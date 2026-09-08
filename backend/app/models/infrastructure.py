from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class InfrastructureAsset(Base):
    __tablename__ = "infrastructure_assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    asset_type = Column(String(50), nullable=False, index=True)  # HOSPITAL, SCHOOL, WATER_FACILITY, etc.
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    ward_id = Column(Integer, nullable=True, index=True)
    ward_name = Column(String(80), nullable=True)
    impact_radius_meters = Column(Float, default=500.0, nullable=False)
    vulnerability_weight = Column(Float, default=1.5, nullable=False)
    description = Column(Text, nullable=True)
    
    # Asset Age & Lifecycle Tracking
    installation_year = Column(Integer, nullable=True, default=2015)
    last_maintenance_date = Column(DateTime, nullable=True)
    last_inspection_date = Column(DateTime, nullable=True)
    expected_lifespan_years = Column(Integer, default=25, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    department = relationship("Department")
    health_snapshots = relationship("AssetHealthSnapshot", back_populates="asset", cascade="all, delete-orphan", order_by="AssetHealthSnapshot.calculated_at.desc()")
    risk_predictions = relationship("AssetRiskPrediction", back_populates="asset", cascade="all, delete-orphan", order_by="AssetRiskPrediction.predicted_at.desc()")
    preventive_orders = relationship("PreventiveMaintenanceOrder", back_populates="asset", cascade="all, delete-orphan", order_by="PreventiveMaintenanceOrder.created_at.desc()")

    def __repr__(self):
        return f"<InfrastructureAsset(name='{self.name}', type='{self.asset_type}', ward={self.ward_id})>"

