from typing import Dict, Any, List, Optional


class XAIEngine:
    """Explainable AI (XAI) and recommendation generator for municipal engineers."""

    DISPATCH_TEMPLATES = {
        "WATER": {
            "CRITICAL": "URGENT DISPATCH: Send Rapid Pipeline Isolation Squad to close isolation valve and deploy water tanker backup.",
            "HIGH": "PRIORITY ACTION: Deploy leak detection crew with acoustic sensors to locate pipe fracture within 12 hours.",
            "MEDIUM": "MAINTENANCE: Schedule valve inspection and pressure equalization during standard shift.",
            "LOW": "MONITOR: Log in regular plumbing maintenance queue."
        },
        "ELECTRICITY": {
            "CRITICAL": "EMERGENCY SAFETY DISPATCH: Immediately de-energize feeder line. Dispatch high-voltage lineman squad with safety cordon.",
            "HIGH": "PRIORITY ACTION: Dispatch substation crew to replace damaged transformer fuse and test phase balance.",
            "MEDIUM": "MAINTENANCE: Schedule streetlight bulb and relay replacement within 24 hours.",
            "LOW": "MONITOR: Routine pole inspection."
        },
        "ROADS": {
            "CRITICAL": "IMMEDIATE HAZARD: Place reflective warning barricades around cave-in. Mobilize rapid cold-mix asphalt repair team.",
            "HIGH": "PRIORITY ACTION: Patch high-traffic crater during off-peak hours (11 PM - 4 AM) to prevent vehicular accidents.",
            "MEDIUM": "MAINTENANCE: Queue for weekly road resurfacing and speed breaker repainting.",
            "LOW": "MONITOR: Log in annual paving review."
        },
        "SEWAGE": {
            "CRITICAL": "BIOHAZARD EMERGENCY: Secure open chamber immediately with reinforced iron cover. Dispatch suction jetting tanker.",
            "HIGH": "PRIORITY ACTION: Clear blocked main sewer trunk with hydro-jetter to prevent backflow into basements.",
            "MEDIUM": "MAINTENANCE: Desilt storm water channel before upcoming monsoon forecast.",
            "LOW": "MONITOR: Routine gutter sweeping."
        },
        "SAFETY": {
            "CRITICAL": "PUBLIC SAFETY RISK: Coordinate with Traffic Police to divert vehicles. Deploy tree/structure clearing crane team.",
            "HIGH": "PRIORITY ACTION: Reset and recalibrate traffic signal controller at junction within 4 hours.",
            "MEDIUM": "MAINTENANCE: Repair pedestrian railing and paint cautionary road markings.",
            "LOW": "MONITOR: General safety audit."
        },
        "WASTE": {
            "CRITICAL": "HEALTH HAZARD: Dispatch heavy compactor truck and apply disinfectant spray over public alley.",
            "HIGH": "PRIORITY ACTION: Clear overflowing community bins and increase collection frequency to twice daily.",
            "MEDIUM": "MAINTENANCE: Remove construction debris and post illegal dumping penalty signage.",
            "LOW": "MONITOR: Regular sanitation route."
        }
    }

    @classmethod
    def generate_explanation(
        cls,
        category_code: str,
        severity_score: float,
        severity_level: str,
        priority_score: float,
        cluster_count: int,
        nearest_asset_name: Optional[str] = None,
        nearest_distance_m: Optional[float] = None,
        urgency_keywords: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Generates clear, explainable feature attributions and tactical dispatch recommendations."""
        category_code = (category_code or "ROADS").upper()
        severity_level = (severity_level or "MEDIUM").upper()

        # Build human-readable rationale bullet points
        reasons = []

        # 1. Cluster volume reasoning
        if cluster_count > 1:
            reasons.append(f"Recurring Issue: Aggregated {cluster_count} citizen complaints within localized zone.")
        else:
            reasons.append("Isolated Citizen Report: Single incident recorded.")

        # 2. Critical asset proximity reasoning
        if nearest_asset_name and nearest_distance_m is not None:
            if nearest_distance_m <= 300:
                reasons.append(
                    f"High Asset Sensitivity: Located only {int(nearest_distance_m)}m from {nearest_asset_name}."
                )
            elif nearest_distance_m <= 600:
                reasons.append(
                    f"Asset Proximity: Within {int(nearest_distance_m)}m buffer of {nearest_asset_name}."
                )

        # 3. Urgency keywords
        if urgency_keywords and len(urgency_keywords) > 0:
            reasons.append(f"Hazard Keywords Detected: [{', '.join(urgency_keywords[:3])}].")

        # 4. Severity rationale
        reasons.append(f"Severity Assessment: Evaluated at {int(severity_score * 100)}% ({severity_level} hazard rating).")

        # Select tactical action recommendation
        cat_rec = cls.DISPATCH_TEMPLATES.get(category_code, cls.DISPATCH_TEMPLATES["ROADS"])
        action_plan = cat_rec.get(severity_level, cat_rec["MEDIUM"])

        # Determine population impact
        if priority_score >= 85 or (cluster_count >= 5 and severity_score >= 0.75):
            impact = "HIGH"
        elif priority_score >= 65 or cluster_count >= 3:
            impact = "MEDIUM"
        else:
            impact = "LOCALIZED"

        return {
            "priority_score": priority_score,
            "severity_level": severity_level,
            "estimated_population_impact": impact,
            "primary_contributing_factors": reasons,
            "tactical_action_plan": action_plan,
            "sla_recommendation": "Immediate (4-12 hours)" if severity_level == "CRITICAL" else ("Within 24 hours" if severity_level == "HIGH" else "Standard (48 hours)")
        }


xai_engine = XAIEngine()
