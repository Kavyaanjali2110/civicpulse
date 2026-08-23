import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sklearn.cluster import DBSCAN
from app.models.complaint import Complaint
from app.models.hotspot import HotspotCluster
from app.models.category import Category
from app.services.infrastructure_service import infrastructure_service


class SpatialClusterEngine:
    """DBSCAN Geospatial Clustering engine for automated civic hotspot detection."""

    EARTH_RADIUS_METERS = 6371000.0
    DEFAULT_EPS_METERS = 300.0  # 300-meter cluster radius
    DEFAULT_MIN_SAMPLES = 2     # Minimum 2 complaints to form a localized hotspot

    @classmethod
    def run_clustering(
        cls,
        db: Session,
        eps_meters: float = DEFAULT_EPS_METERS,
        min_samples: int = DEFAULT_MIN_SAMPLES,
    ) -> List[Dict[str, Any]]:
        """Runs DBSCAN over all active (unresolved) complaints and groups them into hotspot clusters."""
        active_complaints: List[Complaint] = (
            db.query(Complaint)
            .filter(Complaint.status != "RESOLVED")
            .all()
        )

        if len(active_complaints) < min_samples:
            return []

        # Group by category to detect category-specific localized breakdowns
        category_ids = {c.category_id for c in active_complaints}
        created_or_updated_clusters = []

        eps_radians = eps_meters / cls.EARTH_RADIUS_METERS

        for cat_id in category_ids:
            cat_complaints = [c for c in active_complaints if c.category_id == cat_id]
            if len(cat_complaints) < min_samples:
                continue

            coords = np.array([[c.latitude, c.longitude] for c in cat_complaints])
            coords_rad = np.radians(coords)

            dbscan = DBSCAN(eps=eps_radians, min_samples=min_samples, metric="haversine")
            labels = dbscan.fit_predict(coords_rad)

            # Process each cluster (label >= 0; -1 is noise)
            unique_labels = set(labels)
            for label in unique_labels:
                if label == -1:
                    continue

                cluster_indices = np.where(labels == label)[0]
                cluster_complaints = [cat_complaints[i] for i in cluster_indices]
                cluster_coords = coords[cluster_indices]

                # Compute centroid
                centroid_lat = float(np.mean(cluster_coords[:, 0]))
                centroid_lon = float(np.mean(cluster_coords[:, 1]))

                # Compute max radius in meters from centroid
                max_radius = 50.0
                for c in cluster_complaints:
                    dist = infrastructure_service.calculate_distance_meters(
                        centroid_lat, centroid_lon, c.latitude, c.longitude
                    )
                    if dist > max_radius:
                        max_radius = dist

                # Compute aggregate metrics
                count = len(cluster_complaints)
                avg_severity = float(np.mean([c.severity_score for c in cluster_complaints]))

                # Base priority from average severity + complaint count + nearby infrastructure
                nearby = infrastructure_service.find_nearby_assets(
                    db, centroid_lat, centroid_lon, max_radius_meters=600.0
                )
                infra_weight = nearby[0][0].vulnerability_weight if nearby else 1.0

                priority = min(
                    100.0,
                    (avg_severity * 40.0) + (min(10, count) * 4.0) + (infra_weight * 8.0)
                )

                # Fetch category code
                cat = db.query(Category).filter(Category.id == cat_id).first()
                cat_code = cat.code if cat else "CIVIC"

                # Find or create HotspotCluster record
                cluster_code = f"HS-{cat_code}-{abs(hash((cat_id, round(centroid_lat, 3), round(centroid_lon, 3)))) % 10000:04d}"
                existing_cluster = db.query(HotspotCluster).filter(HotspotCluster.cluster_code == cluster_code).first()

                if not existing_cluster:
                    existing_cluster = HotspotCluster(
                        cluster_code=cluster_code,
                        category_id=cat_id,
                        centroid_lat=centroid_lat,
                        centroid_lon=centroid_lon,
                        radius_meters=round(max_radius, 1),
                        complaint_count=count,
                        avg_severity=round(avg_severity, 2),
                        aggregate_priority_score=round(priority, 1),
                        status="ACTIVE",
                        ai_summary=f"Automated cluster of {count} {cat_code} complaints detected within {round(max_radius)}m radius.",
                        ai_recommendation=f"Deploy {cat_code} inspection team to investigate recurring issues around ({round(centroid_lat, 4)}, {round(centroid_lon, 4)})."
                    )
                    db.add(existing_cluster)
                    db.flush()
                else:
                    existing_cluster.centroid_lat = centroid_lat
                    existing_cluster.centroid_lon = centroid_lon
                    existing_cluster.radius_meters = round(max_radius, 1)
                    existing_cluster.complaint_count = count
                    existing_cluster.avg_severity = round(avg_severity, 2)
                    existing_cluster.aggregate_priority_score = round(priority, 1)
                    existing_cluster.updated_at = datetime.now(timezone.utc)

                # Link member complaints to this cluster
                for comp in cluster_complaints:
                    comp.cluster_id = existing_cluster.id

                created_or_updated_clusters.append({
                    "cluster_code": existing_cluster.cluster_code,
                    "category": cat_code,
                    "centroid": [centroid_lat, centroid_lon],
                    "count": count,
                    "avg_severity": round(avg_severity, 2),
                    "priority_score": round(priority, 1)
                })

        db.commit()
        return created_or_updated_clusters


spatial_cluster_engine = SpatialClusterEngine()
