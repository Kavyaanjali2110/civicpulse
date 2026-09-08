import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.infrastructure import InfrastructureAsset
from app.ai.predictive.health_index_engine import asset_health_engine


class FailureForecastingEngine:
    """Estimates failure probabilities across 7, 14, and 30-day prediction windows."""

    MODEL_VERSION = "v1.2-calibrated-hazard"
    PREDICTION_WINDOWS = [7, 14, 30]

    @classmethod
    def categorize_risk(cls, risk_score: float) -> str:
        """Categorizes failure probability into operational severity tiers."""
        if risk_score < 0.25:
            return "LOW"
        elif risk_score < 0.50:
            return "MEDIUM"
        elif risk_score < 0.75:
            return "HIGH"
        else:
            return "CRITICAL"

    @classmethod
    def forecast_risk_for_window(
        cls,
        health_score: float,
        recent_14d_complaints: int,
        days_since_maint: int,
        is_hotspot: bool,
        vulnerability_weight: float,
        window_days: int
    ) -> Dict[str, Any]:
        """Calculates reproducible failure risk for a specific forecast window (7, 14, or 30 days)."""
        # Baseline hazard intensity driven by asset health index (0 to 100)
        norm_health = max(0.0, min(100.0, health_score)) / 100.0
        
        # Velocity multiplier (rapid influx of grievances accelerates failure risk)
        velocity_factor = 1.0 + min(1.5, (recent_14d_complaints / 4.0) * 0.5)
        
        # Hotspot penalty
        hotspot_factor = 1.35 if is_hotspot else 1.0
        
        # Overdue maintenance acceleration
        maint_factor = 1.0 + min(0.6, max(0.0, (days_since_maint - 180) / 180.0) * 0.6)
        
        # Vulnerability weighting
        vuln_factor = 1.0 + (min(3.0, vulnerability_weight) - 1.0) * 0.15

        # Combined hazard rate lambda
        hazard_intensity = (
            (0.65 * norm_health + 0.35 * (norm_health ** 2))
            * velocity_factor
            * hotspot_factor
            * maint_factor
            * vuln_factor
        )

        # Time-window progression: cumulative risk over horizon T days
        # We use a Weibull/exponential hazard accumulation where horizon scaling reflects progressive wear
        time_ratio = float(window_days) / 30.0
        exponent = -1.25 * hazard_intensity * (time_ratio ** 0.82)
        failure_prob = 1.0 - math.exp(exponent)
        
        # Bound strictly between 0.02 and 0.98
        bounded_risk = max(0.02, min(0.98, failure_prob))
        risk_percentage = round(bounded_risk * 100.0, 1)
        risk_level = cls.categorize_risk(bounded_risk)

        return {
            "prediction_window_days": window_days,
            "risk_score": round(bounded_risk, 4),
            "risk_percentage": risk_percentage,
            "risk_level": risk_level,
            "model_version": cls.MODEL_VERSION
        }

    @classmethod
    def predict_asset_risks(
        cls,
        db: Session,
        asset: InfrastructureAsset,
        now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Runs health analysis and generates failure probability forecasts for 7, 14, and 30-day horizons."""
        health_data = asset_health_engine.calculate_asset_health(db, asset, now=now)
        
        h_score = health_data["health_score"]
        rec_14d = health_data["metrics"]["recent_complaints_14d"]
        days_maint = health_data["metrics"]["days_since_maintenance"]
        is_hs = health_data["metrics"]["active_hotspot_code"] is not None
        vuln = asset.vulnerability_weight or 1.5

        predictions = {}
        for w in cls.PREDICTION_WINDOWS:
            pred = cls.forecast_risk_for_window(
                health_score=h_score,
                recent_14d_complaints=rec_14d,
                days_since_maint=days_maint,
                is_hotspot=is_hs,
                vulnerability_weight=vuln,
                window_days=w
            )
            predictions[f"{w}_days"] = pred

        return {
            "asset_id": asset.id,
            "asset_name": asset.name,
            "asset_type": asset.asset_type,
            "ward_id": asset.ward_id,
            "ward_name": asset.ward_name,
            "health_score": h_score,
            "health_category": health_data["health_category"],
            "metrics": health_data["metrics"],
            "contributing_factors": health_data["contributing_factors"],
            "predictions": predictions,
            "calculated_at": health_data["calculated_at"]
        }


failure_forecasting_engine = FailureForecastingEngine()
