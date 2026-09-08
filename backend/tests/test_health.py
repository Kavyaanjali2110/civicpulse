from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "CivicPulse AI" in data["message"]
    assert "docs" in data
    assert "health" in data


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "timestamp" in data


def test_system_info_endpoint():
    response = client.get("/api/v1/system/info")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "CivicPulse AI"
    assert "track_a" in data["active_tracks"]
    assert "track_b" in data["active_tracks"]
    assert "track_c" in data["active_tracks"]


def test_demo_reset_endpoint():
    response = client.post("/api/v1/system/demo-reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "complaints" in data["data"]
    assert data["data"]["complaints"] > 0
