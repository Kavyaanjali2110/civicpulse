import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.db.seed_data import seed_database
from app.models.department import Department
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.resolution_evidence import ResolutionEvidence
from app.models.citizen_feedback import CitizenFeedback
from app.models.complaint import Complaint
from app.services.dispatch_service import dispatch_service
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


def test_department_endpoints():
    # 1. List departments
    res = client.get("/api/v1/gov/departments")
    assert res.status_code == 200
    depts = res.json()
    assert len(depts) >= 5
    dept_names = [d["name"] for d in depts]
    assert "Water Supply & Drainage" in dept_names

    # 2. Create new department
    create_payload = {
        "name": "Parks & Urban Forestry",
        "description": "Tree maintenance, botanical gardens, and public parks.",
        "active": True
    }
    res_create = client.post("/api/v1/gov/departments", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    assert created["name"] == "Parks & Urban Forestry"
    assert created["id"] > 0

    # 3. Prevent duplicate department name
    res_dup = client.post("/api/v1/gov/departments", json=create_payload)
    assert res_dup.status_code == 409


def test_field_crew_endpoints():
    # 1. List crews
    res = client.get("/api/v1/gov/crews")
    assert res.status_code == 200
    crews = res.json()
    assert len(crews) >= 8

    # 2. Filter crews by ward
    res_filtered = client.get("/api/v1/gov/crews?ward_id=4")
    assert res_filtered.status_code == 200
    w4_crews = res_filtered.json()
    assert any(c["ward_id"] == 4 for c in w4_crews)

    # 3. Create new field crew
    new_crew_payload = {
        "name": "Ward 4 Tree Trimming Squad",
        "department_id": 1,
        "ward_id": 4,
        "ward_name": "Ward 4 – East Industrial",
        "crew_leader": "Sunil Kamble",
        "contact_number": "+91-98999-00112",
        "active": True,
        "current_status": "AVAILABLE"
    }
    res_new_crew = client.post("/api/v1/gov/crews", json=new_crew_payload)
    assert res_new_crew.status_code == 201
    new_crew = res_new_crew.json()
    assert new_crew["name"] == "Ward 4 Tree Trimming Squad"
    crew_id = new_crew["id"]

    # 4. Get crew detail and update
    res_get = client.get(f"/api/v1/gov/crews/{crew_id}")
    assert res_get.status_code == 200
    assert res_get.json()["crew_leader"] == "Sunil Kamble"

    res_put = client.put(f"/api/v1/gov/crews/{crew_id}", json={"current_status": "ON_DUTY"})
    assert res_put.status_code == 200
    assert res_put.json()["current_status"] == "ON_DUTY"


def test_end_to_end_dispatch_workflow():
    # Step 1: Submit a new citizen complaint
    submit_res = client.post(
        "/api/v1/citizen/complaints",
        json={
            "citizen_name": "Kavita Deshmukh",
            "citizen_contact": "+91-98777-12345",
            "raw_text": "Major water pipe burst flooding Sector 4 roadway near hospital",
            "latitude": 19.0812,
            "longitude": 72.8810,
            "address": "Sector 4 Main Hospital Ave"
        }
    )
    assert submit_res.status_code == 201
    tracking_id = submit_res.json()["tracking_id"]

    # Retrieve complaint ID
    track_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert track_res.status_code == 200
    complaint_data = track_res.json()
    complaint_id = complaint_data["id"]
    assert complaint_data["status"] == "RECEIVED"

    # Step 2: Assign field crew to complaint
    crews_res = client.get("/api/v1/gov/crews")
    assert crews_res.status_code == 200
    target_crew_id = crews_res.json()[0]["id"]

    assign_res = client.post(
        f"/api/v1/gov/complaints/{complaint_id}/assign",
        json={
            "crew_id": target_crew_id,
            "assigned_by": "Officer R. Verma",
            "notes": "Urgent pipe isolation required."
        }
    )
    assert assign_res.status_code == 201
    assignment = assign_res.json()
    assert assignment["assignment_status"] == "ASSIGNED"
    assignment_id = assignment["id"]

    # Verify complaint status transitioned to INVESTIGATING
    detail_res = client.get(f"/api/v1/gov/complaints/{complaint_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "INVESTIGATING"

    # Step 3: Field crew accepts assignment
    accept_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/accept",
        json={"changed_by": "Vikram Salve (Leader)", "notes": "En route with repair van."}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["assignment_status"] == "ACCEPTED"
    assert accept_res.json()["accepted_at"] is not None

    # Step 4: Field crew starts work
    start_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/start",
        json={"changed_by": "Vikram Salve (Leader)", "notes": "Excavation and pipe isolation active."}
    )
    assert start_res.status_code == 200
    assert start_res.json()["assignment_status"] == "IN_PROGRESS"

    # Verify complaint status is now IN_PROGRESS
    track_res_2 = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert track_res_2.json()["status"] == "IN_PROGRESS"

    # Step 5: Attempting to complete without resolution evidence should fail
    fail_complete = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/complete",
        json={"changed_by": "Vikram Salve (Leader)", "notes": "Done"}
    )
    assert fail_complete.status_code == 400

    # Step 6: Upload resolution evidence (before & after photos + description)
    evidence_res = client.post(
        f"/api/v1/gov/complaints/{complaint_id}/resolution-evidence",
        json={
            "uploaded_by": "Vikram Salve",
            "before_photo": "https://example.com/burst_pipe_before.jpg",
            "after_photo": "https://example.com/repaired_pipe_after.jpg",
            "description": "Replaced 6-inch cracked GI collar with heavy-duty ductile sleeve. Pressure restored to normal."
        }
    )
    assert evidence_res.status_code == 201
    evidence = evidence_res.json()
    assert evidence["complaint_id"] == complaint_id
    assert "ductile sleeve" in evidence["description"]

    # Step 7: Complete assignment & resolve complaint
    complete_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/complete",
        json={"changed_by": "Vikram Salve (Leader)", "notes": "Work inspected and road cleared."}
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["assignment_status"] == "COMPLETED"

    # Verify complaint is now RESOLVED
    resolved_track = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert resolved_track.status_code == 200
    assert resolved_track.json()["status"] == "RESOLVED"
    assert resolved_track.json()["resolved_at"] is not None

    # Step 8: Submit citizen feedback (5 stars)
    feedback_res = client.post(
        f"/api/v1/citizen/complaints/{tracking_id}/feedback",
        json={
            "rating": 5,
            "feedback": "Prompt and clean repair! The flooding stopped within 2 hours.",
            "citizen_name": "Kavita Deshmukh"
        }
    )
    assert feedback_res.status_code == 201
    feedback = feedback_res.json()
    assert feedback["rating"] == 5
    assert feedback["complaint_id"] == complaint_id

    # Step 9: Duplicate feedback submission should be rejected with 409 Conflict
    dup_feedback_res = client.post(
        f"/api/v1/citizen/complaints/{tracking_id}/feedback",
        json={"rating": 4, "feedback": "Second attempt"}
    )
    assert dup_feedback_res.status_code == 409

    # Step 10: Verify feedback is visible via GET endpoint
    get_fb_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}/feedback")
    assert get_fb_res.status_code == 200
    assert get_fb_res.json()["rating"] == 5


def test_invalid_dispatch_transitions():
    # 1. Cannot submit feedback for unresolved complaint
    submit_res = client.post(
        "/api/v1/citizen/complaints",
        json={
            "raw_text": "Streetlight flickers erratically in evening",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "category_id": 4
        }
    )
    tracking_id = submit_res.json()["tracking_id"]

    fb_fail = client.post(
        f"/api/v1/citizen/complaints/{tracking_id}/feedback",
        json={"rating": 5, "feedback": "Premature feedback"}
    )
    assert fb_fail.status_code == 400

    # 2. Cannot assign to inactive crew
    session = TestingSessionLocal()
    inactive_crew = FieldCrew(
        name="Inactive Test Squad",
        department_id=1,
        ward_id=1,
        crew_leader="Test Leader",
        active=False,
        current_status="OFF_DUTY"
    )
    session.add(inactive_crew)
    session.commit()
    inactive_crew_id = inactive_crew.id
    session.close()

    track_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    cid = track_res.json()["id"]

    assign_inactive = client.post(
        f"/api/v1/gov/complaints/{cid}/assign",
        json={"crew_id": inactive_crew_id}
    )
    assert assign_inactive.status_code == 400


def test_workflow_stats_endpoint():
    res = client.get("/api/v1/gov/stats/workflow")
    assert res.status_code == 200
    data = res.json()
    assert "total_complaints" in data
    assert "assigned_complaints" in data
    assert "resolved_complaints" in data
    assert "average_resolution_time_hours" in data
    assert "sla_compliance_percentage" in data
    assert "crew_workload" in data
    assert len(data["crew_workload"]) >= 8
    assert "ward_breakdowns" in data
    assert len(data["ward_breakdowns"]) == 8
