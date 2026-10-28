import os
import sys

# Ensure backend directory is on sys.path for relative imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import init_db
from app.api.routes import (
    auth, incidents, roadwatch, disaster, resources, map, analytics, ai, reports, system
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Unified AI Platform for Civic Infrastructure Intelligence, Road Damage Detection, and Emergency Response.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploaded evidence and road imagery
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")

# Include API Routers under /api/v1
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(incidents.router, prefix=settings.API_V1_PREFIX)
app.include_router(roadwatch.router, prefix=settings.API_V1_PREFIX)
app.include_router(disaster.router, prefix=settings.API_V1_PREFIX)
app.include_router(resources.router, prefix=settings.API_V1_PREFIX)
app.include_router(map.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router)  # Also expose /health at root level

@app.on_event("startup")
def on_startup():
    init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
