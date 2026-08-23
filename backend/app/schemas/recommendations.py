from typing import List, Optional
from pydantic import BaseModel


class AIRecommendationItem(BaseModel):
    id: str
    title: str
    category_code: str
    category_name: str
    priority_score: float
    severity_level: str
    cluster_code: Optional[str] = None
    affected_population_impact: str
    primary_contributing_factors: List[str]
    tactical_action_plan: str
    sla_target: str
    coordinates: List[float]


class ConsolidatedRecommendationsResponse(BaseModel):
    total_recommendations: int
    critical_actions: int
    recommendations: List[AIRecommendationItem]
