from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.predictive_service import predictive_service
from app.schemas.predictive import (
    PreventiveMaintenanceOrderCreate,
    PreventiveMaintenanceOrderStatusUpdate,
    PreventiveMaintenanceOrderResponse
)

router = APIRouter()


@router.post(
    "/preventive-maintenance",
    response_model=PreventiveMaintenanceOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Preventive Maintenance Work Order"
)
def create_preventive_maintenance_order(
    payload: PreventiveMaintenanceOrderCreate,
    db: Session = Depends(get_db)
):
    """Creates and dispatches a confirmed preventive maintenance work order for an infrastructure asset."""
    return predictive_service.create_preventive_order(db=db, payload=payload)


@router.get(
    "/preventive-maintenance",
    response_model=List[PreventiveMaintenanceOrderResponse],
    summary="List Preventive Maintenance Work Orders"
)
def list_preventive_maintenance_orders(
    status: Optional[str] = Query(None, description="Filter by status (ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED)"),
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    crew_id: Optional[int] = Query(None, description="Filter by assigned field crew ID"),
    asset_id: Optional[int] = Query(None, description="Filter by target infrastructure asset ID"),
    db: Session = Depends(get_db)
):
    """Lists preventive maintenance orders with multi-attribute filtering."""
    return predictive_service.list_preventive_orders(
        db=db,
        status_filter=status,
        department_id=department_id,
        crew_id=crew_id,
        asset_id=asset_id
    )


@router.get(
    "/preventive-maintenance/{id}",
    response_model=PreventiveMaintenanceOrderResponse,
    summary="Get Preventive Maintenance Order Detail"
)
def get_preventive_maintenance_order(
    id: int = Path(..., description="Preventive Maintenance Order ID"),
    db: Session = Depends(get_db)
):
    """Retrieves full details and timeline for a specific preventive work order."""
    return predictive_service.get_preventive_order_by_id(db=db, order_id=id)


@router.put(
    "/preventive-maintenance/{id}/status",
    response_model=PreventiveMaintenanceOrderResponse,
    summary="Update Preventive Maintenance Order Status"
)
def update_preventive_maintenance_order_status(
    id: int = Path(..., description="Preventive Maintenance Order ID"),
    payload: PreventiveMaintenanceOrderStatusUpdate = ...,
    db: Session = Depends(get_db)
):
    """Transitions workflow status (ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED) and records repair notes."""
    return predictive_service.update_preventive_order_status(db=db, order_id=id, payload=payload)


@router.get(
    "/crews/{id}/preventive-orders",
    response_model=List[PreventiveMaintenanceOrderResponse],
    summary="Get Crew Assigned Preventive Maintenance Orders"
)
def get_crew_preventive_orders(
    id: int = Path(..., description="Field Crew ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    db: Session = Depends(get_db)
):
    """Lists all preventive maintenance work orders assigned to a specific field crew."""
    return predictive_service.list_preventive_orders(
        db=db,
        crew_id=id,
        status_filter=status
    )
