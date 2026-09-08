from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    complaint_id: int
    citizen_identifier: Optional[str] = None
    channel: str
    event_type: str
    message: str
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationCreate(BaseModel):
    complaint_id: int
    citizen_identifier: Optional[str] = None
    channel: str
    event_type: str
    message: str
    status: str = "SENT"
