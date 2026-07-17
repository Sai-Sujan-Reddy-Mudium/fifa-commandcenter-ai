from google import genai
from google.genai import types
from .schemas import IncidentClassification

client = genai.Client()

async def analyze_incident(raw_text: str) -> IncidentClassification:
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=raw_text,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=IncidentClassification,
        ),
    )
    return response.parsed
