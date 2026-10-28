import os
import uuid
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.core.config import settings
from app.models import RoadObservation, Incident, User, Role, AuditLog
from app.schemas.roadwatch import (
    RoadObservationResponse, RoadObservationReview, ModelStatusResponse
)
from app.security.deps import get_current_user, require_role
from app.ai.vision.vision_service import vision_service
from app.geospatial.spatial_service import spatial_service

router = APIRouter(prefix="/roadwatch", tags=["RoadWatch - Computer Vision"])

@router.get("/model-status", response_model=ModelStatusResponse)
def get_model_status():
    status_info = vision_service.get_model_status()
    return status_info

@router.post("/analyze", response_model=RoadObservationResponse, status_code=status.HTTP_201_CREATED)
async def analyze_road_image(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_description: Optional[str] = Form(None),
    incident_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    content = await file.read()
    valid, message = vision_service.validate_image_file(content, file.filename)
    if not valid:
        raise HTTPException(status_code=400, detail=message)

    file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "jpg"
    safe_name = f"road_{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIRECTORY, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    # Genuine model execution or manual observation record
    analysis = vision_service.analyze_road_image(file_path)

    # Save observation
    obs = RoadObservation(
        related_incident_id=incident_id,
        original_image_path=file_path.replace("\\", "/"),
        annotated_image_path=None,
        detection_classes=json.dumps(analysis.get("detection_classes", [])),
        model_scores=json.dumps(analysis.get("model_scores", {})),
        bounding_boxes=json.dumps(analysis.get("bounding_boxes", [])),
        model_id=analysis.get("model_id", settings.VISION_MODEL_NAME),
        model_version=analysis.get("model_version", "1.0.0"),
        latitude=latitude,
        longitude=longitude,
        location_description=location_description,
        review_status="PENDING",
        reviewer_id=None,
        is_demo=False
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="ROADWATCH_IMAGE_ANALYZED",
        entity_type="road_observation",
        entity_id=obs.id,
        details=f"Model status: {analysis.get('model_status')}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": obs.id,
        "related_incident_id": obs.related_incident_id,
        "original_image_path": obs.original_image_path,
        "annotated_image_path": obs.annotated_image_path,
        "detection_classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [],
        "model_scores": json.loads(obs.model_scores) if obs.model_scores.startswith("{") else {},
        "bounding_boxes": json.loads(obs.bounding_boxes) if obs.bounding_boxes and obs.bounding_boxes.startswith("[") else [],
        "model_id": obs.model_id,
        "model_version": obs.model_version,
        "latitude": obs.latitude,
        "longitude": obs.longitude,
        "location_description": obs.location_description,
        "review_status": obs.review_status,
        "reviewer_id": obs.reviewer_id,
        "reviewer_notes": obs.reviewer_notes,
        "human_corrections": json.loads(obs.human_corrections) if obs.human_corrections else None,
        "is_demo": obs.is_demo,
        "created_at": obs.created_at,
        "updated_at": obs.updated_at
    }

@router.get("/observations", response_model=List[RoadObservationResponse])
def list_observations(
    review_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RoadObservation)
    if review_status:
        query = query.filter(RoadObservation.review_status == review_status)

    obs_list = query.order_by(desc(RoadObservation.created_at)).offset(offset).limit(limit).all()

    results = []
    for obs in obs_list:
        results.append({
            "id": obs.id,
            "related_incident_id": obs.related_incident_id,
            "original_image_path": obs.original_image_path,
            "annotated_image_path": obs.annotated_image_path,
            "detection_classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [],
            "model_scores": json.loads(obs.model_scores) if obs.model_scores.startswith("{") else {},
            "bounding_boxes": json.loads(obs.bounding_boxes) if obs.bounding_boxes and obs.bounding_boxes.startswith("[") else [],
            "model_id": obs.model_id,
            "model_version": obs.model_version,
            "latitude": obs.latitude,
            "longitude": obs.longitude,
            "location_description": obs.location_description,
            "review_status": obs.review_status,
            "reviewer_id": obs.reviewer_id,
            "reviewer_notes": obs.reviewer_notes,
            "human_corrections": json.loads(obs.human_corrections) if obs.human_corrections else None,
            "is_demo": obs.is_demo,
            "created_at": obs.created_at,
            "updated_at": obs.updated_at
        })
    return results

@router.get("/observations/{observation_id}", response_model=RoadObservationResponse)
def get_observation(
    observation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obs = db.query(RoadObservation).filter(RoadObservation.id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    return {
        "id": obs.id,
        "related_incident_id": obs.related_incident_id,
        "original_image_path": obs.original_image_path,
        "annotated_image_path": obs.annotated_image_path,
        "detection_classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [],
        "model_scores": json.loads(obs.model_scores) if obs.model_scores.startswith("{") else {},
        "bounding_boxes": json.loads(obs.bounding_boxes) if obs.bounding_boxes and obs.bounding_boxes.startswith("[") else [],
        "model_id": obs.model_id,
        "model_version": obs.model_version,
        "latitude": obs.latitude,
        "longitude": obs.longitude,
        "location_description": obs.location_description,
        "review_status": obs.review_status,
        "reviewer_id": obs.reviewer_id,
        "reviewer_notes": obs.reviewer_notes,
        "human_corrections": json.loads(obs.human_corrections) if obs.human_corrections else None,
        "is_demo": obs.is_demo,
        "created_at": obs.created_at,
        "updated_at": obs.updated_at
    }

@router.post("/observations/{observation_id}/review", response_model=RoadObservationResponse)
def review_observation(
    observation_id: str,
    review_in: RoadObservationReview,
    current_user: User = Depends(require_role(Role.MUNICIPAL_STAFF, Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    obs = db.query(RoadObservation).filter(RoadObservation.id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    valid_statuses = ["VERIFIED", "REJECTED", "CORRECTED"]
    if review_in.review_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid review status. Allowed: {valid_statuses}")

    obs.review_status = review_in.review_status
    obs.reviewer_id = current_user.id
    obs.reviewer_notes = review_in.reviewer_notes
    if review_in.link_incident_id:
        obs.related_incident_id = review_in.link_incident_id

    # Preserve reviewer corrections separately from original model output (Section 06)
    if review_in.corrected_classes:
        corrections = {
            "corrected_by": current_user.id,
            "corrected_at": datetime.utcnow().isoformat(),
            "classes": review_in.corrected_classes,
            "notes": review_in.reviewer_notes
        }
        obs.human_corrections = json.dumps(corrections)

    db.commit()
    db.refresh(obs)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="ROADWATCH_OBSERVATION_REVIEWED",
        entity_type="road_observation",
        entity_id=obs.id,
        details=f"Status: {obs.review_status}, Notes: {obs.reviewer_notes}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": obs.id,
        "related_incident_id": obs.related_incident_id,
        "original_image_path": obs.original_image_path,
        "annotated_image_path": obs.annotated_image_path,
        "detection_classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [],
        "model_scores": json.loads(obs.model_scores) if obs.model_scores.startswith("{") else {},
        "bounding_boxes": json.loads(obs.bounding_boxes) if obs.bounding_boxes and obs.bounding_boxes.startswith("[") else [],
        "model_id": obs.model_id,
        "model_version": obs.model_version,
        "latitude": obs.latitude,
        "longitude": obs.longitude,
        "location_description": obs.location_description,
        "review_status": obs.review_status,
        "reviewer_id": obs.reviewer_id,
        "reviewer_notes": obs.reviewer_notes,
        "human_corrections": json.loads(obs.human_corrections) if obs.human_corrections else None,
        "is_demo": obs.is_demo,
        "created_at": obs.created_at,
        "updated_at": obs.updated_at
    }
