import io
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Incident, RoadObservation, EmergencyCluster, ResourceAssignment, Department

class ReportGenerator:
    """
    Generates structured reports and CSV exports from actual database records.
    Complies with Section 16:
    - Never fabricates statistics.
    - Embeds metadata: period, generation timestamp, applied filters, and limitations.
    """

    @staticmethod
    def generate_incident_summary_data(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        department_id: Optional[str] = None
    ) -> Dict[str, Any]:
        query = db.query(Incident)
        if start_date:
            query = query.filter(Incident.created_at >= start_date)
        if end_date:
            query = query.filter(Incident.created_at <= end_date)
        if department_id:
            query = query.filter(Incident.assigned_department_id == department_id)

        incidents = query.all()
        total = len(incidents)

        category_counts = {}
        status_counts = {}
        for inc in incidents:
            category_counts[inc.category] = category_counts.get(inc.category, 0) + 1
            status_counts[inc.status] = status_counts.get(inc.status, 0) + 1

        resolved_count = status_counts.get("CLOSED", 0) + status_counts.get("RESOLVED_PENDING_VERIFICATION", 0)
        resolution_rate = round((resolved_count / total * 100), 1) if total > 0 else 0.0

        return {
            "report_name": "Civic Incident Summary Report",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "reporting_period": {
                "start": start_date.isoformat() if start_date else "All time",
                "end": end_date.isoformat() if end_date else "Present"
            },
            "applied_filters": {
                "department_id": department_id or "All Departments"
            },
            "data_source": "CivicShield AI Incident Database",
            "summary_statistics": {
                "total_incidents": total,
                "resolved_or_pending_verification": resolved_count,
                "resolution_rate_percent": resolution_rate,
                "status_breakdown": status_counts,
                "category_breakdown": category_counts
            },
            "limitations": "Reflects reported and ingested civic complaints within CivicShield platform jurisdiction. Unreported incidents or external agency records not integrated into this system are not included.",
            "incidents": [
                {
                    "id": inc.id,
                    "title": inc.title,
                    "category": inc.category,
                    "status": inc.status,
                    "priority": inc.priority,
                    "latitude": inc.latitude,
                    "longitude": inc.longitude,
                    "created_at": inc.created_at.isoformat()
                }
                for inc in incidents[:200]
            ]
        }

    @staticmethod
    def export_incidents_csv(
        db: Session,
        department_id: Optional[str] = None
    ) -> str:
        query = db.query(Incident)
        if department_id:
            query = query.filter(Incident.assigned_department_id == department_id)
        incidents = query.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Incident ID", "Title", "Category", "Priority", "Status",
            "Latitude", "Longitude", "Location Description", "Created At", "Resolved At", "Is Demo"
        ])

        for inc in incidents:
            writer.writerow([
                inc.id,
                inc.title,
                inc.category,
                inc.priority,
                inc.status,
                inc.latitude,
                inc.longitude,
                inc.location_description or "",
                inc.created_at.isoformat() if inc.created_at else "",
                inc.resolved_at.isoformat() if inc.resolved_at else "",
                "YES" if inc.is_demo else "NO"
            ])

        return output.getvalue()

    @staticmethod
    def export_road_damage_csv(db: Session) -> str:
        obs_list = db.query(RoadObservation).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Observation ID", "Related Incident ID", "Detection Classes",
            "Model ID", "Model Version", "Review Status", "Latitude", "Longitude", "Created At", "Is Demo"
        ])
        for obs in obs_list:
            writer.writerow([
                obs.id,
                obs.related_incident_id or "",
                obs.detection_classes,
                obs.model_id,
                obs.model_version,
                obs.review_status,
                obs.latitude or "",
                obs.longitude or "",
                obs.created_at.isoformat() if obs.created_at else "",
                "YES" if obs.is_demo else "NO"
            ])
        return output.getvalue()

report_generator = ReportGenerator()
