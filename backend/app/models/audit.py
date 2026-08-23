from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(String(100), default="System", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(complaint_id={self.complaint_id}, {self.previous_status} -> {self.new_status})>"
