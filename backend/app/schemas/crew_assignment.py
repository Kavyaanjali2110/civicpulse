from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.field_crew import FieldCrewResponse


class CrewAssignmentBase(BaseModel):
    crew_id: int
    complaint_id: Optional[int] = None
    assigned_by: Optional[str] = "Municipal Dispatch"
    notes: Optional[str] = None


class CrewAssignmentCreate(CrewAssignmentBase):
    pass


class CrewAssignmentAction(BaseModel):
    changed_by: Optional[str] = "Field Crew Officer"
    notes: Optional[str] = None


class CrewAssignmentResponse(BaseModel):
    id: int
    complaint_id: int
    crew_id: int
    assigned_by: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assignment_status: str
    notes: Optional[str] = None
    crew: Optional[FieldCrewResponse] = None

    model_config = ConfigDict(from_attributes=True)
