from pydantic import BaseModel, Field
from typing import Literal

class IncidentClassification(BaseModel):
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    category: Literal["Crowd Control", "Medical", "Facilities", "Language Support", "Security"]
    summary: str
    recommended_action: str
    multilingual_announcement: str = Field(..., description="Strictly format the output as 'Language1: Message | Language2: Message'. Example: 'English: Please clear the area. | Spanish: Por favor, despeje el área.'")

class RawIncidentRequest(BaseModel):
    raw_text: str
