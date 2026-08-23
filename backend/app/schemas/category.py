from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    default_sla_hours: int = 48
    criticality_weight: float = 1.0
    icon: Optional[str] = "alert-circle"


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
