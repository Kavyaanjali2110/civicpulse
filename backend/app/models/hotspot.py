from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class HotspotCluster(Base):
    __tablename__ = "hotspot_clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_code = Column(String(50), unique=True, index=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    centroid_lat = Column(Float, nullable=False)
    centroid_lon = Column(Float, nullable=False)
    radius_meters = Column(Float, default=250.0, nullable=False)
    ward_id = Column(Integer, nullable=True, index=True)
    ward_name = Column(String(80), nullable=True)
    complaint_count = Column(Integer, default=1, nullable=False)
    avg_severity = Column(Float, default=0.5, nullable=False)
    aggregate_priority_score = Column(Float, default=50.0, nullable=False, index=True)
    status = Column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, MONITORING, DISPATCHED, RESOLVED
    ai_summary = Column(Text, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    category = relationship("Category", back_populates="hotspots")
    complaints = relationship("Complaint", back_populates="cluster")

    def __repr__(self):
        return f"<HotspotCluster(code='{self.cluster_code}', count={self.complaint_count}, score={self.aggregate_priority_score})>"
