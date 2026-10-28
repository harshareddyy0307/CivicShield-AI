import os
import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database.session import get_db
from app.core.config import settings
from app.models import (
    Incident, IncidentEvidence, IncidentStatusHistory, IncidentRelationship,
    User, Role, Department, Notification, AuditLog
)
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, IncidentDetailResponse,
    IncidentStatusHistoryResponse, EvidenceResponse
)
from app.security.deps import get_current_user, require_role, get_optional_current_user
from app.ai.classification.categorizer import categorizer
from app.ai.correlation.duplicate_detector import duplicate_detector
from app.ai.vision.vision_service import vision_service
from app.geospatial.spatial_service import spatial_service

router = APIRouter(prefix="/incidents", tags=["CivicFix - Incidents"])

VALID_TRANSITIONS = {
    "SUBMITTED": ["UNDER_REVIEW", "INSPECTION_REQUIRED", "ASSIGNED"],
    "UNDER_REVIEW": ["INSPECTION_REQUIRED", "ASSIGNED"],
    "INSPECTION_REQUIRED": ["ASSIGNED", "IN_PROGRESS"],
    "ASSIGNED": ["IN_PROGRESS", "INSPECTION_REQUIRED"],
    "IN_PROGRESS": ["RESOLVED_PENDING_VERIFICATION", "ASSIGNED"],
    "RESOLVED_PENDING_VERIFICATION": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"],
    "REOPENED": ["UNDER_REVIEW", "INSPECTION_REQUIRED", "ASSIGNED"]
}

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Deterministic Categorization & Department Routing
    cat_result = categorizer.classify(
        text=f"{incident_in.title} {incident_in.description}",
        user_selected_category=incident_in.category
    )

    incident = Incident(
        title=incident_in.title,
        description=incident_in.description,
        category=incident_in.category,
        priority=incident_in.priority or "MEDIUM",
        status="SUBMITTED",
        latitude=incident_in.latitude,
        longitude=incident_in.longitude,
        location_description=incident_in.location_description,
        jurisdiction=incident_in.jurisdiction,
        reporter_id=current_user.id,
        assigned_department_id=cat_result["recommended_department_id"],
        predicted_category=cat_result["predicted_category"],
        classification_method=cat_result["classification_method"],
        classification_confidence=cat_result["classification_confidence"],
        classification_reasons=cat_result["classification_reasons"],
        requires_human_review=cat_result["requires_human_review"],
        is_demo=incident_in.is_demo or False
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Initial Status History record
    history = IncidentStatusHistory(
        incident_id=incident.id,
        from_status=None,
        to_status="SUBMITTED",
        actor_id=current_user.id,
        notes="Complaint submitted by citizen.",
        action_type="STATUS_CHANGE"
    )
    db.add(history)

    # In-app notification for the citizen
    notif = Notification(
        user_id=current_user.id,
        title="Complaint Submitted",
        message=f"Your complaint '{incident.title}' has been registered with ID #{incident.id[:8]}.",
        notification_type="COMPLAINT_SUBMITTED",
        reference_type="incident",
        reference_id=incident.id
    )
    db.add(notif)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="INCIDENT_CREATED",
        entity_type="incident",
        entity_id=incident.id,
        details=f"Category: {incident.category}, Assigned Dept: {incident.assigned_department_id}"
    )
    db.add(audit)
    db.commit()

    return incident

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    is_demo: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    # Enforce Role-Based Access:
    # Citizens can only view their own complaints (Section 04)
    if current_user.role == Role.CITIZEN:
        query = query.filter(Incident.reporter_id == current_user.id)
    elif current_user.role == Role.MUNICIPAL_STAFF and current_user.department_id:
        # If staff has assigned department, allow filtering or prioritize department
        if department_id:
            query = query.filter(Incident.assigned_department_id == department_id)
    elif department_id:
        query = query.filter(Incident.assigned_department_id == department_id)

    if category:
        query = query.filter(Incident.category == category)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if priority:
        query = query.filter(Incident.priority == priority)
    if is_demo is not None:
        query = query.filter(Incident.is_demo == is_demo)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(or_(
            Incident.title.ilike(search_pattern),
            Incident.description.ilike(search_pattern),
            Incident.location_description.ilike(search_pattern)
        ))

    incidents = query.order_by(desc(Incident.created_at)).offset(offset).limit(limit).all()
    return incidents

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Citizen privacy check: citizen can only view their own incident
    if current_user.role == Role.CITIZEN and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: citizens can only view their own complaints")

    reporter = db.query(User).filter(User.id == incident.reporter_id).first()
    dept = db.query(Department).filter(Department.id == incident.assigned_department_id).first()
    assigned_user = db.query(User).filter(User.id == incident.assigned_user_id).first() if incident.assigned_user_id else None

    # Load potential duplicates in vicinity
    all_others = db.query(Incident).filter(
        Incident.id != incident.id,
        Incident.created_at >= (incident.created_at - (datetime.utcnow() - incident.created_at))
    ).all()

    candidates = []
    for other in all_others:
        match = duplicate_detector.calculate_duplicate_score(
            incident.latitude, incident.longitude, incident.category, incident.description, incident.created_at,
            other.latitude, other.longitude, other.category, other.description, other.created_at
        )
        if match["is_candidate"]:
            candidates.append({
                "id": other.id,
                "title": other.title,
                "status": other.status,
                "category": other.category,
                "score": match["score"],
                "distance_meters": match["distance_meters"],
                "reason": match["reason"]
            })

    detail_dict = {
        **incident.__dict__,
        "reporter_name": reporter.full_name if reporter else "Unknown Citizen",
        "assigned_department_name": dept.name if dept else None,
        "assigned_user_name": assigned_user.full_name if assigned_user else None,
        "evidence": incident.evidence,
        "history": incident.history,
        "potential_duplicates": candidates,
        "related_incidents": []
    }
    return detail_dict

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Permissions:
    # Citizen can ONLY reopen their own resolved/closed incident
    if current_user.role == Role.CITIZEN:
        if incident.reporter_id != current_user.id:
            raise HTTPException(status_code=403, detail="Cannot modify another citizen's complaint")
        if update_data.status and update_data.status != "REOPENED":
            raise HTTPException(status_code=403, detail="Citizens can only reopen a resolved or closed complaint")

    old_status = incident.status
    new_status = update_data.status

    if new_status and new_status != old_status:
        # Validate status transition
        allowed_next = VALID_TRANSITIONS.get(old_status, [])
        if new_status not in allowed_next and current_user.role != Role.ADMINISTRATOR:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition from '{old_status}' to '{new_status}'. Allowed: {', '.join(allowed_next)}"
            )

        # Verification requirement before closure (Section 05.F)
        if new_status == "CLOSED" and old_status != "RESOLVED_PENDING_VERIFICATION" and current_user.role == Role.CITIZEN:
            raise HTTPException(
                status_code=400,
                detail="Closure requires staff verification before being marked closed."
            )

        incident.status = new_status
        if new_status == "RESOLVED_PENDING_VERIFICATION":
            incident.resolved_at = datetime.utcnow()
        elif new_status == "CLOSED":
            incident.closed_at = datetime.utcnow()
            incident.verified_at = datetime.utcnow()

        # Log history
        history_entry = IncidentStatusHistory(
            incident_id=incident.id,
            from_status=old_status,
            to_status=new_status,
            actor_id=current_user.id,
            notes=update_data.notes or f"Status changed from {old_status} to {new_status}",
            action_type=update_data.action_type or "STATUS_CHANGE"
        )
        db.add(history_entry)

        # Notify reporter
        notif = Notification(
            user_id=incident.reporter_id,
            title="Incident Status Updated",
            message=f"Your complaint '{incident.title}' status changed to {new_status.replace('_', ' ').title()}.",
            notification_type="STATUS_UPDATED",
            reference_type="incident",
            reference_id=incident.id
        )
        db.add(notif)

    if update_data.priority and current_user.role != Role.CITIZEN:
        incident.priority = update_data.priority
    if update_data.assigned_department_id and current_user.role != Role.CITIZEN:
        incident.assigned_department_id = update_data.assigned_department_id
    if update_data.assigned_user_id and current_user.role != Role.CITIZEN:
        incident.assigned_user_id = update_data.assigned_user_id

    db.commit()
    db.refresh(incident)
    return incident

@router.get("/{incident_id}/history", response_model=List[IncidentStatusHistoryResponse])
def get_incident_history(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if current_user.role == Role.CITIZEN and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    history = db.query(IncidentStatusHistory).filter(
        IncidentStatusHistory.incident_id == incident_id
    ).order_by(IncidentStatusHistory.created_at.desc()).all()

    return history

@router.post("/{incident_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    incident_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    is_resolution: Optional[bool] = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if current_user.role == Role.CITIZEN and incident.reporter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Citizens can only upload evidence to their own reports")

    content = await file.read()
    valid, message = vision_service.validate_image_file(content, file.filename)
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    safe_name = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIRECTORY, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    evidence = IncidentEvidence(
        incident_id=incident.id,
        file_path=file_path.replace("\\", "/"),
        file_name=file.filename,
        file_type=file.content_type or "image/jpeg",
        file_size=len(content),
        caption=caption,
        uploaded_by_id=current_user.id,
        is_resolution_evidence=is_resolution or False
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence
