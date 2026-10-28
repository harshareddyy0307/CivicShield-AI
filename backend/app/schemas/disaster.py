from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ClusterMemberResponse(BaseModel):
    id: str
    incident_id: Optional[str] = None
    road_observation_id: Optional[str] = None
    external_alert_id: Optional[str] = None
    contribution_reason: str
    distance_from_center_meters: Optional[float] = None
    title: Optional[str] = None
    category: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EmergencyClusterResponse(BaseModel):
    id: str
    title: str
    hazard_type: str
    severity: str
    status: str
    center_latitude: float
    center_longitude: float
    radius_meters: float
    evidence_summary: str
    recommended_actions: List[str]
    missing_evidence: Optional[str] = None
    contradictory_evidence: Optional[str] = None
    assigned_coordinator_id: Optional[str] = None
    verified_by_id: Optional[str] = None
    verification_notes: Optional[str] = None
    is_demo: bool
    first_observed_at: datetime
    latest_evidence_at: datetime
    created_at: datetime
    updated_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True

class EmergencyClusterDetailResponse(EmergencyClusterResponse):
    members: List[ClusterMemberResponse] = []
    assignments: List[Any] = []

class ClusterReviewRequest(BaseModel):
    status: str = Field(..., description="VERIFIED, RESPONSE_PLANNING, RESPONSE_IN_PROGRESS, RESOLVED, or DISMISSED")
    notes: Optional[str] = None
    coordinator_id: Optional[str] = None

class ExternalAlertResponse(BaseModel):
    id: str
    source: str
    alert_type: str
    severity: str
    headline: str
    description: str
    latitude: float
    longitude: float
    radius_meters: float
    issued_at: datetime
    expires_at: datetime
    is_verified: bool
    is_demo: bool

    class Config:
        from_attributes = True
