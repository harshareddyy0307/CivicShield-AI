from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class RoadObservationReview(BaseModel):
    review_status: str = Field(..., description="VERIFIED, REJECTED, or CORRECTED")
    reviewer_notes: Optional[str] = None
    corrected_classes: Optional[List[str]] = None
    link_incident_id: Optional[str] = None

class RoadObservationResponse(BaseModel):
    id: str
    related_incident_id: Optional[str] = None
    original_image_path: str
    annotated_image_path: Optional[str] = None
    detection_classes: List[str]
    model_scores: Dict[str, float]
    bounding_boxes: List[Dict[str, Any]] = []
    model_id: str
    model_version: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_description: Optional[str] = None
    review_status: str
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    human_corrections: Optional[Dict[str, Any]] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ModelStatusResponse(BaseModel):
    status: str  # "loaded", "unavailable", "fallback_analyzer"
    model_name: str
    model_version: str
    supported_classes: List[str]
    weights_configured: bool
    message: str
    device: str
