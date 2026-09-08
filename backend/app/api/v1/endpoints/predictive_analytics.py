from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.predictive_service import predictive_service
from app.schemas.predictive import (
    AssetHealthResponse,
    AssetRiskResponse,
    WardRiskResponse,
    PredictiveMaintenanceRecommendationResponse
)

router = APIRouter()


@router.get("/assets/health", response_model=List[AssetHealthResponse], summary="List Asset Health Indices")
def get_assets_health(
    ward_id: Optional[int] = Query(None, description="Filter by ward ID (1-8)"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type (e.g. WATER_FACILITY, POWER_STATION, HOSPITAL)"),
    health_category: Optional[str] = Query(None, description="Filter by health tier (HEALTHY, MONITORED, AT_RISK, CRITICAL)"),
    min_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum health score threshold"),
    db: Session = Depends(get_db)
):
    """Calculates and returns normalized Asset Health Index (AHI 0-100) and factor breakdowns."""
    return predictive_service.list_assets_health(
        db=db,
        ward_id=ward_id,
        asset_type=asset_type,
        health_category=health_category,
        min_score=min_score
    )


@router.get("/assets/risk", response_model=List[AssetRiskResponse], summary="List Asset Failure Risk Forecasts")
def get_assets_risk(
    ward_id: Optional[int] = Query(None, description="Filter by ward ID (1-8)"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier (LOW, MEDIUM, HIGH, CRITICAL)"),
    prediction_window: Optional[int] = Query(30, description="Forecast window horizon: 7, 14, or 30 days"),
    db: Session = Depends(get_db)
):
    """Forecasts failure probability across 7, 14, and 30-day windows with XAI explanations."""
    return predictive_service.list_assets_risk(
        db=db,
        ward_id=ward_id,
        asset_type=asset_type,
        risk_level=risk_level,
        prediction_window=prediction_window
    )


@router.get("/assets/{id}/health", response_model=AssetHealthResponse, summary="Get Single Asset Health Index")
def get_asset_health_by_id(
    id: int = Path(..., description="Infrastructure Asset ID"),
    db: Session = Depends(get_db)
):
    """Retrieves detailed Asset Health Index and factor attribution for a specific asset."""
    return predictive_service.get_asset_health(db=db, asset_id=id)


@router.get("/assets/{id}/predictions", response_model=AssetRiskResponse, summary="Get Asset Failure Risk & XAI")
def get_asset_predictions_by_id(
    id: int = Path(..., description="Infrastructure Asset ID"),
    db: Session = Depends(get_db)
):
    """Retrieves 7, 14, and 30-day failure probabilities and human-readable XAI rationales for an asset."""
    return predictive_service.get_asset_risks(db=db, asset_id=id)


@router.get("/wards/risk", response_model=List[WardRiskResponse], summary="Ward-Level Infrastructure Risk Analysis")
def get_wards_risk(db: Session = Depends(get_db)):
    """Calculates spatial infrastructure risk scores (0-100), complaint velocity, and at-risk asset counts per ward."""
    return predictive_service.get_ward_risks(db=db)


@router.get("/predictive-maintenance", response_model=List[PredictiveMaintenanceRecommendationResponse], summary="Predictive Maintenance Recommendations")
def get_predictive_maintenance_recommendations(db: Session = Depends(get_db)):
    """Generates prescriptive preventive maintenance advisories for high-risk and critical infrastructure assets."""
    return predictive_service.get_predictive_maintenance_recommendations(db=db)
