import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Role:
    CITIZEN = "CITIZEN"
    MUNICIPAL_STAFF = "MUNICIPAL_STAFF"
    EMERGENCY_COORDINATOR = "EMERGENCY_COORDINATOR"
    ADMINISTRATOR = "ADMINISTRATOR"
    ALL = [CITIZEN, MUNICIPAL_STAFF, EMERGENCY_COORDINATOR, ADMINISTRATOR]

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="department")
    incidents = relationship("Incident", back_populates="assigned_department")
    resources = relationship("Resource", back_populates="department")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    role = Column(String(30), default=Role.CITIZEN, nullable=False, index=True)
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="users")
    reported_incidents = relationship("Incident", foreign_keys="Incident.reporter_id", back_populates="reporter")
    assigned_incidents = relationship("Incident", foreign_keys="Incident.assigned_user_id", back_populates="assigned_user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(40), default="SUBMITTED", nullable=False, index=True)
    # SUBMITTED, UNDER_REVIEW, INSPECTION_REQUIRED, ASSIGNED, IN_PROGRESS, RESOLVED_PENDING_VERIFICATION, CLOSED, REOPENED
    
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    location_description = Column(String(255), nullable=True)
    jurisdiction = Column(String(100), nullable=True)
    
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    assigned_department_id = Column(String(50), ForeignKey("departments.id"), nullable=True, index=True)
    assigned_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # AI categorization explainability
    predicted_category = Column(String(50), nullable=True)
    classification_method = Column(String(50), nullable=True)  # deterministic_rules, scikit_learn, manual
    classification_confidence = Column(Float, nullable=True)
    classification_reasons = Column(Text, nullable=True)
    requires_human_review = Column(Boolean, default=True)
    
    # Duplicate tracking
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)
    duplicate_score = Column(Float, nullable=True)
    
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_incidents")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id], back_populates="assigned_incidents")
    assigned_department = relationship("Department", back_populates="incidents")
    evidence = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    history = relationship("IncidentStatusHistory", back_populates="incident", cascade="all, delete-orphan", order_by="IncidentStatusHistory.created_at.desc()")
    inspection_tasks = relationship("InspectionTask", back_populates="incident", cascade="all, delete-orphan")
    road_observations = relationship("RoadObservation", back_populates="related_incident")

class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=True)
    caption = Column(String(255), nullable=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_resolution_evidence = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="evidence")

class RoadObservation(Base):
    __tablename__ = "road_observations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    related_incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True, index=True)
    original_image_path = Column(String(500), nullable=False)
    annotated_image_path = Column(String(500), nullable=True)
    
    detection_classes = Column(Text, nullable=False)  # JSON string array
    model_scores = Column(Text, nullable=False)       # JSON string dict
    bounding_boxes = Column(Text, nullable=True)      # JSON string list of bounding boxes
    
    model_id = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    location_description = Column(String(255), nullable=True)
    
    # Review workflow
    review_status = Column(String(30), default="PENDING", index=True)  # PENDING, VERIFIED, REJECTED, CORRECTED
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    human_corrections = Column(Text, nullable=True)   # Separate JSON for human corrections
    
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    related_incident = relationship("Incident", back_populates="road_observations")

class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    target_type = Column(String(50), nullable=False)  # incident, road_observation
    target_id = Column(String(36), nullable=False, index=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    input_hash = Column(String(64), nullable=True)
    raw_output = Column(Text, nullable=False)  # JSON
    confidence = Column(Float, nullable=True)
    latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IncidentRelationship(Base):
    __tablename__ = "incident_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    related_incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(String(50), nullable=False)  # DUPLICATE_CANDIDATE, SPATIAL_CLUSTER, INFRASTRUCTURE_CORRELATION, CASCADE_EFFECT
    matching_method = Column(String(50), nullable=False)
    similarity_score = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    time_delta_hours = Column(Float, nullable=True)
    supporting_evidence = Column(Text, nullable=True)  # JSON
    review_status = Column(String(30), default="PENDING")  # PENDING, CONFIRMED, DISMISSED
    reviewed_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class IncidentStatusHistory(Base):
    __tablename__ = "incident_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status = Column(String(40), nullable=True)
    to_status = Column(String(40), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    action_type = Column(String(50), default="STATUS_CHANGE")  # STATUS_CHANGE, ASSIGNMENT, INSPECTION_NOTE, VERIFICATION, REOPEN
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    incident = relationship("Incident", back_populates="history")
    actor = relationship("User", foreign_keys=[actor_id])

class EmergencyCluster(Base):
    __tablename__ = "emergency_clusters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    hazard_type = Column(String(50), nullable=False)
    severity = Column(String(30), default="POTENTIAL")  # POTENTIAL, MODERATE, CRITICAL, CATASTROPHIC
    status = Column(String(40), default="DETECTED", index=True)
    # DETECTED, AWAITING_VERIFICATION, VERIFIED, RESPONSE_PLANNING, RESPONSE_IN_PROGRESS, RESOLVED, DISMISSED
    
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, nullable=False, default=500.0)
    
    evidence_summary = Column(Text, nullable=False)
    recommended_actions = Column(Text, nullable=False)  # JSON list
    missing_evidence = Column(Text, nullable=True)
    contradictory_evidence = Column(Text, nullable=True)
    
    assigned_coordinator_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    is_demo = Column(Boolean, default=False)
    first_observed_at = Column(DateTime, default=datetime.utcnow)
    latest_evidence_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("EmergencyClusterMember", back_populates="cluster", cascade="all, delete-orphan")
    assignments = relationship("ResourceAssignment", back_populates="cluster")
    assigned_coordinator = relationship("User", foreign_keys=[assigned_coordinator_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])

class EmergencyClusterMember(Base):
    __tablename__ = "emergency_cluster_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cluster_id = Column(String(36), ForeignKey("emergency_clusters.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)
    road_observation_id = Column(String(36), ForeignKey("road_observations.id"), nullable=True)
    external_alert_id = Column(String(36), ForeignKey("external_alerts.id"), nullable=True)
    contribution_reason = Column(String(255), nullable=False)
    distance_from_center_meters = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cluster = relationship("EmergencyCluster", back_populates="members")
    incident = relationship("Incident")
    road_observation = relationship("RoadObservation")
    external_alert = relationship("ExternalAlert")

class Resource(Base):
    __tablename__ = "resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False, index=True)
    # INSPECTION_TEAM, ROAD_MAINTENANCE_TEAM, DRAINAGE_MAINTENANCE_TEAM, EMERGENCY_RESPONSE_TEAM, PUMP_EQUIPMENT, HEAVY_MACHINERY
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    status = Column(String(30), default="AVAILABLE", index=True)  # AVAILABLE, DEPLOYED, MAINTENANCE, OFF_DUTY
    capacity = Column(Integer, default=1)
    capabilities = Column(Text, nullable=False)  # JSON array
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone_number = Column(String(30), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = relationship("Department", back_populates="resources")
    assignments = relationship("ResourceAssignment", back_populates="resource")

class ResourceAssignment(Base):
    __tablename__ = "resource_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_id = Column(String(36), ForeignKey("resources.id"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id"), nullable=True)
    cluster_id = Column(String(36), ForeignKey("emergency_clusters.id"), nullable=True)
    assignment_status = Column(String(30), default="PROPOSED", index=True)
    # PROPOSED, APPROVED, REJECTED, EN_ROUTE, ON_SITE, COMPLETED, CANCELLED
    priority = Column(String(20), default="MEDIUM")
    target_latitude = Column(Float, nullable=False)
    target_longitude = Column(Float, nullable=False)
    instructions = Column(Text, nullable=False)
    estimated_distance_km = Column(Float, nullable=True)
    allocation_method = Column(String(50), default="baseline_heuristic")
    proposed_by = Column(String(100), default="IntelligenceEngine")
    approved_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)

    resource = relationship("Resource", back_populates="assignments")
    cluster = relationship("EmergencyCluster", back_populates="assignments")
    incident = relationship("Incident")
    approved_by = relationship("User", foreign_keys=[approved_by_id])

class InspectionTask(Base):
    __tablename__ = "inspection_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_staff_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    task_type = Column(String(50), nullable=False)  # INITIAL_ASSESSMENT, SAFETY_INSPECTION, REPAIR_VERIFICATION
    status = Column(String(30), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, BLOCKED
    findings = Column(Text, nullable=True)
    recommended_priority = Column(String(20), nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="inspection_tasks")
    assigned_staff = relationship("User", foreign_keys=[assigned_staff_id])

class ExternalAlert(Base):
    __tablename__ = "external_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source = Column(String(100), nullable=False)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(30), nullable=False)  # ADVISORY, WATCH, WARNING, EMERGENCY
    headline = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=2000.0)
    issued_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    reference_type = Column(String(50), nullable=True)  # incident, cluster, assignment
    reference_id = Column(String(36), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="notifications")

class AIAssessment(Base):
    __tablename__ = "ai_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_type = Column(String(50), nullable=False)
    model_provider = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    input_data = Column(Text, nullable=False)  # JSON
    output_data = Column(Text, nullable=False)  # JSON
    summary = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=False)  # JSON
    tools_invoked = Column(Text, nullable=True)  # JSON list
    latency_ms = Column(Float, default=0.0)
    status = Column(String(30), default="SUCCESS")  # SUCCESS, FALLBACK, ERROR
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=True)  # JSON
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", foreign_keys=[user_id])

class ApplicationSetting(Base):
    __tablename__ = "application_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)  # JSON
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
