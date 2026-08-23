from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.category import Category
from app.schemas.category import CategoryCreate


class CategoryService:
    @staticmethod
    def get_all(db: Session) -> List[Category]:
        return db.query(Category).order_by(Category.id.asc()).all()

    @staticmethod
    def get_by_id(db: Session, category_id: int) -> Optional[Category]:
        return db.query(Category).filter(Category.id == category_id).first()

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[Category]:
        return db.query(Category).filter(Category.code == code.upper()).first()

    @staticmethod
    def create(db: Session, data: CategoryCreate) -> Category:
        category = Category(
            code=data.code.upper(),
            name=data.name,
            description=data.description,
            default_sla_hours=data.default_sla_hours,
            criticality_weight=data.criticality_weight,
            icon=data.icon or "alert-circle",
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return category


category_service = CategoryService()
