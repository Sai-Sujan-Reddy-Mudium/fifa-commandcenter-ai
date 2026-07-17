from dotenv import load_dotenv
load_dotenv()
import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, agent, simulator
from .database import engine, get_db, SessionLocal

is_shutting_down = False

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup task
    simulator_task = asyncio.create_task(simulator.start_incident_simulator(SessionLocal))
    yield
    # Shutdown task
    simulator_task.cancel()

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

@app.get("/api/incidents/stream")
async def stream_incidents(request: Request):
    async def event_generator():
        last_id = 0
        try:
            while True:
                if is_shutting_down or await request.is_disconnected():
                    break
                try:
                    # Use an explicit scoped session block in the generator loop to release DB locks between iterations
                    with SessionLocal() as session:
                        incidents = session.query(models.Incident).filter(
                            models.Incident.id > last_id,
                            models.Incident.status == 'PENDING'
                        ).order_by(models.Incident.id.asc()).all()
                        for incident in incidents:
                            data = {
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
                            yield f"data: {json.dumps(data)}\n\n"
                            last_id = incident.id
                except Exception as e:
                    print(f"Error in stream: {e}")
                    
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            print("Client disconnected. Halting stream.")
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
