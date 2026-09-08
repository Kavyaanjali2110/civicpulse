import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.infrastructure import InfrastructureAsset
from app.models.complaint import Complaint
from app.models.hotspot import HotspotCluster
from app.services.infrastructure_service import infrastructure_service


class AssetHealthIndexEngine:
    """Computes transparent Asset Health Index (AHI) from 0 (Healthy) to 100 (Critical)."""

    DEFAULT_WEIGHTS = {
        "frequency": 0.25,           # Recent complaints in impact radius (past 14 days)
        "severity": 0.20,            # Average severity of nearby complaints
        "recurrence": 0.15,          # Total historical complaints associated with zone
        "hotspot": 0.15,             # Active DBSCAN cluster proximity
        "age": 0.10,                 # Asset age relative to design lifespan
        "maintenance_overdue": 0.15  # Elapsed duration since last maintenance
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS

    def set_weights(self, weights: Dict[str, float]) -> None:
        """Configures custom weights dynamically."""
        total = sum(weights.values())
        if total <= 0:
            raise ValueError("Total weights must be strictly positive.")
        # Normalize weights to sum to 1.0
        self.weights = {k: v / total for k, v in weights.items()}

    def categorize_health(self, health_score: float) -> str:
        """Maps health score (0-100) to standardized tier."""
        if health_score < 25.0:
            return "HEALTHY"
        elif health_score < 50.0:
            return "MONITORED"
        elif health_score < 75.0:
            return "AT_RISK"
        else:
            return "CRITICAL"

    def calculate_asset_health(
        self,
        db: Session,
        asset: InfrastructureAsset,
        now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Calculates multi-attribute health index and factor attributions for an asset."""
        now = now or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        fourteen_days_ago = now - timedelta(days=14)
        current_year = now.year

        # 1. Gather all nearby complaints within asset's impact radius
        radius = asset.impact_radius_meters or 500.0
        all_complaints = db.query(Complaint).all()
        
        nearby_complaints = []
        recent_14d_complaints = []
        severities = []
        priority_scores = []

        for c in all_complaints:
            if c.latitude is None or c.longitude is None:
                continue
            dist = infrastructure_service.calculate_distance_meters(
                asset.latitude, asset.longitude, c.latitude, c.longitude
            )
            if dist <= radius:
                nearby_complaints.append(c)
                severities.append(c.severity_score)
                priority_scores.append(c.priority_score)
                
                c_time = c.created_at
                if c_time.tzinfo is None:
                    c_time = c_time.replace(tzinfo=timezone.utc)
                if c_time >= fourteen_days_ago:
                    recent_14d_complaints.append(c)

        # 2. Check active hotspot proximity
        active_hotspots = db.query(HotspotCluster).filter(HotspotCluster.status == "ACTIVE").all()
        nearest_hotspot = None
        min_hotspot_dist = float("inf")
        for h in active_hotspots:
            h_dist = infrastructure_service.calculate_distance_meters(
                asset.latitude, asset.longitude, h.centroid_lat, h.centroid_lon
            )
            if h_dist < min_hotspot_dist:
                min_hotspot_dist = h_dist
                nearest_hotspot = h

        # -------------------------------------------------------------
        # COMPONENT SCORING (Each normalized 0.0 - 100.0)
        # -------------------------------------------------------------
        
        # (a) Recent Complaint Frequency (past 14 days)
        count_14d = len(recent_14d_complaints)
        frequency_score = min(100.0, (count_14d / 6.0) * 100.0)

        # (b) Severity Score
        if severities:
            avg_severity = sum(severities) / len(severities)
            severity_score = min(100.0, avg_severity * 100.0)
        else:
            avg_severity = 0.15
            severity_score = 15.0

        # (c) Recurrence Score (Total historical volume)
        total_nearby = len(nearby_complaints)
        recurrence_score = min(100.0, (total_nearby / 12.0) * 100.0)

        # (d) Hotspot Score
        hotspot_detected_name = None
        if nearest_hotspot and min_hotspot_dist <= (radius + (nearest_hotspot.radius_meters or 200.0)):
            hotspot_score = 100.0 if min_hotspot_dist <= radius else 60.0
            hotspot_detected_name = nearest_hotspot.cluster_code
        else:
            hotspot_score = 0.0

        # (e) Asset Age Score
        install_year = asset.installation_year or (current_year - 5)
        lifespan = asset.expected_lifespan_years or 25
        age_years = max(0, current_year - install_year)
        age_score = min(100.0, (age_years / float(lifespan)) * 100.0)

        # (f) Maintenance Overdue Score
        days_since_maint = 90  # default baseline if unknown
        if asset.last_maintenance_date:
            m_date = asset.last_maintenance_date
            if m_date.tzinfo is None:
                m_date = m_date.replace(tzinfo=timezone.utc)
            days_since_maint = max(0, (now - m_date).days)

        # Standard municipal maintenance cycle is 180 days (6 months)
        if days_since_maint <= 60:
            maint_score = 10.0
        elif days_since_maint <= 180:
            maint_score = 35.0
        elif days_since_maint <= 270:
            maint_score = 70.0
        else:
            maint_score = 100.0

        # -------------------------------------------------------------
        # COMPOSITE WEIGHTED SUM
        # -------------------------------------------------------------
        raw_health = (
            self.weights["frequency"] * frequency_score +
            self.weights["severity"] * severity_score +
            self.weights["recurrence"] * recurrence_score +
            self.weights["hotspot"] * hotspot_score +
            self.weights["age"] * age_score +
            self.weights["maintenance_overdue"] * maint_score
        )

        # Scale by asset vulnerability weight (e.g. 1.0 to 1.3 bonus for high vulnerability assets like hospitals/water)
        vuln_mult = 1.0 + (min(3.0, asset.vulnerability_weight) - 1.0) * 0.1
        adjusted_score = min(100.0, max(0.0, raw_health * vuln_mult))
        final_health_score = round(adjusted_score, 1)
        category = self.categorize_health(final_health_score)

        return {
            "asset_id": asset.id,
            "asset_name": asset.name,
            "asset_type": asset.asset_type,
            "ward_id": asset.ward_id,
            "ward_name": asset.ward_name,
            "health_score": final_health_score,
            "health_category": category,
            "component_scores": {
                "complaint_frequency_score": round(frequency_score, 1),
                "severity_score": round(severity_score, 1),
                "recurrence_score": round(recurrence_score, 1),
                "hotspot_score": round(hotspot_score, 1),
                "age_score": round(age_score, 1),
                "maintenance_overdue_score": round(maint_score, 1)
            },
            "metrics": {
                "age_years": age_years,
                "days_since_maintenance": days_since_maint,
                "recent_complaints_14d": count_14d,
                "total_historical_complaints": total_nearby,
                "average_severity": round(avg_severity, 2),
                "average_priority_score": round(sum(priority_scores) / len(priority_scores), 1) if priority_scores else 40.0,
                "active_hotspot_code": hotspot_detected_name,
                "hotspot_distance_m": round(min_hotspot_dist, 1) if nearest_hotspot else None
            },
            "contributing_factors": [
                f"{count_14d} recent complaints within 14 days",
                f"Average nearby severity: {round(avg_severity, 2)}",
                f"Asset age: {age_years} years (design life: {lifespan}y)",
                f"Elapsed time since maintenance: {days_since_maint} days",
                *( [f"Inside active DBSCAN cluster {hotspot_detected_name}"] if hotspot_detected_name else [] )
            ],
            "calculated_at": now.isoformat()
        }


asset_health_engine = AssetHealthIndexEngine()
