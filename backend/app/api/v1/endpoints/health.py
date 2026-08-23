from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health Check")
def get_health() -> HealthResponse:
    """Returns the operational status and metadata of the CivicPulse AI backend."""
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc)
    )
