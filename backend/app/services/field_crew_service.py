from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.complaint import Complaint
from app.schemas.field_crew import FieldCrewCreate, FieldCrewUpdate


class FieldCrewService:
    @staticmethod
    def get_all(
        db: Session,
        department_id: Optional[int] = None,
        ward_id: Optional[int] = None,
        active_only: bool = False,
    ) -> List[FieldCrew]:
        query = db.query(FieldCrew)
        if department_id is not None:
            query = query.filter(FieldCrew.department_id == department_id)
        if ward_id is not None:
            query = query.filter(FieldCrew.ward_id == ward_id)
        if active_only:
            query = query.filter(FieldCrew.active == True)
        return query.order_by(FieldCrew.name.asc()).all()

    @staticmethod
    def get_by_id(db: Session, crew_id: int) -> Optional[FieldCrew]:
        return db.query(FieldCrew).filter(FieldCrew.id == crew_id).first()

    @staticmethod
    def create(db: Session, obj_in: FieldCrewCreate) -> FieldCrew:
        crew = FieldCrew(
            name=obj_in.name,
            department_id=obj_in.department_id,
            ward_id=obj_in.ward_id,
            ward_name=obj_in.ward_name,
            crew_leader=obj_in.crew_leader,
            contact_number=obj_in.contact_number,
            active=obj_in.active,
            current_status=obj_in.current_status or "AVAILABLE",
        )
        db.add(crew)
        db.commit()
        db.refresh(crew)
        return crew

    @staticmethod
    def update(db: Session, db_obj: FieldCrew, obj_in: FieldCrewUpdate) -> FieldCrew:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def get_active_workload(db: Session, crew_id: int) -> int:
        return (
            db.query(CrewAssignment)
            .filter(
                CrewAssignment.crew_id == crew_id,
                CrewAssignment.assignment_status.in_(["ASSIGNED", "ACCEPTED", "IN_PROGRESS"])
            )
            .count()
        )

    @staticmethod
    def get_assigned_complaints(
        db: Session,
        crew_id: int,
        status: Optional[str] = None
    ) -> List[Complaint]:
        query = (
            db.query(Complaint)
            .join(CrewAssignment, Complaint.id == CrewAssignment.complaint_id)
            .filter(CrewAssignment.crew_id == crew_id)
        )
        if status:
            query = query.filter(CrewAssignment.assignment_status == status)
        return query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc()).all()


field_crew_service = FieldCrewService()
