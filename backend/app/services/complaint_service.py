import random
import string
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from app.models.complaint import Complaint
from app.models.audit import AuditLog
from app.schemas.complaint import ComplaintCreate, ComplaintStatusUpdate


class ComplaintService:
    @staticmethod
    def generate_tracking_id() -> str:
        """Generates a human-friendly unique tracking code like CP-2026-K94B."""
        year = datetime.now().year
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f"CP-{year}-{suffix}"

    @classmethod
    def create(
        cls,
        db: Session,
        data: ComplaintCreate,
        severity_score: float = 0.5,
        severity_level: str = "MEDIUM",
        priority_score: float = 50.0,
        cluster_id: Optional[int] = None,
        is_duplicate: bool = False,
        parent_complaint_id: Optional[int] = None,
    ) -> Complaint:
        tracking_id = cls.generate_tracking_id()
        while db.query(Complaint).filter(Complaint.tracking_id == tracking_id).first():
            tracking_id = cls.generate_tracking_id()

        complaint = Complaint(
            tracking_id=tracking_id,
            citizen_name=data.citizen_name,
            citizen_contact=data.citizen_contact,
            raw_text=data.raw_text,
            detected_language=data.detected_language,
            translated_text=data.translated_text or data.raw_text,
            audio_url=data.audio_url,
            image_url=data.image_url,
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            category_id=data.category_id,
            subcategory=data.subcategory,
            severity_score=severity_score,
            severity_level=severity_level,
            priority_score=priority_score,
            status="RECEIVED",
            cluster_id=cluster_id,
            is_duplicate=is_duplicate,
            parent_complaint_id=parent_complaint_id,
        )
        db.add(complaint)
        db.flush()

        # Create initial audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=None,
            new_status="RECEIVED",
            changed_by="Citizen Submission",
            notes="Initial complaint received and registered.",
        )
        db.add(audit)
        db.commit()
        db.refresh(complaint)
        return complaint

    @staticmethod
    def get_by_id(db: Session, complaint_id: int) -> Optional[Complaint]:
        return db.query(Complaint).filter(Complaint.id == complaint_id).first()

    @staticmethod
    def get_by_tracking_id(db: Session, tracking_id: str) -> Optional[Complaint]:
        return db.query(Complaint).filter(Complaint.tracking_id == tracking_id.upper()).first()

    @staticmethod
    def list_complaints(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        category_id: Optional[int] = None,
        status: Optional[str] = None,
        severity_level: Optional[str] = None,
        cluster_id: Optional[int] = None,
        search: Optional[str] = None,
        ward_id: Optional[int] = None,
        source_channel: Optional[str] = None,
    ) -> Tuple[List[Complaint], int]:
        query = db.query(Complaint)

        if source_channel:
            query = query.filter(Complaint.source_channel == source_channel.upper())

        if ward_id is not None:
            query = query.filter(Complaint.ward_id == ward_id)
        if category_id:
            query = query.filter(Complaint.category_id == category_id)
        if status:
            query = query.filter(Complaint.status == status.upper())
        if severity_level:
            query = query.filter(Complaint.severity_level == severity_level.upper())
        if cluster_id:
            query = query.filter(Complaint.cluster_id == cluster_id)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Complaint.tracking_id.ilike(search_pattern),
                    Complaint.raw_text.ilike(search_pattern),
                    Complaint.translated_text.ilike(search_pattern),
                    Complaint.address.ilike(search_pattern),
                )
            )

        total = query.count()
        complaints = (
            query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return complaints, total

    @staticmethod
    def update_status(
        db: Session,
        complaint_id: int,
        update_data: ComplaintStatusUpdate,
    ) -> Optional[Complaint]:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            return None

        previous_status = complaint.status
        complaint.status = update_data.status.upper()
        complaint.updated_at = datetime.now(timezone.utc)

        if update_data.status.upper() == "RESOLVED":
            complaint.resolved_at = datetime.now(timezone.utc)

        # Append audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=previous_status,
            new_status=complaint.status,
            changed_by=update_data.changed_by,
            notes=update_data.notes,
        )
        db.add(audit)
        db.commit()
        db.refresh(complaint)
        return complaint

    @staticmethod
    def get_overview_stats(db: Session, ward_id: Optional[int] = None) -> Dict[str, Any]:
        """Calculates key metrics for Government dashboard, optionally scoped to a ward."""
        base_query = db.query(func.count(Complaint.id))
        if ward_id is not None:
            base_query = base_query.filter(Complaint.ward_id == ward_id)

        def wq():
            """Return a fresh ward-scoped count query."""
            q = db.query(func.count(Complaint.id))
            if ward_id is not None:
                q = q.filter(Complaint.ward_id == ward_id)
            return q

        total = wq().scalar() or 0
        resolved = wq().filter(Complaint.status == "RESOLVED").scalar() or 0
        in_progress = wq().filter(Complaint.status == "IN_PROGRESS").scalar() or 0
        received = wq().filter(Complaint.status == "RECEIVED").scalar() or 0
        investigating = wq().filter(Complaint.status == "INVESTIGATING").scalar() or 0
        critical_count = wq().filter(Complaint.severity_level == "CRITICAL").scalar() or 0
        high_count = wq().filter(Complaint.severity_level == "HIGH").scalar() or 0

        avg_q = db.query(func.avg(Complaint.priority_score))
        if ward_id is not None:
            avg_q = avg_q.filter(Complaint.ward_id == ward_id)
        avg_priority = avg_q.scalar() or 0.0

        return {
            "total_complaints": total,
            "resolved_count": resolved,
            "in_progress_count": in_progress,
            "received_count": received,
            "investigating_count": investigating,
            "open_count": total - resolved,
            "critical_count": critical_count,
            "high_severity_count": high_count,
            "average_priority_score": round(float(avg_priority), 2),
            "resolution_rate": round((resolved / total * 100) if total > 0 else 0.0, 1),
        }

    @staticmethod
    def get_workflow_stats(db: Session, ward_id: Optional[int] = None) -> Dict[str, Any]:
        """Calculates dispatch workflow, crew assignment, and SLA metrics."""
        from app.models.crew_assignment import CrewAssignment
        from app.models.field_crew import FieldCrew
        from app.models.department import Department
        from app.services.dispatch_service import dispatch_service

        query = db.query(Complaint)
        if ward_id is not None:
            query = query.filter(Complaint.ward_id == ward_id)

        all_complaints = query.all()

        total = len(all_complaints)
        resolved_list = [c for c in all_complaints if c.status == "RESOLVED"]
        active_list = [c for c in all_complaints if c.status != "RESOLVED"]
        in_progress_list = [c for c in all_complaints if c.status == "IN_PROGRESS"]

        # Check assigned vs unassigned in active
        assigned_count = 0
        unassigned_count = 0
        overdue_count = 0
        on_time_count = 0
        at_risk_count = 0

        res_times = []
        sla_met_count = 0

        for c in all_complaints:
            sla = dispatch_service.calculate_sla(c)
            if c.status != "RESOLVED":
                has_active_assign = any(
                    a.assignment_status in ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"]
                    for a in (c.crew_assignments or [])
                )
                if has_active_assign:
                    assigned_count += 1
                else:
                    unassigned_count += 1

                if sla.sla_status == "OVERDUE":
                    overdue_count += 1
                elif sla.sla_status == "AT_RISK":
                    at_risk_count += 1
                else:
                    on_time_count += 1
            else:
                if sla.total_resolution_time_hours is not None:
                    res_times.append(sla.total_resolution_time_hours)
                    if sla.total_resolution_time_hours <= sla.sla_target_hours:
                        sla_met_count += 1
                    else:
                        overdue_count += 1

        avg_resolution_time = round(sum(res_times) / len(res_times), 1) if res_times else 0.0
        sla_compliance = round((sla_met_count / len(resolved_list) * 100), 1) if resolved_list else 100.0

        # Crew workloads
        crews_query = db.query(FieldCrew).filter(FieldCrew.active == True)
        if ward_id is not None:
            crews_query = crews_query.filter(FieldCrew.ward_id == ward_id)
        crews = crews_query.all()

        crew_workloads = []
        for crew in crews:
            active_jobs = (
                db.query(CrewAssignment)
                .filter(
                    CrewAssignment.crew_id == crew.id,
                    CrewAssignment.assignment_status.in_(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
                )
                .count()
            )
            completed_jobs = (
                db.query(CrewAssignment)
                .filter(
                    CrewAssignment.crew_id == crew.id,
                    CrewAssignment.assignment_status == "COMPLETED"
                )
                .count()
            )
            crew_workloads.append({
                "id": crew.id,
                "name": crew.name,
                "department_name": crew.department.name if crew.department else "General",
                "ward_id": crew.ward_id,
                "ward_name": crew.ward_name,
                "crew_leader": crew.crew_leader,
                "contact_number": crew.contact_number,
                "current_status": crew.current_status,
                "active_jobs": active_jobs,
                "completed_jobs": completed_jobs,
            })

        # Ward breakdowns (Wards 1 to 8)
        ward_breakdowns = []
        for w in range(1, 9):
            w_complaints = [c for c in all_complaints if c.ward_id == w]
            w_total = len(w_complaints)
            w_resolved = len([c for c in w_complaints if c.status == "RESOLVED"])
            w_active = w_total - w_resolved
            ward_breakdowns.append({
                "ward_id": w,
                "ward_name": f"Ward {w}",
                "total": w_total,
                "active": w_active,
                "resolved": w_resolved,
            })

        return {
            "total_complaints": total,
            "total_active_complaints": len(active_list),
            "assigned_complaints": assigned_count,
            "unassigned_complaints": unassigned_count,
            "in_progress_complaints": len(in_progress_list),
            "resolved_complaints": len(resolved_list),
            "overdue_complaints": overdue_count,
            "at_risk_complaints": at_risk_count,
            "on_time_complaints": on_time_count,
            "average_resolution_time_hours": avg_resolution_time,
            "sla_compliance_percentage": sla_compliance,
            "crew_workload": crew_workloads,
            "ward_breakdowns": ward_breakdowns,
        }

    @staticmethod
    def get_omnichannel_stats(db: Session) -> Dict[str, Any]:
        """Calculates multi-channel intake volume, channel breakdown, and notification statistics."""
        from app.models.notification import Notification

        all_complaints = db.query(Complaint).all()
        total_complaints = len(all_complaints)
        total_notifications = db.query(Notification).count()

        channels = ["WEB", "WHATSAPP", "SMS", "WEBHOOK"]
        channel_stats = {}

        for ch in channels:
            ch_items = [c for c in all_complaints if (c.source_channel or "WEB").upper() == ch]
            ch_total = len(ch_items)
            ch_resolved = len([c for c in ch_items if c.status == "RESOLVED"])
            ch_active = ch_total - ch_resolved
            ch_ips = round(sum(c.priority_score for c in ch_items) / ch_total, 1) if ch_total > 0 else 0.0
            ch_pct = round((ch_total / total_complaints * 100), 1) if total_complaints > 0 else 0.0

            channel_stats[ch] = {
                "total": ch_total,
                "active": ch_active,
                "resolved": ch_resolved,
                "percentage": ch_pct,
                "avg_priority_score": ch_ips,
            }

        # Recent 10 omnichannel complaints
        recent_complaints = (
            db.query(Complaint)
            .order_by(Complaint.created_at.desc())
            .limit(10)
            .all()
        )

        recent_items = []
        for c in recent_complaints:
            recent_items.append({
                "id": c.id,
                "tracking_id": c.tracking_id,
                "channel": c.source_channel or "WEB",
                "external_message_id": c.external_message_id,
                "citizen_name": c.citizen_name,
                "citizen_contact": c.citizen_contact,
                "category": c.category.name if c.category else "General",
                "ward_id": c.ward_id,
                "ward_name": c.ward_name or (f"Ward {c.ward_id}" if c.ward_id else "Unassigned"),
                "priority_score": c.priority_score,
                "severity_level": c.severity_level,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            })

        channel_breakdown = {ch: stats["total"] for ch, stats in channel_stats.items()}

        return {
            "total_complaints": total_complaints,
            "total_notifications_sent": total_notifications,
            "channel_stats": channel_stats,
            "channel_breakdown": channel_breakdown,
            "recent_complaints": recent_items,
        }


complaint_service = ComplaintService()

