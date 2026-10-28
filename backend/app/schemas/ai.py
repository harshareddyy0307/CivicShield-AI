from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class IncidentAnalysisRequest(BaseModel):
    incident_id: str
    include_duplicate_search: bool = True
    include_nearby_hazards: bool = True
    use_llm_if_available: bool = True

class IncidentAnalysisResponse(BaseModel):
    incident_id: str
    predicted_category: str
    classification_method: str
    confidence: Optional[float] = None
    explanation: str
    recommended_department_id: Optional[str] = None
    recommended_department_name: Optional[str] = None
    duplicate_candidates: List[Dict[str, Any]] = []
    nearby_observations: List[Dict[str, Any]] = []
    potential_cluster_identified: bool = False
    cluster_hazard_type: Optional[str] = None
    recommended_next_steps: List[str] = []
    tools_executed: List[str] = []
    ai_provider: str
    model_version: str

class CorrelationRequest(BaseModel):
    radius_meters: float = Field(default=1000.0, ge=100.0, le=10000.0)
    time_window_hours: float = Field(default=48.0, ge=1.0, le=168.0)
    min_evidence_count: int = Field(default=2, ge=2, le=20)

class CorrelationResponse(BaseModel):
    clusters_found: int
    new_clusters_created: int
    evaluated_incidents_count: int
    evaluated_observations_count: int
    cluster_summaries: List[Dict[str, Any]] = []
    correlation_method: str
    timestamp: str

class AIStatusResponse(BaseModel):
    vision_model_status: str
    vision_model_name: str
    vision_weights_configured: bool
    vision_supported_classes: List[str]
    llm_provider: str
    llm_configured: bool
    llm_model: str
    natural_language_interpretation_ready: bool
    deterministic_agent_ready: bool
    text_similarity_engine: str
    message: str
