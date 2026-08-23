from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.hotspot import HotspotCluster
from app.models.complaint import Complaint
from app.schemas.recommendations import ConsolidatedRecommendationsResponse, AIRecommendationItem
from app.ai.explainability.xai_engine import xai_engine

router = APIRouter()


@router.get("/ai-recommendations", response_model=ConsolidatedRecommendationsResponse, summary="Explainable AI Recommendations")
def get_ai_recommendations(db: Session = Depends(get_db)):
    """Returns explainable municipal recommendations with tactical action plans and root-cause attribution."""
    hotspots = (
        db.query(HotspotCluster)
        .filter(HotspotCluster.status == "ACTIVE")
        .order_by(HotspotCluster.aggregate_priority_score.desc())
        .limit(10)
        .all()
    )

    recommendations_list: List[AIRecommendationItem] = []
    critical_count = 0

    for h in hotspots:
        cat_code = h.category.code if h.category else "CIVIC"
        cat_name = h.category.name if h.category else "Civic Category"
        sev_level = "CRITICAL" if h.avg_severity >= 0.80 else ("HIGH" if h.avg_severity >= 0.65 else "MEDIUM")

        if sev_level == "CRITICAL":
            critical_count += 1

        explanation = xai_engine.generate_explanation(
            category_code=cat_code,
            severity_score=h.avg_severity,
            severity_level=sev_level,
            priority_score=h.aggregate_priority_score,
            cluster_count=h.complaint_count
        )

        recommendations_list.append(
            AIRecommendationItem(
                id=h.cluster_code,
                title=f"{cat_name} Cluster ({h.complaint_count} Reports)",
                category_code=cat_code,
                category_name=cat_name,
                priority_score=h.aggregate_priority_score,
                severity_level=sev_level,
                cluster_code=h.cluster_code,
                affected_population_impact=explanation["estimated_population_impact"],
                primary_contributing_factors=explanation["primary_contributing_factors"],
                tactical_action_plan=h.ai_recommendation or explanation["tactical_action_plan"],
                sla_target=explanation["sla_recommendation"],
                coordinates=[h.centroid_lat, h.centroid_lon]
            )
        )

    return ConsolidatedRecommendationsResponse(
        total_recommendations=len(recommendations_list),
        critical_actions=critical_count,
        recommendations=recommendations_list
    )
