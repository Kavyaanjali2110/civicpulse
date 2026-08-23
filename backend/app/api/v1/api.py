from fastapi import APIRouter
from app.api.v1.endpoints import health, citizen, government, analytics, recommendations, dispatch

api_router = APIRouter()

api_router.include_router(health.router, tags=["System Health"])
api_router.include_router(citizen.router, prefix="/citizen", tags=["Citizen Portal"])
api_router.include_router(government.router, prefix="/gov", tags=["Government Command Center"])
api_router.include_router(dispatch.router, prefix="/gov", tags=["Field Crew Dispatch & Workflow"])
api_router.include_router(dispatch.router, tags=["Direct Workflow Endpoints"])
api_router.include_router(analytics.router, prefix="/gov", tags=["Geospatial & Trend Intelligence"])
api_router.include_router(recommendations.router, prefix="/gov", tags=["Explainable AI Recommendations"])
