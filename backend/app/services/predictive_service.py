import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.infrastructure import InfrastructureAsset
from app.models.department import Department
from app.models.field_crew import FieldCrew
from app.models.asset_health import AssetHealthSnapshot
from app.models.asset_risk import AssetRiskPrediction
from app.models.preventive_maintenance import PreventiveMaintenanceOrder
from app.ai.predictive.health_index_engine import asset_health_engine
from app.ai.predictive.failure_forecasting_engine import failure_forecasting_engine
from app.ai.predictive.ward_risk_engine import ward_risk_engine
from app.ai.predictive.predictive_xai_engine import predictive_xai_engine
from app.schemas.predictive import (
    AssetHealthResponse,
    AssetRiskResponse,
    WardRiskResponse,
    PredictiveMaintenanceRecommendationResponse,
    PreventiveMaintenanceOrderCreate,
    PreventiveMaintenanceOrderStatusUpdate,
    PreventiveMaintenanceOrderResponse
)


class PredictiveService:
    """Orchestrates asset health index calculations, risk predictions, and preventive work orders."""

    @staticmethod
    def get_asset_health(db: Session, asset_id: int) -> AssetHealthResponse:
        asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure asset with ID {asset_id} not found."
            )
        data = asset_health_engine.calculate_asset_health(db, asset)
        return AssetHealthResponse(
            asset_id=data["asset_id"],
            asset_name=data["asset_name"],
            asset_type=data["asset_type"],
            ward_id=data["ward_id"],
            ward_name=data["ward_name"],
            health_score=data["health_score"],
            health_category=data["health_category"],
            component_scores=data["component_scores"],
            metrics=data["metrics"],
            contributing_factors=data["contributing_factors"],
            calculated_at=datetime.fromisoformat(data["calculated_at"])
        )

    @classmethod
    def list_assets_health(
        cls,
        db: Session,
        ward_id: Optional[int] = None,
        asset_type: Optional[str] = None,
        health_category: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> List[AssetHealthResponse]:
        query = db.query(InfrastructureAsset)
        if ward_id is not None:
            query = query.filter(InfrastructureAsset.ward_id == ward_id)
        if asset_type:
            query = query.filter(InfrastructureAsset.asset_type == asset_type.upper())
        
        assets = query.order_by(InfrastructureAsset.name.asc()).all()
        results = []
        for a in assets:
            h = cls.get_asset_health(db, a.id)
            if health_category and h.health_category.upper() != health_category.upper():
                continue
            if min_score is not None and h.health_score < min_score:
                continue
            results.append(h)

        # Sort by health_score descending (most critical first)
        results.sort(key=lambda x: x.health_score, reverse=True)
        return results

    @staticmethod
    def get_asset_risks(db: Session, asset_id: int) -> AssetRiskResponse:
        asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure asset with ID {asset_id} not found."
            )
        
        risk_data = failure_forecasting_engine.predict_asset_risks(db, asset)
        health_data = asset_health_engine.calculate_asset_health(db, asset)
        xai_data = predictive_xai_engine.generate_explanation(
            asset=asset,
            health_data=health_data,
            risk_data_30d=risk_data["predictions"]["30_days"]
        )

        return AssetRiskResponse(
            asset_id=asset.id,
            asset_name=asset.name,
            asset_type=asset.asset_type,
            ward_id=asset.ward_id,
            ward_name=asset.ward_name,
            health_score=risk_data["health_score"],
            health_category=risk_data["health_category"],
            predictions=risk_data["predictions"],
            explanation=xai_data["narrative_explanation"],
            contributing_factors=xai_data["primary_contributing_factors"],
            recommended_action=xai_data["recommended_action"],
            target_department=xai_data["target_department_name"],
            calculated_at=datetime.fromisoformat(risk_data["calculated_at"])
        )

    @classmethod
    def list_assets_risk(
        cls,
        db: Session,
        ward_id: Optional[int] = None,
        asset_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        prediction_window: Optional[int] = 30
    ) -> List[AssetRiskResponse]:
        query = db.query(InfrastructureAsset)
        if ward_id is not None:
            query = query.filter(InfrastructureAsset.ward_id == ward_id)
        if asset_type:
            query = query.filter(InfrastructureAsset.asset_type == asset_type.upper())
        
        assets = query.order_by(InfrastructureAsset.name.asc()).all()
        results = []
        window_key = f"{prediction_window}_days" if prediction_window in [7, 14, 30] else "30_days"

        for a in assets:
            r = cls.get_asset_risks(db, a.id)
            if risk_level:
                pred = r.predictions.get(window_key)
                if not pred or pred.risk_level.upper() != risk_level.upper():
                    continue
            results.append(r)

        # Sort by specified window's risk score descending
        results.sort(
            key=lambda x: x.predictions.get(window_key, x.predictions.get("30_days")).risk_score,
            reverse=True
        )
        return results

    @staticmethod
    def get_ward_risks(db: Session) -> List[WardRiskResponse]:
        raw_wards = ward_risk_engine.analyze_ward_risks(db)
        results = []
        for w in raw_wards:
            results.append(WardRiskResponse(
                ward_id=w["ward_id"],
                ward_name=w["ward_name"],
                ward_risk_score=w["ward_risk_score"],
                risk_level=w["risk_level"],
                requires_preventive_intervention=w["requires_preventive_intervention"],
                metrics=w["metrics"],
                at_risk_assets=w["at_risk_assets"],
                recommendation=w["recommendation"]
            ))
        return results

    @classmethod
    def get_predictive_maintenance_recommendations(
        cls, db: Session
    ) -> List[PredictiveMaintenanceRecommendationResponse]:
        """Generates actionable preventive recommendations for assets at elevated risk."""
        assets = db.query(InfrastructureAsset).all()
        recommendations = []

        for asset in assets:
            risk_info = cls.get_asset_risks(db, asset.id)
            pred_30d = risk_info.predictions.get("30_days")
            risk_score = pred_30d.risk_score if pred_30d else 0.4
            risk_level = pred_30d.risk_level if pred_30d else "MEDIUM"
            risk_pct = pred_30d.risk_percentage if pred_30d else 40.0

            # Only assets evaluated as AT_RISK or CRITICAL health, or HIGH/CRITICAL risk require proactive intervention
            if risk_info.health_category in ["AT_RISK", "CRITICAL"] or risk_level in ["HIGH", "CRITICAL"]:
                # Match recommended department
                dept = None
                if asset.department_id:
                    dept = db.query(Department).filter(Department.id == asset.department_id).first()
                if not dept:
                    dept = db.query(Department).filter(
                        Department.name.ilike(f"%{asset.asset_type[:4]}%")
                    ).first()
                if not dept:
                    dept = db.query(Department).first()

                # Match recommended field crew in same ward or department
                crew = None
                if dept:
                    crew = db.query(FieldCrew).filter(
                        FieldCrew.department_id == dept.id,
                        FieldCrew.ward_id == asset.ward_id,
                        FieldCrew.active == True
                    ).first()
                    if not crew:
                        crew = db.query(FieldCrew).filter(
                            FieldCrew.department_id == dept.id,
                            FieldCrew.active == True
                        ).first()

                urgency = "Within 24-48 hours" if (risk_level == "CRITICAL" or risk_info.health_category == "CRITICAL") else "Within 3-5 days"

                recommendations.append(PredictiveMaintenanceRecommendationResponse(
                    asset_id=asset.id,
                    asset_name=asset.name,
                    asset_type=asset.asset_type,
                    ward_id=asset.ward_id,
                    ward_name=asset.ward_name,
                    latitude=asset.latitude,
                    longitude=asset.longitude,
                    health_score=risk_info.health_score,
                    health_category=risk_info.health_category,
                    risk_score=risk_score,
                    risk_percentage=risk_pct,
                    risk_level=risk_level,
                    recommended_action=risk_info.recommended_action,
                    suggested_urgency=urgency,
                    department_id=dept.id if dept else 1,
                    department_name=dept.name if dept else "Public Works",
                    recommended_crew_id=crew.id if crew else None,
                    recommended_crew_name=crew.name if crew else None,
                    primary_contributing_factors=risk_info.contributing_factors,
                    narrative_explanation=risk_info.explanation
                ))

        # Sort recommendations by risk score descending
        recommendations.sort(key=lambda x: x.risk_score, reverse=True)
        return recommendations

    @classmethod
    def create_preventive_order(
        cls, db: Session, payload: PreventiveMaintenanceOrderCreate
    ) -> PreventiveMaintenanceOrderResponse:
        asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == payload.infrastructure_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Infrastructure asset with ID {payload.infrastructure_id} not found."
            )
        
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {payload.department_id} not found."
            )

        crew = None
        if payload.crew_id:
            crew = db.query(FieldCrew).filter(FieldCrew.id == payload.crew_id).first()
            if not crew:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Field crew with ID {payload.crew_id} not found."
                )

        # Generate unique order code PM-YYYY-XXXX
        order_num = db.query(PreventiveMaintenanceOrder).count() + 1
        code = f"PM-{datetime.now(timezone.utc).year}-{order_num:04d}"

        order = PreventiveMaintenanceOrder(
            order_code=code,
            infrastructure_id=asset.id,
            department_id=dept.id,
            crew_id=crew.id if crew else None,
            priority=(payload.priority or "HIGH").upper(),
            recommended_action=payload.recommended_action,
            notes=payload.notes,
            target_completion_date=payload.target_completion_date,
            status="ASSIGNED",
            created_at=datetime.now(timezone.utc)
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        return cls._format_order_response(order)

    @classmethod
    def list_preventive_orders(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
        department_id: Optional[int] = None,
        crew_id: Optional[int] = None,
        asset_id: Optional[int] = None
    ) -> List[PreventiveMaintenanceOrderResponse]:
        query = db.query(PreventiveMaintenanceOrder)
        if status_filter:
            query = query.filter(PreventiveMaintenanceOrder.status == status_filter.upper())
        if department_id:
            query = query.filter(PreventiveMaintenanceOrder.department_id == department_id)
        if crew_id:
            query = query.filter(PreventiveMaintenanceOrder.crew_id == crew_id)
        if asset_id:
            query = query.filter(PreventiveMaintenanceOrder.infrastructure_id == asset_id)
        
        orders = query.order_by(desc(PreventiveMaintenanceOrder.created_at)).all()
        return [cls._format_order_response(o) for o in orders]

    @classmethod
    def get_preventive_order_by_id(cls, db: Session, order_id: int) -> PreventiveMaintenanceOrderResponse:
        order = db.query(PreventiveMaintenanceOrder).filter(PreventiveMaintenanceOrder.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preventive maintenance order with ID {order_id} not found."
            )
        return cls._format_order_response(order)

    @classmethod
    def update_preventive_order_status(
        cls, db: Session, order_id: int, payload: PreventiveMaintenanceOrderStatusUpdate
    ) -> PreventiveMaintenanceOrderResponse:
        order = db.query(PreventiveMaintenanceOrder).filter(PreventiveMaintenanceOrder.id == order_id).first()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preventive maintenance order with ID {order_id} not found."
            )

        new_status = payload.status.upper()
        curr_status = order.status.upper()
        now = datetime.now(timezone.utc)

        # Enforce valid workflow transitions:
        # ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED (or CANCELLED from any non-completed state)
        allowed_transitions = {
            "ASSIGNED": ["ACCEPTED", "CANCELLED"],
            "ACCEPTED": ["IN_PROGRESS", "CANCELLED"],
            "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
            "COMPLETED": [],
            "CANCELLED": []
        }

        if new_status != curr_status and new_status not in allowed_transitions.get(curr_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid preventive maintenance status transition from '{curr_status}' to '{new_status}'."
            )

        order.status = new_status
        if new_status == "ACCEPTED" and not order.accepted_at:
            order.accepted_at = now
        elif new_status == "IN_PROGRESS" and not order.started_at:
            order.started_at = now
        elif new_status == "COMPLETED":
            order.completed_at = now
            if payload.completion_notes:
                order.completion_notes = payload.completion_notes
            if payload.completed_by:
                order.completed_by = payload.completed_by
            # Update asset's last maintenance date to reset degradation cycle!
            if order.asset:
                order.asset.last_maintenance_date = now

        db.commit()
        db.refresh(order)
        return cls._format_order_response(order)

    @staticmethod
    def _format_order_response(order: PreventiveMaintenanceOrder) -> PreventiveMaintenanceOrderResponse:
        asset = order.asset
        dept = order.department
        crew = order.crew

        return PreventiveMaintenanceOrderResponse(
            id=order.id,
            order_code=order.order_code,
            infrastructure_id=order.infrastructure_id,
            asset_name=asset.name if asset else "Unknown Asset",
            asset_type=asset.asset_type if asset else "GENERAL",
            ward_id=asset.ward_id if asset else None,
            ward_name=asset.ward_name if asset else None,
            latitude=asset.latitude if asset else None,
            longitude=asset.longitude if asset else None,
            department_id=order.department_id,
            department_name=dept.name if dept else "Public Works",
            crew_id=order.crew_id,
            crew_name=crew.name if crew else "Unassigned",
            priority=order.priority,
            recommended_action=order.recommended_action,
            status=order.status,
            assigned_by=order.assigned_by,
            notes=order.notes,
            completion_notes=order.completion_notes,
            completed_by=order.completed_by,
            created_at=order.created_at,
            accepted_at=order.accepted_at,
            started_at=order.started_at,
            completed_at=order.completed_at
        )


predictive_service = PredictiveService()
