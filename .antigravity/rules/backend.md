# Backend Development Rules: FastAPI & GenAI

## Framework & Tooling Standards
- Framework: FastAPI using Uvicorn as the ASGI server.
- Database Layer: SQLAlchemy (Asynchronous or standard scoped-session) pointing to a local `sqlite:///./stadium.db` instance.
- AI Integration: Must exclusively use the official `google-genai` SDK. Call `gemini-2.5-flash` for operational processing due to low latency and high accuracy in structural output.

## AI Prompts & JSON Requirements
- All GenAI prompts targeting incident processing MUST enforce structured JSON output using Pydantic schemas. 
- Example payload requirements:
  ```json
  {
    "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "category": "Crowd Control" | "Medical" | "Facilities" | "Language Support" | "Security",
    "summary": "Concise 1-sentence situational summary",
    "recommended_action": "Actionable dispatch instructions for stadium staff",
    "multilingual_announcement": "Public address announcement text translated into the target community's native language if an localized cluster bottleneck occurs"
  }