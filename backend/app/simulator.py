import asyncio
import random
import logging
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

async def start_incident_simulator(session_factory):
    logger.info("Starting incident simulator background task...")
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
