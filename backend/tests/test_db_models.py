import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models import Category, InfrastructureAsset, HotspotCluster, Complaint, AuditLog
from app.schemas.category import CategoryCreate
from app.schemas.infrastructure import InfrastructureAssetCreate
from app.schemas.hotspot import HotspotClusterCreate
from app.schemas.complaint import ComplaintCreate, ComplaintStatusUpdate
from app.services import category_service, infrastructure_service, hotspot_service, complaint_service

# Use in-memory SQLite for test suite
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_category_service(db_session):
    cat_data = CategoryCreate(
        code="WATER",
        name="Water Supply & Leakage",
        description="Pipeline issues",
        default_sla_hours=24,
        criticality_weight=1.8,
        icon="droplet"
    )
    cat = category_service.create(db_session, cat_data)
    assert cat.id is not None
    assert cat.code == "WATER"

    found = category_service.get_by_code(db_session, "water")
    assert found is not None
    assert found.name == "Water Supply & Leakage"


def test_infrastructure_service_and_distance(db_session):
    # Base hospital: (19.0760, 72.8777)
    asset_data = InfrastructureAssetCreate(
        name="Central Hospital",
        asset_type="HOSPITAL",
        latitude=19.0760,
        longitude=72.8777,
        impact_radius_meters=500.0,
        vulnerability_weight=2.8
    )
    asset = infrastructure_service.create(db_session, asset_data)
    assert asset.id is not None

    # Test point ~110m away: (19.0770, 72.8777)
    dist = infrastructure_service.calculate_distance_meters(19.0760, 72.8777, 19.0770, 72.8777)
    assert 100 < dist < 120

    nearby = infrastructure_service.find_nearby_assets(db_session, 19.0765, 72.8777, max_radius_meters=300.0)
    assert len(nearby) == 1
    assert nearby[0][0].name == "Central Hospital"


def test_complaint_and_audit_lifecycle(db_session):
    cat = category_service.create(
        db_session,
        CategoryCreate(code="ROADS", name="Roads", default_sla_hours=36, criticality_weight=1.4)
    )

    complaint_data = ComplaintCreate(
        raw_text="Huge dangerous pothole on main road",
        detected_language="en",
        translated_text="Huge dangerous pothole on main road",
        latitude=19.0760,
        longitude=72.8777,
        category_id=cat.id,
        subcategory="Pothole"
    )

    complaint = complaint_service.create(
        db_session,
        complaint_data,
        severity_score=0.85,
        severity_level="HIGH",
        priority_score=82.0
    )

    assert complaint.id is not None
    assert complaint.tracking_id.startswith("CP-")
    assert complaint.status == "RECEIVED"
    assert len(complaint.audit_logs) == 1
    assert complaint.audit_logs[0].new_status == "RECEIVED"

    # Update status to INVESTIGATING
    updated = complaint_service.update_status(
        db_session,
        complaint.id,
        ComplaintStatusUpdate(status="INVESTIGATING", changed_by="Inspector Verma", notes="Dispatched survey team")
    )
    assert updated.status == "INVESTIGATING"
    assert len(updated.audit_logs) == 2
    assert updated.audit_logs[1].new_status == "INVESTIGATING"

    # Overview stats
    stats = complaint_service.get_overview_stats(db_session)
    assert stats["total_complaints"] == 1
    assert stats["investigating_count"] == 1
    assert stats["high_severity_count"] == 1
