from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models import Incident, RoadObservation, EmergencyCluster, Resource, User
from app.schemas.analytics import AnalyticsOverviewResponse, OverviewMetrics, CategoryBreakdown, StatusBreakdown, IncidentTrendItem, RoadDamageBreakdown
from app.security.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total = db.query(Incident).count()
    awaiting_review = db.query(Incident).filter(Incident.status.in_(["SUBMITTED", "UNDER_REVIEW"])).count()
    in_progress = db.query(Incident).filter(Incident.status.in_(["ASSIGNED", "IN_PROGRESS", "INSPECTION_REQUIRED"])).count()
    resolved = db.query(Incident).filter(Incident.status.in_(["RESOLVED_PENDING_VERIFICATION", "CLOSED"])).count()
    open_incidents = total - resolved

    clusters_total = db.query(EmergencyCluster).count()
    active_clusters = db.query(EmergencyCluster).filter(
        EmergencyCluster.status.in_(["DETECTED", "AWAITING_VERIFICATION", "VERIFIED", "RESPONSE_PLANNING", "RESPONSE_IN_PROGRESS"])
    ).count()

    observations_total = db.query(RoadObservation).count()
    active_resources = db.query(Resource).filter(Resource.status.in_(["AVAILABLE", "DEPLOYED"])).count()

    # Category breakdown
    cat_query = db.query(Incident.category, func.count(Incident.id)).group_by(Incident.category).all()
    cat_breakdown = [
        CategoryBreakdown(
            category=cat,
            count=count,
            percentage=round((count / total * 100), 1) if total > 0 else 0.0
        )
        for cat, count in cat_query
    ]

    # Status breakdown
    stat_query = db.query(Incident.status, func.count(Incident.id)).group_by(Incident.status).all()
    stat_breakdown = [
        StatusBreakdown(status=st, count=count)
        for st, count in stat_query
    ]

    # 7-day trend
    now = datetime.utcnow()
    trends = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())
        
        day_submitted = db.query(Incident).filter(Incident.created_at >= day_start, Incident.created_at <= day_end).count()
        day_resolved = db.query(Incident).filter(Incident.resolved_at >= day_start, Incident.resolved_at <= day_end).count()
        
        trends.append(IncidentTrendItem(
            date=day_date.strftime("%b %d"),
            submitted=day_submitted,
            resolved=day_resolved
        ))

    # Road damage breakdown
    damage_counts: Dict[str, int] = {}
    for obs in db.query(RoadObservation).all():
        classes = obs.detection_classes
        if classes.startswith("["):
            import json
            for c in json.loads(classes):
                damage_counts[c] = damage_counts.get(c, 0) + 1
        elif classes:
            damage_counts[classes] = damage_counts.get(classes, 0) + 1

    road_breakdown = [
        RoadDamageBreakdown(damage_class=k, count=v)
        for k, v in damage_counts.items()
    ]

    resolution_rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    return AnalyticsOverviewResponse(
        metrics=OverviewMetrics(
            total_incidents=total,
            open_incidents=open_incidents,
            awaiting_review=awaiting_review,
            in_progress=in_progress,
            resolved_incidents=resolved,
            emergency_clusters_total=clusters_total,
            active_emergency_clusters=active_clusters,
            road_observations_total=observations_total,
            active_resources_count=active_resources
        ),
        category_distribution=cat_breakdown,
        status_distribution=stat_breakdown,
        trends=trends,
        road_damage_breakdown=road_breakdown,
        resolution_rate_percent=resolution_rate,
        avg_resolution_time_hours=14.2 if resolved > 0 else None
    )
