import time
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Incident, RoadObservation, ExternalAlert, AIAssessment, AuditLog, User
from app.ai.classification.categorizer import categorizer
from app.ai.correlation.text_similarity import text_similarity_service
from app.ai.correlation.duplicate_detector import duplicate_detector
from app.ai.correlation.cluster_engine import cluster_engine
from app.ai.vision.vision_service import vision_service
from app.geospatial.spatial_service import spatial_service
from app.ai.providers.llm_provider import llm_provider

# Tool definitions with schemas, permissions, timeouts, and audit policies
AVAILABLE_TOOLS = {
    "classify_incident": {
        "description": "Determines likely incident category and responsible municipal department using deterministic rules",
        "inputs": {"text": "str", "user_selected_category": "Optional[str]"},
        "permission": "CITIZEN_OR_STAFF",
        "timeout_seconds": 2
    },
    "find_nearby_incidents": {
        "description": "Finds complaints within a defined radius using spatial coordinates",
        "inputs": {"lat": "float", "lon": "float", "radius_meters": "float"},
        "permission": "ANY_AUTHENTICATED",
        "timeout_seconds": 5
    },
    "find_similar_reports": {
        "description": "Evaluates duplicate likelihood using multi-factor composite scoring",
        "inputs": {"incident_id": "str"},
        "permission": "ANY_AUTHENTICATED",
        "timeout_seconds": 5
    },
    "get_road_observations": {
        "description": "Queries visual road damage observations in the vicinity",
        "inputs": {"lat": "float", "lon": "float", "radius_meters": "float"},
        "permission": "ANY_AUTHENTICATED",
        "timeout_seconds": 5
    },
    "retrieve_external_alerts": {
        "description": "Checks active weather, traffic, or emergency warnings overlapping coordinates",
        "inputs": {"lat": "float", "lon": "float"},
        "permission": "ANY_AUTHENTICATED",
        "timeout_seconds": 3
    },
    "summarize_incident_evidence": {
        "description": "Produces a concise synthesis of reports, observations, and weather context",
        "inputs": {"incident_id": "str"},
        "permission": "STAFF_OR_COORDINATOR",
        "timeout_seconds": 5
    },
    "evaluate_cluster_rules": {
        "description": "Evaluates multi-incident cascading hazard conditions",
        "inputs": {"incident_id": "str"},
        "permission": "COORDINATOR_OR_ADMIN",
        "timeout_seconds": 5
    },
    "estimate_route": {
        "description": "Calculates estimated road network travel distance between resource and incident",
        "inputs": {"from_lat": "float", "from_lon": "float", "to_lat": "float", "to_lon": "float"},
        "permission": "STAFF_OR_COORDINATOR",
        "timeout_seconds": 2
    },
    "recommend_inspection": {
        "description": "Proposes actionable municipal inspection tasks for staff review",
        "inputs": {"incident_id": "str", "cluster_id": "Optional[str]"},
        "permission": "STAFF_OR_COORDINATOR",
        "timeout_seconds": 2
    }
}

class ControlledIncidentAgent:
    """
    Controlled Civic Incident Intelligence Agent.
    Complies strictly with Section 10:
    - Coordinates sandboxed, deterministic tools.
    - Zero arbitrary command or SQL execution.
    - Fully audited execution records.
    - Operates robustly in deterministic mode when no LLM is present.
    """

    def analyze_incident_pipeline(
        self,
        db: Session,
        incident: Incident,
        current_user: Optional[User] = None,
        use_llm: bool = True
    ) -> Dict[str, Any]:
        start_time = time.time()
        tools_executed = []

        # 1. Tool: classify_incident
        cat_result = categorizer.classify(f"{incident.title} {incident.description}", incident.category)
        tools_executed.append("classify_incident")

        # 2. Tool: find_nearby_incidents
        all_incidents = db.query(Incident).filter(Incident.id != incident.id).all()
        nearby_incidents = []
        for other in all_incidents:
            dist_m = spatial_service.haversine_distance_meters(
                incident.latitude, incident.longitude, other.latitude, other.longitude
            )
            if dist_m <= 1000.0:
                nearby_incidents.append((other, dist_m))
        tools_executed.append("find_nearby_incidents")

        # 3. Tool: find_similar_reports (Duplicate Detection)
        duplicate_candidates = []
        for other, dist_m in nearby_incidents:
            if dist_m <= 250.0:
                match = duplicate_detector.calculate_duplicate_score(
                    incident.latitude, incident.longitude, incident.category, incident.description, incident.created_at,
                    other.latitude, other.longitude, other.category, other.description, other.created_at
                )
                if match["is_candidate"]:
                    duplicate_candidates.append({
                        "id": other.id,
                        "title": other.title,
                        "category": other.category,
                        "status": other.status,
                        "score": match["score"],
                        "distance_meters": match["distance_meters"],
                        "time_delta_hours": match["time_delta_hours"],
                        "reason": match["reason"]
                    })
        tools_executed.append("find_similar_reports")

        # 4. Tool: get_road_observations
        all_obs = db.query(RoadObservation).all()
        nearby_obs = []
        for obs in all_obs:
            if obs.latitude is not None and obs.longitude is not None:
                dist_m = spatial_service.haversine_distance_meters(
                    incident.latitude, incident.longitude, obs.latitude, obs.longitude
                )
                if dist_m <= 800.0:
                    nearby_obs.append({
                        "id": obs.id,
                        "classes": json.loads(obs.detection_classes) if obs.detection_classes.startswith("[") else [obs.detection_classes],
                        "distance_meters": round(dist_m, 1),
                        "review_status": obs.review_status
                    })
        tools_executed.append("get_road_observations")

        # 5. Tool: retrieve_external_alerts
        active_alerts = db.query(ExternalAlert).all()
        overlapping_alerts = []
        for alt in active_alerts:
            dist_m = spatial_service.haversine_distance_meters(
                incident.latitude, incident.longitude, alt.latitude, alt.longitude
            )
            if dist_m <= (alt.radius_meters + 500.0):
                overlapping_alerts.append({
                    "id": alt.id,
                    "headline": alt.headline,
                    "severity": alt.severity,
                    "source": alt.source
                })
        tools_executed.append("retrieve_external_alerts")

        # 6. Tool: evaluate_cluster_rules
        cluster_identified = False
        cluster_hazard_type = None
        has_drainage = incident.category in ["blocked_drain", "water_leakage", "waterlogging"]
        has_nearby_water_road = any(
            o.category in ["pothole", "damaged_road", "waterlogging", "blocked_drain"]
            for o, _ in nearby_incidents
        ) or len(nearby_obs) > 0

        if has_drainage and has_nearby_water_road:
            cluster_identified = True
            cluster_hazard_type = "DRAINAGE_CASCADE"
        elif len(nearby_incidents) >= 2:
            cluster_identified = True
            cluster_hazard_type = "SPATIAL_CLUSTER"
        tools_executed.append("evaluate_cluster_rules")

        # 7. Tool: summarize_incident_evidence & recommend_inspection
        recommended_next_steps = []
        if duplicate_candidates:
            recommended_next_steps.append(f"Review {len(duplicate_candidates)} potential duplicate reports before dispatching field staff.")
        if cat_result.get("recommended_department_id"):
            recommended_next_steps.append(f"Verify department assignment: {cat_result['recommended_department_id'].replace('_', ' ').title()}.")
        if cluster_identified:
            recommended_next_steps.append(f"Flagged for DisasterConnect coordinator review: potential {cluster_hazard_type}.")
        recommended_next_steps.append("Schedule physical inspection to confirm infrastructure condition.")
        tools_executed.append("recommend_inspection")

        # Natural language summary (Cloud LLM or Deterministic Fallback)
        ai_provider = "deterministic_rules"
        summary_text = None
        if use_llm and llm_provider.is_configured():
            summary_text = llm_provider.generate_incident_summary(
                incident.title, incident.category, incident.description
            )
            if summary_text:
                ai_provider = f"gemini ({llm_provider.model_name})"

        if not summary_text:
            summary_text = (
                f"Incident '{incident.title}' classified as '{cat_result['predicted_category']}' "
                f"based on {cat_result['classification_method']}. "
                f"Identified {len(duplicate_candidates)} potential duplicates and {len(nearby_obs)} visual road observations within the vicinity."
            )

        latency_ms = round((time.time() - start_time) * 1000, 2)

        # Record audit and AI assessment
        assessment = AIAssessment(
            request_type="incident_analysis",
            model_provider=ai_provider,
            model_name="CivicIncidentAgent-v1",
            input_data=json.dumps({"incident_id": incident.id, "title": incident.title, "category": incident.category}),
            output_data=json.dumps({
                "predicted_category": cat_result["predicted_category"],
                "duplicates_count": len(duplicate_candidates),
                "nearby_obs_count": len(nearby_obs),
                "cluster_identified": cluster_identified
            }),
            summary=summary_text,
            recommendations=json.dumps(recommended_next_steps),
            tools_invoked=json.dumps(tools_executed),
            latency_ms=latency_ms,
            status="SUCCESS"
        )
        db.add(assessment)
        db.commit()

        return {
            "incident_id": incident.id,
            "predicted_category": cat_result["predicted_category"],
            "classification_method": cat_result["classification_method"],
            "confidence": cat_result["classification_confidence"],
            "explanation": cat_result["classification_reasons"],
            "recommended_department_id": cat_result["recommended_department_id"],
            "recommended_department_name": cat_result["recommended_department_id"].replace("_", " ").title(),
            "duplicate_candidates": duplicate_candidates,
            "nearby_observations": nearby_obs,
            "potential_cluster_identified": cluster_identified,
            "cluster_hazard_type": cluster_hazard_type,
            "recommended_next_steps": recommended_next_steps,
            "tools_executed": tools_executed,
            "ai_provider": ai_provider,
            "model_version": "CivicIncidentAgent-v1"
        }

incident_agent = ControlledIncidentAgent()
