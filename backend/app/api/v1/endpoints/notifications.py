from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service

router = APIRouter()


@router.get(
    "",
    response_model=List[NotificationResponse],
    summary="List Citizen Status Notifications"
)
def list_notifications(
    complaint_id: Optional[int] = Query(None, description="Filter by complaint ID"),
    citizen_identifier: Optional[str] = Query(None, description="Filter by citizen contact/identifier"),
    channel: Optional[str] = Query(None, description="Filter by channel: WEB, WHATSAPP, SMS, WEBHOOK"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """Retrieves simulated two-way status notifications sent to citizens across all channels."""
    return notification_service.list_notifications(
        db=db,
        complaint_id=complaint_id,
        citizen_identifier=citizen_identifier,
        channel=channel,
        event_type=event_type,
        limit=limit
    )


@router.get(
    "/complaint/{complaint_id}",
    response_model=List[NotificationResponse],
    summary="Get Complaint Notification History"
)
def get_complaint_notifications(
    complaint_id: int = Path(..., description="Complaint primary key ID"),
    db: Session = Depends(get_db)
):
    """Retrieves the complete chronological notification timeline for a specific civic complaint."""
    return notification_service.get_complaint_notifications(db=db, complaint_id=complaint_id)
