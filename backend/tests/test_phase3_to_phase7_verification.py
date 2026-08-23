import pytest
from datetime import datetime, timezone
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


# ============================================================================
# PHASE 3: GOVERNMENT DASHBOARD VERIFICATION TESTS
# ============================================================================

def test_phase3_overview_and_workflow_kpis():
    """Verify municipal KPI metrics, SLA tracking, and workflow overview."""
    # 1. Overview Statistics
    res_stats = client.get("/api/v1/gov/stats/overview")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_complaints" in stats
    assert stats["total_complaints"] >= 20
    assert stats["open_count"] >= 5
    assert stats["active_hotspots_count"] >= 1
    assert 0.0 <= stats["resolution_rate"] <= 100.0
    assert stats["average_priority_score"] >= 0.0

    # 2. Workflow & SLA Statistics
    res_wf = client.get("/api/v1/gov/stats/workflow")
    assert res_wf.status_code == 200
    wf = res_wf.json()
    assert "sla_compliance_percentage" in wf
    assert "crew_workload" in wf
    assert len(wf["crew_workload"]) >= 5
    assert "ward_breakdowns" in wf
    assert len(wf["ward_breakdowns"]) == 8


def test_phase3_complaints_filtering_and_search():
    """Verify dynamic multi-attribute filtering across category, severity, status, and search."""
    # 1. List all complaints
    res_all = client.get("/api/v1/gov/complaints?page=1&page_size=30")
    assert res_all.status_code == 200
    all_data = res_all.json()
    assert all_data["total"] >= 20
    assert len(all_data["items"]) > 0

    # 2. Filter by category
    res_cat = client.get("/api/v1/gov/complaints?category_id=1")
    assert res_cat.status_code == 200
    cat_items = res_cat.json()["items"]
    for item in cat_items:
        assert item["category_id"] == 1

    # 3. Filter by severity level
    res_sev = client.get("/api/v1/gov/complaints?severity_level=CRITICAL")
    assert res_sev.status_code == 200
    for item in res_sev.json()["items"]:
        assert item["severity_level"] == "CRITICAL"

    # 4. Search query
    res_search = client.get("/api/v1/gov/complaints?search=water")
    assert res_search.status_code == 200
    for item in res_search.json()["items"]:
        text_matches = (
            "water" in item["raw_text"].lower() or
            "water" in (item["translated_text"] or "").lower() or
            "water" in item["category"]["name"].lower() or
            "water" in (item["address"] or "").lower()
        )
        assert text_matches


def test_phase3_ai_classification_ips_and_xai_rationale():
    """Verify AI classification, priority scoring, and explainable AI rationale."""
    # Get complaint detail with ID 1
    res = client.get("/api/v1/gov/complaints/1")
    assert res.status_code == 200
    data = res.json()

    # Validate classification & scores
    assert data["category_id"] is not None
    assert 0.0 <= data["severity_score"] <= 1.0
    assert data["priority_score"] >= 0.0

    # Validate Infrastructure POIs
    assert "nearby_infrastructure" in data
    assert isinstance(data["nearby_infrastructure"], list)
    if len(data["nearby_infrastructure"]) > 0:
        asset = data["nearby_infrastructure"][0]
        assert "name" in asset
        assert "distance_meters" in asset
        assert asset["distance_meters"] <= 700.0

    # Validate XAI Explanation
    assert "xai_explanation" in data
    xai = data["xai_explanation"]
    assert "primary_contributing_factors" in xai
    assert "tactical_action_plan" in xai
    assert "estimated_population_impact" in xai
    assert len(xai["primary_contributing_factors"]) > 0


def test_phase3_map_and_trend_analytics():
    """Verify geospatial markers, heatmap coordinates, hotspots, trends, and AI recommendations."""
    # 1. Heatmap points
    res_hm = client.get("/api/v1/gov/heatmap/points")
    assert res_hm.status_code == 200
    points = res_hm.json()
    assert len(points) >= 10
    for pt in points:
        assert "lat" in pt and "lng" in pt and "intensity" in pt

    # 2. Hotspots clusters
    res_hs = client.get("/api/v1/gov/hotspots")
    assert res_hs.status_code == 200
    hotspots = res_hs.json()
    assert len(hotspots) >= 1
    for h in hotspots:
        assert "centroid_lat" in h
        assert "centroid_lon" in h
        assert "complaint_count" in h

    # 3. Trigger re-clustering
    res_recluster = client.post("/api/v1/gov/hotspots/recluster")
    assert res_recluster.status_code == 200

    # 4. Priority ranking
    res_pr = client.get("/api/v1/gov/priority-ranking?limit=10")
    assert res_pr.status_code == 200
    rankings = res_pr.json()
    assert "ranked_complaints" in rankings
    assert "ranked_hotspots" in rankings
    assert len(rankings["ranked_complaints"]) <= 10

    # 5. Trends & surge intelligence
    res_trends = client.get("/api/v1/gov/trends")
    assert res_trends.status_code == 200
    trends = res_trends.json()
    assert "category_trends" in trends
    assert "daily_series" in trends
    assert len(trends["daily_series"]) > 0

    # 6. AI Recommendations
    res_recs = client.get("/api/v1/gov/ai-recommendations")
    assert res_recs.status_code == 200
    recs = res_recs.json()
    assert "recommendations" in recs
    assert len(recs["recommendations"]) >= 1


# ============================================================================
# PHASE 4: FIELD CREW APP WORKFLOW TESTS
# ============================================================================

def test_phase4_field_crew_dispatch_and_execution_lifecycle():
    """Verify field crew work order assignment, acceptance, start, and photo resolution."""
    # 1. Create a complaint to assign
    sub_res = client.post(
        "/api/v1/citizen/complaints",
        json={
            "citizen_name": "Ramesh Patil",
            "citizen_contact": "+91-99887-11223",
            "raw_text": "Open electrical junction box sparking near primary school bus stop",
            "latitude": 19.0790,
            "longitude": 72.8805,
            "address": "Opposite Bal Bhavan School, Ward 2"
        }
    )
    assert sub_res.status_code == 201
    complaint_tracking = sub_res.json()["tracking_id"]

    track_res = client.get(f"/api/v1/citizen/complaints/{complaint_tracking}")
    cid = track_res.json()["id"]

    # 2. Get available electrical / public safety crew
    crews_res = client.get("/api/v1/gov/crews?active_only=true")
    assert crews_res.status_code == 200
    crews = crews_res.json()
    assert len(crews) > 0
    target_crew = crews[0]
    crew_id = target_crew["id"]

    # 3. Assign complaint to crew
    assign_res = client.post(
        f"/api/v1/gov/complaints/{cid}/assign",
        json={
            "crew_id": crew_id,
            "assigned_by": "Officer A. Sharma",
            "notes": "High priority electrical hazard near school."
        }
    )
    assert assign_res.status_code == 201
    assignment = assign_res.json()
    assignment_id = assignment["id"]
    assert assignment["assignment_status"] == "ASSIGNED"

    # 4. Verify crew's assigned work order list
    crew_assigned = client.get(f"/api/v1/gov/crews/{crew_id}/assigned-complaints")
    assert crew_assigned.status_code == 200
    assigned_ids = [c["id"] for c in crew_assigned.json()]
    assert cid in assigned_ids

    # 5. Crew accepts assignment
    accept_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/accept",
        json={
            "changed_by": target_crew["crew_leader"],
            "notes": "Crew dispatched in emergency utility truck."
        }
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["assignment_status"] == "ACCEPTED"

    # 6. Crew starts physical repair
    start_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/start",
        json={
            "changed_by": target_crew["crew_leader"],
            "notes": "Power isolated. Repair technician replacing burnt junction insulator."
        }
    )
    assert start_res.status_code == 200
    assert start_res.json()["assignment_status"] == "IN_PROGRESS"

    # Verify complaint status is IN_PROGRESS
    status_check = client.get(f"/api/v1/citizen/complaints/{complaint_tracking}")
    assert status_check.json()["status"] == "IN_PROGRESS"

    # 7. Upload photo proof & resolution notes
    photo_res = client.post(
        f"/api/v1/gov/complaints/{cid}/resolution-evidence",
        json={
            "uploaded_by": target_crew["crew_leader"],
            "before_photo": "https://images.unsplash.com/photo-1516216628859-9bcceabb84ca?w=600",
            "after_photo": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600",
            "description": "Replaced burned 415V terminal blocks, sealed junction enclosure with IP65 weatherproof gasket."
        }
    )
    assert photo_res.status_code == 201
    evidence = photo_res.json()
    assert evidence["complaint_id"] == cid
    assert "IP65 weatherproof" in evidence["description"]

    # 8. Complete work order & resolve complaint
    comp_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/complete",
        json={
            "changed_by": target_crew["crew_leader"],
            "notes": "Junction box secured and power restored safely."
        }
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["assignment_status"] == "COMPLETED"

    # Verify complaint status is RESOLVED
    res_final = client.get(f"/api/v1/citizen/complaints/{complaint_tracking}")
    assert res_final.json()["status"] == "RESOLVED"
    assert res_final.json()["resolved_at"] is not None


# ============================================================================
# PHASE 5: COMPLETE CLOSED-LOOP MULTI-ROLE VERIFICATION
# ============================================================================

def test_phase5_complete_closed_loop_workflow():
    """Verify the full closed loop: Citizen report -> AI Pipeline -> Gov Dispatch -> Crew Repair & Proof -> Citizen Feedback."""
    # 1. Citizen submits multilingual grievance in Hindi
    submit_res = client.post(
        "/api/v1/citizen/complaints",
        json={
            "citizen_name": "Pooja Hegde",
            "citizen_contact": "+91-98111-22334",
            "raw_text": "Gutter ka ganda paani sadak par beh raha hai aur badboo fail rahi hai",
            "latitude": 19.0820,
            "longitude": 72.8830,
            "address": "Ganesh Nagar Lane 3"
        }
    )
    assert submit_res.status_code == 201
    sub_data = submit_res.json()
    tracking_id = sub_data["tracking_id"]
    assert sub_data["detected_language"] == "hi"
    assert sub_data["priority_score"] > 0

    # 2. Retrieve complaint record
    c_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert c_res.status_code == 200
    c_data = c_res.json()
    cid = c_data["id"]

    # 3. Government officer dispatches work order to crew
    assign_res = client.post(
        f"/api/v1/gov/complaints/{cid}/assign",
        json={
            "crew_id": 1,
            "assigned_by": "Officer M. Kulkarni",
            "notes": "Drainage overflow grievance."
        }
    )
    assert assign_res.status_code == 201
    assignment_id = assign_res.json()["id"]

    # 4. Crew accepts and starts work
    client.post(f"/api/v1/gov/assignments/{assignment_id}/accept", json={"changed_by": "Crew Leader"})
    client.post(f"/api/v1/gov/assignments/{assignment_id}/start", json={"changed_by": "Crew Leader"})

    # 5. Crew uploads repair evidence
    client.post(
        f"/api/v1/gov/complaints/{cid}/resolution-evidence",
        json={
            "uploaded_by": "Crew Leader",
            "before_photo": "https://images.unsplash.com/photo-1542013936693-884638332954?w=600",
            "after_photo": "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600",
            "description": "Cleared blockage in 300mm storm sewer line and disinfected surrounding roadway."
        }
    )

    # 6. Complete work order
    complete_res = client.post(
        f"/api/v1/gov/assignments/{assignment_id}/complete",
        json={"changed_by": "Crew Leader", "notes": "Completed and tested flow."}
    )
    assert complete_res.status_code == 200

    # 7. Citizen verifies resolution proof on tracker
    verify_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert verify_res.status_code == 200
    resolved_info = verify_res.json()
    assert resolved_info["status"] == "RESOLVED"
    assert len(resolved_info["resolution_evidences"]) >= 1
    assert resolved_info["resolution_evidences"][0]["after_photo"] is not None

    # 8. Citizen submits 5-star feedback
    fb_res = client.post(
        f"/api/v1/citizen/complaints/{tracking_id}/feedback",
        json={
            "rating": 5,
            "feedback": "Outstanding speed! Cleaned the gutter within hours of reporting.",
            "citizen_name": "Pooja Hegde"
        }
    )
    assert fb_res.status_code == 201
    assert fb_res.json()["rating"] == 5

    # 9. Verify feedback is visible in government dashboard
    gov_fb = client.get(f"/api/v1/gov/complaints/{cid}/feedback")
    assert gov_fb.status_code == 200
    assert gov_fb.json()["rating"] == 5
    assert gov_fb.json()["citizen_name"] == "Pooja Hegde"


# ============================================================================
# PHASE 6: ERROR & EXCEPTION CHECKS
# ============================================================================

def test_phase6_error_and_exception_handling():
    """Verify negative test cases, constraint validations, and error recovery."""
    # 1. Attempt to complete assignment without resolution evidence -> 400 Bad Request
    sub_res = client.post(
        "/api/v1/citizen/complaints",
        json={"raw_text": "Minor pothole near corner shop", "latitude": 19.0760, "longitude": 72.8777}
    )
    tracking_id = sub_res.json()["tracking_id"]
    cid = client.get(f"/api/v1/citizen/complaints/{tracking_id}").json()["id"]

    assign_res = client.post(
        f"/api/v1/gov/complaints/{cid}/assign",
        json={"crew_id": 1, "assigned_by": "Officer"}
    )
    aid = assign_res.json()["id"]
    client.post(f"/api/v1/gov/assignments/{aid}/accept", json={})
    client.post(f"/api/v1/gov/assignments/{aid}/start", json={})

    fail_comp = client.post(f"/api/v1/gov/assignments/{aid}/complete", json={})
    assert fail_comp.status_code == 400
    assert "evidence" in fail_comp.json()["detail"].lower()

    # 2. Attempt to submit feedback on non-resolved complaint -> 400 Bad Request
    sub_unresolved = client.post(
        "/api/v1/citizen/complaints",
        json={"raw_text": "Broken footpath slab", "latitude": 19.0760, "longitude": 72.8777}
    )
    tid_unresolved = sub_unresolved.json()["tracking_id"]
    fail_fb = client.post(
        f"/api/v1/citizen/complaints/{tid_unresolved}/feedback",
        json={"rating": 5, "feedback": "Premature"}
    )
    assert fail_fb.status_code == 400

    # 3. Query non-existent tracking ID -> 404 Not Found
    not_found_res = client.get("/api/v1/citizen/complaints/CP-NON-EXISTENT-999")
    assert not_found_res.status_code == 404
    assert "not found" in not_found_res.json()["detail"].lower()

    # 4. Query non-existent complaint ID -> 404 Not Found
    bad_cid_res = client.get("/api/v1/gov/complaints/999999")
    assert bad_cid_res.status_code == 404

    # 5. Non-existent crew assignment -> 404 Not Found
    bad_aid_res = client.post("/api/v1/gov/assignments/999999/accept", json={})
    assert bad_aid_res.status_code == 404

    # 6. Duplicate Department Name -> 409 Conflict
    dept_dup = client.post("/api/v1/gov/departments", json={"name": "Water Supply & Drainage"})
    assert dept_dup.status_code == 409
