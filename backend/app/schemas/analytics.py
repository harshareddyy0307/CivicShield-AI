from typing import Optional, List, Dict
from pydantic import BaseModel

class OverviewMetrics(BaseModel):
    total_incidents: int
    open_incidents: int
    awaiting_review: int
    in_progress: int
    resolved_incidents: int
    emergency_clusters_total: int
    active_emergency_clusters: int
    road_observations_total: int
    active_resources_count: int

class CategoryBreakdown(BaseModel):
    category: str
    count: int
    percentage: float

class StatusBreakdown(BaseModel):
    status: str
    count: int

class IncidentTrendItem(BaseModel):
    date: str
    submitted: int
    resolved: int

class RoadDamageBreakdown(BaseModel):
    damage_class: str
    count: int

class AnalyticsOverviewResponse(BaseModel):
    metrics: OverviewMetrics
    category_distribution: List[CategoryBreakdown]
    status_distribution: List[StatusBreakdown]
    trends: List[IncidentTrendItem]
    road_damage_breakdown: List[RoadDamageBreakdown]
    resolution_rate_percent: float
    avg_resolution_time_hours: Optional[float] = None
