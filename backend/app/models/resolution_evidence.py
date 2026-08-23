from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class ResolutionEvidence(Base):
    __tablename__ = "resolution_evidences"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    uploaded_by = Column(String(100), default="Field Crew", nullable=False)
    before_photo = Column(String(500), nullable=True)
    after_photo = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="resolution_evidences")

    def __repr__(self):
        return f"<ResolutionEvidence(complaint_id={self.complaint_id}, uploaded_by='{self.uploaded_by}')>"
