import math
from typing import List, Tuple, Dict, Any, Optional

class SpatialService:
    """
    Geospatial calculations and spatial querying.
    Uses spherical Haversine formula on Earth (radius = 6,371,000 meters).
    All distance outputs explicitly document units (meters or kilometers).
    """
    EARTH_RADIUS_METERS = 6371000.0

    @staticmethod
    def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate spherical great-circle distance between two GPS coordinates in meters.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return SpatialService.EARTH_RADIUS_METERS * c

    @staticmethod
    def bounding_box(lat: float, lon: float, radius_meters: float) -> Dict[str, float]:
        """
        Return approximate latitude and longitude bounds for a circular radius.
        Useful for preliminary DB indexed indexing before precise distance filtering.
        """
        lat_delta = (radius_meters / SpatialService.EARTH_RADIUS_METERS) * (180.0 / math.pi)
        lon_delta = (radius_meters / (SpatialService.EARTH_RADIUS_METERS * math.cos(math.radians(lat)))) * (180.0 / math.pi)
        return {
            "min_lat": lat - lat_delta,
            "max_lat": lat + lat_delta,
            "min_lon": lon - abs(lon_delta),
            "max_lon": lon + abs(lon_delta)
        }

    @staticmethod
    def estimate_driving_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Simplified road routing model.
        NOTE: This is an estimated road travel distance based on a 1.28x urban detour factor
        over great-circle distance, not a live turn-by-turn road network route.
        """
        straight_line_m = SpatialService.haversine_distance_meters(lat1, lon1, lat2, lon2)
        urban_road_detour_factor = 1.28
        estimated_road_m = straight_line_m * urban_road_detour_factor
        return round(estimated_road_m / 1000.0, 2)

    @staticmethod
    def calculate_centroid(coords: List[Tuple[float, float]]) -> Tuple[float, float]:
        """
        Calculate the geographic center (arithmetic mean latitude, longitude) of a group of points.
        """
        if not coords:
            return (0.0, 0.0)
        avg_lat = sum(c[0] for c in coords) / len(coords)
        avg_lon = sum(c[1] for c in coords) / len(coords)
        return (round(avg_lat, 6), round(avg_lon, 6))

spatial_service = SpatialService()
