from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import User, Role
from app.security.deps import get_current_user, require_role
from app.reporting.report_generator import report_generator

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/incidents")
def get_incident_report(
    department_id: Optional[str] = None,
    current_user: User = Depends(require_role(Role.MUNICIPAL_STAFF, Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    report_data = report_generator.generate_incident_summary_data(
        db=db,
        department_id=department_id
    )
    return report_data

@router.get("/export/incidents.csv")
def export_incidents_csv(
    department_id: Optional[str] = None,
    current_user: User = Depends(require_role(Role.MUNICIPAL_STAFF, Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    csv_content = report_generator.export_incidents_csv(db=db, department_id=department_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=civic_incidents_export.csv"}
    )

@router.get("/export/roadwatch.csv")
def export_roadwatch_csv(
    current_user: User = Depends(require_role(Role.MUNICIPAL_STAFF, Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR)),
    db: Session = Depends(get_db)
):
    csv_content = report_generator.export_road_damage_csv(db=db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=roadwatch_observations_export.csv"}
    )
