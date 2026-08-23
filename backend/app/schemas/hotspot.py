from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.category import CategoryResponse


class HotspotClusterBase(BaseModel):
    cluster_code: str
    category_id: int
    centroid_lat: float
    centroid_lon: float
    radius_meters: float = 250.0
    complaint_count: int = 1
    avg_severity: float = 0.5
    aggregate_priority_score: float = 50.0
    status: str = "ACTIVE"
    ai_summary: Optional[str] = None
    ai_recommendation: Optional[str] = None


class HotspotClusterCreate(HotspotClusterBase):
    pass


class HotspotClusterResponse(HotspotClusterBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)
