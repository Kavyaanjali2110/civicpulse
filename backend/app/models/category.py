from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    default_sla_hours = Column(Integer, default=48, nullable=False)
    criticality_weight = Column(Float, default=1.0, nullable=False)
    icon = Column(String(50), default="alert-circle", nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    complaints = relationship("Complaint", back_populates="category")
    hotspots = relationship("HotspotCluster", back_populates="category")

    def __repr__(self):
        return f"<Category(code='{self.code}', name='{self.name}')>"
