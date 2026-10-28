export type UserRole = 'CITIZEN' | 'MUNICIPAL_STAFF' | 'EMERGENCY_COORDINATOR' | 'ADMINISTRATOR';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  department_id?: string;
  is_active: boolean;
  created_at: string;
}

export type IncidentCategory =
  | 'pothole'
  | 'damaged_road'
  | 'blocked_drain'
  | 'water_leakage'
  | 'waterlogging'
  | 'garbage_accumulation'
  | 'broken_streetlight'
  | 'road_obstruction'
  | 'damaged_public_infrastructure'
  | 'other';

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'INSPECTION_REQUIRED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED_PENDING_VERIFICATION'
  | 'CLOSED'
  | 'REOPENED';

export interface IncidentEvidence {
  id: string;
  incident_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  caption?: string;
  is_resolution_evidence: boolean;
  file_path: string;
  created_at: string;
}

export interface IncidentStatusHistory {
  id: string;
  incident_id: string;
  from_status?: string;
  to_status: string;
  actor_id?: string;
  actor_name?: string;
  notes?: string;
  action_type: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  location_description?: string;
  jurisdiction?: string;
  reporter_id: string;
  reporter_name?: string;
  assigned_department_id?: string;
  assigned_department_name?: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  predicted_category?: string;
  classification_method?: string;
  classification_confidence?: number;
  classification_reasons?: string;
  requires_human_review: boolean;
  is_duplicate: boolean;
  duplicate_of_id?: string;
  duplicate_score?: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  verified_at?: string;
  closed_at?: string;
  evidence?: IncidentEvidence[];
  history?: IncidentStatusHistory[];
  potential_duplicates?: any[];
}

export interface RoadObservation {
  id: string;
  related_incident_id?: string;
  original_image_path: string;
  annotated_image_path?: string;
  detection_classes: string[];
  model_scores: Record<string, number>;
  bounding_boxes: Array<{ class: string; box: number[]; score: number }>;
  model_id: string;
  model_version: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
  review_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CORRECTED';
  reviewer_id?: string;
  reviewer_notes?: string;
  human_corrections?: any;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export type HazardType =
  | 'DRAINAGE_CASCADE'
  | 'FLOODING'
  | 'WATERLOGGING_ROAD_BLOCKAGE'
  | 'SEVERE_ROAD_DAMAGE'
  | 'SPATIAL_CLUSTER'
  | 'MULTI_HAZARD';

export type ClusterStatus =
  | 'DETECTED'
  | 'AWAITING_VERIFICATION'
  | 'VERIFIED'
  | 'RESPONSE_PLANNING'
  | 'RESPONSE_IN_PROGRESS'
  | 'RESOLVED'
  | 'DISMISSED';

export interface EmergencyClusterMember {
  id: string;
  incident_id?: string;
  road_observation_id?: string;
  external_alert_id?: string;
  contribution_reason: string;
  distance_from_center_meters?: number;
  title?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

export interface EmergencyCluster {
  id: string;
  title: string;
  hazard_type: HazardType;
  severity: string;
  status: ClusterStatus;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  evidence_summary: string;
  recommended_actions: string[];
  missing_evidence?: string;
  contradictory_evidence?: string;
  assigned_coordinator_id?: string;
  verified_by_id?: string;
  verification_notes?: string;
  is_demo: boolean;
  first_observed_at: string;
  latest_evidence_at: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  members?: EmergencyClusterMember[];
  assignments?: any[];
}

export interface ExternalAlert {
  id: string;
  source: string;
  alert_type: string;
  severity: string;
  headline: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  issued_at: string;
  expires_at: string;
  is_verified: boolean;
  is_demo: boolean;
}

export interface Resource {
  id: string;
  name: string;
  resource_type: string;
  department_id?: string;
  department_name?: string;
  status: 'AVAILABLE' | 'DEPLOYED' | 'MAINTENANCE' | 'OFF_DUTY';
  capacity: number;
  capabilities: string[];
  current_latitude?: number;
  current_longitude?: number;
  contact_person?: string;
  phone_number?: string;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceAssignment {
  id: string;
  resource_id: string;
  resource_name?: string;
  resource_type?: string;
  incident_id?: string;
  cluster_id?: string;
  assignment_status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EN_ROUTE' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED';
  priority: string;
  target_latitude: number;
  target_longitude: number;
  instructions: string;
  estimated_distance_km?: number;
  allocation_method: string;
  proposed_by?: string;
  approved_by_id?: string;
  approved_by_name?: string;
  assigned_at: string;
  completed_at?: string;
  notes?: string;
  is_demo: boolean;
}

export interface AnalyticsOverview {
  metrics: {
    total_incidents: number;
    open_incidents: number;
    awaiting_review: number;
    in_progress: number;
    resolved_incidents: number;
    emergency_clusters_total: number;
    active_emergency_clusters: number;
    road_observations_total: number;
    active_resources_count: number;
  };
  category_distribution: Array<{ category: string; count: number; percentage: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  trends: Array<{ date: string; submitted: number; resolved: number }>;
  road_damage_breakdown: Array<{ damage_class: string; count: number }>;
  resolution_rate_percent: number;
  avg_resolution_time_hours?: number;
}

export interface AIStatus {
  vision_model_status: string;
  vision_model_name: string;
  vision_weights_configured: boolean;
  vision_supported_classes: string[];
  llm_provider: string;
  llm_configured: boolean;
  llm_model: string;
  natural_language_interpretation_ready: boolean;
  deterministic_agent_ready: boolean;
  text_similarity_engine: string;
  message: string;
}
