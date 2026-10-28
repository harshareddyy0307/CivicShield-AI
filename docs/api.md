# CivicShield AI - REST API Documentation

All API endpoints are versioned under `/api/v1`. Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

## 1. Authentication (`/api/v1/auth`)
- `POST /register`: Register a citizen account. Body: `{ email, password, full_name, phone_number, role? }`.
- `POST /login`: Authenticate and receive JWT bearer token. Body: `{ email, password }`.
- `GET /me`: Fetch authenticated user profile.
- `POST /logout`: Invalidate session and record audit event.

## 2. Civic Complaints (`/api/v1/incidents`)
- `POST /`: Submit a civic complaint. Automatically triggers deterministic categorization and department routing.
- `GET /`: List complaints with category, status, priority, and search filters. Citizens only see their own reports.
- `GET /{id}`: Retrieve incident details, evidence, history, and duplicate candidate analysis.
- `PATCH /{id}`: Update incident status or priority. Enforces valid state transitions and verification rules.
- `GET /{id}/history`: Retrieve immutable status transition audit timeline.
- `POST /{id}/evidence`: Upload supporting photographs with MIME and magic byte validation.

## 3. RoadWatch AI (`/api/v1/roadwatch`)
- `GET /model-status`: Retrieve active vision model status, loaded weights, and supported distress classes.
- `POST /analyze`: Ingest and screen road imagery. Returns genuine detections or records for manual staff review.
- `GET /observations`: List visual damage observations.
- `GET /observations/{id}`: Detailed observation view with bounding boxes and model scores.
- `POST /observations/{id}/review`: Staff action to verify, reject, or submit human corrections (preserved separately from original model outputs).

## 4. DisasterConnect AI (`/api/v1/disaster`)
- `GET /clusters`: List multi-hazard potential emergency clusters.
- `GET /clusters/{id}`: Full evidence synthesis, constituent incident members, and recommended actions.
- `POST /clusters/{id}/review`: Coordinator review action (VERIFIED, RESPONSE_PLANNING, RESOLVED, DISMISSED).
- `GET /alerts`: Retrieve active weather and road restriction warnings.

## 5. Resource Coordination (`/api/v1/resources`)
- `GET /`: List inspection teams, road maintenance crews, and pump equipment.
- `POST /`: Register new municipal equipment or team.
- `GET /assignments`: List field dispatch assignments.
- `POST /assignments`: Propose a resource deployment with estimated driving distance.
- `PATCH /assignments/{id}`: Coordinator action to APPROVE, REJECT, or mark COMPLETED.

## 6. Interactive GIS Map (`/api/v1/map`)
- `GET /incidents`: GeoJSON-compatible incident markers with category styling.
- `GET /clusters`: Circular emergency cluster geographic boundaries and center points.
- `GET /road-observations`: Visual distress screening coordinates.
- `GET /external-alerts`: Active severe weather polygon/radius warnings.

## 7. Hybrid AI Subsystem (`/api/v1/ai`)
- `GET /status`: Live health and configuration of all 3 AI layers.
- `POST /analyze-incident`: Execute the 7-tool controlled agent analysis pipeline on an incident.
- `POST /correlate-incidents`: Execute multi-hazard spatial-temporal cascade engine across reports.
- `GET /tools`: Schema catalog of controlled agent tools.

## 8. Reports & Administration (`/api/v1/reports`, `/api/v1/system`)
- `GET /reports/incidents`: Generate formal municipal summary report.
- `GET /reports/export/incidents.csv`: Download CSV export of complaints.
- `GET /reports/export/roadwatch.csv`: Download CSV export of road damage observations.
- `GET /health`: Health check endpoint.
- `GET /system/departments`: Directory of municipal departments.
- `GET /system/audit-logs`: Immutable platform audit log (restricted to Administrators).
