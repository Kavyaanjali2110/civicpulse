import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.db.seed_data import seed_database
from main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session, force=True)
    session.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)



def test_citizen_get_categories():
    response = client.get("/api/v1/citizen/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    codes = [c["code"] for c in data]
    assert "WATER" in codes
    assert "ROADS" in codes


def test_citizen_submit_complaint():
    payload = {
        "citizen_name": "Sunil Varma",
        "citizen_contact": "+91-98765-43210",
        "raw_text": "Bada paani ka pipe phat gaya hai hospital ke paas aur sadak par paani bhara hai",
        "latitude": 19.0812,
        "longitude": 72.8810,
        "address": "Hospital Main Road"
    }
    response = client.post("/api/v1/citizen/complaints", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["tracking_id"].startswith("CP-")
    assert data["status"] == "RECEIVED"
    assert data["detected_language"] == "hi"
    assert "water" in data["translated_text"].lower() or "pipe" in data["translated_text"].lower()
    assert data["predicted_category"] == "Water Supply & Leakage"
    assert data["severity_score"] >= 0.70
    assert data["priority_score"] >= 60.0
    assert "message" in data


def test_citizen_track_complaint():
    # Submit first to get tracking ID
    payload = {
        "raw_text": "Broken streetlight making area pitch black at night",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "category_id": 4
    }
    submit_res = client.post("/api/v1/citizen/complaints", json=payload)
    tracking_id = submit_res.json()["tracking_id"]

    # Now track it
    track_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["tracking_id"] == tracking_id
    assert track_data["status"] == "RECEIVED"
    assert len(track_data["audit_logs"]) >= 1

    # Non-existent tracking ID
    bad_res = client.get("/api/v1/citizen/complaints/CP-9999-INVALID")
    assert bad_res.status_code == 404


def test_citizen_voice_transcribe():
    response = client.post("/api/v1/citizen/voice-transcribe?raw_text=Sadak%20pe%20bahut%20bada%20gaddha%20hai")
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hi"
    assert "pothole" in data["translated_text"].lower() or "road" in data["translated_text"].lower()


def test_gov_overview_stats():
    response = client.get("/api/v1/gov/stats/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["total_complaints"] >= 20
    assert data["open_count"] >= 10
    assert data["active_hotspots_count"] >= 4
    assert 0.0 <= data["resolution_rate"] <= 100.0


def test_gov_list_complaints():
    response = client.get("/api/v1/gov/complaints?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] >= 20
    assert data["page"] == 1

    # Filter by category
    filtered = client.get("/api/v1/gov/complaints?category_id=2")
    assert filtered.status_code == 200
    for item in filtered.json()["items"]:
        assert item["category_id"] == 2


def test_gov_complaint_detail():
    response = client.get("/api/v1/gov/complaints/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert "nearby_infrastructure" in data
    assert "xai_explanation" in data
    assert "tactical_action_plan" in data["xai_explanation"]


def test_gov_update_status():
    update_payload = {
        "status": "INVESTIGATING",
        "changed_by": "Officer Verma",
        "notes": "Emergency repair crew dispatched."
    }
    response = client.patch("/api/v1/gov/complaints/1/status", json=update_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "INVESTIGATING"


def test_gov_heatmap_points():
    response = client.get("/api/v1/gov/heatmap/points")
    assert response.status_code == 200
    points = response.json()
    assert len(points) >= 10
    for pt in points:
        assert "lat" in pt
        assert "lng" in pt
        assert 0.0 <= pt["intensity"] <= 1.0


def test_gov_hotspots_and_recluster():
    # List hotspots
    response = client.get("/api/v1/gov/hotspots")
    assert response.status_code == 200
    hotspots = response.json()
    assert len(hotspots) >= 4

    # Trigger recluster
    recluster_res = client.post("/api/v1/gov/hotspots/recluster?eps_meters=300&min_samples=2")
    assert recluster_res.status_code == 200
    assert recluster_res.json()["status"] == "success"


def test_gov_priority_ranking():
    response = client.get("/api/v1/gov/priority-ranking?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "ranked_complaints" in data
    assert "ranked_hotspots" in data
    assert len(data["ranked_complaints"]) <= 10


def test_gov_trends():
    response = client.get("/api/v1/gov/trends")
    assert response.status_code == 200
    data = response.json()
    assert "category_trends" in data
    assert "daily_series" in data
    assert len(data["daily_series"]) == 15


def test_gov_ai_recommendations():
    response = client.get("/api/v1/gov/ai-recommendations")
    assert response.status_code == 200
    data = response.json()
    assert data["total_recommendations"] >= 4
    assert len(data["recommendations"]) >= 4
    for rec in data["recommendations"]:
        assert rec["tactical_action_plan"] != ""
        assert rec["affected_population_impact"] in ["HIGH", "MEDIUM", "LOCALIZED"]
