from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogBase(BaseModel):
    complaint_id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by: str = "System"
    notes: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogResponse(AuditLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
