from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    resource_type: str = Field(..., description="INSPECTION_TEAM, ROAD_MAINTENANCE_TEAM, DRAINAGE_MAINTENANCE_TEAM, EMERGENCY_RESPONSE_TEAM, PUMP_EQUIPMENT, HEAVY_MACHINERY")
    department_id: Optional[str] = None
    capacity: int = 1
    capabilities: List[str] = []
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    is_demo: Optional[bool] = False

class ResourceResponse(BaseModel):
    id: str
    name: str
    resource_type: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    status: str
    capacity: int
    capabilities: List[str]
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    contact_person: Optional[str] = None
    phone_number: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ResourceAssignmentCreate(BaseModel):
    resource_id: str
    incident_id: Optional[str] = None
    cluster_id: Optional[str] = None
    instructions: str = Field(..., min_length=5)
    priority: str = "MEDIUM"
    target_latitude: float
    target_longitude: float
    allocation_method: Optional[str] = "manual_coordinator"

class ResourceAssignmentUpdate(BaseModel):
    assignment_status: str = Field(..., description="APPROVED, REJECTED, EN_ROUTE, ON_SITE, COMPLETED, CANCELLED")
    notes: Optional[str] = None

class ResourceAssignmentResponse(BaseModel):
    id: str
    resource_id: str
    resource_name: Optional[str] = None
    resource_type: Optional[str] = None
    incident_id: Optional[str] = None
    cluster_id: Optional[str] = None
    assignment_status: str
    priority: str
    target_latitude: float
    target_longitude: float
    instructions: str
    estimated_distance_km: Optional[float] = None
    allocation_method: str
    proposed_by: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_demo: bool

    class Config:
        from_attributes = True
