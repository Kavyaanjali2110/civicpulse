from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ComponentScores(BaseModel):
    complaint_frequency_score: float
    severity_score: float
    recurrence_score: float
    hotspot_score: float
    age_score: float
    maintenance_overdue_score: float


class AssetMetrics(BaseModel):
    age_years: int
    days_since_maintenance: int
    recent_complaints_14d: int
    total_historical_complaints: int
    average_severity: float
    average_priority_score: float
    active_hotspot_code: Optional[str] = None
    hotspot_distance_m: Optional[float] = None


class AssetHealthResponse(BaseModel):
    asset_id: int
    asset_name: str
    asset_type: str
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    health_score: float
    health_category: str
    component_scores: ComponentScores
    metrics: AssetMetrics
    contributing_factors: List[str]
    calculated_at: datetime


class WindowPrediction(BaseModel):
    prediction_window_days: int
    risk_score: float
    risk_percentage: float
    risk_level: str
    model_version: str


class AssetRiskResponse(BaseModel):
    asset_id: int
    asset_name: str
    asset_type: str
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    health_score: float
    health_category: str
    predictions: Dict[str, WindowPrediction]
    explanation: str
    contributing_factors: List[str]
    recommended_action: str
    target_department: Optional[str] = None
    calculated_at: datetime


class WardRiskMetrics(BaseModel):
    total_active_complaints: int
    complaints_last_7d: int
    velocity_growth_percentage: float
    high_severity_percentage: float
    active_hotspot_count: int
    total_assets_count: int
    at_risk_assets_count: int
    average_asset_health: float
    predicted_failures_30d: int


class WardRiskResponse(BaseModel):
    ward_id: int
    ward_name: str
    ward_risk_score: float
    risk_level: str
    requires_preventive_intervention: bool
    metrics: WardRiskMetrics
    at_risk_assets: List[Dict[str, Any]]
    recommendation: str


class PredictiveMaintenanceRecommendationResponse(BaseModel):
    asset_id: int
    asset_name: str
    asset_type: str
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    latitude: float
    longitude: float
    health_score: float
    health_category: str
    risk_score: float
    risk_percentage: float
    risk_level: str
    recommended_action: str
    suggested_urgency: str
    department_id: Optional[int] = None
    department_name: str
    recommended_crew_id: Optional[int] = None
    recommended_crew_name: Optional[str] = None
    primary_contributing_factors: List[str]
    narrative_explanation: str


class PreventiveMaintenanceOrderCreate(BaseModel):
    infrastructure_id: int
    department_id: int
    crew_id: Optional[int] = None
    priority: Optional[str] = "HIGH"
    recommended_action: str
    notes: Optional[str] = None
    target_completion_date: Optional[datetime] = None


class PreventiveMaintenanceOrderStatusUpdate(BaseModel):
    status: str = Field(..., description="ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED")
    completion_notes: Optional[str] = None
    completed_by: Optional[str] = None


class PreventiveMaintenanceOrderResponse(BaseModel):
    id: int
    order_code: str
    infrastructure_id: int
    asset_name: str
    asset_type: str
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    department_id: int
    department_name: str
    crew_id: Optional[int] = None
    crew_name: Optional[str] = None
    priority: str
    recommended_action: str
    status: str
    assigned_by: str
    notes: Optional[str] = None
    completion_notes: Optional[str] = None
    completed_by: Optional[str] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
