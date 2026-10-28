import json
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.config import settings
from app.models import Incident, RoadObservation, ExternalAlert, EmergencyCluster, EmergencyClusterMember, User, Role
from app.schemas.ai import (
    IncidentAnalysisRequest, IncidentAnalysisResponse, CorrelationRequest,
    CorrelationResponse, AIStatusResponse
)
from app.security.deps import get_current_user, require_role
from app.ai.agent.incident_agent import incident_agent, AVAILABLE_TOOLS
from app.ai.correlation.cluster_engine import cluster_engine
from app.ai.vision.vision_service import vision_service
from app.ai.providers.llm_provider import llm_provider
from app.ai.correlation.text_similarity import text_similarity_service

router = APIRouter(prefix="/ai", tags=["AI & Controlled Agent Intelligence"])

@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    v_status = vision_service.get_model_status()
    llm_ready = llm_provider.is_configured()

    return AIStatusResponse(
        vision_model_status=v_status["status"],
        vision_model_name=v_status["model_name"],
        vision_weights_configured=v_status["weights_configured"],
        vision_supported_classes=v_status["supported_classes"],
        llm_provider=settings.LLM_PROVIDER,
        llm_configured=llm_ready,
        llm_model=settings.LLM_MODEL,
        natural_language_interpretation_ready=llm_ready,
        deterministic_agent_ready=True,
        text_similarity_engine=text_similarity_service.engine_name,
        message=(
            "Hybrid AI Operational: Deterministic rules, TF-IDF text similarity, and controlled agent tools active. "
            + ("Cloud LLM connected. " if llm_ready else "Running without optional LLM API key. ")
            + ("Vision model weights loaded." if v_status["weights_configured"] else "Vision model in manual observation mode.")
        )
    )

@router.get("/tools")
def get_agent_tools(current_user: User = Depends(get_current_user)):
    return {
        "agent_name": "ControlledIncidentAgent",
        "description": "Deterministic, sandboxed analysis tool orchestrator for civic infrastructure intelligence.",
        "tools": AVAILABLE_TOOLS
    }

@router.post("/analyze-incident", response_model=IncidentAnalysisResponse)
def analyze_incident(
    req: IncidentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    result = incident_agent.analyze_incident_pipeline(
        db=db,
        incident=incident,
        current_user=current_user,
        use_llm=req.use_llm_if_available
    )
    return result

@router.post("/correlate-incidents", response_model=CorrelationResponse)
def correlate_incidents(
    req: CorrelationRequest,
    current_user: User = Depends(require_role(Role.EMERGENCY_COORDINATOR, Role.ADMINISTRATOR, Role.MUNICIPAL_STAFF)),
    db: Session = Depends(get_db)
):
    incidents = db.query(Incident).all()
    observations = db.query(RoadObservation).all()
    alerts = db.query(ExternalAlert).all()

    candidates = cluster_engine.evaluate_potential_clusters(
        incidents=incidents,
        observations=observations,
        alerts=alerts,
        radius_meters=req.radius_meters,
        time_window_hours=req.time_window_hours
    )

    new_clusters_count = 0
    summaries = []

    for cand in candidates:
        # Check if an existing cluster already encompasses these incidents
        existing = db.query(EmergencyCluster).filter(
            EmergencyCluster.hazard_type == cand["hazard_type"],
            EmergencyCluster.status.in_(["DETECTED", "AWAITING_VERIFICATION", "VERIFIED"])
        ).first()

        if not existing:
            new_cluster = EmergencyCluster(
                title=cand["title"],
                hazard_type=cand["hazard_type"],
                severity=cand["severity"],
                status="DETECTED",
                center_latitude=cand["center_latitude"],
                center_longitude=cand["center_longitude"],
                radius_meters=cand["radius_meters"],
                evidence_summary=cand["evidence_summary"],
                recommended_actions=json.dumps(cand["recommended_actions"]),
                missing_evidence=cand["missing_evidence"],
                contradictory_evidence=cand["contradictory_evidence"],
                first_observed_at=cand["first_observed_at"],
                latest_evidence_at=cand["latest_evidence_at"],
                is_demo=any(inc.is_demo for inc in incidents if inc.id in cand["incident_ids"])
            )
            db.add(new_cluster)
            db.commit()
            db.refresh(new_cluster)

            # Add cluster members
            for inc_id in cand["incident_ids"]:
                member = EmergencyClusterMember(
                    cluster_id=new_cluster.id,
                    incident_id=inc_id,
                    contribution_reason="Civic complaint in spatial and temporal hazard zone"
                )
                db.add(member)

            for obs_id in cand["observation_ids"]:
                member = EmergencyClusterMember(
                    cluster_id=new_cluster.id,
                    road_observation_id=obs_id,
                    contribution_reason="Road damage observation in hazard vicinity"
                )
                db.add(member)

            for alt_id in cand["alert_ids"]:
                member = EmergencyClusterMember(
                    cluster_id=new_cluster.id,
                    external_alert_id=alt_id,
                    contribution_reason="Active external emergency warning overlapping cluster"
                )
                db.add(member)

            db.commit()
            new_clusters_count += 1
            summaries.append({
                "cluster_id": new_cluster.id,
                "title": new_cluster.title,
                "hazard_type": new_cluster.hazard_type,
                "members_count": len(cand["incident_ids"]) + len(cand["observation_ids"])
            })
        else:
            summaries.append({
                "cluster_id": existing.id,
                "title": existing.title,
                "hazard_type": existing.hazard_type,
                "status": "already_active"
            })

    return CorrelationResponse(
        clusters_found=len(candidates),
        new_clusters_created=new_clusters_count,
        evaluated_incidents_count=len(incidents),
        evaluated_observations_count=len(observations),
        cluster_summaries=summaries,
        correlation_method="Deterministic Multi-Hazard Spatial-Temporal Cascade Engine",
        timestamp=datetime.utcnow().isoformat() + "Z"
    )
