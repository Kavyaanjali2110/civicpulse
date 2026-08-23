from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class OverviewStatsResponse(BaseModel):
    total_complaints: int
    open_count: int
    resolved_count: int
    in_progress_count: int
    received_count: int
    investigating_count: int
    critical_count: int
    high_severity_count: int
    active_hotspots_count: int
    average_priority_score: float
    resolution_rate: float
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    intensity: float
    category: str
    severity_level: str
    tracking_id: str
    title: str


class CategoryTrendItem(BaseModel):
    category_id: int
    category_code: str
    category_name: str
    count_last_7d: int
    baseline_weekly_avg: float
    growth_percentage: float
    is_surge: bool
    status: str


class DailyTimelineItem(BaseModel):
    date: str
    display_date: str
    complaints: int


class TrendAnalyticsResponse(BaseModel):
    period: str
    total_active_7d: int
    category_trends: List[CategoryTrendItem]
    daily_series: List[DailyTimelineItem]
    emerging_alerts: List[str]
