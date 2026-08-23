from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class FieldCrew(Base):
    __tablename__ = "field_crews"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    ward_id = Column(Integer, nullable=True, index=True)
    ward_name = Column(String(80), nullable=True)
    crew_leader = Column(String(100), nullable=False)
    contact_number = Column(String(50), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    current_status = Column(String(30), default="AVAILABLE", nullable=False)  # AVAILABLE, ON_DUTY, OFF_DUTY, BUSY
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    department = relationship("Department", back_populates="crews")
    assignments = relationship("CrewAssignment", back_populates="crew", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FieldCrew(name='{self.name}', department_id={self.department_id}, status='{self.current_status}')>"
