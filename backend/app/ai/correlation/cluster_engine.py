import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from app.geospatial.spatial_service import spatial_service
from app.models import (
    Incident, RoadObservation, ExternalAlert, EmergencyCluster, EmergencyClusterMember
)

class ClusterCorrelationEngine:
    """
    Identifies multi-incident infrastructure cascades and potential emergencies.
    Complies with Section 07 and 08:
    - Analyzes CivicFix complaints, RoadWatch observations, and verified external alerts.
    - Explicitly labels clusters as POTENTIAL emergencies awaiting verification.
    - Generates explainable evidence summaries and actionable inspection recommendations.
    - Strictly avoids autonomous high-impact actions.
    """
    DEFAULT_CLUSTER_RADIUS_METERS = 600.0
    DEFAULT_TIME_WINDOW_HOURS = 48.0

    @staticmethod
    def evaluate_potential_clusters(
        incidents: List[Incident],
        observations: List[RoadObservation],
        alerts: List[ExternalAlert],
        radius_meters: float = DEFAULT_CLUSTER_RADIUS_METERS,
        time_window_hours: float = DEFAULT_TIME_WINDOW_HOURS
    ) -> List[Dict[str, Any]]:
        candidate_clusters = []
        visited_incidents = set()

        # Drainage & Water Cascade pattern:
        # Category combinations: (blocked_drain or water_leakage) + (waterlogging or damaged_road or pothole)
        water_hazard_categories = {"blocked_drain", "water_leakage", "waterlogging"}
        road_hazard_categories = {"pothole", "damaged_road", "road_obstruction"}

        for i, anchor in enumerate(incidents):
            if anchor.id in visited_incidents or anchor.status in ["CLOSED", "RESOLVED_PENDING_VERIFICATION"]:
                continue

            nearby_incidents = []
            anchor_coords = (anchor.latitude, anchor.longitude)

            for other in incidents:
                if other.id == anchor.id or other.status in ["CLOSED"]:
                    continue
                dist_m = spatial_service.haversine_distance_meters(
                    anchor.latitude, anchor.longitude, other.latitude, other.longitude
                )
                time_diff = abs((anchor.created_at - other.created_at).total_seconds()) / 3600.0

                if dist_m <= radius_meters and time_diff <= time_window_hours:
                    nearby_incidents.append((other, dist_m, time_diff))

            # Also check nearby RoadWatch observations
            nearby_obs = []
            for obs in observations:
                if obs.latitude is not None and obs.longitude is not None:
                    dist_obs = spatial_service.haversine_distance_meters(
                        anchor.latitude, anchor.longitude, obs.latitude, obs.longitude
                    )
                    time_diff = abs((anchor.created_at - obs.created_at).total_seconds()) / 3600.0
                    if dist_obs <= radius_meters and time_diff <= time_window_hours:
                        nearby_obs.append((obs, dist_obs, time_diff))

            # Also check relevant external alerts overlapping
            overlapping_alerts = []
            for alt in alerts:
                dist_alt = spatial_service.haversine_distance_meters(
                    anchor.latitude, anchor.longitude, alt.latitude, alt.longitude
                )
                if dist_alt <= (radius_meters + alt.radius_meters):
                    overlapping_alerts.append(alt)

            all_cluster_incidents = [anchor] + [item[0] for item in nearby_incidents]
            all_categories = set(inc.category for inc in all_cluster_incidents)

            # Heuristic Rule 1: Waterlogging + Blocked Drain / Water Leakage (Drainage Cascade)
            has_drainage_issue = bool(all_categories.intersection({"blocked_drain", "water_leakage"}))
            has_waterlogging = "waterlogging" in all_categories
            has_road_damage = bool(all_categories.intersection(road_hazard_categories)) or len(nearby_obs) > 0
            has_external_alert = len(overlapping_alerts) > 0

            # Conditions to flag as potential emergency cluster:
            # - At least 3 related reports in proximity, OR
            # - Combined drainage issue + waterlogging + road damage, OR
            # - Waterlogging/drainage combined with an active severe weather alert
            is_potential_emergency = False
            hazard_type = "MULTI_HAZARD"
            title = f"Infrastructure Correlation: {anchor.title}"

            if has_drainage_issue and has_waterlogging and has_road_damage:
                is_potential_emergency = True
                hazard_type = "DRAINAGE_CASCADE"
                title = "Potential Drainage Overflow & Road Degradation Cascade"
            elif has_waterlogging and has_external_alert:
                is_potential_emergency = True
                hazard_type = "FLOODING"
                title = "Potential Localized Flooding under Active Weather Alert"
            elif len(all_cluster_incidents) + len(nearby_obs) >= 3:
                is_potential_emergency = True
                hazard_type = "SPATIAL_CLUSTER"
                title = f"High-Density Incident Cluster ({len(all_cluster_incidents)} reports within {int(radius_meters)}m)"

            if is_potential_emergency:
                # Mark visited
                for inc in all_cluster_incidents:
                    visited_incidents.add(inc.id)

                coords = [(inc.latitude, inc.longitude) for inc in all_cluster_incidents]
                center_lat, center_lon = spatial_service.calculate_centroid(coords)

                # Assemble evidence points
                evidence_points = [
                    f"Anchor report #{anchor.id[:8]} ({anchor.category}): {anchor.title}."
                ]
                for other, d, t in nearby_incidents:
                    evidence_points.append(
                        f"Associated report #{other.id[:8]} ({other.category}) located {round(d, 0)}m away, reported {round(t, 1)}h apart."
                    )
                for obs, d, t in nearby_obs:
                    evidence_points.append(
                        f"RoadWatch visual observation #{obs.id[:8]} ({obs.detection_classes}) {round(d, 0)}m away."
                    )
                for alt in overlapping_alerts:
                    evidence_points.append(
                        f"External Alert: '{alt.headline}' ({alt.severity}) issued by {alt.source}."
                    )

                recommended_actions = []
                if has_drainage_issue:
                    recommended_actions.append("Dispatch municipal drainage crew to inspect reported blockages/catch-basins.")
                if has_waterlogging:
                    recommended_actions.append("Verify road navigability and check for standing water depth exceeding 10cm.")
                if has_road_damage or nearby_obs:
                    recommended_actions.append("Inspect road pavement for structural damage, potholes, or subgrade erosion.")
                if has_external_alert:
                    recommended_actions.append("Coordinate with emergency traffic management regarding potential localized road diversion.")
                recommended_actions.append("Coordinator review required before assigning response teams.")

                candidate_clusters.append({
                    "title": title,
                    "hazard_type": hazard_type,
                    "severity": "POTENTIAL",
                    "status": "DETECTED",
                    "center_latitude": center_lat,
                    "center_longitude": center_lon,
                    "radius_meters": radius_meters,
                    "evidence_summary": " | ".join(evidence_points),
                    "recommended_actions": recommended_actions,
                    "missing_evidence": "Ground water depth measurement; active traffic impact verification.",
                    "contradictory_evidence": None,
                    "incident_ids": [inc.id for inc in all_cluster_incidents],
                    "observation_ids": [obs.id for obs in nearby_obs],
                    "alert_ids": [alt.id for alt in overlapping_alerts],
                    "first_observed_at": min(inc.created_at for inc in all_cluster_incidents),
                    "latest_evidence_at": max(inc.created_at for inc in all_cluster_incidents)
                })

        return candidate_clusters

cluster_engine = ClusterCorrelationEngine()
