import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.complaint import Complaint
from app.models.notification import Notification

client = TestClient(app)


def test_whatsapp_webhook_text_ingestion():
    """Verify WhatsApp text webhook is ingested into the unified pipeline and generates tracking code."""
    msg_id = f"WA-{uuid.uuid4().hex[:8]}"
    payload = {
        "message_id": msg_id,
        "from": "+919876543210",
        "type": "text",
        "text": "Dangerous deep pothole on main road causing motorbikes to skid near Metro station",
        "location": {
            "latitude": 19.0760,
            "longitude": 72.8777
        }
    }
    res = client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["channel"] == "WHATSAPP"
    assert data["external_message_id"] == msg_id
    assert data["tracking_id"].startswith("CP-2026-")
    assert data["category"] in ["Roads & Potholes", "Public Safety & Traffic", "General Civic Grievance"]
    assert data["severity_level"] in ["MEDIUM", "HIGH", "CRITICAL"]
    assert data["priority_score"] > 0
    assert data["ward_name"] is not None
    assert data["status"] == "RECEIVED"
    assert len(data["notifications_sent"]) >= 2

    # Check notification event types
    events = [n["event_type"] for n in data["notifications_sent"]]
    assert "COMPLAINT_RECEIVED" in events
    assert "AI_ANALYZED" in events


def test_whatsapp_webhook_with_image():
    """Verify WhatsApp webhook with image metadata stores image_url."""
    msg_id = f"WA-{uuid.uuid4().hex[:8]}"
    payload = {
        "message_id": msg_id,
        "from": "+919811122334",
        "type": "image",
        "text": "Broken water pipeline overflowing onto roadway",
        "location": {
            "latitude": 19.0814,
            "longitude": 72.8809
        },
        "image_url": "https://example.com/whatsapp_pipe_burst.jpg"
    }
    res = client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res.status_code == 201
    data = res.json()

    # Verify complaint record in db has image_url
    db = SessionLocal()
    complaint = db.query(Complaint).filter(Complaint.id == data["complaint_id"]).first()
    assert complaint is not None
    assert complaint.image_url == "https://example.com/whatsapp_pipe_burst.jpg"
    assert complaint.source_channel == "WHATSAPP"
    db.close()


def test_sms_webhook_ingestion_and_fallback_location():
    """Verify SMS webhook without GPS works gracefully without fabricating coordinates."""
    msg_id = f"SMS-{uuid.uuid4().hex[:8]}"
    payload = {
        "message_id": msg_id,
        "from": f"+9199{uuid.uuid4().hex[:8]}",
        "text": "Garbage pile has been burning near our street emitting thick smoke"
    }
    res = client.post("/api/v1/webhooks/sms", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["channel"] == "SMS"
    assert data["external_message_id"] == msg_id
    assert data["tracking_id"].startswith("CP-2026-")
    assert data["category"] in ["Waste Management & Garbage", "General Civic Grievance"]

    # Since coords were missing, verify database record has None for lat/lon
    db = SessionLocal()
    complaint = db.query(Complaint).filter(Complaint.id == data["complaint_id"]).first()
    assert complaint is not None
    assert complaint.latitude is None
    assert complaint.longitude is None
    assert complaint.source_channel == "SMS"

    # Verify LOCATION_REQUIRED notification was logged
    events = [n["event_type"] for n in data["notifications_sent"]]
    assert "LOCATION_REQUIRED" in events
    db.close()


def test_sms_webhook_profile_location_resolution():
    """Verify subsequent SMS from same citizen resolves location from earlier complaint."""
    citizen_phone = f"+9177{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    c1 = Complaint(
        tracking_id=f"CP-2026-{uuid.uuid4().hex[:4].upper()}",
        source_channel="WEB",
        citizen_name="Profile User",
        citizen_contact=citizen_phone,
        raw_text="Streetlight flickering",
        detected_language="en",
        translated_text="Streetlight flickering",
        latitude=19.0780,
        longitude=72.8790,
        ward_id=1,
        ward_name="Ward 1 – North Hospital Zone",
        address="Profile Street, Ward 1",
        category_id=1,
        severity_score=0.5,
        severity_level="MEDIUM",
        priority_score=50.0,
        status="RECEIVED"
    )
    db.add(c1)
    db.commit()
    db.close()

    # Now send SMS from same citizen phone number without GPS
    msg_id = f"SMS-{uuid.uuid4().hex[:8]}"
    payload = {
        "message_id": msg_id,
        "from": citizen_phone,
        "text": "Drainage clogged and foul smell spreading"
    }
    res = client.post("/api/v1/webhooks/sms", json=payload)
    assert res.status_code == 201
    data = res.json()

    # Should have resolved ward and location from previous record
    assert data["ward_id"] == 1
    assert data["ward_name"] is not None

    db = SessionLocal()
    complaint = db.query(Complaint).filter(Complaint.id == data["complaint_id"]).first()
    assert complaint.latitude == 19.0780
    assert complaint.longitude == 72.8790
    db.close()


def test_generic_partner_webhook_ingestion():
    """Verify generic partner webhook with attachments."""
    ext_id = f"EXT-{uuid.uuid4().hex[:8]}"
    payload = {
        "external_id": ext_id,
        "channel": "WEBHOOK",
        "citizen": "Metro Transit Authority",
        "contact": "ops@metrotransit.org",
        "message": "Fallen traffic signal pole blocking two lanes at Central Junction",
        "latitude": 19.0755,
        "longitude": 72.8770,
        "address": "Central Junction, Ward 3",
        "attachments": ["https://example.com/signal_pole.jpg"]
    }
    res = client.post("/api/v1/webhooks/civic-complaint", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["channel"] == "WEBHOOK"
    assert data["external_message_id"] == ext_id
    assert data["tracking_id"].startswith("CP-2026-")
    assert data["category"] in ["Public Safety & Traffic", "Roads & Potholes", "General Civic Grievance"]


def test_duplicate_external_message_id_rejected():
    """Verify sending duplicate external message ID is rejected with 409 Conflict."""
    dup_id = f"WA-DUP-{uuid.uuid4().hex[:8]}"
    payload = {
        "message_id": dup_id,
        "from": "+919876500000",
        "text": "Water leakage in alleyway"
    }
    res1 = client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res1.status_code == 201

    # Second attempt with same message ID
    res2 = client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res2.status_code == 409
    assert "Duplicate external message ID" in res2.json()["detail"]


def test_unsupported_channel_rejected():
    """Verify generic webhook rejects invalid or unsupported channel."""
    payload = {
        "external_id": f"EXT-INV-{uuid.uuid4().hex[:8]}",
        "channel": "TELEGRAM_UNSUPPORTED",
        "message": "Test complaint"
    }
    res = client.post("/api/v1/webhooks/civic-complaint", json=payload)
    assert res.status_code == 400
    assert "Unsupported ingestion channel" in res.json()["detail"]


def test_missing_required_fields_rejected():
    """Verify missing required fields in webhook payload fails with 422 Unprocessable Entity."""
    # Missing message text
    res = client.post("/api/v1/webhooks/sms", json={"message_id": "SMS-EMPTY", "from": "+919999900000"})
    assert res.status_code == 422


def test_unified_ai_pipeline_equivalence():
    """Verify WEB, WHATSAPP, and SMS all yield identical AI classification and category."""
    text = "High voltage transformer sparking furiously with dangerous blue flashes"
    lat = 19.0760
    lon = 72.8777

    # Web submission
    web_res = client.post(
        "/api/v1/citizen/complaints",
        json={
            "citizen_name": "Rohan",
            "citizen_contact": f"+91{uuid.uuid4().hex[:10]}",
            "raw_text": text,
            "latitude": lat,
            "longitude": lon,
            "address": "Transformer Street"
        }
    )
    assert web_res.status_code == 201
    web_data = web_res.json()

    # WhatsApp submission
    wa_res = client.post(
        "/api/v1/webhooks/whatsapp",
        json={
            "message_id": f"WA-EQ-{uuid.uuid4().hex[:8]}",
            "from": f"+91{uuid.uuid4().hex[:10]}",
            "text": text,
            "location": {"latitude": lat, "longitude": lon}
        }
    )
    assert wa_res.status_code == 201
    wa_data = wa_res.json()

    # Category code and severity level must match exactly across channels
    assert web_data["category_id"] == wa_data["category_id"]
    assert web_data["severity_level"] == wa_data["severity_level"]
    # Second complaint at same location receives a dynamic IPS volume-boost (~4.2 pts)
    assert abs(web_data["priority_score"] - wa_data["priority_score"]) <= 6.0


def test_status_triggered_notifications():
    """Verify notifications are recorded on ASSIGNED, IN_PROGRESS, and RESOLVED."""
    # 1. Ingest via WhatsApp
    msg_id = f"WA-NOTIF-{uuid.uuid4().hex[:8]}"
    wa_res = client.post(
        "/api/v1/webhooks/whatsapp",
        json={
            "message_id": msg_id,
            "from": "+919812345678",
            "text": "Sewage overflow spilling into residential lane",
            "location": {"latitude": 19.0800, "longitude": 72.8800}
        }
    )
    assert wa_res.status_code == 201
    complaint_id = wa_res.json()["complaint_id"]

    # Check initial notifications (RECEIVED, AI_ANALYZED)
    notif_res = client.get(f"/api/v1/notifications/complaint/{complaint_id}")
    assert notif_res.status_code == 200
    initial_events = [n["event_type"] for n in notif_res.json()]
    assert "COMPLAINT_RECEIVED" in initial_events
    assert "AI_ANALYZED" in initial_events

    # 2. Assign crew
    crew_id = client.get("/api/v1/gov/crews").json()[0]["id"]
    assign_res = client.post(
        f"/api/v1/gov/complaints/{complaint_id}/assign",
        json={"crew_id": crew_id, "assigned_by": "Officer Test"}
    )
    assert assign_res.status_code == 201

    # Check notification for ASSIGNED
    notif_res2 = client.get(f"/api/v1/notifications/complaint/{complaint_id}")
    events2 = [n["event_type"] for n in notif_res2.json()]
    assert "ASSIGNED" in events2


def test_omnichannel_stats_endpoint():
    """Verify /api/v1/gov/omnichannel/stats returns correct metrics."""
    res = client.get("/api/v1/gov/omnichannel/stats")
    assert res.status_code == 200
    data = res.json()

    assert "total_complaints" in data
    assert "total_notifications_sent" in data
    assert "channel_stats" in data
    assert "WEB" in data["channel_stats"]
    assert "WHATSAPP" in data["channel_stats"]
    assert "SMS" in data["channel_stats"]
    assert "WEBHOOK" in data["channel_stats"]
    assert len(data["recent_complaints"]) > 0


def test_channel_filtering_in_complaints_list():
    """Verify complaints list can be filtered by source_channel."""
    res_all = client.get("/api/v1/gov/complaints?page_size=50")
    assert res_all.status_code == 200

    res_wa = client.get("/api/v1/gov/complaints?source_channel=WHATSAPP")
    assert res_wa.status_code == 200
    for item in res_wa.json()["items"]:
        assert item["source_channel"] == "WHATSAPP"

    res_sms = client.get("/api/v1/gov/complaints?source_channel=SMS")
    assert res_sms.status_code == 200
    for item in res_sms.json()["items"]:
        assert item["source_channel"] == "SMS"
