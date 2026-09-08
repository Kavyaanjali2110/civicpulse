from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class PreventiveMaintenanceOrder(Base):
    """Proactive maintenance order dispatched to municipal crews based on predictive failure forecasting."""
    __tablename__ = "preventive_maintenance_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(30), unique=True, index=True, nullable=False)  # e.g., PM-2026-001
    
    infrastructure_id = Column(Integer, ForeignKey("infrastructure_assets.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    crew_id = Column(Integer, ForeignKey("field_crews.id"), nullable=True, index=True)
    risk_prediction_id = Column(Integer, ForeignKey("asset_risk_predictions.id"), nullable=True, index=True)
    
    priority = Column(String(20), default="HIGH", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    recommended_action = Column(Text, nullable=False)
    status = Column(String(30), default="ASSIGNED", nullable=False, index=True)  # ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED
    
    assigned_by = Column(String(100), default="Predictive Intelligence Dispatch", nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    target_completion_date = Column(DateTime, nullable=True)
    
    notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    completed_by = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    accepted_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    asset = relationship("InfrastructureAsset", back_populates="preventive_orders")
    department = relationship("Department")
    crew = relationship("FieldCrew")
    risk_prediction = relationship("AssetRiskPrediction", back_populates="preventive_orders")

    def __repr__(self):
        return f"<PreventiveMaintenanceOrder(code='{self.order_code}', asset_id={self.infrastructure_id}, status='{self.status}')>"
