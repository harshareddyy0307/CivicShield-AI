from typing import List, Dict, Any, Optional
from datetime import datetime
from app.geospatial.spatial_service import spatial_service
from app.ai.correlation.text_similarity import text_similarity_service

COMPATIBLE_CATEGORIES = {
    "pothole": {"pothole", "damaged_road"},
    "damaged_road": {"pothole", "damaged_road"},
    "blocked_drain": {"blocked_drain", "waterlogging", "water_leakage"},
    "waterlogging": {"blocked_drain", "waterlogging"},
    "broken_streetlight": {"broken_streetlight"},
    "garbage_accumulation": {"garbage_accumulation"}
}

class DuplicateDetector:
    """
    Evaluates duplicate likelihood between civic complaints.
    Complies with Sections 05 and 08:
    - Combines spatial proximity, time window, category compatibility, and text similarity.
    - Explicitly documents the formula and factors.
    - Never auto-merges without human review.
    """
    MAX_DUPLICATE_DISTANCE_METERS = 250.0  # Physical proximity threshold for civic infrastructure
    MAX_DUPLICATE_TIME_HOURS = 72.0        # 3-day temporal window

    @staticmethod
    def calculate_duplicate_score(
        inc1_lat: float, inc1_lon: float, inc1_cat: str, inc1_desc: str, inc1_time: datetime,
        inc2_lat: float, inc2_lon: float, inc2_cat: str, inc2_desc: str, inc2_time: datetime
    ) -> Dict[str, Any]:
        # 1. Spatial distance
        dist_m = spatial_service.haversine_distance_meters(inc1_lat, inc1_lon, inc2_lat, inc2_lon)
        if dist_m > DuplicateDetector.MAX_DUPLICATE_DISTANCE_METERS:
            return {
                "score": 0.0,
                "is_candidate": False,
                "distance_meters": round(dist_m, 1),
                "reason": f"Distance ({round(dist_m, 1)}m) exceeds maximum proximity threshold ({DuplicateDetector.MAX_DUPLICATE_DISTANCE_METERS}m)"
            }

        s_spatial = max(0.0, 1.0 - (dist_m / DuplicateDetector.MAX_DUPLICATE_DISTANCE_METERS))

        # 2. Time delta
        delta_seconds = abs((inc1_time - inc2_time).total_seconds())
        delta_hours = delta_seconds / 3600.0
        if delta_hours > DuplicateDetector.MAX_DUPLICATE_TIME_HOURS:
            s_temporal = 0.0
        else:
            s_temporal = max(0.0, 1.0 - (delta_hours / DuplicateDetector.MAX_DUPLICATE_TIME_HOURS))

        # 3. Category compatibility
        if inc1_cat == inc2_cat:
            s_category = 1.0
        elif inc2_cat in COMPATIBLE_CATEGORIES.get(inc1_cat, set()):
            s_category = 0.5
        else:
            s_category = 0.1

        # 4. Text similarity
        s_text = text_similarity_service.compute_similarity(inc1_desc, inc2_desc)

        # Composite weighted formula
        # Weights: Spatial 35%, Text 30%, Category 20%, Temporal 15%
        composite = (0.35 * s_spatial) + (0.30 * s_text) + (0.20 * s_category) + (0.15 * s_temporal)
        composite = round(composite, 4)

        is_candidate = composite >= 0.48

        return {
            "score": composite,
            "is_candidate": is_candidate,
            "distance_meters": round(dist_m, 1),
            "time_delta_hours": round(delta_hours, 1),
            "spatial_score": round(s_spatial, 3),
            "text_score": round(s_text, 3),
            "category_score": round(s_category, 3),
            "temporal_score": round(s_temporal, 3),
            "formula": "0.35*spatial + 0.30*text + 0.20*category + 0.15*temporal",
            "reason": (
                f"Candidate match ({int(composite*100)}% score): {round(dist_m, 1)}m apart, "
                f"{round(delta_hours, 1)}h apart, text similarity {round(s_text, 2)}."
                if is_candidate else "Below duplicate confidence threshold."
            )
        }

duplicate_detector = DuplicateDetector()
