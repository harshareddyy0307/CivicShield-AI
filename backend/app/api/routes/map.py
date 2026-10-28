import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import Incident, RoadObservation, EmergencyCluster, ExternalAlert, User, Role
from app.security.deps import get_optional_current_user

router = APIRouter(prefix="/map", tags=["Interactive GIS Map"])

@router.get("/incidents")
def get_map_incidents(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_demo: Optional[bool] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if category:
        query = query.filter(Incident.category == category)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if is_demo is not None:
        query = query.filter(Incident.is_demo == is_demo)

    incidents = query.all()

    # Redact reporter private info for map view
    results = []
    for inc in incidents:
        results.append({
            "id": inc.id,
            "title": inc.title,
            "category": inc.category,
            "priority": inc.priority,
            "status": inc.status,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "location_description": inc.location_description,
            "is_demo": inc.is_demo,
            "created_at": inc.created_at.isoformat(),
            "evidence_count": len(inc.evidence)
        })
    return results

@router.get("/clusters")
def get_map_clusters(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(EmergencyCluster)
    if status_filter:
        query = query.filter(EmergencyCluster.status == status_filter)

    clusters = query.all()
    results = []
    for c in clusters:
        results.append({
            "id": c.id,
            "title": c.title,
            "hazard_type": c.hazard_type,
            "severity": c.severity,
            "status": c.status,
            "center_latitude": c.center_latitude,
            "center_longitude": c.center_longitude,
            "radius_meters": c.radius_meters,
            "evidence_summary": c.evidence_summary,
            "member_count": len(c.members),
            "is_demo": c.is_demo
        })
    return results

@router.get("/road-observations")
def get_map_road_observations(
    review_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RoadObservation).filter(RoadObservation.latitude.isnot(None), RoadObservation.longitude.isnot(None))
    if review_status:
        query = query.filter(RoadObservation.review_status == review_status)

    obs_list = query.all()
    results = []
    for obs in obs_list:
        results.append({
            "id": obs.id,
            "related_incident_id": obs.related_incident_id,
            "detection_classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [],
            "latitude": obs.latitude,
            "longitude": obs.longitude,
            "location_description": obs.location_description,
            "review_status": obs.review_status,
            "is_demo": obs.is_demo,
            "created_at": obs.created_at.isoformat()
        })
    return results

@router.get("/external-alerts")
def get_map_alerts(db: Session = Depends(get_db)):
    alerts = db.query(ExternalAlert).all()
    results = []
    for a in alerts:
        results.append({
            "id": a.id,
            "headline": a.headline,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "radius_meters": a.radius_meters,
            "is_demo": a.is_demo
        })
    return results
