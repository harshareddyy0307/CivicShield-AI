# CivicShield AI

**Unified AI Platform for Civic Infrastructure Intelligence, Road Damage Detection, and Emergency Response**

---

## 1. Executive Summary & Purpose

**CivicShield AI** is an intelligent public infrastructure monitoring and emergency coordination platform designed for municipal governments, public works departments, and emergency response authorities.

Modern municipalities frequently suffer from siloed public data:
- Road departments track potholes independently of drainage teams.
- Citizens report standing water on social media or generic helplines without geolocation.
- Emergency services only become aware of critical culvert failures when low-lying roads are already submerged.

CivicShield AI bridges these silos into a **single, shared geospatial intelligence platform** connecting three core operational systems:
- **Module A: CivicFix AI** &mdash; Intelligent citizen complaint management, automated triage, composite duplicate detection, and verified lifecycle tracking.
- **Module B: RoadWatch AI** &mdash; Computer vision road damage screening, genuine model execution with strict confidence thresholds, and manual surveyor fallbacks.
- **Module C: DisasterConnect AI** &mdash; Multi-hazard cascade correlation, potential emergency clustering, resource coordination with driving detour calculations, and coordinator verification workflows.

```
       CITIZEN COMPLAINTS         ROAD SURVEY CAMERAS          EXTERNAL SENSORS
        (CivicFix AI)               (RoadWatch AI)             (Weather / Alerts)
              │                           │                            │
              └───────────────────┬───────┴────────────────────────────┘
                                  ▼
                SHARED INCIDENT INTELLIGENCE ENGINE
                ├── Spatial-Temporal Distance Matrix (Haversine + Detour)
                ├── TF-IDF & Cosine Text Semantic Similarity
                ├── Deterministic Multi-Hazard Cascade Rules
                └── Composite Duplicate Detection Scoring
                                  │
                                  ▼
                EMERGENCY CLUSTERING & RESOURCE MATCHING
                        (DisasterConnect AI)
                                  │
                                  ▼
               HUMAN-IN-THE-LOOP VERIFICATION DASHBOARD
             (Municipal Staff, Coordinators, Administrators)
```

---

## 2. Core Modules Breakdown

### Module A: CivicFix AI (Civic Complaint Management)
- **10 Core Infrastructure Categories**: Potholes, Damaged Roads, Blocked Drains, Water Leakage, Waterlogging, Garbage Accumulation, Broken Streetlights, Road Obstructions, Damaged Public Infrastructure, and Other Civic Issues.
- **Explainable Triage**: Deterministic keyword baseline with explicit match evidence; human review flags are generated when complaints are ambiguous or cross jurisdictional boundaries.
- **Automated Duplicate Detection**: 4-part weighted composite similarity algorithm:
  $$\text{Score} = 0.35 \times S_{\text{geo}} + 0.30 \times S_{\text{text}} + 0.20 \times S_{\text{cat}} + 0.15 \times S_{\text{time}}$$
- **Audited Lifecycle**: Enforces transition rules (`SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `INSPECTION_REQUIRED` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED_PENDING_VERIFICATION` $\to$ `CLOSED` or `REOPENED`). Unverified closure is blocked.
- **Evidence Management**: Image upload with MIME type and magic-byte header validation (JPEG, PNG, WebP).

### Module B: RoadWatch AI (Road Damage Computer Vision Screening)
- **Architectural Abstraction**: Clean `RoadVisionModelInterface` isolating deep learning dependencies from API controllers.
- **Zero Fabricated Detections**: When model weights are unconfigured, the system explicitly reports `MODEL_NOT_CONFIGURED` or `PENDING_INSPECTION` with `confidence = 0.0` and empty bounding boxes.
- **Verification & Correction Workflow**: Municipal staff can inspect images, verify genuine damage, adjust bounding boxes and severity classes, or flag false positives.
- **Manual Observation Stream**: Field surveyors can record road observations with manual severity ratings (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) when cameras or CV models are offline.

### Module C: DisasterConnect AI (Multi-Hazard Correlation & Response)
- **Cascading Failure Detection**: Correlates drainage failures, standing water, and road surface degradation within a configurable spatial radius ($\le 500\,\text{m}$) and temporal window ($\le 24\,\text{h}$).
- **Potential vs. Verified Separation**: Clusters are flagged as `POTENTIAL` until an authorized Emergency Coordinator inspects the evidence and updates the status to `VERIFIED`.
- **Resource Dispatch Optimization**: Matches available municipal assets (high-capacity water pumps, rescue skiffs, barricades, sandbag trucks) using capability filtering and driving distance estimation ($1.28\times$ urban detour factor).
- **External Alert Ingestion**: Correlates active municipal incidents against severe weather advisories or river sensor thresholds.

---

## 3. System Architecture & Technical Stack

CivicShield AI uses a **modular monolithic architecture** designed for easy containerization and eventual microservice extraction.

```
├── frontend/                     # React 18 + TypeScript + Vite Single Page Application
│   ├── src/
│   │   ├── api/                 # Typed API client services
│   │   ├── components/          # Reusable UI (Navbar, Sidebar, Badges, Map)
│   │   ├── context/             # Authentication & active persona context
│   │   ├── pages/               # 10 Role-based application views
│   │   └── types/               # Full TypeScript definitions
│   └── dist/                    # Production bundle
│
├── backend/                      # Python 3.10+ FastAPI Monolith
│   ├── app/
│   │   ├── ai/                  # 3-Tier AI Architecture (Rules, ML, LLM)
│   │   │   ├── agent/           # Controlled Agent with 7 sandboxed tools
│   │   │   ├── classification/  # Deterministic keyword categorizer
│   │   │   ├── correlation/     # Cluster engine, text similarity, duplicate detector
│   │   │   ├── providers/       # Gemini cloud LLM provider interface
│   │   │   └── vision/          # RoadWatch CV model interface & screening
│   │   ├── api/routes/          # REST API endpoints (v1)
│   │   ├── core/                # Configuration and environment settings
│   │   ├── database/            # SQLAlchemy session & SQLite/PostgreSQL connectors
│   │   ├── geospatial/          # Haversine spatial math & urban detour calculations
│   │   ├── models/              # 18 Normalized SQLAlchemy database models
│   │   ├── reporting/           # Municipal KPI report generation & CSV export
│   │   ├── resources/           # Capability-proximity resource allocator
│   │   ├── schemas/             # Pydantic v2 validation schemas
│   │   └── security/            # Native bcrypt hashing, JWT auth, and RBAC guards
│   ├── scripts/
│   │   └── seed_demo_data.py    # Section 19 demonstration scenario seeder
│   └── tests/
│       └── test_civicshield.py  # Comprehensive test suite
│
├── docs/                        # Complete technical documentation
│   ├── architecture.md          # Architectural blueprints and pipeline diagrams
│   ├── api.md                   # REST API specification
│   ├── ai_models.md             # AI models, weights, and provider guide
│   ├── deployment.md            # Local & Docker production deployment guide
│   └── limitations.md           # Ethical disclaimers & verification boundaries
│
├── docker-compose.yml           # Production Docker multi-container stack
├── Dockerfile                   # Backend & Frontend container specifications
└── civicshield.db               # SQLite database with seeded demo scenario
```

### The 3-Tier Hybrid AI Architecture
1. **Layer 1: Deterministic Baseline (Zero Dependencies)**
   - Always runs locally with zero external API calls or GPU requirements.
   - Fast keyword matching, exact regex, and distance thresholds.
2. **Layer 2: Classical Machine Learning & CV (Local Inference)**
   - Scikit-learn TF-IDF vectorization and cosine similarity for complaint texts.
   - Computer vision model interface (YOLOv8/ONNX) for road damage detection.
3. **Layer 3: Replaceable Cloud LLM (Optional Cloud Intelligence)**
   - Google Gemini API integration for natural language complaint summaries and response action drafting.
   - **Crucial Rule**: The entire platform functions with 100% operational capability even when `LLM_PROVIDER=none` or `LLM_API_KEY` is omitted.

---

## 4. Role-Based Access Control & Demonstration Personas

CivicShield AI enforces strict backend role verification on all API endpoints. The frontend navigation includes an instant **1-Click Persona Switcher** on the top navigation bar for testing.

| Role | Demo Email | Demo Password | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicshield.local` | `Citizen123!` | File complaints, attach photos, drop map pins, track own complaints, view status history. |
| **Municipal Staff** | `staff@civicshield.local` | `Staff123!` | View department incidents, inspect evidence, transition statuses (`UNDER_REVIEW` $\to$ `IN_PROGRESS`), submit resolution notes. |
| **Emergency Coordinator** | `coordinator@civicshield.local` | `Coordinator123!` | Review potential multi-hazard clusters, verify emergencies, inspect cascade evidence, assign response fleets. |
| **Administrator** | `admin@civicshield.local` | `Admin123!` | Manage user roles, configure departments, inspect AI provider status, download audit logs, run system health diagnostics. |

---

## 5. Walkthrough of the Section 19 Demonstration Scenario

To demonstrate how CivicShield AI correlates seemingly disconnected civic complaints into an urgent response action, the following scenario is pre-seeded in the database:

1. **Incident #1 (14:15)**: Citizen Rahul Sharma submits a complaint for a **Blocked Culvert Drain** on Subhash Marg (`12.9716, 77.5946`).
2. **Incident #2 (15:30)**: Citizen Priya Patel reports **Severe Waterlogging (40 cm depth)** accumulating $120\,\text{m}$ down the road on Subhash Marg (`12.9724, 77.5951`).
3. **Incident #3 (16:10)**: RoadWatch vehicle camera records a **Severe Pothole / Structural Road Crack** at `12.9719, 77.5948` caused by water softening the road subgrade.
4. **External Alert (16:00)**: State Meteorological Centre issues a **Heavy Rainfall Advisory (Orange Warning)** for the Central Zone.
5. **Correlation Engine Trigger**:
   - Shared Incident Intelligence Engine detects 3 related incidents within a $150\,\text{m}$ radius occurring within 2 hours.
   - Multi-hazard cascading rule triggers: $\text{Blocked Drain} \to \text{Waterlogging} \to \text{Road Degradation} + \text{Severe Rain}$.
   - System synthesizes **Emergency Cluster `EMG-2026-0001`**: *"Cascading Drainage Failure & Severe Waterlogging on Subhash Marg Corridor"*.
6. **Coordinator Review**:
   - Coordinator logs in (`coordinator@civicshield.local`).
   - Cluster is displayed with clear warning badge `POTENTIAL (UNVERIFIED)`.
   - Coordinator reviews the combined spatial map and evidence timeline, then clicks **"Verify Emergency Cluster"**.
7. **Resource Dispatch**:
   - Coordinator opens the Resource Matcher; system recommends **High-Capacity Dewatering Pump 01** stationed $2.4\,\text{km}$ away at Central Municipal Yard.
   - Driving distance is estimated at $3.07\,\text{km}$ ($1.28\times$ urban detour factor).
   - Coordinator confirms deployment; asset status updates to `DISPATCHED`.

---

## 6. Installation & Quickstart Guide

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18 or higher (with `npm`)
- **Git**

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/your-org/civicshield-ai.git
cd civicshield-ai

# Copy environment template
cp .env.example .env
```

### Step 2: Backend Setup & Seeding
```bash
# 1. Create and activate a Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Seed demonstration scenario data (creates civicshield.db)
python backend/scripts/seed_demo_data.py
```

### Step 3: Run Backend Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation will be available at:* `http://localhost:8000/docs`

### Step 4: Frontend Setup & Launch
```bash
# In a separate terminal:
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
*Web Application will be available at:* `http://localhost:5173`

---

## 7. Production Docker Deployment

CivicShield AI includes full production containerization with PostgreSQL and PostGIS support:

```bash
# Build and start all services (PostGIS database, FastAPI backend, React frontend)
docker-compose up -d --build

# View container logs
docker-compose logs -f

# To stop the containers
docker-compose down
```

Services exposed:
- **Frontend Web UI**: `http://localhost:3000` (or `http://localhost:5173` in local dev)
- **Backend REST API**: `http://localhost:8000`
- **PostGIS Database**: `localhost:5432`

---

## 8. Verification & Test Suite

Run the comprehensive automated test suite verifying security, categorization, spatial calculations, duplicate detection formulas, CV abstraction, and database integrity:

```bash
# Run pytest backend test suite
python -m pytest backend/tests/test_civicshield.py -v
```

Expected result:
```
backend/tests/test_civicshield.py::test_password_hashing_and_jwt PASSED
backend/tests/test_civicshield.py::test_deterministic_categorization PASSED
backend/tests/test_civicshield.py::test_text_similarity PASSED
backend/tests/test_civicshield.py::test_spatial_calculations PASSED
backend/tests/test_civicshield.py::test_duplicate_detector PASSED
backend/tests/test_civicshield.py::test_vision_model_abstraction PASSED
backend/tests/test_civicshield.py::test_status_transitions_rules PASSED
backend/tests/test_civicshield.py::test_database_incident_and_cluster_queries PASSED
backend/tests/test_civicshield.py::test_reporting_generator PASSED

======================= 9 passed in 4.94s =======================
```

To verify the frontend TypeScript and build output:
```bash
cd frontend
npm run build
```
Output: `✓ built in 4.7s` with zero errors.

---

## 9. Vision & Cloud LLM Configuration

### RoadWatch Computer Vision Model
To attach an active YOLOv8 or ONNX road damage model:
1. Place your model weights file (e.g. `road_damage_yolov8.pt` or `model.onnx`) into `backend/models/weights/`.
2. Update your `.env` configuration:
   ```env
   VISION_MODEL_PATH=./backend/models/weights/road_damage_yolov8.pt
   VISION_MODEL_NAME=RoadDamageYOLOv8
   VISION_CONFIDENCE_THRESHOLD=0.45
   ```
3. Restart the backend service. The RoadWatch dashboard will automatically update from `MODEL_NOT_CONFIGURED` to `READY` with verified class metadata.

### Google Gemini Cloud LLM (Optional)
To enable generative intelligence for incident summaries and automated citizen notifications:
1. Obtain an API key from Google AI Studio.
2. Update your `.env`:
   ```env
   LLM_PROVIDER=gemini
   LLM_API_KEY=your_gemini_api_key_here
   LLM_MODEL=gemini-2.5-flash
   ```
3. When omitted, all triage, clustering, and routing continue to operate seamlessly via Layer 1 deterministic rules.

---

## 10. Ethical Disclaimers & Operational Boundaries

> **IMPORTANT NOTICE FOR PUBLIC SAFETY AUTHORITIES**
>
> 1. **Decision-Support Only**: CivicShield AI is an advisory intelligence and operational coordination tool. It does **NOT** autonomously declare civil emergencies, dispatch police or fire units, issue mandatory evacuation orders, or certify structural integrity of compromised bridges or roads.
> 2. **Verification Requirements**: All AI-generated triage classifications, duplicate candidates, and multi-hazard clusters require human verification by authorized municipal or emergency coordination personnel prior to high-impact actions.
> 3. **No Fabricated Data**: The system strictly forbids fabricated confidence scores or mock emergency alerts. Demonstration data records are clearly labeled with demonstration flags to prevent confusion with operational records.
> 4. **Privacy Protection**: Citizen Personally Identifiable Information (PII) is isolated and accessible only to authorized departmental staff in compliance with municipal data privacy regulations.

---

## 11. Documentation Directory (`docs/`)

For in-depth technical documentation, refer to the guides in the `docs/` folder:
- [Architecture & Intelligence Pipeline](file:///docs/architecture.md) &mdash; Detailed data flow diagrams and engine specifications.
- [REST API Reference](file:///docs/api.md) &mdash; Full endpoint documentation and request/response schemas.
- [AI Models & Provider Guide](file:///docs/ai_models.md) &mdash; Computer vision training, weights format, and LLM provider interfaces.
- [Production Deployment Guide](file:///docs/deployment.md) &mdash; Production checklist, SSL, backup, and PostGIS optimization.
- [Ethical AI & Civil Limitations](file:///docs/limitations.md) &mdash; Human-in-the-loop governance and safety protocols.

---

## 12. License & Credits

Developed for the **Hacktoberfest Civic Infrastructure Intelligence Initiative**.  
Licensed under the Apache License 2.0. Built with FastAPI, React, Leaflet, and Scikit-learn.
