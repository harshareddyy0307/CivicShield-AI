# CivicShield AI - App Main Entrypoint Re-export
# Supports uvicorn app.main:app when run from backend directory
from backend.main import app

__all__ = ["app"]
