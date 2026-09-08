from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.complaint import Complaint
from app.models.category import Category
from app.models.audit import AuditLog
from app.schemas.webhook import NormalizedComplaintPayload, OmnichannelIngestionResponse
from app.schemas.notification import NotificationResponse
from app.services.complaint_service import complaint_service
from app.services.notification_service import notification_service
from app.ai.pipeline import civic_pipeline
from app.utils.ward_resolver import get_ward


class UnifiedIngestionService:
    VALID_CHANNELS = {"WEB", "WHATSAPP", "SMS", "WEBHOOK"}

    @classmethod
    def ingest(
        cls,
        db: Session,
        payload: NormalizedComplaintPayload,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> OmnichannelIngestionResponse:
        # 1. Validate Channel
        channel = (payload.source_channel or "WEB").upper()
        if channel not in cls.VALID_CHANNELS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported ingestion channel '{payload.source_channel}'. Supported: {', '.join(cls.VALID_CHANNELS)}"
            )

        # 2. Validate Message Content
        clean_text = (payload.raw_message or "").strip()
        if not clean_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Grievance message text cannot be empty."
            )

        # 3. Enforce Idempotency / Reject Duplicate External Message ID
        if payload.external_message_id:
            existing = db.query(Complaint).filter(Complaint.external_message_id == payload.external_message_id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Duplicate external message ID '{payload.external_message_id}' has already been processed (Tracking ID: {existing.tracking_id})."
                )

        # 4. Resolve Geospatial Coordinates & Municipal Ward
        lat: Optional[float] = None
        lon: Optional[float] = None
        ward_id: Optional[int] = None
        ward_name: Optional[str] = None
        addr: Optional[str] = payload.address

        if payload.latitude is not None and payload.longitude is not None:
            lat = float(payload.latitude)
            lon = float(payload.longitude)
            ward_id, ward_name = get_ward(lat, lon)
            if not addr:
                addr = f"{ward_name} (Coordinates: {round(lat, 4)}, {round(lon, 4)})"
        else:
            # Fallback for SMS or generic channels without GPS:
            # Attempt to resolve from citizen profile/history if contact number is available
            if payload.citizen_identifier:
                prev = (
                    db.query(Complaint)
                    .filter(
                        Complaint.citizen_contact == payload.citizen_identifier,
                        Complaint.latitude.isnot(None),
                        Complaint.longitude.isnot(None)
                    )
                    .order_by(Complaint.created_at.desc())
                    .first()
                )
                if prev:
                    lat = prev.latitude
                    lon = prev.longitude
                    ward_id = prev.ward_id
                    ward_name = prev.ward_name
                    addr = addr or prev.address or f"{ward_name} (Resolved from citizen history)"

        if not addr:
            addr = f"{ward_name}" if ward_name else "Location Pending (GPS Missing)"

        # 5. Execute Unified AI Intelligence Pipeline
        ai_result = civic_pipeline.process_complaint(
            raw_text=clean_text,
            latitude=lat if lat is not None else 0.0,
            longitude=lon if lon is not None else 0.0,
            db=db
        )

        resolved_category_id = ai_result["category_id"]
        category = db.query(Category).filter(Category.id == resolved_category_id).first()
        category_name = category.name if category else "General Civic Grievance"

        # 6. Generate CivicPulse Tracking Code
        tracking_id = complaint_service.generate_tracking_id()
        while db.query(Complaint).filter(Complaint.tracking_id == tracking_id).first():
            tracking_id = complaint_service.generate_tracking_id()

        # 7. Persist Complaint
        image_attachment = payload.image_url or (payload.attachments[0] if payload.attachments else None)
        complaint = Complaint(
            tracking_id=tracking_id,
            source_channel=channel,
            external_message_id=payload.external_message_id,
            external_sender_id=payload.citizen_identifier,
            ingestion_timestamp=payload.received_at or datetime.now(timezone.utc),
            citizen_name=payload.citizen_name or f"Citizen ({channel})",
            citizen_contact=payload.citizen_identifier,
            raw_text=clean_text,
            detected_language=ai_result["detected_language"],
            translated_text=ai_result["translated_text"],
            audio_url=payload.audio_url,
            image_url=image_attachment,
            latitude=lat,
            longitude=lon,
            address=addr,
            ward_id=ward_id,
            ward_name=ward_name,
            category_id=resolved_category_id,
            subcategory=ai_result.get("subcategory"),
            severity_score=ai_result["severity_score"],
            severity_level=ai_result["severity_level"],
            priority_score=ai_result["priority_score"],
            status="RECEIVED",
            cluster_id=None,
            is_duplicate=ai_result["is_duplicate"],
            parent_complaint_id=ai_result.get("parent_complaint_id"),
        )
        db.add(complaint)
        db.flush()

        # Audit Log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=None,
            new_status="RECEIVED",
            changed_by=f"Omnichannel Intake ({channel})",
            notes=f"Ingested via {channel}. Ext ID: {payload.external_message_id or 'N/A'}. Lang: {ai_result['detected_language'].upper()}.",
        )
        db.add(audit)
        db.commit()
        db.refresh(complaint)

        # 8. Send Initial Notifications
        notifications_sent = []
        n1 = notification_service.send_notification(db, complaint, "COMPLAINT_RECEIVED")
        notifications_sent.append(NotificationResponse.model_validate(n1))

        n2 = notification_service.send_notification(db, complaint, "AI_ANALYZED")
        notifications_sent.append(NotificationResponse.model_validate(n2))

        # If location missing, prompt for location
        if lat is None or lon is None:
            n3 = notification_service.send_notification(db, complaint, "LOCATION_REQUIRED")
            notifications_sent.append(NotificationResponse.model_validate(n3))

        # 9. Trigger Background Spatial Cluster & Hotspot Recalculation
        if background_tasks:
            def recluster_job():
                from app.core.database import SessionLocal
                job_db = SessionLocal()
                try:
                    civic_pipeline.run_cluster_and_trend_intelligence(job_db)
                finally:
                    job_db.close()

            background_tasks.add_task(recluster_job)

        # 10. Construct Omnichannel Confirmation Response
        confirm_msg = (
            f"Grievance successfully registered via {channel}. "
            f"Tracking Code: {tracking_id}. Categorized as {category_name} ({complaint.severity_level} priority)."
        )

        return OmnichannelIngestionResponse(
            complaint_id=complaint.id,
            tracking_id=complaint.tracking_id,
            channel=complaint.source_channel,
            external_message_id=complaint.external_message_id,
            detected_language=complaint.detected_language,
            translated_text=complaint.translated_text,
            category_id=complaint.category_id,
            category=category_name,
            subcategory=complaint.subcategory,
            severity_level=complaint.severity_level,
            severity_score=complaint.severity_score,
            priority_score=complaint.priority_score,
            ward_id=complaint.ward_id,
            ward_name=complaint.ward_name,
            status=complaint.status,
            message=confirm_msg,
            notifications_sent=notifications_sent,
            xai_explanation=ai_result.get("xai_explanation"),
        )


unified_ingestion_service = UnifiedIngestionService()
