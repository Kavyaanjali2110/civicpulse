import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models import Category, InfrastructureAsset, HotspotCluster, Complaint
from app.db.seed_data import seed_database

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


def test_seed_database(db_session):
    res = seed_database(db_session, force=True)
    assert res["status"] == "seeded_successfully"
    assert res["categories_count"] == 6
    assert res["assets_count"] >= 8
    assert res["hotspots_count"] >= 4
    assert res["complaints_count"] >= 15

    # Check that categories exist
    categories = db_session.query(Category).all()
    assert len(categories) == 6
    cat_codes = {c.code for c in categories}
    assert "WATER" in cat_codes
    assert "ELECTRICITY" in cat_codes
    assert "ROADS" in cat_codes
    assert "SEWAGE" in cat_codes

    # Check that complaints are linked to categories and clusters
    complaints = db_session.query(Complaint).all()
    assert len(complaints) >= 15
    for comp in complaints:
        assert comp.tracking_id.startswith("CP-")
        assert comp.category_id is not None
        assert 0.0 <= comp.severity_score <= 1.0
        assert 0.0 <= comp.priority_score <= 100.0

    # Check critical hotspots
    hotspots = db_session.query(HotspotCluster).all()
    assert len(hotspots) >= 4
    for hs in hotspots:
        assert hs.cluster_code.startswith("HS-")
        assert hs.complaint_count > 0
