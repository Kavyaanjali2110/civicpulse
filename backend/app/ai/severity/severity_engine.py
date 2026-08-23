import re
import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.services.infrastructure_service import infrastructure_service


class SeverityEngine:
    """Multi-factor severity and urgency scoring engine for civic complaints."""

    # High-impact critical hazard keywords
    URGENCY_KEYWORDS = {
        "spark": 0.95, "sparking": 0.95, "fire": 0.95, "electrocution": 0.95, "live wire": 0.95,
        "burst": 0.90, "gushing": 0.88, "flooding": 0.88, "sinkhole": 0.92, "cave-in": 0.92,
        "open manhole": 0.90, "missing lid": 0.88, "toxic": 0.85, "collapsed": 0.90,
        "ambulance": 0.90, "hospital": 0.85, "school": 0.85, "children": 0.85, "accident": 0.85,
        "danger": 0.80, "emergency": 0.85, "chispas": 0.95, "fuego": 0.95, "peligro": 0.80,
    }

    # Baseline category severity weights
    CATEGORY_CRITICALITY = {
        "ELECTRICITY": 0.80,
        "SAFETY": 0.75,
        "WATER": 0.70,
        "SEWAGE": 0.68,
        "ROADS": 0.58,
        "WASTE": 0.45,
    }

    @classmethod
    def calculate_severity(
        cls,
        text: str,
        category_code: str,
        latitude: float,
        longitude: float,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Computes continuous severity score (0.0 - 1.0), discrete severity level, and contributing factors."""
        cleaned_text = (text or "").lower()
        category_code = (category_code or "ROADS").upper()

        # 1. Urgency keyword factor
        matched_keywords = []
        highest_kw_weight = 0.0

        for kw, weight in cls.URGENCY_KEYWORDS.items():
            if re.search(rf"\b{re.escape(kw)}\b", cleaned_text):
                matched_keywords.append(kw)
                if weight > highest_kw_weight:
                    highest_kw_weight = weight

        kw_score = highest_kw_weight if highest_kw_weight > 0 else 0.40

        # 2. Category baseline criticality
        cat_score = cls.CATEGORY_CRITICALITY.get(category_code, 0.50)

        # 3. Critical Infrastructure Proximity Factor
        infra_proximity_score = 0.0
        nearest_asset_name = None
        nearest_distance = None

        if db:
            nearby = infrastructure_service.find_nearby_assets(
                db, latitude, longitude, max_radius_meters=800.0
            )
            if nearby:
                nearest_asset, dist = nearby[0]
                nearest_asset_name = nearest_asset.name
                nearest_distance = round(dist, 1)

                # Exponential decay based on distance: close to 0m = 1.0, 500m = ~0.37
                proximity_multiplier = math.exp(-dist / 400.0)
                infra_proximity_score = min(1.0, (nearest_asset.vulnerability_weight / 3.0) * proximity_multiplier)

        # 4. Multi-factor blended score
        raw_severity = (
            0.40 * kw_score +
            0.30 * cat_score +
            0.30 * (infra_proximity_score if infra_proximity_score > 0 else cat_score * 0.7)
        )

        # Clamp between 0.15 and 0.98
        final_score = round(max(0.15, min(0.98, raw_severity)), 2)

        # Determine discrete severity level
        if final_score >= 0.80:
            level = "CRITICAL"
        elif final_score >= 0.65:
            level = "HIGH"
        elif final_score >= 0.45:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "severity_score": final_score,
            "severity_level": level,
            "matched_urgency_keywords": matched_keywords,
            "nearest_infrastructure": nearest_asset_name,
            "distance_to_infrastructure_m": nearest_distance,
            "proximity_impact": round(infra_proximity_score, 2)
        }


severity_engine = SeverityEngine()
