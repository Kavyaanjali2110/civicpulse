import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.core.config import settings
from app.db.reset_demo import reset_demo

router = APIRouter()


@router.get("/info", summary="System Information & Track Status")
def get_system_info():
    """Returns platform version, enabled tracks, and runtime metadata."""
    return {
        "platform": "CivicPulse AI",
        "version": "1.3.0",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "active_tracks": {
            "track_a": {
                "name": "Reactive Grievance Resolution & SLA Operations",
                "status": "OPERATIONAL",
                "components": ["Multilingual NLP", "Severity Engine", "DBSCAN Hotspots", "IPS Scoring", "Crew Dispatch"]
            },
            "track_b": {
                "name": "Predictive Infrastructure Maintenance & Failure Forecasting",
                "status": "OPERATIONAL",
                "components": ["Asset Health Index", "7/14/30d Risk Forecasting", "Ward Risk Index", "Preventive Work Orders"]
            },
            "track_c": {
                "name": "Omnichannel Grievance Ingestion & Citizen Notifications",
                "status": "OPERATIONAL",
                "channels": ["WEB", "WHATSAPP", "SMS", "WEBHOOK"],
                "components": ["Unified Ingestion Engine", "Idempotency Protection", "Two-Way Citizen Notifications"]
            }
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.post("/demo-reset", summary="Reset Platform to Deterministic Demo State")
def trigger_demo_reset():
    """Resets and re-seeds SQLite database with clean demonstration data.
    Development & Demonstration ONLY. Disabled in production.
    """
    if settings.ENVIRONMENT.lower() == "production" and not os.getenv("ALLOW_PROD_RESET"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo reset is disabled in production environments."
        )

    try:
        summary = reset_demo()
        return {
            "status": "success",
            "message": "CivicPulse demo state restored successfully.",
            "data": summary
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset demo state: {str(e)}"
        )
