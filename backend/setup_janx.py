import os
import sys

def create_files():
    # Base directories
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define file paths and their contents
    files_to_create = {}

    # 1. requirements.txt
    files_to_create[os.path.join(base_dir, 'requirements.txt')] = """django>=4.2
djangorestframework
google-cloud-bigquery>=3.0.0
google-cloud-speech>=2.0.0
google-generativeai>=0.3.0
python-dotenv
gunicorn
uvicorn
requests
"""

    # 2. Dockerfile
    files_to_create[os.path.join(base_dir, 'Dockerfile')] = """FROM python:3.10-slim

ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
WORKDIR $APP_HOME

COPY . ./

RUN pip install --no-cache-dir -r requirements.txt

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 core.wsgi:application
"""

    # 3. core/settings.py
    files_to_create[os.path.join(base_dir, 'core', 'settings.py')] = """import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY must be set in environment variables.")

DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

REST_FRAMEWORK = {
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ]
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
BQ_DATASET = os.getenv("BQ_DATASET", "janx_dataset")

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
"""

    # 4. core/urls.py
    files_to_create[os.path.join(base_dir, 'core', 'urls.py')] = """from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
"""

    # 5. services/gemini_service.py
    files_to_create[os.path.join(base_dir, 'services', 'gemini_service.py')] = """import json
import google.generativeai as genai
from django.conf import settings

if getattr(settings, 'GEMINI_API_KEY', None):
    genai.configure(api_key=settings.GEMINI_API_KEY)

def structure_and_translate_complaint(normalized_text, state_name):
    \"\"\"Structural standardization: forces Gemini output into the strict JanX JSON schema.\"\"\"
    model = genai.GenerativeModel(
        'gemini-1.5-pro',
        generation_config={"response_mime_type": "application/json"}
    )

    prompt = f'''
    Analyze the following citizen complaint input for the JanX platform. Translate it to English if it is in an Indian regional language or code-mixed speech (e.g., Hinglish).
    Extract structural data objectively without narrative filler or markdown wrappers.

    Complaint Data: "{normalized_text}"

    You MUST respond with a single JSON object matching this schema exactly:
    {{
      "category": "String (e.g., Water Infrastructure, Education, Transport, Road Damage)",
      "location_node": "String (Extracted Ward or Village name inferred from input)",
      "state": "{state_name}",
      "severity_index": "Integer (1-10 scale based on public risk severity parameters)",
      "english_translation": "String (normalized, clear objective summary text in English)"
    }}
    '''
    try:
        response = model.generate_content(prompt)
        structured_data = json.loads(response.text)
        structured_data['state'] = state_name
        return structured_data
    except Exception as e:
        print(f"Error in Gemini JSON parsing: {str(e)}")
        return None

def analyze_image_severity(image_file):
    \"\"\"Gemini Vision: objective severity extraction from an uploaded photo.\"\"\"
    model = genai.GenerativeModel('gemini-1.5-flash')
    image_bytes = image_file.read()
    image_parts = [{"mime_type": image_file.content_type, "data": image_bytes}]

    prompt = "Analyze this citizen-uploaded photo for the JanX platform. Provide a highly objective text description mapping physical infrastructure damage and explicit threat levels to the community."
    response = model.generate_content([prompt, image_parts[0]])
    return response.text

def generate_text_embedding(text):
    \"\"\"Generates the embedding vector used for BigQuery Vector Search clustering.\"\"\"
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def generate_ai_justification(metrics):
    \"\"\"Generates the 'ai_justification' text explaining why a project ranked where it did.\"\"\"
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"Based strictly on these numbers, provide a concise, factual 1-sentence explanation justifying the priority rank of this JanX civic project: {metrics}"
    response = model.generate_content(prompt)
    return response.text.strip()
"""

    # 6. services/vertex_speech.py
    files_to_create[os.path.join(base_dir, 'services', 'vertex_speech.py')] = """from google.cloud import speech

def transcribe_regional_audio(audio_file):
    \"\"\"Transcribes code-mixed Indian dialect speech via Google Cloud Speech-to-Text.\"\"\"
    client = speech.SpeechClient()
    audio_bytes = audio_file.read()
    audio = speech.RecognitionAudio(content=audio_bytes)

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code="hi-IN",
        alternative_language_codes=["mr-IN", "en-IN", "ta-IN"],
    )

    try:
        response = client.recognize(config=config, audio=audio)
        transcript_pieces = [result.alternatives[0].transcript for result in response.results]
        return " ".join(transcript_pieces)
    except Exception as e:
        print(f"Speech-to-Text Exception: {str(e)}")
        return None
"""

    # 7. services/bigquery_client.py
    files_to_create[os.path.join(base_dir, 'services', 'bigquery_client.py')] = """import uuid
from datetime import datetime, timezone
from google.cloud import bigquery
from django.conf import settings

def stream_payload_to_bigquery(structured_data, embedding, raw_input_type, geo_lat=None, geo_lng=None):
    \"\"\"Streams a structured complaint record into BigQuery.\"\"\"
    client = bigquery.Client(project=settings.GCP_PROJECT_ID)
    table_id = f"{settings.GCP_PROJECT_ID}.{settings.BQ_DATASET}.citizen_complaints"

    lat_val = None
    lng_val = None
    if geo_lat is not None:
        try:
            lat_val = float(geo_lat)
        except (ValueError, TypeError):
            pass
    if geo_lng is not None:
        try:
            lng_val = float(geo_lng)
        except (ValueError, TypeError):
            pass

    row_to_insert = [{
        "request_id": str(uuid.uuid4()),
        "category": structured_data.get("category"),
        "location_node": structured_data.get("location_node"),
        "state": structured_data.get("state"),
        "severity_index": int(structured_data.get("severity_index", 1)),
        "english_translation": structured_data.get("english_translation"),
        "embedding": embedding,
        "raw_input_type": raw_input_type,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "geo_lat": lat_val,
        "geo_lng": lng_val
    }]

    errors = client.insert_rows_json(table_id, row_to_insert)
    if errors:
        print(f"BigQuery stream insert errors: {errors}")
        return False
    return True
"""

    # 8. api/views.py
    files_to_create[os.path.join(base_dir, 'api', 'views.py')] = """import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from google.cloud import bigquery
from django.conf import settings

from services.gemini_service import (
    structure_and_translate_complaint,
    analyze_image_severity,
    generate_text_embedding,
    generate_ai_justification
)
from services.vertex_speech import transcribe_regional_audio
from services.bigquery_client import stream_payload_to_bigquery

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_IMAGE = 5 * 1024 * 1024  # 5 MB
MAX_FILE_SIZE_AUDIO = 10 * 1024 * 1024  # 10 MB

ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/x-wav']


class SubmitRequestAPI(APIView):
    \"\"\"POST /api/submit-request — ingests text, audio, or image and routes it through the pipeline.\"\"\"

    def post(self, request, *args, **kwargs):
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
    \"\"\"GET /api/get-ranked-projects?state=... — returns projects ranked by priority score, scoped to a state.\"\"\"

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
            AVG(c.severity_index) as mean_severity,
            COALESCE(AVG(c.geo_lat), NULL) as representative_lat,
            COALESCE(AVG(c.geo_lng), NULL) as representative_lng,
            COALESCE(AVG(ig.distance_to_nearest_facility), 65.0) as distance_to_nearest_facility,
            COALESCE(AVG(cd.population_impact_factor), 80.0) as population_impact_factor
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
"""

    # 9. api/urls.py
    files_to_create[os.path.join(base_dir, 'api', 'urls.py')] = """from django.urls import path
from .views import SubmitRequestAPI, GetRankedProjectsAPI

urlpatterns = [
    path('submit-request', SubmitRequestAPI.as_view(), name='submit-request'),
    path('get-ranked-projects', GetRankedProjectsAPI.as_view(), name='get-ranked-projects'),
]
"""

    # Create target directories
    for file_path in files_to_create.keys():
        dir_name = os.path.dirname(file_path)
        if not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)
            print(f"Created directory: {dir_name}")

    # Write file contents
    for file_path, content in files_to_create.items():
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Wrote file: {file_path}")

    print("Project successfully scaffolded!")

if __name__ == "__main__":
    create_files()
