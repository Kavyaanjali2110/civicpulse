from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssetHealthSnapshot(Base):
    """Snapshot of Asset Health Index (AHI) and its constituent factor scores."""
    __tablename__ = "asset_health_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    infrastructure_id = Column(Integer, ForeignKey("infrastructure_assets.id"), nullable=False, index=True)
    
    health_score = Column(Float, nullable=False, index=True)  # 0.0 (Healthy) to 100.0 (Critical)
    health_category = Column(String(30), nullable=False, index=True)  # HEALTHY, MONITORED, AT_RISK, CRITICAL
    
    complaint_frequency_score = Column(Float, default=0.0, nullable=False)
    severity_score = Column(Float, default=0.0, nullable=False)
    recurrence_score = Column(Float, default=0.0, nullable=False)
    hotspot_score = Column(Float, default=0.0, nullable=False)
    age_score = Column(Float, default=0.0, nullable=False)
    maintenance_overdue_score = Column(Float, default=0.0, nullable=False)
    
    historical_complaint_count = Column(Integer, default=0, nullable=False)
    recent_complaints_14d = Column(Integer, default=0, nullable=False)
    active_hotspot_detected = Column(String(50), nullable=True)
    
    contributing_factors = Column(JSON, nullable=True)  # Detailed breakdown dictionary
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    asset = relationship("InfrastructureAsset", back_populates="health_snapshots")

    def __repr__(self):
        return f"<AssetHealthSnapshot(asset_id={self.infrastructure_id}, score={self.health_score}, category='{self.health_category}')>"
