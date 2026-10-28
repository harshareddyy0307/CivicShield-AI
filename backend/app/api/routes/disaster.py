import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models import (
    EmergencyCluster, EmergencyClusterMember, Incident, RoadObservation,
    ExternalAlert, ResourceAssignment, User, Role, AuditLog
)
from app.schemas.disaster import (
    EmergencyClusterResponse, EmergencyClusterDetailResponse, ClusterReviewRequest,
    ClusterMemberResponse, ExternalAlertResponse
)
from app.security.deps import get_current_user, require_role

router = APIRouter(prefix="/disaster", tags=["DisasterConnect - Emergency Intelligence"])

@router.get("/clusters", response_model=List[EmergencyClusterResponse])
def list_clusters(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(EmergencyCluster)
    if status_filter:
        query = query.filter(EmergencyCluster.status == status_filter)

    clusters = query.order_by(desc(EmergencyCluster.created_at)).offset(offset).limit(limit).all()

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
            "recommended_actions": json.loads(c.recommended_actions) if c.recommended_actions.startswith("[") else [c.recommended_actions],
            "missing_evidence": c.missing_evidence,
            "contradictory_evidence": c.contradictory_evidence,
            "assigned_coordinator_id": c.assigned_coordinator_id,
            "verified_by_id": c.verified_by_id,
            "verification_notes": c.verification_notes,
            "is_demo": c.is_demo,
            "first_observed_at": c.first_observed_at,
            "latest_evidence_at": c.latest_evidence_at,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "member_count": len(c.members)
        })
    return results

@router.get("/clusters/{cluster_id}", response_model=EmergencyClusterDetailResponse)
def get_cluster(
    cluster_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    c = db.query(EmergencyCluster).filter(EmergencyCluster.id == cluster_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Emergency cluster not found")

    members_data = []
    for m in c.members:
        member_dict = {
            "id": m.id,
            "incident_id": m.incident_id,
            "road_observation_id": m.road_observation_id,
            "external_alert_id": m.external_alert_id,
            "contribution_reason": m.contribution_reason,
            "distance_from_center_meters": m.distance_from_center_meters,
            "title": None,
            "category": None,
            "latitude": None,
            "longitude": None
        }
        if m.incident:
            member_dict["title"] = m.incident.title
            member_dict["category"] = m.incident.category
            member_dict["latitude"] = m.incident.latitude
            member_dict["longitude"] = m.incident.longitude
        elif m.road_observation:
            member_dict["title"] = f"Visual Observation ({m.road_observation.model_id})"
            member_dict["category"] = "road_damage_observation"
            member_dict["latitude"] = m.road_observation.latitude
            member_dict["longitude"] = m.road_observation.longitude
        elif m.external_alert:
            member_dict["title"] = m.external_alert.headline
            member_dict["category"] = m.external_alert.alert_type
            member_dict["latitude"] = m.external_alert.latitude
            member_dict["longitude"] = m.external_alert.longitude

        members_data.append(member_dict)

    # Assigned resources
    assignments_data = [
        {
            "id": asg.id,
            "resource_id": asg.resource_id,
            "resource_name": asg.resource.name if asg.resource else "Unknown",
            "assignment_status": asg.assignment_status,
            "instructions": asg.instructions,
            "estimated_distance_km": asg.estimated_distance_km,
            "assigned_at": asg.assigned_at
        }
        for asg in c.assignments
    ]

    return {
        "id": c.id,
        "title": c.title,
        "hazard_type": c.hazard_type,
        "severity": c.severity,
        "status": c.status,
        "center_latitude": c.center_latitude,
        "center_longitude": c.center_longitude,
        "radius_meters": c.radius_meters,
        "evidence_summary": c.evidence_summary,
        "recommended_actions": json.loads(c.recommended_actions) if c.recommended_actions.startswith("[") else [c.recommended_actions],
        "missing_evidence": c.missing_evidence,
        "contradictory_evidence": c.contradictory_evidence,
        "assigned_coordinator_id": c.assigned_coordinator_id,
        "verified_by_id": c.verified_by_id,
        "verification_notes": c.verification_notes,
        "is_demo": c.is_demo,
        "first_observed_at": c.first_observed_at,
        "latest_evidence_at": c.latest_evidence_at,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "member_count": len(c.members),
        "members": members_data,
        "assignments": assignments_data
    }

@router.post("/clusters/{cluster_id}/review", response_model=EmergencyClusterResponse)
def review_cluster(
    cluster_id: str,
    review_in: ClusterReviewRequest,
    current_user: User = Depends(require_role(Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    c = db.query(EmergencyCluster).filter(EmergencyCluster.id == cluster_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cluster not found")

    valid_statuses = ["VERIFIED", "RESPONSE_PLANNING", "RESPONSE_IN_PROGRESS", "RESOLVED", "DISMISSED"]
    if review_in.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid review status. Allowed: {valid_statuses}")

    c.status = review_in.status
    c.verified_by_id = current_user.id
    c.verification_notes = review_in.notes or c.verification_notes
    if review_in.coordinator_id:
        c.assigned_coordinator_id = review_in.coordinator_id
    elif not c.assigned_coordinator_id:
        c.assigned_coordinator_id = current_user.id

    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)

    audit = AuditLog(
        user_id=current_user.id,
        action="DISASTER_CLUSTER_REVIEWED",
        entity_type="emergency_cluster",
        entity_id=c.id,
        details=f"Status: {c.status}, Notes: {c.verification_notes}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": c.id,
        "title": c.title,
        "hazard_type": c.hazard_type,
        "severity": c.severity,
        "status": c.status,
        "center_latitude": c.center_latitude,
        "center_longitude": c.center_longitude,
        "radius_meters": c.radius_meters,
        "evidence_summary": c.evidence_summary,
        "recommended_actions": json.loads(c.recommended_actions) if c.recommended_actions.startswith("[") else [c.recommended_actions],
        "missing_evidence": c.missing_evidence,
        "contradictory_evidence": c.contradictory_evidence,
        "assigned_coordinator_id": c.assigned_coordinator_id,
        "verified_by_id": c.verified_by_id,
        "verification_notes": c.verification_notes,
        "is_demo": c.is_demo,
        "first_observed_at": c.first_observed_at,
        "latest_evidence_at": c.latest_evidence_at,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "member_count": len(c.members)
    }

@router.get("/alerts", response_model=List[ExternalAlertResponse])
def list_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alerts = db.query(ExternalAlert).order_by(desc(ExternalAlert.issued_at)).all()
    return alerts
