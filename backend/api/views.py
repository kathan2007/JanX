import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from google.cloud import bigquery
from django.conf import settings
from firebase_admin import auth

from services.gemini_service import (
    structure_and_translate_complaint,
    analyze_image_severity,
    generate_text_embedding,
    generate_ai_justification
)
from services.vertex_speech import transcribe_regional_audio
from services.bigquery_client import stream_payload_to_bigquery

logger = logging.getLogger(__name__)


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
        try:
            decoded_token = auth.verify_id_token(id_token)
            # Future use ke liye: user_email = decoded_token.get('email')
        except Exception as e:
            logger.warning(f"Firebase token verification failed: {e}")
            return Response({"error": "Unauthorized: Invalid or expired Firebase token."}, status=status.HTTP_401_UNAUTHORIZED)

        # ✅ STEP 2: Authenticated — Pipeline Logic Shuru
        state = request.data.get('state')
        if not state:
            return Response({"error": "The 'state' field is required."}, status=status.HTTP_400_BAD_REQUEST)

        normalized_text = ""
        raw_input_type = "text"

        geo_lat = request.data.get('geo_lat')
        geo_lng = request.data.get('geo_lng')
        if geo_lat is not None:
            try:
                float(geo_lat)
            except (ValueError, TypeError):
                return Response({"error": "Invalid geo_lat coordinates. Must be a float number."}, status=status.HTTP_400_BAD_REQUEST)
        if geo_lng is not None:
            try:
                float(geo_lng)
            except (ValueError, TypeError):
                return Response({"error": "Invalid geo_lng coordinates. Must be a float number."}, status=status.HTTP_400_BAD_REQUEST)

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

        else:
            return Response({"error": "Provide one of: text, audio, or image."}, status=status.HTTP_400_BAD_REQUEST)

        structured_payload = structure_and_translate_complaint(normalized_text, state)
        if not structured_payload:
            return Response({"error": "Failed to structure the complaint via Gemini."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        english_translation = structured_payload.get('english_translation')
        if not english_translation:
            return Response({"error": "Gemini structured payload did not return an English translation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        embedding_vector = generate_text_embedding(english_translation)

        db_success = stream_payload_to_bigquery(
            structured_payload, embedding_vector, raw_input_type,
            geo_lat=geo_lat, geo_lng=geo_lng
        )

        if db_success:
            return Response(structured_payload, status=status.HTTP_201_CREATED)
        return Response({"error": "Failed to stream the record to BigQuery."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

            ranked_projects.append({
                "project_title": f"JanX Redressal: {row.category} at {row.location_node}",
                "state": state,
                "priority_score": priority_score,
                "complaint_count": volume,
                "geolocation": geolocation,
                "category": row.category,
                "ai_justification": ai_justification
            })

        ranked_projects = sorted(ranked_projects, key=lambda x: x['priority_score'], reverse=True)
        for idx, item in enumerate(ranked_projects):
            item['rank'] = idx + 1

        return Response(ranked_projects, status=status.HTTP_200_OK)
