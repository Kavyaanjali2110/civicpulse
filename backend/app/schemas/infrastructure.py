from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InfrastructureAssetBase(BaseModel):
    name: str
    asset_type: str
    latitude: float
    longitude: float
    impact_radius_meters: float = 500.0
    vulnerability_weight: float = 1.5
    description: Optional[str] = None


class InfrastructureAssetCreate(InfrastructureAssetBase):
    pass


class InfrastructureAssetResponse(InfrastructureAssetBase):
    id: int
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
