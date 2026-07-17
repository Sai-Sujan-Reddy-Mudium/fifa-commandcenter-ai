import asyncio
import random
import logging
import os
import json
from . import agent, models

logger = logging.getLogger(__name__)

INCIDENT_DESCRIPTIONS = [
    "Referees reporting missing equipment in locker room A",
    "Fan fainted in row 12 due to heat exhaustion",
    "French tourists complaining about gate signage malfunction",
    "Overcrowding near the South entrance causing massive delays",
    "Suspicious package spotted near the concession stands in section 405",
    "Massive spill in the main concourse causing slip hazards for attendees",
]

MOCK_INCIDENTS = [
    {"title": "Unauthorized Drone Ingress", "description": "Commercial drone flying directly over the stadium pitch, disrupting warmups.", "severity": "HIGH", "category": "Security", "recommended_action": "Deploy anti-drone netting systems, alert local law enforcement, and pause player field access.", "announcement": "English: Security protocol active. Please remain in your seats. | Spanish: Protocolo de seguridad activo. Por favor permanezcan en sus asientos."},
    {"title": "Structural Deflection Detected", "description": "Sensors indicate anomalous structural movement in Sector 4 Upper Deck.", "severity": "CRITICAL", "category": "Facilities", "recommended_action": "Evacuate Sector 4 immediately and reroute spectators to lower concourses.", "announcement": "English: Sector 4 closed for maintenance. Reroute via Sector 3. | Spanish: Sector 4 cerrado por mantenimiento. Desvíese por el Sector 3."},
    {"title": "Mass Food Poisoning Report", "description": "Multiple fans presenting severe gastrointestinal distress from Concession Stand B.", "severity": "HIGH", "category": "Medical", "recommended_action": "Shut down Concession Stand B immediately, deploy medical response teams to South Stand.", "announcement": "English: Concession B closed. Medical help available at Gate 2. | Spanish: Concesión B cerrada. Ayuda médica disponible en la Puerta 2."},
    {"title": "Turnstile Network Outage", "description": "Main gate digital authentication system crashed, causing thousands to bottleneck at ticket entry.", "severity": "MEDIUM", "category": "Crowd Management", "recommended_action": "Switch ticketing verification to offline paper/visual validation checks.", "announcement": "English: Ticket validation delayed. Prepare physical IDs. | Spanish: Validación de entradas retrasada. Prepare identificaciones físicas."},
    {"title": "Server Room Thermal Spike", "description": "Main data center cooling array failed, internal temperature exceeding 45°C.", "severity": "HIGH", "category": "Facilities", "recommended_action": "Activate secondary backup exhaust systems and initiate non-critical server spin-down.", "announcement": "English: System maintenance in progress. Digital features limited. | Spanish: Mantenimiento del sistema en progreso. Funciones digitales limitadas."},
    {"title": "Pyrotechnics Misfire", "description": "Pre-match flare array ignited unevenly, leaving localized smoke hazard in North Stand.", "severity": "MEDIUM", "category": "Fire Safety", "recommended_action": "Deploy exhaust vacuums to North Stand, monitor air quality indicators.", "announcement": "English: Heavy smoke in North Stand. Stay clear of row 10-15. | Spanish: Humo denso en la tribuna norte. Manténgase alejado de las filas 10-15."},
    {"title": "VIP Escalator Mechanical Jam", "description": "Main escalator in West Lounge suffered abrupt gear lockup, minor injuries reported.", "severity": "MEDIUM", "category": "Medical", "recommended_action": "Dispatch emergency response to West Lounge, secure mechanical perimeter.", "announcement": "English: West escalator out of service. Use adjacent lifts. | Spanish: Escalera mecánica oeste fuera de servicio. Use los ascensores adyacentes."},
    {"title": "Flash Flooding at South Gate", "description": "Sudden downpour overwhelmed external drainage channels near South Gate entrance.", "severity": "MEDIUM", "category": "Facilities", "recommended_action": "Deploy sandbags to South Gate vestibule and open North Gate emergency turnstiles.", "announcement": "English: South Gate restricted due to flooding. Use North Gate. | Spanish: Puerta Sur restringida por inundación. Use la Puerta Norte."},
    {"title": "Suspected Abandoned Baggage", "description": "Unattended large black duffel bag discovered near outer perimeter security checkpoint 3.", "severity": "HIGH", "category": "Security", "recommended_action": "Cordon off Checkpoint 3 and deploy bomb disposal containment unit.", "announcement": "English: Area 3 cleared for security sweep. Follow staff paths. | Spanish: Área 3 despejada para control de seguridad. Siga las rutas del personal."},
    {"title": "Substation Power Surge", "description": "Grid power surge tripped main breakers, forcing stadium into emergency diesel generator power.", "severity": "CRITICAL", "category": "Facilities", "recommended_action": "Isolate main transformer circuit and throttle non-essential stadium displays.", "announcement": "English: Auxiliary power active. Scoreboards operating at lower power. | Spanish: Energía auxiliar activa. Marcadores funcionando a baja potencia."}
]

async def start_incident_simulator(session_factory):
    logger.info("Starting incident simulator background task...")
    
    is_demo = os.getenv('DEMO_MODE', 'false').lower() == 'true'
    
    if is_demo:
        for mock in MOCK_INCIDENTS:
            try:
                with session_factory() as db:
                    incident = models.Incident(
                        title=mock["title"],
                        description=mock["description"],
                        severity=mock["severity"],
                        category=mock["category"],
                        recommended_action=mock["recommended_action"],
                        announcement=mock["announcement"]
                    )
                    db.add(incident)
                    db.commit()
                    logger.info(f"Saved simulated mock incident ID: {incident.id}")
                await asyncio.sleep(5)
            except asyncio.CancelledError:
                logger.info("Incident simulator cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in mock simulator: {e}")
                break
        print("SIMULATOR KILLED: Demo mock events exhausted.")
    else:
        iterations = 0
        while iterations < 5:
            try:
                raw_text = random.choice(INCIDENT_DESCRIPTIONS)
                logger.info(f"Simulating incident: {raw_text}")
                
                classification = await agent.analyze_incident(raw_text)
                
                with session_factory() as db:
                    incident = models.Incident(
                        title=classification.summary,
                        description=raw_text,
                        recommended_action=classification.recommended_action,
                        announcement=classification.multilingual_announcement,
                        severity=classification.severity,
                        category=classification.category
                    )
                    db.add(incident)
                    db.commit()
                    logger.info(f"Saved simulated incident ID: {incident.id}")
                    
                iterations += 1
                if iterations < 5:
                    await asyncio.sleep(45)
            except asyncio.CancelledError:
                logger.info("Incident simulator cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in incident simulator: {e}")
                break
                
        print("SIMULATOR KILLED: Max API limit reached for testing.")
