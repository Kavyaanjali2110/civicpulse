from typing import List, Optional
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.complaint import Complaint
from app.models.hotspot import HotspotCluster
from app.schemas.complaint import (
    ComplaintResponse,
    ComplaintDetailResponse,
    ComplaintStatusUpdate,
    PaginatedComplaintResponse
)
from app.schemas.category import CategoryResponse
from app.schemas.infrastructure import InfrastructureAssetResponse
from app.schemas.analytics import OverviewStatsResponse
from app.services.category_service import category_service
from app.services.infrastructure_service import infrastructure_service
from app.services.complaint_service import complaint_service
from app.ai.explainability.xai_engine import xai_engine

router = APIRouter()


@router.get("/stats/overview", response_model=OverviewStatsResponse, summary="Government Overview Statistics")
def get_overview_stats(db: Session = Depends(get_db)):
    """Returns high-level municipal statistics and KPIs."""
    base_stats = complaint_service.get_overview_stats(db)
    active_hotspots = db.query(HotspotCluster).filter(HotspotCluster.status == "ACTIVE").count()

    return OverviewStatsResponse(
        total_complaints=base_stats["total_complaints"],
        open_count=base_stats["open_count"],
        resolved_count=base_stats["resolved_count"],
        in_progress_count=base_stats["in_progress_count"],
        received_count=base_stats["received_count"],
        investigating_count=base_stats["investigating_count"],
        critical_count=base_stats["critical_count"],
        high_severity_count=base_stats["high_severity_count"],
        active_hotspots_count=active_hotspots,
        average_priority_score=base_stats["average_priority_score"],
        resolution_rate=base_stats["resolution_rate"]
    )


@router.get("/complaints", response_model=PaginatedComplaintResponse, summary="List & Filter Complaints")
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    severity_level: Optional[str] = None,
    cluster_id: Optional[int] = None,
    search: Optional[str] = None,
    source_channel: Optional[str] = Query(None, description="Filter by channel: WEB, WHATSAPP, SMS, WEBHOOK"),
    db: Session = Depends(get_db)
):
    """Returns paginated complaints with dynamic multi-attribute filters."""
    items, total = complaint_service.list_complaints(
        db=db,
        page=page,
        page_size=page_size,
        category_id=category_id,
        status=status,
        severity_level=severity_level,
        cluster_id=cluster_id,
        search=search,
        source_channel=source_channel
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedComplaintResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/complaints/{id}", response_model=ComplaintDetailResponse, summary="Get Complaint Detail & XAI Rationale")
def get_complaint_detail(id: int, db: Session = Depends(get_db)):
    """Retrieves full details for a complaint including nearby assets and explainable AI rationale."""
    complaint = complaint_service.get_by_id(db, id)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} not found."
        )

    # 1. Nearby infrastructure POIs
    nearby_assets = infrastructure_service.find_nearby_assets(
        db, complaint.latitude, complaint.longitude, max_radius_meters=700.0
    )
    nearby_list = [
        {
            "id": asset.id,
            "name": asset.name,
            "type": asset.asset_type,
            "distance_meters": round(dist, 1),
            "vulnerability_weight": asset.vulnerability_weight
        }
        for asset, dist in nearby_assets
    ]

    # 2. XAI Rationale
    cat_code = complaint.category.code if complaint.category else "CIVIC"
    nearest_name = nearby_assets[0][0].name if nearby_assets else None
    nearest_dist = nearby_assets[0][1] if nearby_assets else None

    xai_res = xai_engine.generate_explanation(
        category_code=cat_code,
        severity_score=complaint.severity_score,
        severity_level=complaint.severity_level,
        priority_score=complaint.priority_score,
        cluster_count=complaint.cluster.complaint_count if complaint.cluster else 1,
        nearest_asset_name=nearest_name,
        nearest_distance_m=nearest_dist,
    )

    response_data = ComplaintDetailResponse.model_validate(complaint)
    response_data.nearby_infrastructure = nearby_list
    response_data.xai_explanation = xai_res
    return response_data


@router.patch("/complaints/{id}/status", response_model=ComplaintResponse, summary="Update Complaint Workflow Status")
def update_complaint_status(
    id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db)
):
    """Updates complaint status, registers department notes, and appends to audit log."""
    updated = complaint_service.update_status(db, id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID {id} not found."
        )
    return updated


@router.get("/categories", response_model=List[CategoryResponse], summary="List Categories")
def get_categories(db: Session = Depends(get_db)):
    return category_service.get_all(db)


@router.get("/infrastructure-assets", response_model=List[InfrastructureAssetResponse], summary="List Infrastructure Assets")
def get_infrastructure_assets(db: Session = Depends(get_db)):
    return infrastructure_service.get_all(db)


@router.get("/omnichannel/stats", summary="Omnichannel Intake Statistics")
def get_omnichannel_stats(db: Session = Depends(get_db)):
    """Returns intake volumes, breakdown percentages, and notification counts across WEB, WHATSAPP, SMS, and WEBHOOK."""
    return complaint_service.get_omnichannel_stats(db)
