from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CitizenFeedbackBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Citizen satisfaction rating between 1 and 5")
    feedback: Optional[str] = None
    citizen_name: Optional[str] = "Citizen"
    citizen_id: Optional[str] = None


class CitizenFeedbackCreate(CitizenFeedbackBase):
    pass


class CitizenFeedbackResponse(CitizenFeedbackBase):
    id: int
    complaint_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
