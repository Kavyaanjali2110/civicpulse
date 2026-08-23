from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentService:
    @staticmethod
    def get_all(db: Session, active_only: bool = False) -> List[Department]:
        query = db.query(Department)
        if active_only:
            query = query.filter(Department.active == True)
        return query.order_by(Department.name.asc()).all()

    @staticmethod
    def get_by_id(db: Session, department_id: int) -> Optional[Department]:
        return db.query(Department).filter(Department.id == department_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[Department]:
        return db.query(Department).filter(Department.name == name).first()

    @staticmethod
    def create(db: Session, obj_in: DepartmentCreate) -> Department:
        dept = Department(
            name=obj_in.name,
            description=obj_in.description,
            active=obj_in.active,
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def update(db: Session, db_obj: Department, obj_in: DepartmentUpdate) -> Department:
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj


department_service = DepartmentService()
