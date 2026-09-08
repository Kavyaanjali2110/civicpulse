from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.complaint import Complaint
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.resolution_evidence import ResolutionEvidence
from app.models.citizen_feedback import CitizenFeedback
from app.models.audit import AuditLog
from app.schemas.crew_assignment import CrewAssignmentCreate, CrewAssignmentAction
from app.schemas.resolution_evidence import ResolutionEvidenceCreate
from app.schemas.citizen_feedback import CitizenFeedbackCreate
from app.schemas.complaint import SLAMetrics
from app.services.notification_service import notification_service


class DispatchService:
    @staticmethod
    def calculate_sla(complaint: Complaint) -> SLAMetrics:
        """Calculates SLA metrics, time to milestones, and overall compliance status."""
        target_hours = complaint.category.default_sla_hours if complaint.category else 48
        now = datetime.now(timezone.utc)

        created_at = complaint.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        # 1. Assignment time
        time_to_assignment = None
        time_to_acceptance = None
        time_to_start = None
        time_to_resolution = None
        total_resolution_time = None

        # Check latest or initial crew assignment
        if complaint.crew_assignments:
            first_assign = complaint.crew_assignments[-1]  # or sorted by assigned_at
            a_time = first_assign.assigned_at
            if a_time.tzinfo is None:
                a_time = a_time.replace(tzinfo=timezone.utc)
            time_to_assignment = round(max(0.0, (a_time - created_at).total_seconds() / 3600.0), 2)

            if first_assign.accepted_at:
                acc_time = first_assign.accepted_at
                if acc_time.tzinfo is None:
                    acc_time = acc_time.replace(tzinfo=timezone.utc)
                time_to_acceptance = round(max(0.0, (acc_time - created_at).total_seconds() / 3600.0), 2)

            if first_assign.started_at:
                st_time = first_assign.started_at
                if st_time.tzinfo is None:
                    st_time = st_time.replace(tzinfo=timezone.utc)
                time_to_start = round(max(0.0, (st_time - created_at).total_seconds() / 3600.0), 2)

        # 2. Resolution time
        if complaint.resolved_at:
            r_time = complaint.resolved_at
            if r_time.tzinfo is None:
                r_time = r_time.replace(tzinfo=timezone.utc)
            time_to_resolution = round(max(0.0, (r_time - created_at).total_seconds() / 3600.0), 2)
            total_resolution_time = time_to_resolution

            sla_status = "ON_TIME" if time_to_resolution <= target_hours else "OVERDUE"
        else:
            elapsed_hours = (now - created_at).total_seconds() / 3600.0
            if elapsed_hours > target_hours:
                sla_status = "OVERDUE"
            elif elapsed_hours >= (target_hours * 0.75):
                sla_status = "AT_RISK"
            else:
                sla_status = "ON_TIME"

        return SLAMetrics(
            time_to_assignment_hours=time_to_assignment,
            time_to_acceptance_hours=time_to_acceptance,
            time_to_start_hours=time_to_start,
            time_to_resolution_hours=time_to_resolution,
            total_resolution_time_hours=total_resolution_time,
            sla_target_hours=target_hours,
            sla_status=sla_status,
        )

    @classmethod
    def assign_crew(
        cls,
        db: Session,
        complaint_id: int,
        obj_in: CrewAssignmentCreate,
    ) -> CrewAssignment:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint with ID {complaint_id} does not exist."
            )

        if complaint.status == "RESOLVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign crew to an already resolved complaint."
            )

        crew = db.query(FieldCrew).filter(FieldCrew.id == obj_in.crew_id).first()
        if not crew:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field crew with ID {obj_in.crew_id} does not exist."
            )

        if not crew.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field crew '{crew.name}' is currently inactive and cannot receive new assignments."
            )

        # Create assignment
        assignment = CrewAssignment(
            complaint_id=complaint.id,
            crew_id=crew.id,
            assigned_by=obj_in.assigned_by or "Municipal Dispatch",
            assigned_at=datetime.now(timezone.utc),
            assignment_status="ASSIGNED",
            notes=obj_in.notes,
        )
        db.add(assignment)

        # Update complaint status if currently RECEIVED
        prev_status = complaint.status
        if complaint.status == "RECEIVED":
            complaint.status = "INVESTIGATING"

        # Update crew status to ON_DUTY if AVAILABLE
        if crew.current_status == "AVAILABLE":
            crew.current_status = "ON_DUTY"

        # Add audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=prev_status,
            new_status=complaint.status,
            changed_by=obj_in.assigned_by or "Municipal Dispatch",
            notes=f"Dispatched to field crew: {crew.name} ({crew.crew_leader}). Notes: {obj_in.notes or 'None'}",
        )
        db.add(audit)

        db.commit()
        db.refresh(assignment)
        db.refresh(complaint)

        # Trigger citizen assignment notification
        notification_service.send_notification(db, complaint, "ASSIGNED")

        return assignment

    @classmethod
    def accept_assignment(
        cls,
        db: Session,
        assignment_id: int,
        action_in: CrewAssignmentAction,
    ) -> CrewAssignment:
        assignment = db.query(CrewAssignment).filter(CrewAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crew assignment {assignment_id} not found."
            )

        if assignment.assignment_status != "ASSIGNED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept assignment in '{assignment.assignment_status}' state. Must be 'ASSIGNED'."
            )

        assignment.assignment_status = "ACCEPTED"
        assignment.accepted_at = datetime.now(timezone.utc)
        if action_in.notes:
            assignment.notes = (assignment.notes or "") + f" | Accepted: {action_in.notes}"

        # Audit log
        audit = AuditLog(
            complaint_id=assignment.complaint_id,
            previous_status=assignment.complaint.status,
            new_status=assignment.complaint.status,
            changed_by=action_in.changed_by or assignment.crew.crew_leader,
            notes=f"Field crew '{assignment.crew.name}' accepted task assignment. {action_in.notes or ''}",
        )
        db.add(audit)

        db.commit()
        db.refresh(assignment)
        return assignment

    @classmethod
    def start_work(
        cls,
        db: Session,
        assignment_id: int,
        action_in: CrewAssignmentAction,
    ) -> CrewAssignment:
        assignment = db.query(CrewAssignment).filter(CrewAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crew assignment {assignment_id} not found."
            )

        if assignment.assignment_status not in ["ASSIGNED", "ACCEPTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot start work for assignment in '{assignment.assignment_status}' state."
            )

        assignment.assignment_status = "IN_PROGRESS"
        assignment.started_at = datetime.now(timezone.utc)
        if not assignment.accepted_at:
            assignment.accepted_at = assignment.started_at

        # Update complaint status to IN_PROGRESS
        complaint = assignment.complaint
        prev_status = complaint.status
        complaint.status = "IN_PROGRESS"

        # Update crew status to BUSY
        assignment.crew.current_status = "BUSY"

        # Audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=prev_status,
            new_status="IN_PROGRESS",
            changed_by=action_in.changed_by or assignment.crew.crew_leader,
            notes=f"Field crew started on-site repair work. {action_in.notes or ''}",
        )
        db.add(audit)

        db.commit()
        db.refresh(assignment)
        db.refresh(complaint)

        # Trigger citizen work in progress notification
        notification_service.send_notification(db, complaint, "IN_PROGRESS")

        return assignment

    @classmethod
    def upload_resolution_evidence(
        cls,
        db: Session,
        complaint_id: int,
        evidence_in: ResolutionEvidenceCreate,
    ) -> ResolutionEvidence:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint with ID {complaint_id} not found."
            )

        evidence = ResolutionEvidence(
            complaint_id=complaint.id,
            uploaded_by=evidence_in.uploaded_by or "Field Crew Officer",
            before_photo=evidence_in.before_photo or complaint.image_url,
            after_photo=evidence_in.after_photo,
            description=evidence_in.description,
            uploaded_at=datetime.now(timezone.utc),
        )
        db.add(evidence)

        # Audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=complaint.status,
            new_status=complaint.status,
            changed_by=evidence_in.uploaded_by or "Field Crew Officer",
            notes=f"Uploaded photo resolution proof: {evidence_in.description}",
        )
        db.add(audit)

        db.commit()
        db.refresh(evidence)
        return evidence

    @classmethod
    def complete_assignment(
        cls,
        db: Session,
        assignment_id: int,
        action_in: CrewAssignmentAction,
        evidence_in: Optional[ResolutionEvidenceCreate] = None,
    ) -> CrewAssignment:
        assignment = db.query(CrewAssignment).filter(CrewAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Crew assignment {assignment_id} not found."
            )

        complaint = assignment.complaint

        # Check resolution evidence exists or is provided
        if evidence_in:
            cls.upload_resolution_evidence(db, complaint.id, evidence_in)

        # Verify evidence exists
        ev_count = db.query(ResolutionEvidence).filter(ResolutionEvidence.complaint_id == complaint.id).count()
        if ev_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resolution evidence (after repair photo & description) must be uploaded before completing resolution."
            )

        now = datetime.now(timezone.utc)
        assignment.assignment_status = "COMPLETED"
        assignment.completed_at = now
        if not assignment.accepted_at:
            assignment.accepted_at = now
        if not assignment.started_at:
            assignment.started_at = now

        # Update complaint to RESOLVED
        prev_status = complaint.status
        complaint.status = "RESOLVED"
        complaint.resolved_at = now

        # Reset crew status to AVAILABLE if no other active jobs
        active_remaining = (
            db.query(CrewAssignment)
            .filter(
                CrewAssignment.crew_id == assignment.crew_id,
                CrewAssignment.id != assignment.id,
                CrewAssignment.assignment_status.in_(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
            )
            .count()
        )
        if active_remaining == 0:
            assignment.crew.current_status = "AVAILABLE"

        # Audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=prev_status,
            new_status="RESOLVED",
            changed_by=action_in.changed_by or assignment.crew.crew_leader,
            notes=f"Field repair completed and verified with photographic evidence. {action_in.notes or ''}",
        )
        db.add(audit)

        db.commit()
        db.refresh(assignment)
        db.refresh(complaint)

        # Trigger citizen resolution & feedback request notifications
        notification_service.send_notification(db, complaint, "RESOLVED")
        notification_service.send_notification(db, complaint, "FEEDBACK_REQUEST")

        return assignment

    @classmethod
    def submit_citizen_feedback(
        cls,
        db: Session,
        complaint_id: int,
        feedback_in: CitizenFeedbackCreate,
    ) -> CitizenFeedback:
        complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint with ID {complaint_id} not found."
            )

        if complaint.status != "RESOLVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feedback can only be submitted for RESOLVED complaints. Current status is '{complaint.status}'."
            )

        # Prevent duplicate feedback
        existing = db.query(CitizenFeedback).filter(CitizenFeedback.complaint_id == complaint.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Citizen feedback has already been submitted for this complaint."
            )

        if not (1 <= feedback_in.rating <= 5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be an integer between 1 and 5."
            )

        feedback = CitizenFeedback(
            complaint_id=complaint.id,
            citizen_id=feedback_in.citizen_id or "anonymous_citizen",
            citizen_name=feedback_in.citizen_name or complaint.citizen_name or "Citizen",
            rating=feedback_in.rating,
            feedback=feedback_in.feedback,
            created_at=datetime.now(timezone.utc),
        )
        db.add(feedback)

        # Audit log
        audit = AuditLog(
            complaint_id=complaint.id,
            previous_status=complaint.status,
            new_status=complaint.status,
            changed_by=feedback.citizen_name,
            notes=f"Citizen submitted {feedback.rating}★ rating. Feedback: '{feedback.feedback or 'No comment provided'}'",
        )
        db.add(audit)

        db.commit()
        db.refresh(feedback)
        return feedback


dispatch_service = DispatchService()
