from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.complaint import Complaint


class NotificationService:
    @staticmethod
    def format_event_message(complaint: Complaint, event_type: str, custom_message: Optional[str] = None) -> str:
        if custom_message:
            return custom_message

        tracking = complaint.tracking_id
        cat_name = complaint.category.name if complaint.category else "Civic Infrastructure"
        channel = complaint.source_channel or "Web Portal"

        if event_type == "COMPLAINT_RECEIVED":
            return (
                f"Your CivicPulse complaint {tracking} has been received via {channel}. "
                f"Category: {cat_name}. Priority: {complaint.severity_level}."
            )
        elif event_type == "AI_ANALYZED":
            ward_info = complaint.ward_name or f"Ward {complaint.ward_id}" if complaint.ward_id else "Location Pending"
            return (
                f"AI analysis completed for {tracking}. "
                f"Priority Score: {complaint.priority_score}/100. Zone: {ward_info}."
            )
        elif event_type == "LOCATION_REQUIRED":
            return (
                f"Location coordinates missing for SMS complaint {tracking}. "
                f"Please reply with your street name or landmark to expedite dispatch."
            )
        elif event_type == "ASSIGNED":
            crew_name = "Municipal Field Operations Unit"
            dept_name = "Public Works"
            if complaint.crew_assignments:
                latest_assign = complaint.crew_assignments[0]
                if latest_assign.crew:
                    crew_name = latest_assign.crew.name
                    if latest_assign.crew.department:
                        dept_name = latest_assign.crew.department.name
            elif complaint.category:
                dept_name = complaint.category.name
            return f"Your complaint {tracking} has been assigned to the {crew_name} ({dept_name})."
        elif event_type == "INVESTIGATING":
            return f"Technical investigation initiated for complaint {tracking}."
        elif event_type == "IN_PROGRESS":
            return f"Work has started on-site for complaint {tracking}."
        elif event_type == "RESOLVED":
            return f"Your complaint {tracking} has been resolved. Please review the verified repair proof."
        elif event_type == "FEEDBACK_REQUEST":
            return f"Please rate your satisfaction (1 to 5 stars) for resolved complaint {tracking}."
        else:
            return f"Update for complaint {tracking}: Status changed to {complaint.status}."

    @classmethod
    def send_notification(
        cls,
        db: Session,
        complaint: Complaint,
        event_type: str,
        custom_message: Optional[str] = None,
        citizen_identifier: Optional[str] = None
    ) -> Notification:
        """Simulates and persists a two-way citizen notification for the complaint's source channel."""
        target_citizen = citizen_identifier or complaint.citizen_contact or complaint.citizen_name or "Citizen"
        message_text = cls.format_event_message(complaint, event_type, custom_message)

        now = datetime.now(timezone.utc)
        notification = Notification(
            complaint_id=complaint.id,
            citizen_identifier=str(target_citizen),
            channel=complaint.source_channel or "WEB",
            event_type=event_type,
            message=message_text,
            status="SENT",
            created_at=now,
            sent_at=now,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def list_notifications(
        db: Session,
        complaint_id: Optional[int] = None,
        citizen_identifier: Optional[str] = None,
        channel: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Notification]:
        query = db.query(Notification)
        if complaint_id is not None:
            query = query.filter(Notification.complaint_id == complaint_id)
        if citizen_identifier:
            query = query.filter(Notification.citizen_identifier.ilike(f"%{citizen_identifier}%"))
        if channel:
            query = query.filter(Notification.channel == channel.upper())
        if event_type:
            query = query.filter(Notification.event_type == event_type.upper())

        return query.order_by(Notification.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_complaint_notifications(db: Session, complaint_id: int) -> List[Notification]:
        return (
            db.query(Notification)
            .filter(Notification.complaint_id == complaint_id)
            .order_by(Notification.created_at.asc())
            .all()
        )


notification_service = NotificationService()
