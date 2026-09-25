from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.complaint import Complaint
from app.models.hotspot import HotspotCluster
from app.schemas.analytics import HeatmapPoint, TrendAnalyticsResponse
from app.schemas.hotspot import HotspotClusterResponse
from app.services.hotspot_service import hotspot_service
from app.ai.clustering.spatial_cluster import spatial_cluster_engine
from app.ai.trends.trend_analyzer import trend_analyzer
from app.schemas.crew_assignment import CrewAssignmentResponse
from app.services.dispatch_service import dispatch_service

router = APIRouter()


@router.get("/heatmap/points", response_model=List[HeatmapPoint], summary="Geospatial Heatmap Points")
def get_heatmap_points(
    category_id: Optional[int] = None,
    min_severity: Optional[float] = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """Returns geospatial coordinate points with intensity weighting for Leaflet heatmap layers."""
    query = db.query(Complaint).filter(Complaint.status != "RESOLVED")
    if category_id:
        query = query.filter(Complaint.category_id == category_id)
    if min_severity > 0:
        query = query.filter(Complaint.severity_score >= min_severity)

    complaints = query.all()

    points = []
    for c in complaints:
        # Intensity scaled by priority score and severity score
        intensity = round((c.priority_score / 100.0) * 0.7 + (c.severity_score) * 0.3, 2)
        cat_name = c.category.name if c.category else "Civic Issue"
        points.append(
            HeatmapPoint(
                lat=c.latitude,
                lng=c.longitude,
                intensity=intensity,
                category=cat_name,
                severity_level=c.severity_level,
                tracking_id=c.tracking_id,
                title=c.subcategory or c.raw_text[:40]
            )
        )
    return points


@router.get("/hotspots", response_model=List[HotspotClusterResponse], summary="DBSCAN Hotspot Clusters")
def get_hotspots(
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    min_priority: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Returns detected spatial density clusters with severity metrics and AI summaries."""
    return hotspot_service.get_all(
        db=db,
        status=status,
        category_id=category_id,
        min_priority=min_priority
    )


@router.post("/hotspots/recluster", summary="Trigger DBSCAN Spatial Reclustering")
def trigger_recluster(
    eps_meters: float = Query(300.0, ge=50.0, le=1000.0),
    min_samples: int = Query(2, ge=2, le=10),
    db: Session = Depends(get_db)
):
    """Executes DBSCAN spatial clustering over active complaints and updates hotspot records."""
    updated = spatial_cluster_engine.run_clustering(
        db=db,
        eps_meters=eps_meters,
        min_samples=min_samples
    )
    return {
        "status": "success",
        "clusters_detected": len(updated),
        "clusters": updated
    }


@router.get("/priority-ranking", summary="Infrastructure Priority Ranking")
def get_priority_ranking(
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Returns top ranked municipal issues and hotspots sorted by Infrastructure Priority Score (IPS)."""
    # 1. Top individual critical complaints
    top_complaints = (
        db.query(Complaint)
        .filter(Complaint.status != "RESOLVED")
        .order_by(Complaint.priority_score.desc())
        .limit(limit)
        .all()
    )

    # 2. Top active hotspot clusters
    top_hotspots = (
        db.query(HotspotCluster)
        .filter(HotspotCluster.status == "ACTIVE")
        .order_by(HotspotCluster.aggregate_priority_score.desc())
        .limit(limit)
        .all()
    )

    ranked_complaints = []
    for c in top_complaints:
        current_assignment = None
        assigned_crew_name = None
        crew_assignments_data = []

        if c.crew_assignments:
            latest_assignment = c.crew_assignments[0]
            current_assignment = CrewAssignmentResponse.model_validate(latest_assignment).model_dump(mode="json")
            if latest_assignment.crew:
                assigned_crew_name = latest_assignment.crew.name

            for a in c.crew_assignments:
                crew_assignments_data.append(
                    CrewAssignmentResponse.model_validate(a).model_dump(mode="json")
                )

        sla = dispatch_service.calculate_sla(c).model_dump(mode="json")
        sla["status"] = sla.get("sla_status")

        ranked_complaints.append({
            "id": c.id,
            "tracking_id": c.tracking_id,
            "source_channel": c.source_channel or "WEB",
            "category": c.category.name if c.category else "Civic",
            "category_code": c.category.code if c.category else "CIVIC",
            "subcategory": c.subcategory or "General",
            "summary": c.translated_text[:100],
            "severity_score": c.severity_score,
            "severity_level": c.severity_level,
            "priority_score": c.priority_score,
            "status": c.status,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "address": c.address,
            "ward_id": c.ward_id,
            "ward_name": c.ward_name,
            "cluster_id": c.cluster_id,
            "created_at": c.created_at,
            "current_assignment": current_assignment,
            "assigned_crew_name": assigned_crew_name,
            "crew_assignments": crew_assignments_data,
            "sla_metrics": sla,
        })

    ranked_hotspots = [
        {
            "id": h.id,
            "cluster_code": h.cluster_code,
            "category": h.category.name if h.category else "Civic",
            "category_code": h.category.code if h.category else "CIVIC",
            "centroid": [h.centroid_lat, h.centroid_lon],
            "radius_meters": h.radius_meters,
            "complaint_count": h.complaint_count,
            "avg_severity": h.avg_severity,
            "priority_score": h.aggregate_priority_score,
            "status": h.status,
            "ai_summary": h.ai_summary,
            "ai_recommendation": h.ai_recommendation
        }
        for h in top_hotspots
    ]

    return {
        "ranked_complaints": ranked_complaints,
        "ranked_hotspots": ranked_hotspots
    }


@router.get("/trends", response_model=TrendAnalyticsResponse, summary="Trend & Spike Analytics")
def get_trends(db: Session = Depends(get_db)):
    """Returns 7-day vs 30-day velocity trends, surge alerts, and 14-day timeline distribution."""
    return trend_analyzer.analyze_trends(db)
