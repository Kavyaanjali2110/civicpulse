from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class CitizenFeedback(Base):
    __tablename__ = "citizen_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True, nullable=False, index=True)
    citizen_id = Column(String(100), nullable=True)
    citizen_name = Column(String(100), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 to 5
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="citizen_feedback")

    def __repr__(self):
        return f"<CitizenFeedback(complaint_id={self.complaint_id}, rating={self.rating})>"
