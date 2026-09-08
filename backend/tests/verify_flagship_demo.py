"""Flagship End-to-End Demonstration Verification Script
Verifies the complete 6-step CivicPulse demonstration story sequentially:
1. Citizen WhatsApp Ingestion
2. Government Priority Queue & Field Crew Assignment
3. Field Crew Acceptance, Evidence Upload & Resolution
4. Citizen Tracker Verification & 5-Star Satisfaction Review
5. Predictive Infrastructure Intelligence & Preventive Work Order Generation
6. Field Crew Preventive Maintenance Execution & Completion
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))

import uuid
from fastapi.testclient import TestClient
from main import app
from app.core.database import SessionLocal
from app.models.complaint import Complaint
from app.models.notification import Notification
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.resolution_evidence import ResolutionEvidence
from app.models.citizen_feedback import CitizenFeedback
from app.models.preventive_maintenance import PreventiveMaintenanceOrder
from app.db.reset_demo import reset_demo


def test_flagship_end_to_end_demo():
    print("=" * 70)
    print(" EXECUTING FLAGSHIP DEMONSTRATION VERIFICATION")
    print("=" * 70)

    # 0. Reset Demo to clean slate
    print("\n--- STEP 0: Reset Demo State ---")
    reset_demo()
    client = TestClient(app)

    # STEP 1: Citizen submits via WhatsApp simulator
    print("\n--- STEP 1: Citizen Reports via WhatsApp ---")
    msg_id = f"WA-FLAGSHIP-{uuid.uuid4().hex[:6]}"
    citizen_phone = "+919876543210"
    payload = {
        "message_id": msg_id,
        "from": citizen_phone,
        "sender_name": "Aarav Sharma",
        "type": "text",
        "text": "There is a major water leak near Ward 4 market. Water is flooding the road and nearby infrastructure may be affected.",
        "location": {
            "latitude": 19.0815,
            "longitude": 72.8808,
            "name": "Ward 4 Market Junction"
        }
    }

    res = client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    ingest_data = res.json()
    tracking_id = ingest_data["tracking_id"]
    complaint_id = ingest_data["complaint_id"]

    print(f" [OK] Grievance Ingested: Tracking ID = {tracking_id}")
    print(f" [OK] Category Classified: {ingest_data['category']} (ID: {ingest_data['category_id']})")
    print(f" [OK] Severity Level: {ingest_data['severity_level']} (Score: {ingest_data['severity_score']})")
    print(f" [OK] Dynamic IPS Priority Score: {ingest_data['priority_score']}/100")
    print(f" [OK] Zone / Ward: {ingest_data['ward_name']}")

    assert ingest_data["category"] == "Water Supply & Drainage" or ingest_data["category_id"] == 2
    assert ingest_data["priority_score"] >= 40.0

    # Verify initial notifications
    notifs_res = client.get(f"/api/v1/notifications/complaint/{complaint_id}")
    assert notifs_res.status_code == 200
    notifs = notifs_res.json()
    event_types = [n["event_type"] for n in notifs]
    print(f" [OK] Automated Citizen Notifications: {event_types}")
    assert "COMPLAINT_RECEIVED" in event_types
    assert "AI_ANALYZED" in event_types

    # STEP 2: Government Officer Reviews & Assigns Crew
    print("\n--- STEP 2: Government Triage & Field Crew Dispatch ---")
    # Verify complaint appears in Gov list
    gov_list = client.get("/api/v1/gov/complaints?status=RECEIVED").json()
    complaints = gov_list.get("items", [])
    match = next((c for c in complaints if c["tracking_id"] == tracking_id), None)
    assert match is not None, "Complaint must be visible in Government Priority Queue"
    print(f" [OK] Complaint visible in Government Priority Queue with Source: {match.get('source_channel')}")

    # Assign to Ward 4 Water Repair Crew
    db = SessionLocal()
    water_crew = db.query(FieldCrew).filter(FieldCrew.name.ilike("%water%")).first()
    crew_id = water_crew.id if water_crew else 1
    db.close()

    assign_payload = {
        "crew_id": crew_id,
        "assigned_by": "Officer Verma (Chief Operations)",
        "notes": "Emergency valve isolation required. Clear water accumulation near market entrance."
    }
    assign_res = client.post(f"/api/v1/gov/complaints/{complaint_id}/assign", json=assign_payload)
    assert assign_res.status_code in (200, 201), f"Assignment failed: {assign_res.text}"
    assign_data = assign_res.json()
    crew_name = assign_data.get("crew", {}).get("name") or assign_data.get("crew_name")
    print(f" [OK] Assigned to: {crew_name} (Status: {assign_data.get('assignment_status')})")

    # STEP 3: Field Crew Executes & Resolves Complaint
    print("\n--- STEP 3: Field Crew Acceptance, Repair & Evidence Upload ---")
    assignment_id = assign_data["id"]

    # 3a. Accept
    res_accept = client.post(f"/api/v1/gov/assignments/{assignment_id}/accept", json={
        "changed_by": "Suresh K. (Crew Leader)",
        "notes": "Acknowledged and en route."
    })
    assert res_accept.status_code == 200, f"Accept failed: {res_accept.text}"
    print(" [OK] Crew Accepted Task")

    # 3b. Start Work
    res_start = client.post(f"/api/v1/gov/assignments/{assignment_id}/start", json={
        "changed_by": "Suresh K. (Crew Leader)",
        "notes": "Commenced excavation and valve isolation."
    })
    assert res_start.status_code == 200, f"Start failed: {res_start.text}"
    print(" [OK] Crew In Progress on Site (Excavation & Valve Isolation)")

    # 3c. Upload Evidence
    evidence_payload = {
        "uploaded_by": "Suresh K. (Crew Leader)",
        "before_photo": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600",
        "after_photo": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600",
        "description": "Replaced cracked ductile iron collar on 8-inch secondary distribution pipe. Tarmac backfilled and sealed."
    }
    res_ev = client.post(f"/api/v1/gov/complaints/{complaint_id}/resolution-evidence", json=evidence_payload)
    assert res_ev.status_code == 201, f"Evidence upload failed: {res_ev.text}"
    print(" [OK] Resolution Evidence Uploaded (Before/After Photos)")

    # 3d. Complete
    complete_payload = {
        "changed_by": "Suresh K. (Crew Leader)",
        "notes": "Main road reopened to pedestrian and vehicular traffic. Water pressure fully restored."
    }
    res_complete = client.post(f"/api/v1/gov/assignments/{assignment_id}/complete", json=complete_payload)
    assert res_complete.status_code == 200, f"Complete failed: {res_complete.text}"
    print(" [OK] Complaint Marked RESOLVED")

    # STEP 4: Citizen Verification & Feedback
    print("\n--- STEP 4: Citizen Tracker & 5-Star Satisfaction Rating ---")
    track_res = client.get(f"/api/v1/citizen/complaints/{tracking_id}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["status"] == "RESOLVED"
    print(f" [OK] Citizen Tracker Confirms: Status = {track_data['status']}")
    print(f" [OK] Resolution Evidence Present: {len(track_data.get('resolution_evidences', []))} photos recorded")

    # Submit 5-star rating
    feedback_payload = {
        "rating": 5,
        "feedback": "Remarkable response speed! The leak was contained within 2 hours and road was restored without traffic chaos.",
        "citizen_name": "Aarav Sharma"
    }
    feedback_res = client.post(f"/api/v1/citizen/complaints/{tracking_id}/feedback", json=feedback_payload)
    assert feedback_res.status_code in (200, 201), f"Feedback failed: {feedback_res.text}"
    print(" [OK] 5-Star Citizen Feedback Successfully Recorded")

    # STEP 5: Predictive Infrastructure Intelligence & Preventive Maintenance
    print("\n--- STEP 5: Predictive Intelligence & Work Order Creation ---")
    # Query Asset Risk
    risk_res = client.get("/api/v1/analytics/assets/risk?prediction_window=30")
    assert risk_res.status_code == 200
    assets_risk = risk_res.json()
    assert len(assets_risk) > 0
    target_asset = assets_risk[0]
    print(f" [OK] Analyzed Asset: {target_asset['asset_name']}")
    print(f"   • Asset Health Index (AHI): {target_asset['health_score']}/100 ({target_asset['health_category']})")
    print(f"   • 7-Day Failure Risk:  {(target_asset['predictions']['7_days']['risk_score'] * 100):.1f}%")
    print(f"   • 30-Day Failure Risk: {(target_asset['predictions']['30_days']['risk_score'] * 100):.1f}% ({target_asset['predictions']['30_days']['risk_level']})")

    # Lookup asset department ID
    from app.models.infrastructure import InfrastructureAsset
    db = SessionLocal()
    asset_obj = db.query(InfrastructureAsset).filter(InfrastructureAsset.id == target_asset["asset_id"]).first()
    dept_id = asset_obj.department_id if (asset_obj and asset_obj.department_id) else 1
    db.close()

    # Create Preventive Work Order for this asset
    wo_payload = {
        "infrastructure_id": target_asset["asset_id"],
        "department_id": dept_id,
        "crew_id": crew_id,
        "priority": "HIGH",
        "recommended_action": "Comprehensive ultrasonic wall thickness inspection and preventive valve gasket replacement",
        "notes": "Flagged by CivicPulse Track B predictive failure forecasting model."
    }
    wo_res = client.post("/api/v1/dispatch/preventive-maintenance", json=wo_payload)
    assert wo_res.status_code == 201, f"Create WO failed: {wo_res.text}"
    wo_data = wo_res.json()
    order_id = wo_data["id"]
    order_code = wo_data["order_code"]
    print(f" [OK] Preventive Maintenance Work Order Created: {order_code} (Status: {wo_data['status']})")

    # STEP 6: Field Crew Executes Preventive Maintenance
    print("\n--- STEP 6: Field Crew Executes Preventive Order ---")
    # Crew accepts
    res_wo_acc = client.put(f"/api/v1/dispatch/preventive-maintenance/{order_id}/status", json={
        "status": "ACCEPTED",
        "completion_notes": "Preventive inspection scheduled with maintenance crew."
    })
    assert res_wo_acc.status_code == 200

    # Crew starts
    res_wo_prog = client.put(f"/api/v1/dispatch/preventive-maintenance/{order_id}/status", json={
        "status": "IN_PROGRESS",
        "completion_notes": "Commencing ultrasonic diagnostics on pipe joint."
    })
    assert res_wo_prog.status_code == 200

    # Crew completes
    complete_wo_res = client.put(f"/api/v1/dispatch/preventive-maintenance/{order_id}/status", json={
        "status": "COMPLETED",
        "completion_notes": "Ultrasonic scan completed. Minor cavitation cleared; seals replaced. Expected lifespan extended by 4 years.",
        "completed_by": "Suresh K. (Crew Leader)"
    })
    assert complete_wo_res.status_code == 200
    print(f" [OK] Preventive Order {order_code} Completed on Site!")

    print("\n" + "=" * 70)
    print(" FLAGSHIP DEMONSTRATION VERIFIED END-TO-END (ALL 6 STEPS PASSED!)")
    print("=" * 70)


if __name__ == "__main__":
    test_flagship_end_to_end_demo()
