from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.department import DepartmentResponse


class FieldCrewBase(BaseModel):
    name: str
    department_id: int
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    crew_leader: str
    contact_number: Optional[str] = None
    active: bool = True
    current_status: str = "AVAILABLE"  # AVAILABLE, ON_DUTY, OFF_DUTY, BUSY


class FieldCrewCreate(FieldCrewBase):
    pass


class FieldCrewUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    crew_leader: Optional[str] = None
    contact_number: Optional[str] = None
    active: Optional[bool] = None
    current_status: Optional[str] = None


class FieldCrewResponse(FieldCrewBase):
    id: int
    created_at: datetime
    department: Optional[DepartmentResponse] = None
    active_assignments_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
