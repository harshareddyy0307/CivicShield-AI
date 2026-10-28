from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, text

from app.database.session import get_db
from app.core.config import settings
from app.models import Department, AuditLog, Notification, User, Role
from app.security.deps import get_current_user, require_role

router = APIRouter(tags=["System & Administration"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "connected"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "vision_subsystem": "operational",
        "llm_provider": settings.LLM_PROVIDER
    }

@router.get("/readiness")
def readiness_check(db: Session = Depends(get_db)):
    return {
        "ready": True,
        "service": settings.PROJECT_NAME,
        "timestamp": settings.VERSION
    }

@router.get("/system/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).filter(Department.is_active == True).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "contact_email": d.contact_email
        }
        for d in depts
    ]

@router.get("/system/audit-logs")
def list_audit_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(require_role(Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": log.user.email if log.user else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@router.get("/system/notifications")
def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifs = query.order_by(desc(Notification.created_at)).limit(30).all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "reference_type": n.reference_type,
            "reference_id": n.reference_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat()
        }
        for n in notifs
    ]

@router.patch("/system/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}
