from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ResolutionEvidenceBase(BaseModel):
    before_photo: Optional[str] = None
    after_photo: str
    description: str
    uploaded_by: str = "Field Crew Officer"


class ResolutionEvidenceCreate(ResolutionEvidenceBase):
    pass


class ResolutionEvidenceResponse(ResolutionEvidenceBase):
    id: int
    complaint_id: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
