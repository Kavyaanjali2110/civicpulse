from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CrewAssignment(Base):
    __tablename__ = "crew_assignments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    crew_id = Column(Integer, ForeignKey("field_crews.id"), nullable=False, index=True)
    assigned_by = Column(String(100), default="Municipal Dispatch", nullable=False)
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    assignment_status = Column(String(30), default="ASSIGNED", nullable=False, index=True)  # ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED
    notes = Column(Text, nullable=True)

    # Relationships
    complaint = relationship("Complaint", back_populates="crew_assignments")
    crew = relationship("FieldCrew", back_populates="assignments")

    def __repr__(self):
        return f"<CrewAssignment(complaint_id={self.complaint_id}, crew_id={self.crew_id}, status='{self.assignment_status}')>"
