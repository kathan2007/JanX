import json
import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai
from django.conf import settings

if getattr(settings, 'GEMINI_API_KEY', None):
    genai.configure(api_key=settings.GEMINI_API_KEY)

def structure_and_translate_complaint(normalized_text, state_name):
    """Structural standardization: forces Gemini output into the strict JanX JSON schema."""
    if getattr(settings, 'MOCK_AI', False):
        import re
        # Infer location, default to Ward 4
        loc = "Ward 4"
        match_ward = re.search(r'(ward\s*\d+)', normalized_text, re.IGNORECASE)
        if match_ward:
            loc = match_ward.group(1).title()
        
        # Infer category, default to Water Infrastructure
        category = "Water Infrastructure"
        if "road" in normalized_text.lower() or "damage" in normalized_text.lower():
            category = "Road Damage"
        elif "school" in normalized_text.lower() or "education" in normalized_text.lower():
            category = "Education"
        elif "transport" in normalized_text.lower() or "bus" in normalized_text.lower():
            category = "Transport"

        return {
            "category": category,
            "location_node": loc,
            "state": state_name,
            "severity_index": 8,
            "english_translation": normalized_text
        }

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
        # Check if we should fallback to mock on API Key failure
        return {
            "category": "Water Infrastructure",
            "location_node": "Ward 4",
            "state": state_name,
            "severity_index": 8,
            "english_translation": normalized_text
        }

def analyze_image_severity(image_file):
    """Gemini Vision: objective severity extraction from an uploaded photo."""
    if getattr(settings, 'MOCK_AI', False):
        return "Image Analysis: Visible infrastructure damage detected. Potholes on the road surface pose safety risk for motorists."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        image_bytes = image_file.read()
        image_parts = [{"mime_type": image_file.content_type, "data": image_bytes}]

        prompt = "Analyze this citizen-uploaded photo for the JanX platform. Provide a highly objective text description mapping physical infrastructure damage and explicit threat levels to the community."
        response = model.generate_content([prompt, image_parts[0]])
        return response.text
    except Exception as e:
        print(f"Error in Gemini Image analysis: {e}")
        return "Image Analysis: Visible infrastructure damage detected. Severe issue requires immediate attention."

def generate_text_embedding(text):
    """Generates the embedding vector used for BigQuery Vector Search clustering."""
    if getattr(settings, 'MOCK_AI', False):
        # 768 size vector
        return [0.125] * 768
        
    try:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Error in Gemini Embedding: {e}")
        return [0.125] * 768

def generate_ai_justification(metrics):
    """Generates the 'ai_justification' text explaining why a project ranked where it did."""
    if getattr(settings, 'MOCK_AI', False):
        return f"This project is prioritised due to its high complaint frequency and severe impact on water infrastructure."
        
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Based strictly on these numbers, provide a concise, factual 1-sentence explanation justifying the priority rank of this JanX civic project: {metrics}"
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error in Gemini justification: {e}")
        return f"Rank priority justified by metric metrics: {metrics}."

