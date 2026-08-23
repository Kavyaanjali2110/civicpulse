from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    crews_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
