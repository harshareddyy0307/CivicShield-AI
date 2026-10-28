import os
import sys
import json
from datetime import datetime, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal, init_db
from app.models import (
    User, Role, Department, Incident, IncidentEvidence, RoadObservation,
    EmergencyCluster, EmergencyClusterMember, Resource, ResourceAssignment,
    ExternalAlert, IncidentStatusHistory, Notification, AuditLog
)
from app.security.password import get_password_hash

def seed_database():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Seed Departments
        departments_data = [
            {"id": "roads_bridges", "name": "Roads & Bridges Department", "code": "RBD", "description": "Maintenance of city roads, flyovers, potholes, and pavements."},
            {"id": "water_sewerage", "name": "Water Supply & Sewerage Board", "code": "WSSB", "description": "Stormwater drains, sewer lines, water logging, and pipeline leakage."},
            {"id": "sanitation", "name": "Sanitation & Waste Management", "code": "SWM", "description": "Garbage clearing, debris management, and public hygiene."},
            {"id": "electrical", "name": "Electrical & Lighting Department", "code": "ELD", "description": "Street lights, traffic signal electrics, and power lines."},
            {"id": "emergency_public_works", "name": "Emergency Public Works Taskforce", "code": "EPWT", "description": "Rapid response coordination during monsoon and infrastructure failure events."}
        ]

        for d in departments_data:
            existing = db.query(Department).filter(Department.id == d["id"]).first()
            if not existing:
                dept = Department(
                    id=d["id"],
                    name=d["name"],
                    code=d["code"],
                    description=d["description"],
                    contact_email=f"{d['code'].lower()}@civicshield.local"
                )
                db.add(dept)
        db.commit()
        print("[OK] Departments seeded.")

        # 2. Seed Standard Users for all 4 Roles
        users_data = [
            {
                "email": "citizen@civicshield.local",
                "full_name": "Demo Citizen (Priya Sharma)",
                "role": Role.CITIZEN,
                "phone": "+1-555-0101",
                "dept": None
            },
            {
                "email": "staff@civicshield.local",
                "full_name": "Demo Staff (Rajesh Kumar)",
                "role": Role.MUNICIPAL_STAFF,
                "phone": "+1-555-0102",
                "dept": "water_sewerage"
            },
            {
                "email": "coordinator@civicshield.local",
                "full_name": "Demo Coordinator (Sarah Jenkins)",
                "role": Role.EMERGENCY_COORDINATOR,
                "phone": "+1-555-0103",
                "dept": "emergency_public_works"
            },
            {
                "email": "admin@civicshield.local",
                "full_name": "System Administrator",
                "role": Role.ADMINISTRATOR,
                "phone": "+1-555-0100",
                "dept": None
            }
        ]

        user_objects = {}
        for u in users_data:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    hashed_password=get_password_hash("CivicShield123!"),
                    full_name=u["full_name"],
                    phone_number=u["phone"],
                    role=u["role"],
                    department_id=u["dept"]
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                user_objects[u["role"]] = user
            else:
                user_objects[u["role"]] = existing
        print("[OK] Users seeded for all 4 roles.")

        # Check if demonstration scenario already exists
        demo_incident_check = db.query(Incident).filter(Incident.is_demo == True).first()
        if demo_incident_check:
            print("[OK] Demonstration scenario already seeded. Skipping recreate.")
            return

        print("Seeding Section 19 Demonstration Scenario: Simulated Heavy Rainfall & Drainage Cascade...")
        citizen_user = user_objects[Role.CITIZEN]
        coordinator_user = user_objects[Role.EMERGENCY_COORDINATOR]
        staff_user = user_objects[Role.MUNICIPAL_STAFF]

        # Base neighborhood coordinates (e.g. Metro Riverside Sector, Lat: 12.9716, Lon: 77.5946)
        base_lat = 12.9716
        base_lon = 77.5946
        now = datetime.utcnow()

        # A. One Simulated External Weather Alert
        sim_alert = ExternalAlert(
            source="METEOROLOGICAL_DEPARTMENT [DEMO]",
            alert_type="HEAVY_RAINFALL_WARNING",
            severity="WARNING",
            headline="[DEMONSTRATION] Level-3 Severe Precipitation Warning (50-70mm/hr)",
            description="Intense convective rainfall cluster moving northeast over Riverside & Central sectors with high surface runoff risk.",
            latitude=base_lat,
            longitude=base_lon,
            radius_meters=3500.0,
            issued_at=now - timedelta(hours=6),
            expires_at=now + timedelta(hours=18),
            is_verified=True,
            is_demo=True
        )
        db.add(sim_alert)
        db.commit()
        db.refresh(sim_alert)

        # B. Two Blocked Drain Reports
        drain1 = Incident(
            title="[DEMO] Major Storm Drain Clogged with Construction Silt",
            description="The primary concrete drainage culvert on 4th Main Road is completely choked with gravel and plastic debris. Runoff from the upper incline cannot enter.",
            category="blocked_drain",
            priority="HIGH",
            status="INSPECTION_REQUIRED",
            latitude=base_lat + 0.0012,
            longitude=base_lon - 0.0008,
            location_description="4th Main Rd opposite Central Market",
            jurisdiction="Sector 4 Central",
            reporter_id=citizen_user.id,
            assigned_department_id="water_sewerage",
            predicted_category="blocked_drain",
            classification_method="deterministic_keyword_rules",
            classification_reasons="Matched keyword rules for 'blocked_drain' with terms: blocked drain, storm drain.",
            requires_human_review=True,
            is_demo=True,
            created_at=now - timedelta(hours=5, minutes=30)
        )
        drain2 = Incident(
            title="[DEMO] Secondary Stormwater Gutter Overflowing into Street",
            description="Catch-basin drain grate jammed with wet leaves and refuse. Backwater overflowing across the roadway curb.",
            category="blocked_drain",
            priority="HIGH",
            status="UNDER_REVIEW",
            latitude=base_lat + 0.0018,
            longitude=base_lon - 0.0003,
            location_description="Corner of 4th Main and Cross 2",
            jurisdiction="Sector 4 Central",
            reporter_id=citizen_user.id,
            assigned_department_id="water_sewerage",
            predicted_category="blocked_drain",
            classification_method="deterministic_keyword_rules",
            classification_reasons="Matched keyword rules for 'blocked_drain' with terms: drain, catch-basin.",
            requires_human_review=True,
            is_demo=True,
            created_at=now - timedelta(hours=4)
        )
        db.add_all([drain1, drain2])
        db.commit()
        db.refresh(drain1)
        db.refresh(drain2)

        # C. Three Waterlogging Reports
        water1 = Incident(
            title="[DEMO] Severe Street Submersion Near Junction",
            description="Standing water depth roughly 25-30cm over both traffic lanes. Vehicles are stalled and diverting onto sidewalk edges.",
            category="waterlogging",
            priority="CRITICAL",
            status="ASSIGNED",
            latitude=base_lat + 0.0015,
            longitude=base_lon - 0.0005,
            location_description="4th Main Junction at Metro Pillar 114",
            jurisdiction="Sector 4 Central",
            reporter_id=citizen_user.id,
            assigned_department_id="water_sewerage",
            assigned_user_id=staff_user.id,
            predicted_category="waterlogging",
            classification_method="deterministic_keyword_rules",
            classification_reasons="Matched keyword rules for 'waterlogging' with terms: standing water, submersion.",
            requires_human_review=True,
            is_demo=True,
            created_at=now - timedelta(hours=3, minutes=15)
        )
        water2 = Incident(
            title="[DEMO] Deep Water Accumulation on Roadway (Potential Duplicate)",
            description="Water is stagnating deeply across the entire lane near Metro Pillar 114. Two sedans unable to cross.",
            category="waterlogging",
            priority="HIGH",
            status="SUBMITTED",
            latitude=base_lat + 0.0016,
            longitude=base_lon - 0.0006,
            location_description="Near Pillar 114, 4th Main Road",
            jurisdiction="Sector 4 Central",
            reporter_id=citizen_user.id,
            assigned_department_id="water_sewerage",
            predicted_category="waterlogging",
            classification_method="deterministic_keyword_rules",
            classification_reasons="Matched keyword rules for 'waterlogging' with terms: water accumulation, stagnating.",
            requires_human_review=True,
            is_duplicate=True,
            duplicate_of_id=water1.id,
            duplicate_score=0.88,
            is_demo=True,
            created_at=now - timedelta(hours=2, minutes=45)
        )
        water3 = Incident(
            title="[DEMO] Water Retention Affecting Commercial Pedestrian Access",
            description="Runoff pooling in front of store frontage due to lack of street drainage outlet.",
            category="waterlogging",
            priority="MEDIUM",
            status="UNDER_REVIEW",
            latitude=base_lat + 0.0022,
            longitude=base_lon - 0.0010,
            location_description="Commercial Arcade, 4th Main North",
            jurisdiction="Sector 4 Central",
            reporter_id=citizen_user.id,
            assigned_department_id="water_sewerage",
            predicted_category="waterlogging",
            classification_method="deterministic_keyword_rules",
            classification_reasons="Matched keyword rules for 'waterlogging' with terms: water retention, pooling.",
            requires_human_review=True,
            is_demo=True,
            created_at=now - timedelta(hours=2)
        )
        db.add_all([water1, water2, water3])
        db.commit()
        db.refresh(water1)
        db.refresh(water2)
        db.refresh(water3)

        # D. Two Road Damage Observations (RoadWatch AI)
        obs1 = RoadObservation(
            related_incident_id=water1.id,
            original_image_path="uploads/demo_pothole_submerged.jpg",
            annotated_image_path=None,
            detection_classes=json.dumps(["pothole", "alligator_cracking"]),
            model_scores=json.dumps({"pothole": 0.91, "alligator_cracking": 0.84}),
            bounding_boxes=json.dumps([
                {"class": "pothole", "box": [140, 220, 390, 480], "score": 0.91},
                {"class": "alligator_cracking", "box": [50, 180, 560, 520], "score": 0.84}
            ]),
            model_id="RoadWatch-Demo-Baseline",
            model_version="1.0-demo",
            latitude=base_lat + 0.0014,
            longitude=base_lon - 0.0004,
            location_description="Submerged road crater, 4th Main near Pillar 114",
            review_status="VERIFIED",
            reviewer_id=staff_user.id,
            reviewer_notes="Pothole verified by field inspection; asphalt base eroded by water infiltration.",
            is_demo=True,
            created_at=now - timedelta(hours=3)
        )
        obs2 = RoadObservation(
            related_incident_id=drain1.id,
            original_image_path="uploads/demo_transverse_crack.jpg",
            annotated_image_path=None,
            detection_classes=json.dumps(["transverse_crack", "pothole"]),
            model_scores=json.dumps({"transverse_crack": 0.88, "pothole": 0.76}),
            bounding_boxes=json.dumps([
                {"class": "transverse_crack", "box": [80, 310, 540, 360], "score": 0.88}
            ]),
            model_id="RoadWatch-Demo-Baseline",
            model_version="1.0-demo",
            latitude=base_lat + 0.0011,
            longitude=base_lon - 0.0007,
            location_description="Asphalt fracture adjacent to clogged drainage inlet",
            review_status="PENDING",
            reviewer_id=None,
            is_demo=True,
            created_at=now - timedelta(hours=4, minutes=30)
        )
        db.add_all([obs1, obs2])
        db.commit()
        db.refresh(obs1)
        db.refresh(obs2)

        # E. Two Inspection / Response Teams (Resources)
        res1 = Resource(
            name="[DEMO] Rapid Drainage Taskforce - Crew Alpha",
            resource_type="DRAINAGE_MAINTENANCE_TEAM",
            department_id="water_sewerage",
            status="AVAILABLE",
            capacity=4,
            capabilities=json.dumps(["drain_cleaning", "catch_basin_unclogging", "high_capacity_jetting", "water_pumping"]),
            current_latitude=base_lat - 0.008,
            current_longitude=base_lon + 0.004,
            contact_person="Foreman Vikram Singh",
            phone_number="+1-555-0210",
            is_demo=True
        )
        res2 = Resource(
            name="[DEMO] High-Capacity Submersible Pump Unit 4",
            resource_type="PUMP_EQUIPMENT",
            department_id="water_sewerage",
            status="AVAILABLE",
            capacity=1,
            capabilities=json.dumps(["water_pumping", "flood_control", "high_capacity_pump"]),
            current_latitude=base_lat - 0.012,
            current_longitude=base_lon - 0.002,
            contact_person="Logistics Yard South",
            phone_number="+1-555-0211",
            is_demo=True
        )
        res3 = Resource(
            name="[DEMO] Road Pavement Inspection Team 2",
            resource_type="INSPECTION_TEAM",
            department_id="roads_bridges",
            status="AVAILABLE",
            capacity=3,
            capabilities=json.dumps(["asphalt_repair", "road_maintenance", "general_inspection", "structural_inspection"]),
            current_latitude=base_lat + 0.015,
            current_longitude=base_lon + 0.006,
            contact_person="Engineer Meera Sen",
            phone_number="+1-555-0212",
            is_demo=True
        )
        db.add_all([res1, res2, res3])
        db.commit()
        db.refresh(res1)
        db.refresh(res2)
        db.refresh(res3)

        # F. Emergency Cluster (DisasterConnect AI: Potential Emergency Cluster)
        cluster = EmergencyCluster(
            title="[DEMO] Potential Drainage Cascade & Road Degradation (Sector 4)",
            hazard_type="DRAINAGE_CASCADE",
            severity="POTENTIAL",
            status="AWAITING_VERIFICATION",
            center_latitude=base_lat + 0.0014,
            center_longitude=base_lon - 0.0006,
            radius_meters=450.0,
            evidence_summary=(
                "Demonstration correlated cluster: 2 blocked drain complaints, 3 localized waterlogging reports, "
                "and 2 RoadWatch road damage detections clustered within 450m radius under an active Severe Rainfall Warning. "
                "Water backflow from clogged culvert is actively degrading roadway subgrade."
            ),
            recommended_actions=json.dumps([
                "Deploy Crew Alpha to de-silt the 4th Main concrete culvert.",
                "Position High-Capacity Pump Unit 4 to drain standing water near Metro Pillar 114.",
                "Conduct structural pavement integrity inspection before reopening submerged traffic lanes.",
                "Maintain simulated emergency monitoring until water level recedes."
            ]),
            missing_evidence="Continuous culvert flow rate telemetry; post-storm subsurface core sample.",
            contradictory_evidence="None identified across reported items.",
            assigned_coordinator_id=coordinator_user.id,
            is_demo=True,
            first_observed_at=now - timedelta(hours=5, minutes=30),
            latest_evidence_at=now - timedelta(hours=2)
        )
        db.add(cluster)
        db.commit()
        db.refresh(cluster)

        # Cluster members
        m1 = EmergencyClusterMember(cluster_id=cluster.id, incident_id=drain1.id, contribution_reason="Primary blocked culvert causing drainage backup", distance_from_center_meters=35.0)
        m2 = EmergencyClusterMember(cluster_id=cluster.id, incident_id=water1.id, contribution_reason="Severe water accumulation at downstream low-point", distance_from_center_meters=20.0)
        m3 = EmergencyClusterMember(cluster_id=cluster.id, road_observation_id=obs1.id, contribution_reason="Verified deep asphalt crater forming under standing water", distance_from_center_meters=15.0)
        m4 = EmergencyClusterMember(cluster_id=cluster.id, external_alert_id=sim_alert.id, contribution_reason="Active rainfall warning elevating runoff velocity", distance_from_center_meters=120.0)
        db.add_all([m1, m2, m3, m4])

        # G. Proposed Resource Assignment
        asg = ResourceAssignment(
            resource_id=res1.id,
            incident_id=drain1.id,
            cluster_id=cluster.id,
            assignment_status="PROPOSED",
            priority="HIGH",
            target_latitude=drain1.latitude,
            target_longitude=drain1.longitude,
            instructions="Deploy jetting vacuum unit to clear construction silt blockage at 4th Main culvert.",
            estimated_distance_km=1.45,
            allocation_method="baseline_capability_proximity_heuristic",
            proposed_by="SharedIntelligenceEngine",
            approved_by_id=None,
            notes="Pending authorization by Emergency Coordinator Sarah Jenkins.",
            is_demo=True
        )
        db.add(asg)

        # H. Initial Status History
        hist = IncidentStatusHistory(
            incident_id=drain1.id,
            from_status="SUBMITTED",
            to_status="INSPECTION_REQUIRED",
            actor_id=coordinator_user.id,
            notes="Correlated with downstream waterlogging report. Fast-tracked for inspection.",
            action_type="STATUS_CHANGE"
        )
        db.add(hist)

        # Audit log for demo seeding
        audit = AuditLog(
            user_id=coordinator_user.id,
            action="DEMO_SCENARIO_SEEDED",
            entity_type="system",
            entity_id=cluster.id,
            details="Seeded complete Section 19 heavy rainfall demonstration scenario."
        )
        db.add(audit)
        db.commit()

        print("[OK] Section 19 Demonstration Scenario successfully seeded!")
        print("==================================================")
        print("DEMO CREDENTIALS:")
        print("  Citizen:     citizen@civicshield.local     / CivicShield123!")
        print("  Staff:       staff@civicshield.local       / CivicShield123!")
        print("  Coordinator: coordinator@civicshield.local / CivicShield123!")
        print("  Admin:       admin@civicshield.local       / CivicShield123!")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo data: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
