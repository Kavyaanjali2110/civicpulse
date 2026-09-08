from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    citizen,
    government,
    analytics,
    recommendations,
    dispatch,
    predictive_analytics,
    preventive_dispatch,
    webhooks,
    notifications,
    system,
)

api_router = APIRouter()

api_router.include_router(system.router, prefix="/system", tags=["System Management & Demo Reset"])

api_router.include_router(health.router, tags=["System Health"])
api_router.include_router(citizen.router, prefix="/citizen", tags=["Citizen Portal"])
api_router.include_router(government.router, prefix="/gov", tags=["Government Command Center"])
api_router.include_router(dispatch.router, prefix="/gov", tags=["Field Crew Dispatch & Workflow"])
api_router.include_router(dispatch.router, tags=["Direct Workflow Endpoints"])
api_router.include_router(analytics.router, prefix="/gov", tags=["Geospatial & Trend Intelligence"])
api_router.include_router(recommendations.router, prefix="/gov", tags=["Explainable AI Recommendations"])

# Track B: Predictive Infrastructure Maintenance & Failure Forecasting
api_router.include_router(predictive_analytics.router, prefix="/analytics", tags=["Predictive Infrastructure Intelligence"])
api_router.include_router(predictive_analytics.router, prefix="/gov/analytics", tags=["Predictive Analytics (Gov Alias)"])
api_router.include_router(preventive_dispatch.router, prefix="/dispatch", tags=["Preventive Maintenance Dispatch"])
api_router.include_router(preventive_dispatch.router, prefix="/gov/dispatch", tags=["Preventive Dispatch (Gov Alias)"])
api_router.include_router(preventive_dispatch.router, prefix="/gov", tags=["Preventive Dispatch (Gov Direct)"])

# Track C: Omnichannel Civic Grievance Ingestion & Citizen Notifications
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Omnichannel Webhook Ingestion"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Citizen Status Notifications"])
api_router.include_router(notifications.router, prefix="/gov/notifications", tags=["Citizen Notifications (Gov Alias)"])
