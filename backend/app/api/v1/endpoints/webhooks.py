from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.webhook import (
    WhatsAppWebhookPayload,
    SMSWebhookPayload,
    GenericWebhookPayload,
    NormalizedComplaintPayload,
    OmnichannelIngestionResponse
)
from app.services.unified_ingestion_service import unified_ingestion_service

router = APIRouter()


@router.post(
    "/whatsapp",
    response_model=OmnichannelIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="WhatsApp Business Grievance Webhook"
)
def whatsapp_webhook(
    payload: WhatsAppWebhookPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Ingests citizen civic grievances submitted via WhatsApp Business webhook.
    Normalizes text, GPS location, and attachments into the unified CivicPulse AI pipeline.
    """
    normalized = NormalizedComplaintPayload(
        source_channel="WHATSAPP",
        external_message_id=payload.message_id,
        citizen_identifier=payload.from_number,
        citizen_name=f"WhatsApp User ({payload.from_number})",
        raw_message=payload.text,
        latitude=payload.location.latitude if payload.location else None,
        longitude=payload.location.longitude if payload.location else None,
        image_url=payload.image_url,
    )
    return unified_ingestion_service.ingest(db=db, payload=normalized, background_tasks=background_tasks)


@router.post(
    "/sms",
    response_model=OmnichannelIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="SMS Grievance Ingestion Webhook"
)
def sms_webhook(
    payload: SMSWebhookPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Ingests citizen civic grievances submitted via SMS text webhook.
    Normalizes SMS text and resolves citizen location from previous complaint history or flags coordinates as missing.
    """
    normalized = NormalizedComplaintPayload(
        source_channel="SMS",
        external_message_id=payload.message_id,
        citizen_identifier=payload.from_number,
        citizen_name=f"SMS User ({payload.from_number})",
        raw_message=payload.text,
        latitude=None,
        longitude=None,
    )
    return unified_ingestion_service.ingest(db=db, payload=normalized, background_tasks=background_tasks)


@router.post(
    "/civic-complaint",
    response_model=OmnichannelIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generic Civic Complaint Partner Webhook"
)
def generic_civic_webhook(
    payload: GenericWebhookPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Generic civic complaint webhook for partner municipal apps, IoT sensors, and external systems.
    Validates external ID, channel, and passes through the unified AI pipeline.
    """
    normalized = NormalizedComplaintPayload(
        source_channel=(payload.channel or "WEBHOOK").upper(),
        external_message_id=payload.external_id,
        citizen_identifier=payload.contact,
        citizen_name=payload.citizen or f"Partner User ({payload.external_id})",
        raw_message=payload.message,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        attachments=payload.attachments or [],
    )
    return unified_ingestion_service.ingest(db=db, payload=normalized, background_tasks=background_tasks)


@router.get(
    "/stats",
    summary="Omnichannel Intake & Notification Statistics",
    tags=["Omnichannel Webhook Ingestion"]
)
def get_omnichannel_stats_webhook(db: Session = Depends(get_db)):
    """Provides volume metrics and channel breakdown across WhatsApp, SMS, Web, and Partner webhooks."""
    from app.services.complaint_service import complaint_service
    return complaint_service.get_omnichannel_stats(db)
