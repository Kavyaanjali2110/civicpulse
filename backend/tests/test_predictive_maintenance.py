import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base, get_db
from app.db.seed_data import seed_database
from app.models.infrastructure import InfrastructureAsset
from app.models.department import Department
from app.models.field_crew import FieldCrew
from app.models.preventive_maintenance import PreventiveMaintenanceOrder
from app.ai.predictive.health_index_engine import asset_health_engine, AssetHealthIndexEngine
from app.ai.predictive.failure_forecasting_engine import failure_forecasting_engine, FailureForecastingEngine
from app.ai.predictive.ward_risk_engine import ward_risk_engine
from app.ai.predictive.predictive_xai_engine import predictive_xai_engine
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


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session, force=True)
    session.close()
    yield
    Base.metadata.drop_all(bind=engine)


# =====================================================================
# 1. ASSET HEALTH INDEX TESTS
# =====================================================================
def test_asset_health_index_calculation():
    """Verifies Asset Health Index computes all 6 component scores bounded between 0 and 100."""
    session = TestingSessionLocal()
    try:
        assets = session.query(InfrastructureAsset).all()
        assert len(assets) >= 8

        for asset in assets:
            health = asset_health_engine.calculate_asset_health(session, asset)
            assert "health_score" in health
            assert 0.0 <= health["health_score"] <= 100.0
            assert health["health_category"] in ["HEALTHY", "MONITORED", "AT_RISK", "CRITICAL"]

            comp = health["component_scores"]
            assert 0.0 <= comp["complaint_frequency_score"] <= 100.0
            assert 0.0 <= comp["severity_score"] <= 100.0
            assert 0.0 <= comp["recurrence_score"] <= 100.0
            assert 0.0 <= comp["hotspot_score"] <= 100.0
            assert 0.0 <= comp["age_score"] <= 100.0
            assert 0.0 <= comp["maintenance_overdue_score"] <= 100.0
            assert len(health["contributing_factors"]) >= 3
    finally:
        session.close()


def test_health_category_classification():
    """Verifies category boundaries: HEALTHY, MONITORED, AT_RISK, and CRITICAL."""
    engine_inst = AssetHealthIndexEngine()
    assert engine_inst.categorize_health(10.0) == "HEALTHY"
    assert engine_inst.categorize_health(24.9) == "HEALTHY"
    assert engine_inst.categorize_health(25.0) == "MONITORED"
    assert engine_inst.categorize_health(49.9) == "MONITORED"
    assert engine_inst.categorize_health(50.0) == "AT_RISK"
    assert engine_inst.categorize_health(74.9) == "AT_RISK"
    assert engine_inst.categorize_health(75.0) == "CRITICAL"
    assert engine_inst.categorize_health(98.5) == "CRITICAL"


# =====================================================================
# 2. FAILURE RISK FORECASTING (7, 14, 30 DAYS)
# =====================================================================
def test_failure_risk_prediction_windows():
    """Verifies multi-window predictions (7, 14, 30 days) and monotonicity."""
    session = TestingSessionLocal()
    try:
        asset = session.query(InfrastructureAsset).first()
        assert asset is not None

        forecast = failure_forecasting_engine.predict_asset_risks(session, asset)
        preds = forecast["predictions"]

        assert "7_days" in preds
        assert "14_days" in preds
        assert "30_days" in preds

        p7 = preds["7_days"]["risk_score"]
        p14 = preds["14_days"]["risk_score"]
        p30 = preds["30_days"]["risk_score"]

        # Longer horizons must have accumulated higher or equal cumulative failure probability
        assert 0.0 < p7 <= p14 <= p30 <= 1.0
        assert preds["7_days"]["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert preds["30_days"]["risk_percentage"] == round(p30 * 100.0, 1)
    finally:
        session.close()


# =====================================================================
# 3. SPATIAL & WARD RISK FORECASTING
# =====================================================================
def test_ward_risk_calculation():
    """Verifies WardRiskEngine processes all 8 wards and generates calibrated risk scores."""
    session = TestingSessionLocal()
    try:
        ward_risks = ward_risk_engine.analyze_ward_risks(session)
        assert len(ward_risks) >= 8

        for w in ward_risks:
            assert 1 <= w["ward_id"] <= 10
            assert 0.0 <= w["ward_risk_score"] <= 100.0
            assert w["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
            assert "requires_preventive_intervention" in w
            assert "recommendation" in w
            m = w["metrics"]
            assert m["total_active_complaints"] >= 0
            assert m["predicted_failures_30d"] >= 0
    finally:
        session.close()


# =====================================================================
# 4. PREDICTIVE XAI & EXPLANATION GENERATION
# =====================================================================
def test_predictive_xai_explanation():
    """Verifies narrative rationale generation and evidence-based risk factors."""
    session = TestingSessionLocal()
    try:
        asset = session.query(InfrastructureAsset).filter(
            InfrastructureAsset.name.like("%Water Treatment Station WT-04%")
        ).first()
        if not asset:
            asset = session.query(InfrastructureAsset).first()

        health_data = asset_health_engine.calculate_asset_health(session, asset)
        risk_data = failure_forecasting_engine.forecast_risk_for_window(
            health_score=health_data["health_score"],
            recent_14d_complaints=health_data["metrics"]["recent_complaints_14d"],
            days_since_maint=health_data["metrics"]["days_since_maintenance"],
            is_hotspot=health_data["metrics"]["active_hotspot_code"] is not None,
            vulnerability_weight=asset.vulnerability_weight,
            window_days=30
        )

        xai = predictive_xai_engine.generate_explanation(asset, health_data, risk_data)
        assert asset.name in xai["narrative_explanation"]
        assert len(xai["primary_contributing_factors"]) >= 3
        assert len(xai["recommended_action"]) > 10
        assert "suggested_urgency" in xai
        assert "target_department_name" in xai
    finally:
        session.close()


# =====================================================================
# 5. REST API ENDPOINTS — HEALTH, RISK & WARD ANALYTICS
# =====================================================================
def test_api_assets_health_endpoint():
    """Tests GET /api/v1/analytics/assets/health with and without filters."""
    res = client.get("/api/v1/analytics/assets/health")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 8
    first = data[0]
    assert "health_score" in first
    assert "component_scores" in first
    assert "metrics" in first

    # Test filtering by category
    filtered = client.get("/api/v1/analytics/assets/health?health_category=CRITICAL")
    assert filtered.status_code == 200
    for a in filtered.json():
        assert a["health_category"] == "CRITICAL"


def test_api_assets_risk_endpoint():
    """Tests GET /api/v1/analytics/assets/risk with prediction window parameter."""
    res = client.get("/api/v1/analytics/assets/risk?prediction_window=14")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 8
    first = data[0]
    assert "predictions" in first
    assert "14_days" in first["predictions"]
    assert "explanation" in first
    assert "recommended_action" in first


def test_api_single_asset_health_and_prediction():
    """Tests GET /api/v1/analytics/assets/{id}/health and /predictions."""
    # Get list first to grab valid ID
    assets_res = client.get("/api/v1/analytics/assets/health")
    asset_id = assets_res.json()[0]["asset_id"]

    res_h = client.get(f"/api/v1/analytics/assets/{asset_id}/health")
    assert res_h.status_code == 200
    assert res_h.json()["asset_id"] == asset_id

    res_p = client.get(f"/api/v1/analytics/assets/{asset_id}/predictions")
    assert res_p.status_code == 200
    assert res_p.json()["asset_id"] == asset_id


def test_api_wards_risk_endpoint():
    """Tests GET /api/v1/analytics/wards/risk."""
    res = client.get("/api/v1/analytics/wards/risk")
    assert res.status_code == 200
    wards = res.json()
    assert len(wards) >= 8
    assert wards[0]["ward_risk_score"] >= wards[-1]["ward_risk_score"]  # Sorted desc



def test_api_predictive_maintenance_recommendations():
    """Tests GET /api/v1/analytics/predictive-maintenance recommendations queue."""
    res = client.get("/api/v1/analytics/predictive-maintenance")
    assert res.status_code == 200
    recs = res.json()
    assert isinstance(recs, list)
    if recs:
        r = recs[0]
        assert "recommended_action" in r
        assert "department_name" in r
        assert "risk_score" in r
        assert r["health_category"] in ["AT_RISK", "CRITICAL"] or r["risk_level"] in ["HIGH", "CRITICAL"]


# =====================================================================
# 6. PREVENTIVE MAINTENANCE DISPATCH LIFECYCLE
# =====================================================================
def test_preventive_work_order_full_lifecycle():
    """Tests complete closed-loop preventive work order creation, dispatch, and status progression."""
    # 1. Fetch available asset and department
    session = TestingSessionLocal()
    try:
        asset = session.query(InfrastructureAsset).first()
        dept = session.query(Department).first()
        crew = session.query(FieldCrew).first()
        asset_id = asset.id
        dept_id = dept.id
        crew_id = crew.id
    finally:
        session.close()

    # 2. Create Preventive Work Order
    create_payload = {
        "infrastructure_id": asset_id,
        "department_id": dept_id,
        "crew_id": crew_id,
        "priority": "CRITICAL",
        "recommended_action": "Perform ultrasonic pressure test and replace corroded flange bolts.",
        "notes": "Triggered by municipal predictive intelligence advisory."
    }
    create_res = client.post("/api/v1/dispatch/preventive-maintenance", json=create_payload)
    assert create_res.status_code == 201
    order = create_res.json()
    order_id = order["id"]
    assert order["status"] == "ASSIGNED"
    assert order["order_code"].startswith("PM-")
    assert order["priority"] == "CRITICAL"

    # 3. Retrieve order detail
    get_res = client.get(f"/api/v1/dispatch/preventive-maintenance/{order_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == order_id

    # 4. Step 1: Crew accepts order (ASSIGNED -> ACCEPTED)
    accept_res = client.put(
        f"/api/v1/dispatch/preventive-maintenance/{order_id}/status",
        json={"status": "ACCEPTED"}
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"
    assert accept_res.json()["accepted_at"] is not None

    # 5. Step 2: Crew starts on-site maintenance (ACCEPTED -> IN_PROGRESS)
    start_res = client.put(
        f"/api/v1/dispatch/preventive-maintenance/{order_id}/status",
        json={"status": "IN_PROGRESS"}
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"
    assert start_res.json()["started_at"] is not None

    # 6. Step 3: Crew completes maintenance (IN_PROGRESS -> COMPLETED)
    complete_res = client.put(
        f"/api/v1/dispatch/preventive-maintenance/{order_id}/status",
        json={
            "status": "COMPLETED",
            "completion_notes": "Ultrasonic testing passed. High-pressure flange replaced and calibrated.",
            "completed_by": "Vikram Salve (Lead Engineer)"
        }
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"
    assert complete_res.json()["completed_at"] is not None
    assert "Ultrasonic testing passed" in complete_res.json()["completion_notes"]

    # 7. Check crew assigned preventive orders
    crew_orders = client.get(f"/api/v1/dispatch/crews/{crew_id}/preventive-orders")
    assert crew_orders.status_code == 200
    matching = [o for o in crew_orders.json() if o["id"] == order_id]
    assert len(matching) == 1


# =====================================================================
# 7. NEGATIVE & EXCEPTION VALIDATION
# =====================================================================
def test_negative_invalid_status_transition():
    """Verifies that invalid status transitions (e.g. jumping from ASSIGNED directly to COMPLETED) fail."""
    # Create new order
    create_res = client.post(
        "/api/v1/dispatch/preventive-maintenance",
        json={
            "infrastructure_id": 1,
            "department_id": 1,
            "recommended_action": "Inspection test"
        }
    )
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    # Attempt illegal jump directly to COMPLETED without ACCEPTED or IN_PROGRESS
    bad_transition = client.put(
        f"/api/v1/dispatch/preventive-maintenance/{order_id}/status",
        json={"status": "COMPLETED"}
    )
    assert bad_transition.status_code == 400
    assert "Invalid preventive maintenance status transition" in bad_transition.json()["detail"]


def test_negative_not_found_entities():
    """Verifies 404 responses for non-existent asset IDs and order IDs."""
    bad_asset_h = client.get("/api/v1/analytics/assets/99999/health")
    assert bad_asset_h.status_code == 404

    bad_asset_p = client.get("/api/v1/analytics/assets/99999/predictions")
    assert bad_asset_p.status_code == 404

    bad_order = client.get("/api/v1/dispatch/preventive-maintenance/99999")
    assert bad_order.status_code == 404
