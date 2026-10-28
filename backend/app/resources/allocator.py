import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Resource, ResourceAssignment, Incident, EmergencyCluster
from app.geospatial.spatial_service import spatial_service

class ResourceAllocator:
    """
    Coordinates and optimizes resource deployment for civic incidents and emergency clusters.
    Complies with Section 13:
    - Implements baseline greedy distance-capability matching.
    - Uses documented simplified road detour distance factor (1.28x).
    - Never fabricates real driving directions.
    - Generates PROPOSED assignments that require authorized human approval.
    """

    CAPABILITY_REQUIREMENTS = {
        "pothole": ["asphalt_repair", "road_maintenance", "general_inspection"],
        "damaged_road": ["road_maintenance", "crack_sealing", "heavy_machinery"],
        "blocked_drain": ["drain_cleaning", "water_pumping", "sewer_maintenance"],
        "waterlogging": ["water_pumping", "flood_control", "high_capacity_pump"],
        "water_leakage": ["pipe_repair", "water_supply_maintenance"],
        "broken_streetlight": ["electrical_repair", "cherry_picker"],
        "road_obstruction": ["heavy_machinery", "debris_removal", "chainsaw_crew"],
        "damaged_public_infrastructure": ["structural_repair", "civil_engineering"]
    }

    @staticmethod
    def recommend_best_resource(
        db: Session,
        target_lat: float,
        target_lon: float,
        incident_category: Optional[str] = None,
        required_capability: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        # Query available resources
        available_resources = db.query(Resource).filter(Resource.status == "AVAILABLE").all()
        if not available_resources:
            return None

        scored_candidates = []
        for res in available_resources:
            # Check location
            if res.current_latitude is None or res.current_longitude is None:
                # Penalty for unknown location
                est_km = 15.0
            else:
                est_km = spatial_service.estimate_driving_distance_km(
                    res.current_latitude, res.current_longitude, target_lat, target_lon
                )

            # Check capability fit
            cap_score = 0.5
            res_caps = res.capabilities.lower()
            if required_capability and required_capability.lower() in res_caps:
                cap_score = 1.0
            elif incident_category:
                needed = ResourceAllocator.CAPABILITY_REQUIREMENTS.get(incident_category, [])
                for n in needed:
                    if n in res_caps:
                        cap_score = 1.0
                        break

            # Distance score: closer is better (up to 30km)
            dist_score = max(0.0, 1.0 - (est_km / 30.0))

            # Total score
            total_score = (0.6 * cap_score) + (0.4 * dist_score)

            scored_candidates.append({
                "resource": res,
                "score": round(total_score, 3),
                "estimated_distance_km": est_km,
                "cap_match": cap_score == 1.0
            })

        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        best = scored_candidates[0]

        return {
            "resource_id": best["resource"].id,
            "resource_name": best["resource"].name,
            "resource_type": best["resource"].resource_type,
            "match_score": best["score"],
            "estimated_distance_km": best["estimated_distance_km"],
            "method": "baseline_capability_proximity_heuristic",
            "routing_model_disclaimer": "Distance is estimated using great-circle + 1.28x urban detour factor. Actual travel time may vary with live traffic and verified road closures."
        }

resource_allocator = ResourceAllocator()
