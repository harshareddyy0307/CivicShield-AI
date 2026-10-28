import os
import sys
import json
from datetime import datetime, timedelta
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal, init_db
from app.models import (
    User, Role, Department, Incident, RoadObservation,
    EmergencyCluster, Resource, ResourceAssignment, ExternalAlert, AuditLog
)
from app.core.config import settings
from app.security.password import verify_password, get_password_hash
from app.security.jwt import create_access_token, decode_access_token
from app.ai.classification.categorizer import categorizer
from app.ai.correlation.text_similarity import text_similarity_service
from app.ai.correlation.duplicate_detector import duplicate_detector
from app.ai.correlation.cluster_engine import cluster_engine
from app.geospatial.spatial_service import spatial_service
from app.ai.vision.vision_service import vision_service
from app.resources.allocator import resource_allocator
from app.reporting.report_generator import report_generator
from app.api.routes.incidents import VALID_TRANSITIONS

@pytest.fixture(scope="module")
def db():
    init_db()
    session = SessionLocal()
    yield session
    session.close()

def test_password_hashing_and_jwt():
    raw_pass = "TestSecurePassword123!"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # JWT Token encoding & decoding
    token = create_access_token({"sub": "user-uuid-1234", "role": Role.EMERGENCY_COORDINATOR})
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user-uuid-1234"
    assert payload["role"] == Role.EMERGENCY_COORDINATOR

def test_deterministic_categorization():
    # 1. Pothole
    r1 = categorizer.classify("Severe pothole on 4th cross road damaging car suspensions.")
    assert r1["predicted_category"] == "pothole"
    assert r1["classification_method"] == "deterministic_keyword_rules"
    assert r1["classification_confidence"] is None  # Section 05: no fabricated scores
    assert r1["recommended_department_id"] == "roads_bridges"

    # 2. Blocked drain
    r2 = categorizer.classify("Stormwater blocked drain choked with silt and refuse.")
    assert r2["predicted_category"] == "blocked_drain"
    assert r2["recommended_department_id"] == "water_sewerage"

    # 3. Waterlogging
    r3 = categorizer.classify("Deep waterlogging and standing water across street.")
    assert r3["predicted_category"] == "waterlogging"

    # 4. Broken streetlight
    r4 = categorizer.classify("Broken streetlight pole dark street at night.")
    assert r4["predicted_category"] == "broken_streetlight"
    assert r4["recommended_department_id"] == "electrical"

    # 5. Default fallback
    r5 = categorizer.classify("Random generic statement without civic terms.")
    assert r5["predicted_category"] == "other"
    assert r5["requires_human_review"] is True

def test_text_similarity():
    t1 = "Storm drain choked with construction silt on 4th road"
    t2 = "Drain clogged with heavy silt and sand on 4th road"
    t3 = "Street light bulb is fused and dark"

    sim_high = text_similarity_service.compute_similarity(t1, t2)
    sim_low = text_similarity_service.compute_similarity(t1, t3)

    assert sim_high > 0.15
    assert sim_low < sim_high

def test_spatial_calculations():
    # Equator 1-degree latitude ~ 111.19 km
    dist_m = spatial_service.haversine_distance_meters(0.0, 0.0, 1.0, 0.0)
    assert 110000 <= dist_m <= 112000

    # Local neighborhood coordinates (within 300m)
    dist_local = spatial_service.haversine_distance_meters(12.9716, 77.5946, 12.9725, 77.5955)
    assert 0 < dist_local < 300

    # Road travel estimate applies documented 1.28x urban detour factor
    est_km = spatial_service.estimate_driving_distance_km(12.9716, 77.5946, 12.9725, 77.5955)
    assert est_km > (dist_local / 1000.0)

    # Centroid calculation
    coords = [(10.0, 20.0), (12.0, 22.0)]
    centroid = spatial_service.calculate_centroid(coords)
    assert centroid == (11.0, 21.0)

def test_duplicate_detector():
    now = datetime.utcnow()
    # High duplicate match (same spot, compatible category, similar description)
    match = duplicate_detector.calculate_duplicate_score(
        12.9716, 77.5946, "blocked_drain", "Storm drain is clogged with debris", now,
        12.9717, 77.5947, "blocked_drain", "Drain choked with debris and garbage", now + timedelta(hours=1)
    )
    assert match["is_candidate"] is True
    assert match["score"] >= 0.48
    assert "formula" in match
    assert match["distance_meters"] < 250.0

    # Distant report (> 250m) must be rejected as duplicate candidate
    distant = duplicate_detector.calculate_duplicate_score(
        12.9716, 77.5946, "blocked_drain", "Storm drain is clogged", now,
        12.9780, 77.6050, "blocked_drain", "Storm drain is clogged", now
    )
    assert distant["is_candidate"] is False
    assert distant["score"] == 0.0

def test_vision_model_abstraction():
    status = vision_service.get_model_status()
    assert "status" in status
    assert "supported_classes" in status
    assert "weights_configured" in status
    assert len(status["supported_classes"]) >= 4

    meta = vision_service.get_model_metadata()
    assert "disclaimer" in meta
    assert "Structural road safety requires certified civil engineering inspection" in meta["disclaimer"]

    # Image header validation
    fake_header = b"\xff\xd8\xff" + b"\x00" * 200
    valid, mime = vision_service.validate_image_file(fake_header, "photo.jpg")
    assert valid is True
    assert mime == "image/jpeg"

    # Spoofed file rejection
    invalid, msg = vision_service.validate_image_file(b"MZ\x90\x00\x03", "malicious.exe")
    assert invalid is False

def test_status_transitions_rules():
    # Valid transitions
    assert "UNDER_REVIEW" in VALID_TRANSITIONS["SUBMITTED"]
    assert "IN_PROGRESS" in VALID_TRANSITIONS["ASSIGNED"]
    assert "RESOLVED_PENDING_VERIFICATION" in VALID_TRANSITIONS["IN_PROGRESS"]
    assert "CLOSED" in VALID_TRANSITIONS["RESOLVED_PENDING_VERIFICATION"]
    assert "REOPENED" in VALID_TRANSITIONS["CLOSED"]

    # Invalid transitions
    assert "CLOSED" not in VALID_TRANSITIONS["SUBMITTED"]
    assert "IN_PROGRESS" not in VALID_TRANSITIONS["CLOSED"]

def test_database_incident_and_cluster_queries(db):
    # Verify seeded demo records exist in database
    demo_incidents = db.query(Incident).filter(Incident.is_demo == True).all()
    assert len(demo_incidents) >= 5

    # Verify demonstration cluster exists
    demo_cluster = db.query(EmergencyCluster).filter(EmergencyCluster.is_demo == True).first()
    assert demo_cluster is not None
    assert demo_cluster.hazard_type == "DRAINAGE_CASCADE"
    assert len(demo_cluster.members) >= 3

    # Verify resource recommendation
    rec = resource_allocator.recommend_best_resource(
        db=db,
        target_lat=demo_cluster.center_latitude,
        target_lon=demo_cluster.center_longitude,
        incident_category="blocked_drain"
    )
    assert rec is not None
    assert "resource_id" in rec
    assert rec["estimated_distance_km"] is not None

def test_reporting_generator(db):
    summary = report_generator.generate_incident_summary_data(db)
    assert "summary_statistics" in summary
    assert summary["summary_statistics"]["total_incidents"] > 0
    assert "limitations" in summary

    csv_data = report_generator.export_incidents_csv(db)
    assert "Incident ID,Title,Category" in csv_data
    assert len(csv_data.splitlines()) > 2
