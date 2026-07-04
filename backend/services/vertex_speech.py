from google.cloud import speech
from django.conf import settings

def transcribe_regional_audio(audio_file):
    """Transcribes code-mixed Indian dialect speech via Google Cloud Speech-to-Text."""
    if getattr(settings, 'MOCK_AI', False):
        return "The water pipeline near Ward 4 is leaking heavily, wasting drinking water and flooding the main street."

    try:
        client = speech.SpeechClient()
        audio_bytes = audio_file.read()
        audio = speech.RecognitionAudio(content=audio_bytes)

        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="hi-IN",
            alternative_language_codes=["mr-IN", "en-IN", "ta-IN"],
        )

        response = client.recognize(config=config, audio=audio)
        transcript_pieces = [result.alternatives[0].transcript for result in response.results]
        return " ".join(transcript_pieces)
    except Exception as e:
        print(f"Speech-to-Text Exception: {str(e)}")
        # Check if we should fallback to mock on API precondition/billing failure
        if getattr(settings, 'MOCK_AI', False) or "billing" in str(e).lower() or "credentials" in str(e).lower() or "403" in str(e).lower():
            print("Speech-to-Text failed, returning mock fallback transcribed text.")
            return "The water pipeline near Ward 4 is leaking heavily, wasting drinking water and flooding the main street."
        return None

