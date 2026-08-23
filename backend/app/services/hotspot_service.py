from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.hotspot import HotspotCluster
from app.schemas.hotspot import HotspotClusterCreate


class HotspotService:
    @staticmethod
    def get_all(
        db: Session,
        status: Optional[str] = None,
        category_id: Optional[int] = None,
        min_priority: Optional[float] = None
    ) -> List[HotspotCluster]:
        query = db.query(HotspotCluster)
        if status:
            query = query.filter(HotspotCluster.status == status.upper())
        if category_id:
            query = query.filter(HotspotCluster.category_id == category_id)
        if min_priority is not None:
            query = query.filter(HotspotCluster.aggregate_priority_score >= min_priority)
        return query.order_by(HotspotCluster.aggregate_priority_score.desc()).all()

    @staticmethod
    def get_by_id(db: Session, cluster_id: int) -> Optional[HotspotCluster]:
        return db.query(HotspotCluster).filter(HotspotCluster.id == cluster_id).first()

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[HotspotCluster]:
        return db.query(HotspotCluster).filter(HotspotCluster.cluster_code == code).first()

    @staticmethod
    def create(db: Session, data: HotspotClusterCreate) -> HotspotCluster:
        cluster = HotspotCluster(
            cluster_code=data.cluster_code,
            category_id=data.category_id,
            centroid_lat=data.centroid_lat,
            centroid_lon=data.centroid_lon,
            radius_meters=data.radius_meters,
            complaint_count=data.complaint_count,
            avg_severity=data.avg_severity,
            aggregate_priority_score=data.aggregate_priority_score,
            status=data.status,
            ai_summary=data.ai_summary,
            ai_recommendation=data.ai_recommendation,
        )
        db.add(cluster)
        db.commit()
        db.refresh(cluster)
        return cluster

    @staticmethod
    def update_metrics(
        db: Session,
        cluster_id: int,
        complaint_count: int,
        avg_severity: float,
        priority_score: float,
        ai_summary: Optional[str] = None,
        ai_recommendation: Optional[str] = None
    ) -> Optional[HotspotCluster]:
        cluster = db.query(HotspotCluster).filter(HotspotCluster.id == cluster_id).first()
        if not cluster:
            return None
        cluster.complaint_count = complaint_count
        cluster.avg_severity = avg_severity
        cluster.aggregate_priority_score = priority_score
        if ai_summary:
            cluster.ai_summary = ai_summary
        if ai_recommendation:
            cluster.ai_recommendation = ai_recommendation
        cluster.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(cluster)
        return cluster


hotspot_service = HotspotService()
