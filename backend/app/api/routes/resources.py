import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models import Resource, ResourceAssignment, Department, User, Role, AuditLog
from app.schemas.resources import (
    ResourceCreate, ResourceResponse, ResourceAssignmentCreate,
    ResourceAssignmentUpdate, ResourceAssignmentResponse
)
from app.security.deps import get_current_user, require_role
from app.geospatial.spatial_service import spatial_service
from app.resources.allocator import resource_allocator

router = APIRouter(prefix="/resources", tags=["Resource Coordination"])

@router.get("", response_model=List[ResourceResponse])
def list_resources(
    resource_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    department_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Resource)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if status_filter:
        query = query.filter(Resource.status == status_filter)
    if department_id:
        query = query.filter(Resource.department_id == department_id)

    resources = query.all()

    results = []
    for r in resources:
        results.append({
            "id": r.id,
            "name": r.name,
            "resource_type": r.resource_type,
            "department_id": r.department_id,
            "department_name": r.department.name if r.department else None,
            "status": r.status,
            "capacity": r.capacity,
            "capabilities": json.loads(r.capabilities) if r.capabilities.startswith("[") else [r.capabilities],
            "current_latitude": r.current_latitude,
            "current_longitude": r.current_longitude,
            "contact_person": r.contact_person,
            "phone_number": r.phone_number,
            "is_demo": r.is_demo,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return results

@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    res_in: ResourceCreate,
    current_user: User = Depends(require_role(Role.ADMINISTRATOR, Role.EMERGENCY_COORDINATOR, Role.MUNICIPAL_STAFF)),
    db: Session = Depends(get_db)
):
    res = Resource(
        name=res_in.name,
        resource_type=res_in.resource_type,
        department_id=res_in.department_id,
        status="AVAILABLE",
        capacity=res_in.capacity,
        capabilities=json.dumps(res_in.capabilities),
        current_latitude=res_in.current_latitude,
        current_longitude=res_in.current_longitude,
        contact_person=res_in.contact_person,
        phone_number=res_in.phone_number,
        is_demo=res_in.is_demo or False
    )
    db.add(res)
    db.commit()
    db.refresh(res)

    audit = AuditLog(
        user_id=current_user.id,
        action="RESOURCE_CREATED",
        entity_type="resource",
        entity_id=res.id,
        details=f"Name: {res.name}, Type: {res.resource_type}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": res.id,
        "name": res.name,
        "resource_type": res.resource_type,
        "department_id": res.department_id,
        "department_name": res.department.name if res.department else None,
        "status": res.status,
        "capacity": res.capacity,
        "capabilities": res_in.capabilities,
        "current_latitude": res.current_latitude,
        "current_longitude": res.current_longitude,
        "contact_person": res.contact_person,
        "phone_number": res.phone_number,
        "is_demo": res.is_demo,
        "created_at": res.created_at,
        "updated_at": res.updated_at
    }

@router.get("/assignments", response_model=List[ResourceAssignmentResponse])
def list_assignments(
    assignment_status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ResourceAssignment)
    if assignment_status:
        query = query.filter(ResourceAssignment.assignment_status == assignment_status)

    assignments = query.order_by(desc(ResourceAssignment.assigned_at)).all()

    results = []
    for asg in assignments:
        results.append({
            "id": asg.id,
            "resource_id": asg.resource_id,
            "resource_name": asg.resource.name if asg.resource else "Unknown",
            "resource_type": asg.resource.resource_type if asg.resource else "Unknown",
            "incident_id": asg.incident_id,
            "cluster_id": asg.cluster_id,
            "assignment_status": asg.assignment_status,
            "priority": asg.priority,
            "target_latitude": asg.target_latitude,
            "target_longitude": asg.target_longitude,
            "instructions": asg.instructions,
            "estimated_distance_km": asg.estimated_distance_km,
            "allocation_method": asg.allocation_method,
            "proposed_by": asg.proposed_by,
            "approved_by_id": asg.approved_by_id,
            "approved_by_name": asg.approved_by.full_name if asg.approved_by else None,
            "assigned_at": asg.assigned_at,
            "completed_at": asg.completed_at,
            "notes": asg.notes,
            "is_demo": asg.is_demo
        })
    return results

@router.post("/assignments", response_model=ResourceAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    asg_in: ResourceAssignmentCreate,
    current_user: User = Depends(require_role(Role.EMERGENCY_COORDINATOR, Role.MUNICIPAL_STAFF, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(Resource.id == asg_in.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Calculate distance estimate
    est_km = None
    if resource.current_latitude and resource.current_longitude:
        est_km = spatial_service.estimate_driving_distance_km(
            resource.current_latitude, resource.current_longitude,
            asg_in.target_latitude, asg_in.target_longitude
        )

    # Initial state is PROPOSED per Section 13 (human authorization required)
    asg = ResourceAssignment(
        resource_id=resource.id,
        incident_id=asg_in.incident_id,
        cluster_id=asg_in.cluster_id,
        assignment_status="PROPOSED",
        priority=asg_in.priority,
        target_latitude=asg_in.target_latitude,
        target_longitude=asg_in.target_longitude,
        instructions=asg_in.instructions,
        estimated_distance_km=est_km,
        allocation_method=asg_in.allocation_method or "manual_coordinator",
        proposed_by=current_user.full_name,
        approved_by_id=None,
        is_demo=False
    )
    db.add(asg)
    db.commit()
    db.refresh(asg)

    audit = AuditLog(
        user_id=current_user.id,
        action="RESOURCE_ASSIGNMENT_PROPOSED",
        entity_type="resource_assignment",
        entity_id=asg.id,
        details=f"Resource {resource.name} proposed for assignment"
    )
    db.add(audit)
    db.commit()

    return {
        "id": asg.id,
        "resource_id": asg.resource_id,
        "resource_name": resource.name,
        "resource_type": resource.resource_type,
        "incident_id": asg.incident_id,
        "cluster_id": asg.cluster_id,
        "assignment_status": asg.assignment_status,
        "priority": asg.priority,
        "target_latitude": asg.target_latitude,
        "target_longitude": asg.target_longitude,
        "instructions": asg.instructions,
        "estimated_distance_km": asg.estimated_distance_km,
        "allocation_method": asg.allocation_method,
        "proposed_by": asg.proposed_by,
        "approved_by_id": asg.approved_by_id,
        "approved_by_name": None,
        "assigned_at": asg.assigned_at,
        "completed_at": asg.completed_at,
        "notes": asg.notes,
        "is_demo": asg.is_demo
    }

@router.patch("/assignments/{assignment_id}", response_model=ResourceAssignmentResponse)
def update_assignment_status(
    assignment_id: str,
    update_in: ResourceAssignmentUpdate,
    current_user: User = Depends(require_role(Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR, Role.MUNICIPAL_STAFF)),
    db: Session = Depends(get_db)
):
    asg = db.query(ResourceAssignment).filter(ResourceAssignment.id == assignment_id).first()
    if not asg:
        raise HTTPException(status_code=404, detail="Assignment not found")

    new_status = update_in.assignment_status
    asg.assignment_status = new_status
    if update_in.notes:
        asg.notes = update_in.notes

    resource = db.query(Resource).filter(Resource.id == asg.resource_id).first()

    if new_status == "APPROVED":
        # Authorization check: Emergency coordinator or Admin
        if current_user.role not in [Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR]:
            raise HTTPException(status_code=403, detail="Only Emergency Coordinators or Administrators can approve resource assignments")
        asg.approved_by_id = current_user.id
        if resource:
            resource.status = "DEPLOYED"
    elif new_status == "COMPLETED":
        asg.completed_at = datetime.utcnow()
        if resource:
            resource.status = "AVAILABLE"
            resource.current_latitude = asg.target_latitude
            resource.current_longitude = asg.target_longitude
    elif new_status in ["REJECTED", "CANCELLED"]:
        if resource and resource.status == "DEPLOYED":
            resource.status = "AVAILABLE"

    db.commit()
    db.refresh(asg)

    audit = AuditLog(
        user_id=current_user.id,
        action="RESOURCE_ASSIGNMENT_UPDATED",
        entity_type="resource_assignment",
        entity_id=asg.id,
        details=f"New status: {new_status}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": asg.id,
        "resource_id": asg.resource_id,
        "resource_name": asg.resource.name if asg.resource else "Unknown",
        "resource_type": asg.resource.resource_type if asg.resource else "Unknown",
        "incident_id": asg.incident_id,
        "cluster_id": asg.cluster_id,
        "assignment_status": asg.assignment_status,
        "priority": asg.priority,
        "target_latitude": asg.target_latitude,
        "target_longitude": asg.target_longitude,
        "instructions": asg.instructions,
        "estimated_distance_km": asg.estimated_distance_km,
        "allocation_method": asg.allocation_method,
        "proposed_by": asg.proposed_by,
        "approved_by_id": asg.approved_by_id,
        "approved_by_name": asg.approved_by.full_name if asg.approved_by else None,
        "assigned_at": asg.assigned_at,
        "completed_at": asg.completed_at,
        "notes": asg.notes,
        "is_demo": asg.is_demo
    }
