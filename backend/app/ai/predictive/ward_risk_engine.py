from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.complaint import Complaint
from app.models.hotspot import HotspotCluster
from app.models.infrastructure import InfrastructureAsset
from app.ai.predictive.health_index_engine import asset_health_engine
from app.ai.predictive.failure_forecasting_engine import failure_forecasting_engine
from app.utils.ward_resolver import get_ward, WARD_LIST


class WardRiskEngine:
    """Calculates spatial infrastructure vulnerability and risk index across municipal wards."""

    @classmethod
    def categorize_ward_risk(cls, score: float) -> str:
        """Classifies ward risk into operational tiers."""
        if score < 25.0:
            return "LOW"
        elif score < 50.0:
            return "MEDIUM"
        elif score < 75.0:
            return "HIGH"
        else:
            return "CRITICAL"

    @classmethod
    def analyze_ward_risks(cls, db: Session, now: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Analyzes complaint telemetry and infrastructure health across all municipal wards."""
        now = now or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)

        ward_results = []

        for ward_entry in WARD_LIST:
            ward_id = ward_entry["ward_id"]
            ward_name = ward_entry["ward_name"]

            # 1. Complaint metrics
            complaints_q = db.query(Complaint).filter(Complaint.ward_id == ward_id)
            active_complaints = complaints_q.filter(Complaint.status != "RESOLVED").all()
            total_active = len(active_complaints)

            complaints_7d = [
                c for c in active_complaints 
                if (c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at) >= seven_days_ago
            ]
            count_7d = len(complaints_7d)

            complaints_prev_7d = [
                c for c in active_complaints
                if fourteen_days_ago <= (c.created_at.replace(tzinfo=timezone.utc) if c.created_at.tzinfo is None else c.created_at) < seven_days_ago
            ]
            count_prev_7d = len(complaints_prev_7d)

            velocity_growth = round(
                ((count_7d - count_prev_7d) / max(1, count_prev_7d)) * 100.0, 1
            )

            # High severity ratio
            high_sev = [c for c in active_complaints if c.severity_score >= 0.70]
            high_sev_pct = round((len(high_sev) / max(1, total_active)) * 100.0, 1)

            # 2. Hotspots located in ward
            hotspots = db.query(HotspotCluster).filter(
                HotspotCluster.status == "ACTIVE"
            ).all()
            
            ward_hotspots = []
            for h in hotspots:
                h_w_id, _ = get_ward(h.centroid_lat, h.centroid_lon)
                if h_w_id == ward_id:
                    ward_hotspots.append(h)
            hotspot_count = len(ward_hotspots)


            # 3. Infrastructure assets in ward
            assets = db.query(InfrastructureAsset).filter(
                (InfrastructureAsset.ward_id == ward_id) |
                (InfrastructureAsset.ward_name.ilike(f"%Ward {ward_id}%"))
            ).all()

            asset_healths = []
            at_risk_assets = []
            predicted_failures_30d = 0

            for asset in assets:
                forecast = failure_forecasting_engine.predict_asset_risks(db, asset, now=now)
                h_score = forecast["health_score"]
                asset_healths.append(h_score)
                
                if forecast["health_category"] in ["AT_RISK", "CRITICAL"]:
                    at_risk_assets.append({
                        "id": asset.id,
                        "name": asset.name,
                        "type": asset.asset_type,
                        "health_score": h_score,
                        "health_category": forecast["health_category"],
                        "risk_30d_pct": forecast["predictions"]["30_days"]["risk_percentage"]
                    })
                
                if forecast["predictions"]["30_days"]["risk_score"] >= 0.50:
                    predicted_failures_30d += 1

            avg_health = round(sum(asset_healths) / len(asset_healths), 1) if asset_healths else 30.0

            # -------------------------------------------------------------
            # WARD RISK SCORE (0 to 100)
            # -------------------------------------------------------------
            # (a) Asset vulnerability factor (0 - 35 pts)
            asset_factor = (avg_health / 100.0) * 25.0 + min(10.0, len(at_risk_assets) * 4.0)

            # (b) Complaint velocity factor (0 - 25 pts)
            vel_factor = min(25.0, (count_7d / 5.0) * 18.0 + (max(0.0, velocity_growth) / 100.0) * 7.0)

            # (c) High-severity ratio factor (0 - 20 pts)
            sev_factor = (high_sev_pct / 100.0) * 20.0

            # (d) Hotspot factor (0 - 20 pts)
            hotspot_factor = min(20.0, hotspot_count * 10.0)

            raw_ward_risk = asset_factor + vel_factor + sev_factor + hotspot_factor
            final_ward_risk = round(min(100.0, max(5.0, raw_ward_risk)), 1)
            risk_tier = cls.categorize_ward_risk(final_ward_risk)
            requires_intervention = final_ward_risk >= 50.0 or len(at_risk_assets) > 0

            ward_results.append({
                "ward_id": ward_id,
                "ward_name": ward_name,
                "ward_risk_score": final_ward_risk,
                "risk_level": risk_tier,
                "requires_preventive_intervention": requires_intervention,
                "metrics": {
                    "total_active_complaints": total_active,
                    "complaints_last_7d": count_7d,
                    "velocity_growth_percentage": velocity_growth,
                    "high_severity_percentage": high_sev_pct,
                    "active_hotspot_count": hotspot_count,
                    "total_assets_count": len(assets),
                    "at_risk_assets_count": len(at_risk_assets),
                    "average_asset_health": avg_health,
                    "predicted_failures_30d": predicted_failures_30d
                },
                "at_risk_assets": at_risk_assets,
                "recommendation": (
                    f"Deploy preventive engineering inspection in {ward_name}. "
                    f"{len(at_risk_assets)} asset(s) degrading with {count_7d} complaints in 7 days."
                    if requires_intervention else
                    f"{ward_name} telemetry is stable. Maintain standard routine patrol schedule."
                )
            })

        # Sort by ward_risk_score descending
        ward_results.sort(key=lambda x: x["ward_risk_score"], reverse=True)
        return ward_results


ward_risk_engine = WardRiskEngine()
