import math
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.infrastructure import InfrastructureAsset
from app.schemas.infrastructure import InfrastructureAssetCreate


class InfrastructureService:
    @staticmethod
    def get_all(db: Session, asset_type: Optional[str] = None) -> List[InfrastructureAsset]:
        query = db.query(InfrastructureAsset)
        if asset_type:
            query = query.filter(InfrastructureAsset.asset_type == asset_type.upper())
        return query.order_by(InfrastructureAsset.name.asc()).all()

    @staticmethod
    def get_by_id(db: Session, asset_id: int) -> Optional[InfrastructureAsset]:
        return db.query(InfrastructureAsset).filter(InfrastructureAsset.id == asset_id).first()

    @staticmethod
    def create(db: Session, data: InfrastructureAssetCreate) -> InfrastructureAsset:
        asset = InfrastructureAsset(
            name=data.name,
            asset_type=data.asset_type.upper(),
            latitude=data.latitude,
            longitude=data.longitude,
            impact_radius_meters=data.impact_radius_meters,
            vulnerability_weight=data.vulnerability_weight,
            description=data.description,
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def calculate_distance_meters(lat1: Optional[float], lon1: Optional[float], lat2: Optional[float], lon2: Optional[float]) -> float:
        """Haversine formula to calculate distance in meters between two lat/lon points."""
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return float("inf")
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    @classmethod
    def find_nearby_assets(
        cls, db: Session, lat: float, lon: float, max_radius_meters: float = 1000.0
    ) -> List[Tuple[InfrastructureAsset, float]]:
        """Finds all infrastructure assets within max_radius_meters of (lat, lon) with exact distance."""
        if lat is None or lon is None:
            return []
        assets = db.query(InfrastructureAsset).all()
        nearby = []
        for asset in assets:
            if asset.latitude is None or asset.longitude is None:
                continue
            dist = cls.calculate_distance_meters(lat, lon, asset.latitude, asset.longitude)
            if dist <= max_radius_meters:
                nearby.append((asset, dist))
        # Sort by distance ascending
        nearby.sort(key=lambda x: x[1])
        return nearby


infrastructure_service = InfrastructureService()
