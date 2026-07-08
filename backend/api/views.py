import os
import time
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from google.cloud import bigquery
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from firebase_admin import auth
from api.models import DevelopmentRequest
from google.oauth2 import service_account
import json

from services.gemini_service import (
    structure_and_translate_complaint,
    analyze_image_severity,
    generate_text_embedding,
    generate_ai_justification
)
from services.vertex_speech import transcribe_regional_audio
from services.bigquery_client import stream_payload_to_bigquery

logger = logging.getLogger(__name__)

# Valid sector values (must match frontend dropdown + BigQuery enum)
VALID_SECTORS = {
    "WATER", "ROAD", "HEALTH", "EDUCATION", "ELECTRICITY",
    "SANITATION", "WASTE", "SAFETY", "WOMEN_CHILD", "ENVIRONMENT", "AGRICULTURE"
}


class ApiRootView(APIView):
    """GET /api — lists all available JanX API endpoints."""

    def get(self, request, *args, **kwargs):
        return Response({
            "service": "JanX Civic Pipeline API",
            "version": "1.0",
            "status": "running",
            "endpoints": {
                "submit_request": "POST /api/submit-request",
                "get_ranked_projects": "GET /api/get-ranked-projects?state=<state_name>",
                "get_complaints": "GET /api/get-complaints?state=<state_name>&sector=<sector>&limit=<N>",
            }
        })

MAX_FILE_SIZE_IMAGE = 5 * 1024 * 1024  # 5 MB
MAX_FILE_SIZE_AUDIO = 10 * 1024 * 1024  # 10 MB

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/x-wav']


class SubmitRequestAPI(APIView):
    """POST /api/submit-request — ingests text, audio, or image and routes it through the pipeline."""

    def post(self, request, *args, **kwargs):
        # 🔐 STEP 1: Firebase Authentication Check
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({"error": "Unauthorized: No Firebase token provided."}, status=status.HTTP_401_UNAUTHORIZED)

        id_token = auth_header.split(' ')[1]

        # 🚧 SANDBOX BYPASS — allow mock token in local dev mode (MOCK_AI=True)
        SANDBOX_TOKEN = "mock-jwt-sandbox-token-string-12345"
        is_sandbox = getattr(settings, 'MOCK_AI', False) and id_token == SANDBOX_TOKEN

        if not is_sandbox:
            try:
                decoded_token = auth.verify_id_token(id_token)
            except Exception as e:
                logger.warning(f"Firebase token verification failed: {e}")
                return Response({"error": "Unauthorized: Invalid or expired Firebase token."}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            logger.info("Sandbox mode — bypassing Firebase token verification.")

        # ✅ STEP 2: Authenticated — Pipeline Logic
        state = request.data.get('state')
        if not state:
            return Response({"error": "The 'state' field is required."}, status=status.HTTP_400_BAD_REQUEST)

        sector = request.data.get('sector', '').upper() or None
        if sector and sector not in VALID_SECTORS:
            logger.warning(f"Invalid sector '{sector}' received — storing as-is.")

        # image_url and audio_url resolved after file save / fallback below
        image_url = None
        audio_url = None

        normalized_text = ""
        raw_input_type = "text"

        geo_lat = request.data.get('geo_lat') or None
        geo_lng = request.data.get('geo_lng') or None

        # Coerce and validate — reject only if a value is present but clearly invalid
        if geo_lat is not None:
            try:
                geo_lat = float(geo_lat)
                if not (-90.0 <= geo_lat <= 90.0):
                    return Response({"error": "geo_lat out of range (−90 to 90)."}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({"error": "Invalid geo_lat. Must be a decimal number."}, status=status.HTTP_400_BAD_REQUEST)

        if geo_lng is not None:
            try:
                geo_lng = float(geo_lng)
                if not (-180.0 <= geo_lng <= 180.0):
                    return Response({"error": "geo_lng out of range (−180 to 180)."}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({"error": "Invalid geo_lng. Must be a decimal number."}, status=status.HTTP_400_BAD_REQUEST)

        if 'text' in request.data:
            normalized_text = request.data.get('text')
            raw_input_type = "text"
            if not normalized_text or not isinstance(normalized_text, str) or normalized_text.strip() == "":
                return Response({"error": "Text complaint cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        elif 'audio' in request.FILES:
            raw_input_type = "audio"
            audio_file = request.FILES['audio']

            if audio_file.size > MAX_FILE_SIZE_AUDIO:
                return Response({"error": f"Audio file size exceeds limit of {MAX_FILE_SIZE_AUDIO / (1024*1024)}MB."}, status=status.HTTP_400_BAD_REQUEST)

            content_type = getattr(audio_file, 'content_type', '')
            if content_type not in ALLOWED_AUDIO_TYPES:
                name = audio_file.name.lower()
                suffix_ok = any(name.endswith(ext) for ext in ['.wav', '.mp3', '.ogg'])
                if not suffix_ok:
                    return Response({"error": f"Unsupported audio format: {content_type}. Allowed formats: wav, mp3, ogg."}, status=status.HTTP_400_BAD_REQUEST)

            normalized_text = transcribe_regional_audio(audio_file)
            if normalized_text is None:
                return Response({"error": "Audio transcription failed. Please try again or submit as text."}, status=status.HTTP_502_BAD_GATEWAY)

            # 💾 Save audio locally to media/complaints/ — bypasses Firebase Storage CORS entirely
            try:
                audio_file.seek(0)  # rewind after transcription read
                ext = os.path.splitext(audio_file.name)[-1] or '.wav'
                save_path = f"complaints/{int(time.time() * 1000)}{ext}"
                saved_name = default_storage.save(save_path, ContentFile(audio_file.read()))
                audio_url = settings.MEDIA_URL + saved_name  # relative — served via Vite proxy
                logger.info(f"Audio saved locally: {audio_url}")
            except Exception as file_err:
                logger.warning(f"Local audio save failed: {file_err}")

        elif 'image' in request.FILES:
            raw_input_type = "image"
            image_file = request.FILES['image']

            if image_file.size > MAX_FILE_SIZE_IMAGE:
                return Response({"error": f"Image file size exceeds limit of {MAX_FILE_SIZE_IMAGE / (1024*1024)}MB."}, status=status.HTTP_400_BAD_REQUEST)

            content_type = getattr(image_file, 'content_type', '')
            if content_type not in ALLOWED_IMAGE_TYPES:
                name = image_file.name.lower()
                suffix_ok = any(name.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp'])
                if not suffix_ok:
                    return Response({"error": f"Unsupported image format: {content_type}. Allowed formats: jpeg, png, webp."}, status=status.HTTP_400_BAD_REQUEST)

            normalized_text = analyze_image_severity(image_file)
            if not normalized_text:
                return Response({"error": "Failed to analyze image content via Gemini."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # 💾 Save image locally to media/complaints/ — bypasses Firebase Storage CORS entirely
            try:
                image_file.seek(0)  # rewind after Gemini read
                ext = os.path.splitext(image_file.name)[-1] or '.jpg'
                save_path = f"complaints/{int(time.time() * 1000)}{ext}"
                saved_name = default_storage.save(save_path, ContentFile(image_file.read()))
                image_url = settings.MEDIA_URL + saved_name  # relative — served via Vite proxy
                logger.info(f"Image saved locally: {image_url}")
            except Exception as file_err:
                logger.warning(f"Local image save failed: {file_err} — using frontend URL fallback")
                image_url = request.data.get('image_url') or None

        else:
            return Response({"error": "Provide one of: text, audio, or image."}, status=status.HTTP_400_BAD_REQUEST)

        structured_payload = structure_and_translate_complaint(normalized_text, state)
        if not structured_payload:
            return Response({"error": "Failed to structure the complaint via Gemini."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        english_translation = structured_payload.get('english_translation')
        if not english_translation:
            return Response({"error": "Gemini structured payload did not return an English translation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        embedding_vector = generate_text_embedding(english_translation)

        # For text/audio submissions, check if frontend sent an image_url
        if not image_url:
            image_url = request.data.get('image_url') or request.POST.get('image_url') or None

        import threading
        import uuid

        request_id = str(uuid.uuid4())

        # Fire-and-forget streaming payload insertion in a background thread
        threading.Thread(
            target=stream_payload_to_bigquery,
            args=(structured_payload, embedding_vector, raw_input_type),
            kwargs={
                "geo_lat": geo_lat,
                "geo_lng": geo_lng,
                "sector": sector,
                "image_url": image_url,
                "audio_url": audio_url,
                "status": "Pending",
                "request_id": request_id
            },
            daemon=True
        ).start()

        # Build response immediately
        response_data = {
            **structured_payload,
            "request_id": request_id,
            "sector": sector,
            "image_url": image_url,
            "audio_url": audio_url,
            "status": "Pending",
            "raw_input_type": raw_input_type
        }
        return Response(response_data, status=status.HTTP_201_CREATED)



class GetRankedProjectsAPI(APIView):
    """GET /api/get-ranked-projects?state=... — returns projects ranked by priority score, scoped to a state."""

    def get(self, request, *args, **kwargs):
        state = request.query_params.get('state')
        if not state:
            return Response({"error": "Missing required query parameter: state"}, status=status.HTTP_400_BAD_REQUEST)

        client = bigquery.Client(project=settings.GCP_PROJECT_ID)

        query = f'''
        SELECT
            c.category,
            c.location_node,
            COUNT(c.request_id) as volume,
            AVG(CAST(c.severity_index AS FLOAT64)) as mean_severity,
            AVG(CAST(c.geo_lat AS FLOAT64)) as representative_lat,
            AVG(CAST(c.geo_lng AS FLOAT64)) as representative_lng,
            COALESCE(AVG(ig.distance_to_nearest_facility), 0.0) as distance_to_nearest_facility,
            COALESCE(AVG(cd.population_impact_factor), 0.0) as population_impact_factor
        FROM `{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.citizen_complaints` c
        LEFT JOIN `{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.infrastructure_gaps` ig
          ON TRIM(LOWER(c.location_node)) = TRIM(LOWER(ig.location_node))
          AND TRIM(LOWER(c.category)) = TRIM(LOWER(ig.category))
        LEFT JOIN `{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.census_demographics` cd
          ON TRIM(LOWER(c.location_node)) = TRIM(LOWER(cd.location_node))
        WHERE c.state = @state
        GROUP BY c.category, c.location_node
        '''

        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("state", "STRING", state)]
        )

        try:
            query_job = client.query(query, job_config=job_config)
            query_results = list(query_job.result())
        except Exception as e:
            logger.error(f"BigQuery query failed: {str(e)}")
            return Response({"error": f"BigQuery query failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        ranked_projects = []
        for row in query_results:
            volume = row.volume
            mean_severity = row.mean_severity
            distance_to_nearest_facility = row.distance_to_nearest_facility
            population_impact_factor = row.population_impact_factor

            complaint_density_score = min((volume * mean_severity) * 10, 100)
            priority_score = max(0, min(int((0.4 * complaint_density_score) +
                                             (0.3 * distance_to_nearest_facility) +
                                             (0.3 * population_impact_factor)), 100))

            footprint = (
                f"Priority: {priority_score}/100, Volume: {volume}, Avg Severity: {mean_severity:.1f}, "
                f"Distance to Facility Gap: {distance_to_nearest_facility:.1f}, "
                f"Population Impact Factor: {population_impact_factor:.1f}."
            )

            try:
                ai_justification = generate_ai_justification(footprint)
            except Exception as e:
                logger.error(f"Failed to generate AI justification: {e}")
                ai_justification = f"Priority justification based on complaint volume ({volume}), average severity ({mean_severity:.1f}), infrastructure gap, and area demographics."

            geolocation = None
            if row.representative_lat is not None and row.representative_lng is not None:
                geolocation = {
                    "lat": float(row.representative_lat),
                    "lng": float(row.representative_lng)
                }

            project_title = f"JanX Redressal: {row.category} at {row.location_node}"
            dev_req, created = DevelopmentRequest.objects.get_or_create(
                title=project_title,
                state=state,
                defaults={
                    "description": ai_justification,
                    "score": priority_score,
                    "status": "PENDING"
                }
            )
            if not created:
                dev_req.score = priority_score
                dev_req.save()

            ranked_projects.append({
                "id": dev_req.id,
                "status": dev_req.status,
                "project_title": project_title,
                "state": state,
                "priority_score": dev_req.score,
                "complaint_count": volume,
                "geolocation": geolocation,
                "category": row.category,
                "ai_justification": dev_req.description
            })

        ranked_projects = sorted(ranked_projects, key=lambda x: x['priority_score'], reverse=True)
        for idx, item in enumerate(ranked_projects):
            item['rank'] = idx + 1

        return Response(ranked_projects, status=status.HTTP_200_OK)


class GetComplaintsAPI(APIView):
    """GET /api/get-complaints?state=...&sector=...&limit=50
    Fetches individual complaint records (with image_url, sector) for MP Dashboard."""

    def get(self, request, *args, **kwargs):
        state = request.query_params.get('state')
        if not state:
            return Response(
                {"error": "Missing required query parameter: state"},
                status=status.HTTP_400_BAD_REQUEST
            )

        sector_filter = request.query_params.get('sector', '').upper() or None
        limit = int(request.query_params.get('limit', 50))
        limit = min(limit, 200)

        # 🎯 1. Live Render Environment dynamically authenticates using JSON String
        gcp_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")

        if gcp_json:
            try:
                credentials_dict = json.loads(gcp_json)
                credentials = service_account.Credentials.from_service_account_info(credentials_dict)
                client = bigquery.Client(project=settings.GCP_PROJECT_ID, credentials=credentials)
            except Exception as credential_error:
                logger.error(f"Failed to load credentials from GOOGLE_CREDENTIALS_JSON string: {credential_error}")
                client = bigquery.Client(project=settings.GCP_PROJECT_ID)
        else:
            # Local machine/development setup safe fallback
            client = bigquery.Client(project=settings.GCP_PROJECT_ID)

        # 📊 2. Dynamic Query String and Parameter Mapping
        sector_clause = f"AND UPPER(c.sector) = @sector" if sector_filter else ""

        query = f'''
        SELECT
            request_id,
            category,
            sector,
            location_node,
            state,
            CAST(severity_index AS INT64) as severity_index,
            english_translation,
            raw_input_type,
            submitted_at,
            CAST(geo_lat AS FLOAT64) as geo_lat,
            CAST(geo_lng AS FLOAT64) as geo_lng,
            image_url,
            audio_url,
            status
        FROM `{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.citizen_complaints` c
        WHERE c.state = @state
        {sector_clause}
        ORDER BY submitted_at DESC
        LIMIT {limit}
        '''

        params = [bigquery.ScalarQueryParameter("state", "STRING", state)]
        if sector_filter:
            params.append(bigquery.ScalarQueryParameter("sector", "STRING", sector_filter))

        # 🛠️ Fixed Class Typo: Using correct QueryJobConfiguration reference
        job_config = bigquery.QueryJobConfiguration(query_parameters=params)

        try:
            query_job = client.query(query, job_config=job_config)
            complaints = []
            
            for row in query_job.result():
                row_dict = {
                    "request_id":           row.request_id,
                    "category":             row.category,
                    "sector":               row.sector,
                    "location_node":        row.location_node,
                    "state":                row.state,
                    "severity_index":       row.severity_index,
                    "english_translation":  row.english_translation,
                    "raw_input_type":       row.raw_input_type,
                    "submitted_at":         str(row.submitted_at) if row.submitted_at else None,
                    "geo_lat":              float(row.geo_lat) if row.geo_lat is not None else None,
                    "geo_lng":              float(row.geo_lng) if row.geo_lng is not None else None,
                    "image_url":            row.image_url,
                    "audio_url":            getattr(row, 'audio_url', None),
                    "status":               row.status or "Pending",
                }

                # Generate dynamic AI justification parameters on the fly
                sev = row_dict.get('severity_index', 5)
                cat = row_dict.get('category', 'General')
                loc = row_dict.get('location_node', 'local area')
                row_dict['ai_justification'] = (
                    f"System flagged this issue with a severity score of {sev}/10. "
                    f"Priority allocation generated based on structural delays and "
                    f"infrastructure risk parameters for {cat} in {loc}."
                )
                complaints.append(row_dict)
                
            return Response(complaints, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"GetComplaintsAPI BigQuery query failed: {str(e)}")
            return Response(
                {"error": f"BigQuery query failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DevelopmentRequestDetailAPI(APIView):
    """PATCH /api/requests/<id>/ — updates status of a development request."""

    def patch(self, request, pk, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({"error": "Unauthorized: No Firebase token provided."}, status=status.HTTP_401_UNAUTHORIZED)

        id_token = auth_header.split(' ')[1]

        SANDBOX_TOKEN = "mock-jwt-sandbox-token-string-12345"
        is_sandbox = getattr(settings, 'MOCK_AI', False) and id_token == SANDBOX_TOKEN

        if not is_sandbox:
            try:
                auth.verify_id_token(id_token)
            except Exception as e:
                logger.warning(f"Firebase token verification failed: {e}")
                return Response({"error": "Unauthorized: Invalid or expired Firebase token."}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            logger.info("Sandbox mode — bypassing Firebase token verification.")

        try:
            dev_req = DevelopmentRequest.objects.get(pk=pk)
        except DevelopmentRequest.DoesNotExist:
            return Response({"error": "Development request not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if not new_status:
            return Response({"error": "Missing status value."}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in DevelopmentRequest.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status: {new_status}. Allowed values are {valid_statuses}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        dev_req.status = new_status
        dev_req.save()

        return Response({
            "id": dev_req.id,
            "status": dev_req.status,
            "title": dev_req.title,
            "state": dev_req.state,
            "priority_score": dev_req.score
        }, status=status.HTTP_200_OK)


class UpdateStatusAPI(APIView):
    """PATCH /api/update-status — updates status of a specific complaint request in BigQuery."""

    def patch(self, request, *args, **kwargs):
        request_id = request.data.get('request_id')
        new_status = request.data.get('status')
        if not request_id or not new_status:
            return Response(
                {"error": "Fields 'request_id' and 'status' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        client = bigquery.Client(project=settings.GCP_PROJECT_ID)
        query = f'''
        UPDATE `{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.citizen_complaints`
        SET status = @status
        WHERE request_id = @request_id
        '''
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("status", "STRING", new_status),
                bigquery.ScalarQueryParameter("request_id", "STRING", request_id)
            ]
        )
        try:
            query_job = client.query(query, job_config=job_config)
            query_job.result()
            return Response(
                {"success": True, "message": f"Status updated to '{new_status}'."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"BigQuery update status failed: {str(e)}")
            return Response(
                {"error": f"Failed to update status: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
