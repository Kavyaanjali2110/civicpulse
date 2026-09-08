from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.infrastructure import InfrastructureAsset
from app.models.department import Department
from app.models.field_crew import FieldCrew


class PredictiveXAIEngine:
    """Generates transparent, feature-grounded explanations and prescriptive maintenance recommendations."""

    ACTION_TEMPLATES = {
        "WATER_FACILITY": {
            "CRITICAL": "Emergency preventive overhaul: Deploy ultrasonic leak detection squad to test pipeline joints and replace degrading pressure valve seals.",
            "HIGH": "Targeted maintenance: Inspect intake pumps, calibrate pressure equalization chambers, and flush sediment filters.",
            "MEDIUM": "Routine servicing: Inspect valve packing, lubricate gate valves, and verify telemetry sensors."
        },
        "POWER_STATION": {
            "CRITICAL": "High-voltage emergency preventive overhaul: Conduct infrared thermography on transformer coils, test SF6 gas pressure, and service trip breakers.",
            "HIGH": "Substation intervention: Replace degrading feeder arrestors, check oil dielectric breakdown voltage, and balance phase load.",
            "MEDIUM": "Routine servicing: Clear vegetation around substation fence, clean insulator bushings, and test ground resistance."
        },
        "BRIDGE": {
            "CRITICAL": "Structural emergency audit: Perform ultrasonic flaw detection on bearing pads, inspect expansion joints, and clear blocked drainage channels.",
            "HIGH": "Bridge maintenance: Resurface wearing course over piers, inspect structural rebar for spalling, and reinforce crash barriers.",
            "MEDIUM": "Routine bridge check: Clean scuppers, inspect expansion joint sealant, and touch up anti-corrosion coating."
        },
        "HOSPITAL": {
            "CRITICAL": "Life-safety priority: Inspect primary hospital utility conduits, test emergency water backup booster pumps, and secure access corridors.",
            "HIGH": "Hospital infrastructure audit: Pressure test emergency intake water lines and verify electrical feeder redundancy.",
            "MEDIUM": "Routine facility inspection: Check adjacent stormwater drains and perimeter street lighting."
        },
        "SCHOOL": {
            "CRITICAL": "Child safety priority: Immediately replace snapped or exposed electrical cables along perimeter and clear overflowing drains.",
            "HIGH": "School zone safety overhaul: Repair pavement potholes around pedestrian crossings and test storm drainage capacity.",
            "MEDIUM": "Routine safety audit: Repaint pedestrian caution markings and inspect sidewalk curbs."
        },
        "TRANSIT_HUB": {
            "CRITICAL": "Mass transit emergency preventive action: Service high-capacity dewatering pumps in underpass and inspect passenger escalator electrical trunks.",
            "HIGH": "Transit maintenance: Patch high-wear bus terminal asphalt and service multi-bay drainage channels.",
            "MEDIUM": "Routine facility check: Clean concourse gutters and test automated lighting sensors."
        }
    }

    DEPARTMENT_TYPE_MAP = {
        "WATER_FACILITY": "Water Supply & Drainage",
        "POWER_STATION": "Power & Street Lighting",
        "BRIDGE": "Roads & Infrastructure",
        "HOSPITAL": "Public Safety & Emergency",
        "SCHOOL": "Public Works & Safety",
        "TRANSIT_HUB": "Roads & Public Transit"
    }

    @classmethod
    def generate_explanation(
        cls,
        asset: InfrastructureAsset,
        health_data: Dict[str, Any],
        risk_data_30d: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Synthesizes actual feature attributions into a coherent, evidence-based narrative."""
        metrics = health_data.get("metrics", {})
        h_score = health_data.get("health_score", 50.0)
        h_category = health_data.get("health_category", "MONITORED")
        risk_level = risk_data_30d.get("risk_level", "MEDIUM")
        risk_pct = risk_data_30d.get("risk_percentage", 45.0)

        count_14d = metrics.get("recent_complaints_14d", 0)
        total_hist = metrics.get("total_historical_complaints", 0)
        avg_sev = metrics.get("average_severity", 0.5)
        age = metrics.get("age_years", 8)
        days_maint = metrics.get("days_since_maintenance", 90)
        hotspot_code = metrics.get("active_hotspot_code")

        # Build feature attribution list
        factors = []
        factors.append(f"{count_14d} complaints in last 14 days ({total_hist} total historical incidents)")
        factors.append(f"Average incident severity: {avg_sev:.2f} / 1.0")
        factors.append(f"Asset age: {age} years (expected life: {asset.expected_lifespan_years}y)")
        factors.append(f"Time since last maintenance: {days_maint} days")
        if hotspot_code:
            factors.append(f"Active spatial density cluster: {hotspot_code}")

        # Narrative formulation
        reasons_text = []
        if count_14d >= 4:
            reasons_text.append(f"it has received {count_14d} recent citizen grievances within 14 days")
        if avg_sev >= 0.65:
            reasons_text.append(f"nearby incidents reflect elevated severity ({int(avg_sev * 100)}%)")
        if days_maint >= 180:
            reasons_text.append(f"routine maintenance is overdue ({days_maint} days since last servicing)")
        if hotspot_code:
            reasons_text.append(f"it is situated directly within active DBSCAN hotspot {hotspot_code}")
        if age >= 10:
            reasons_text.append(f"structural fatigue due to age ({age} years in operation)")

        if not reasons_text:
            narrative = f"{asset.name} is operating within nominal safety thresholds with stable diagnostic telemetry."
        else:
            narrative = (
                f"{asset.name} ({asset.asset_type}) is classified as {h_category} ({h_score}/100) with a "
                f"{risk_pct}% 30-day failure probability because {', '.join(reasons_text)}."
            )

        # Action plan selection
        cat_plans = cls.ACTION_TEMPLATES.get(asset.asset_type, cls.ACTION_TEMPLATES["WATER_FACILITY"])
        action_plan = cat_plans.get(
            h_category, 
            cat_plans.get("HIGH" if h_score >= 50 else "MEDIUM")
        )

        urgency = "Within 24-48 hours" if h_category == "CRITICAL" else (
            "Within 3-5 days" if h_category == "AT_RISK" else "Within 14 days"
        )

        return {
            "narrative_explanation": narrative,
            "risk_level": risk_level,
            "health_category": h_category,
            "primary_contributing_factors": factors,
            "recommended_action": action_plan,
            "suggested_urgency": urgency,
            "target_department_name": cls.DEPARTMENT_TYPE_MAP.get(asset.asset_type, "Engineering & Maintenance")
        }


predictive_xai_engine = PredictiveXAIEngine()
