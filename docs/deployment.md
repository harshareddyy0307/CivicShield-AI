# CivicShield AI - Deployment Guide

## 1. Quick Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Step 1: Clone & Configure Environment
```bash
git clone <repo-url> civicshield-ai
cd civicshield-ai
cp .env.example .env
```

### Step 2: Install Backend Dependencies & Seed Demonstration Data
```bash
cd backend
python -m pip install -r requirements.txt
python scripts/seed_demo_data.py
```

### Step 3: Start FastAPI Backend
```bash
# In the backend directory
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend will be live at `http://127.0.0.1:8000`. API docs available at `http://127.0.0.1:8000/docs`.

### Step 4: Start Frontend
```bash
# In a new terminal, navigate to frontend
cd frontend
npm install --offline
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 2. Docker Compose Deployment (Production)

To deploy with PostgreSQL and PostGIS containerization:

```bash
docker-compose up -d --build
```

Services started:
- `db`: PostgreSQL 16 with PostGIS spatial extension on port `5432`.
- `backend`: FastAPI Uvicorn ASGI server on port `8000`.
- `frontend`: High-performance Nginx production web server on port `5173`.

---

## 3. Seeded Demonstration Credentials
CivicShield AI comes with four pre-configured demonstration personas:

| Role | Email | Password | Permissions Scope |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicshield.local` | `CivicShield123!` | Submit complaints, upload photos, view own reports, reopen resolved issues. |
| **Municipal Staff** | `staff@civicshield.local` | `CivicShield123!` | Department queue review, verification notes, repair progress, resolution proof. |
| **Coordinator** | `coordinator@civicshield.local` | `CivicShield123!` | Multi-hazard emergency cluster review, authorization, resource dispatch approval. |
| **Administrator** | `admin@civicshield.local` | `CivicShield123!` | Full authority: users, departments, system health, audit logs, reports. |
