from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    citizen_identifier = Column(String(100), nullable=True, index=True)  # phone number or citizen identifier
    channel = Column(String(20), nullable=False, index=True)  # WEB, WHATSAPP, SMS, WEBHOOK
    event_type = Column(String(50), nullable=False, index=True)  # COMPLAINT_RECEIVED, AI_ANALYZED, ASSIGNED, INVESTIGATING, IN_PROGRESS, RESOLVED, FEEDBACK_REQUEST
    message = Column(Text, nullable=False)
    status = Column(String(20), default="SENT", nullable=False, index=True)  # PENDING, SENT, FAILED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    # Relationships
    complaint = relationship("Complaint", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, complaint_id={self.complaint_id}, event='{self.event_type}', channel='{self.channel}', status='{self.status}')>"
