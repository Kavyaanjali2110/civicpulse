import math
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.services.infrastructure_service import infrastructure_service


class PriorityEngine:
    """Calculates the dynamic Infrastructure Priority Score (IPS) for complaints and hotspots."""

    @classmethod
    def calculate_ips(
        cls,
        severity_score: float,
        latitude: float,
        longitude: float,
        cluster_complaint_count: int = 1,
        created_at: Optional[datetime] = None,
        trend_spike_z: float = 0.0,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Calculates multi-attribute Infrastructure Priority Score from 0.0 to 100.0.
        
        Formula:
        IPS = 40 * Severity + 25 * log2(1 + Count) / log2(1 + 10)
            + 25 * InfraWeight + 5 * AgeDays / 14 + 5 * SpikeFactor
        """
        # 1. Severity component (0 - 40 pts)
        sev_component = 40.0 * max(0.0, min(1.0, severity_score))

        # 2. Recurring cluster volume component (0 - 25 pts)
        count = max(1, cluster_complaint_count)
        cluster_component = 25.0 * (math.log2(1 + min(10, count)) / math.log2(1 + 10))

        # 3. Critical Infrastructure Proximity component (0 - 25 pts)
        infra_component = 0.0
        nearest_asset_info = None

        if db:
            nearby = infrastructure_service.find_nearby_assets(
                db, latitude, longitude, max_radius_meters=700.0
            )
            if nearby:
                asset, dist = nearby[0]
                prox_factor = math.exp(-dist / 350.0)
                norm_vuln = min(1.0, asset.vulnerability_weight / 3.0)
                infra_component = 25.0 * norm_vuln * prox_factor
                nearest_asset_info = {
                    "asset_name": asset.name,
                    "asset_type": asset.asset_type,
                    "distance_meters": round(dist, 1)
                }

        # 4. Age/Starvation prevention component (0 - 5 pts)
        age_component = 0.0
        if created_at:
            now = datetime.now(timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            days_pending = max(0.0, (now - created_at).total_seconds() / 86400.0)
            age_component = 5.0 * min(1.0, days_pending / 14.0)

        # 5. Trend / Surge component (0 - 5 pts)
        trend_component = 5.0 * max(0.0, min(1.0, trend_spike_z / 3.0))

        raw_total = sev_component + cluster_component + infra_component + age_component + trend_component
        final_ips = round(max(5.0, min(100.0, raw_total)), 1)

        return {
            "priority_score": final_ips,
            "components": {
                "severity_points": round(sev_component, 1),
                "cluster_volume_points": round(cluster_component, 1),
                "infrastructure_proximity_points": round(infra_component, 1),
                "duration_pending_points": round(age_component, 1),
                "trend_spike_points": round(trend_component, 1),
            },
            "nearest_asset": nearest_asset_info
        }


priority_engine = PriorityEngine()
