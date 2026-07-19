from dotenv import load_dotenv
import asyncio
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, agent, simulator
from .database import engine, get_db, SessionLocal

load_dotenv(override=True)

is_shutting_down = False

models.Base.metadata.create_all(bind=engine)

incident_queue = asyncio.Queue()

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="FIFA 2026 CommandCenter AI Backend", lifespan=lifespan)

@app.on_event("shutdown")
def shutdown_event():
    global is_shutting_down
    is_shutting_down = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "https://fifa-commandcenter-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "operational", "database": "connected"}

@app.post("/api/incidents/analyze")
async def analyze_incident_endpoint(request: schemas.RawIncidentRequest, db: Session = Depends(get_db)):
    classification = await agent.analyze_incident(request.raw_text)
    
    incident = models.Incident(
        title=classification.summary,
        description=request.raw_text,
        recommended_action=classification.recommended_action,
        announcement=classification.multilingual_announcement,
        severity=classification.severity,
        category=classification.category
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident

@app.put("/api/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if incident:
        incident.status = "RESOLVED"
        db.commit()
        return {"success": True, "message": "Incident resolved successfully"}
    return {"success": False, "message": "Incident not found"}

async def process_manual_incident(description: str, db_session: Session):
    classification = await agent.analyze_incident(description)
    
    incident = models.Incident(
        title=classification.summary,
        description=description,
        recommended_action=classification.recommended_action,
        announcement=classification.multilingual_announcement,
        severity=classification.severity,
        category=classification.category
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)
    
    incident_dict = {
        "id": incident.id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "category": incident.category,
        "status": incident.status,
        "recommended_action": incident.recommended_action,
        "announcement": incident.announcement,
        "created_at": incident.created_at.isoformat() if incident.created_at else None
    }
    
    await incident_queue.put(incident_dict)

@app.get("/api/incidents")
def get_active_incidents(db: Session = Depends(get_db)):
    active_incidents = db.query(models.Incident).filter(models.Incident.status != "RESOLVED").order_by(models.Incident.created_at.desc()).all()
    return active_incidents

@app.post("/api/incidents/manual")
async def create_manual_incident(
    payload: schemas.ManualIncidentRequest, 
    x_api_key: str = Header(None),
    db: Session = Depends(get_db)
):
    expected_key = os.getenv("ADMIN_API_KEY")
    if not expected_key or x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    await process_manual_incident(payload.description, db)
    return {"success": True, "message": "Manual incident created and dispatched"}

@app.get("/api/incidents/stream")
async def stream_incidents(request: Request):
    async def event_generator():
        try:
            while True:
                if is_shutting_down or await request.is_disconnected():
                    break
                try:
                    incident_data = await asyncio.wait_for(incident_queue.get(), timeout=1.0)
                    yield f"data: {json.dumps(incident_data)}\n\n"
                except asyncio.TimeoutError:
                    pass
                except Exception as e:
                    print(f"Error in stream: {e}")
                    await asyncio.sleep(1)
        except asyncio.CancelledError:
            print("Client disconnected. Halting stream.")
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
