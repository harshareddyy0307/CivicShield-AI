from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    category: str = Field(..., description="pothole, damaged_road, blocked_drain, water_leakage, waterlogging, garbage_accumulation, broken_streetlight, road_obstruction, damaged_public_infrastructure, other")
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_description: Optional[str] = None
    jurisdiction: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    is_demo: Optional[bool] = False

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_department_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    notes: Optional[str] = None
    action_type: Optional[str] = "STATUS_CHANGE"

class EvidenceResponse(BaseModel):
    id: str
    incident_id: str
    file_name: str
    file_type: str
    file_size: int
    caption: Optional[str] = None
    is_resolution_evidence: bool = False
    file_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentStatusHistoryResponse(BaseModel):
    id: str
    incident_id: str
    from_status: Optional[str] = None
    to_status: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    notes: Optional[str] = None
    action_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    latitude: float
    longitude: float
    location_description: Optional[str] = None
    jurisdiction: Optional[str] = None
    reporter_id: str
    assigned_department_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    predicted_category: Optional[str] = None
    classification_method: Optional[str] = None
    classification_confidence: Optional[float] = None
    classification_reasons: Optional[str] = None
    requires_human_review: bool
    is_duplicate: bool
    duplicate_of_id: Optional[str] = None
    duplicate_score: Optional[float] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    reporter_name: Optional[str] = None
    assigned_department_name: Optional[str] = None
    assigned_user_name: Optional[str] = None
    evidence: List[EvidenceResponse] = []
    history: List[IncidentStatusHistoryResponse] = []
    potential_duplicates: List[Any] = []
    related_incidents: List[Any] = []

class IncidentFilter(BaseModel):
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    department_id: Optional[str] = None
    reporter_id: Optional[str] = None
    search: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_demo: Optional[bool] = None
    limit: int = 50
    offset: int = 0
