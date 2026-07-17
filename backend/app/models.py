from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    severity = Column(String)
    category = Column(String)
    status = Column(String, default="PENDING")
    recommended_action = Column(String, nullable=True)
    announcement = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
