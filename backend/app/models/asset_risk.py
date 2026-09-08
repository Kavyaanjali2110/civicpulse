from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssetRiskPrediction(Base):
    """Predictive failure risk forecast for an infrastructure asset over a specified time horizon."""
    __tablename__ = "asset_risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    infrastructure_id = Column(Integer, ForeignKey("infrastructure_assets.id"), nullable=False, index=True)
    
    risk_score = Column(Float, nullable=False, index=True)  # 0.0 to 1.0 probability
    risk_percentage = Column(Float, nullable=False)  # 0.0 to 100.0%
    risk_level = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    
    prediction_window_days = Column(Integer, nullable=False, index=True)  # 7, 14, or 30 days
    predicted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    explanation = Column(Text, nullable=False)  # Human-readable XAI summary
    contributing_factors = Column(JSON, nullable=True)  # List of primary risk factors
    model_version = Column(String(50), default="v1.0-calibrated-hazard", nullable=False)

    # Relationships
    asset = relationship("InfrastructureAsset", back_populates="risk_predictions")
    preventive_orders = relationship("PreventiveMaintenanceOrder", back_populates="risk_prediction")

    def __repr__(self):
        return f"<AssetRiskPrediction(asset_id={self.infrastructure_id}, window={self.prediction_window_days}d, risk='{self.risk_level}')>"
