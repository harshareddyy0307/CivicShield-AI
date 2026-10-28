# CivicShield AI - System Architecture

## 1. System Vision & Objective
CivicShield AI is an intelligent civic infrastructure monitoring and emergency coordination platform that unifies three integrated modules:
1. **Module A: CivicFix AI** - Citizen civic complaint reporting, automated deterministic triage, duplicate detection, and lifecycle tracking.
2. **Module B: RoadWatch AI** - Computer vision screening of pavement distress, potholes, cracks, and road degradation.
3. **Module C: DisasterConnect AI** - Multi-hazard incident correlation, potential emergency cluster detection, evidence synthesis, and coordinated field resource response.

## 2. Architectural Blueprint
CivicShield AI follows a modular monolithic architecture, allowing clean separation of domain concerns while maintaining rapid operational efficiency.

```
+-----------------------------------------------------------------------------------+
|                            CivicShield Web Dashboard                              |
|   React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Leaflet GIS + Recharts |
+-----------------------------------------------------------------------------------+
                                         │  HTTP / REST API (JSON)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             FastAPI Backend Core                                  |
|                                                                                   |
|  [Auth & RBAC]         [CivicFix Router]      [RoadWatch Router] [Disaster Router]|
|  - Citizen             - Complaint Ingestion  - CV Model Status  - Cluster Engine |
|  - Staff               - Triage & Routing     - Evidence Storage - Evidence Synth |
|  - Coordinator         - Status Transitions   - Staff Review     - Recommendations|
|  - Administrator       - Lifecycle History    - Correction Log   - Task Dispatch  |
|                                                                                   |
|  [Shared Incident Intelligence Engine]                                            |
|  - Ingestion -> Validation -> Normalization -> Categorization -> Spatial Match -> |
|    Duplicate Detection -> Relationship Analysis -> Potential Cluster Detection -> |
|    Evidence Summary -> Recommendation Generation -> Human Verification            |
|                                                                                   |
|  [Hybrid AI Architecture]                                                         |
|  - Layer 1: Deterministic Rules & PostGIS/Haversine Spatial Calculations          |
|  - Layer 2: Scikit-learn TF-IDF Text Similarity & RoadWatch Computer Vision       |
|  - Layer 3: Controlled AI Agent & Optional Replaceable Cloud LLM (Gemini)         |
+-----------------------------------------------------------------------------------+
                                         │  SQLAlchemy ORM
                                         ▼
+-----------------------------------------------------------------------------------+
|                        PostgreSQL + PostGIS / SQLite                              |
|  Normalized schemas: users, departments, incidents, incident_evidence,            |
|  road_observations, model_predictions, incident_relationships, status_history,    |
|  emergency_clusters, emergency_cluster_members, resources, assignments, audit_logs|
+-----------------------------------------------------------------------------------+
```

## 3. Shared Incident Intelligence Engine Pipeline
Every submitted incident traverses an audited, deterministic intelligence pipeline:
1. **Validation & Security**: MIME type verification, file magic byte signature inspection, and field constraints.
2. **Deterministic Categorization**: Rule-based matching against municipal infrastructure keywords. Never fabricates artificial confidence scores for keyword heuristics.
3. **Department Routing**: Deterministic mapping of categories to jurisdictional authorities (e.g. Roads & Bridges, Water Supply & Sewerage, Electrical).
4. **Spatial & Temporal Proximity**: Great-circle Haversine distance and temporal window comparisons.
5. **Multi-Factor Duplicate Candidate Discovery**: Composite scoring combining spatial proximity (35%), lexical text similarity (30%), category compatibility (20%), and temporal proximity (15%). Never auto-merges records without staff authorization.
6. **Multi-Hazard Cluster Correlation**: Evaluates cascading infrastructure failure patterns:
   - Drainage obstruction + downstream waterlogging + road pavement cratering = **DRAINAGE_CASCADE**
   - Severe weather warning + localized surface water retention = **FLOODING**
   - High spatial density within 600m radius = **SPATIAL_CLUSTER**
7. **Evidence Synthesis & Recommendations**: Transparent generation of itemized evidence summaries and prioritized field inspection recommendations.
8. **Human-in-the-Loop Verification**: Authoritative state transitions and resource dispatches require authorized public-service personnel approval.
