CivicPulse AI 

AI-Powered Omnichannel Civic Grievance Intake, Predictive Municipal Infrastructure Intelligence & Automated Field Operations Platform

[![Backend Tests](https://img.shields.io/badge/backend%20tests-68%2F68%20passed-brightgreen)](./backend/tests/) [![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://python.org) [![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)](https://fastapi.tiangolo.com) [![React](https://img.shields.io/badge/react-18-61dafb)](https://react.dev) [![Vite](https://img.shields.io/badge/vite-5.4-646CFF)](https://vitejs.dev) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

Executive Summary

CivicPulse AI transforms civic governance from a reactive complaint ticketing system into a predictive municipal infrastructure intelligence and rapid field-operations platform.

```
       OMNICHANNEL INTAKE                AI REASONING CORE                    PREDICTIVE INTELLIGENCE
  ┌───────────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────────┐
  │ • Web Portal (Multilingual)│      │ • Language Detection (30+)│      │ • Asset Health Index (0-100)│
  │ • WhatsApp Webhook        │ ───► │ • TF-IDF + Logistic Reg   │ ───► │ • 7/14/30-Day Failure Risk  │
  │ • SMS Ingestion Gateway   │      │ • Multi-Factor Severity   │      │ • Ward Risk Index           │
  │ • Partner REST Webhooks   │      │ • Spatial DBSCAN Hotspots │      │ • Preventive Work Orders    │
  └───────────────────────────┘      │ • Infrastructure Priority │      └──────────────┬──────────────┘
                                     │ • Explainable AI (XAI)    │                     │
                                     └─────────────┬─────────────┘                     ▼
                                                   │                    ┌─────────────────────────────┐
                                                   ▼                    │ FIELD CREW OPERATIONS       │
                                     ┌───────────────────────────┐      │ • Real-Time Dispatch        │
                                     │ TWO-WAY CITIZEN ALERTS    │      │ • Mobile Acceptance & Work  │
                                     │ • Received (CP-2026-XXXX) │      │ • Photographic Evidence     │
                                     │ • AI Triaged & Scored     │      │ • SLA Tracking & Feedback   │
                                     │ • Assigned & In-Progress  │      └─────────────────────────────┘
                                     │ • Resolved + Photo Proof  │
                                     └───────────────────────────┘
```

---

Platform Architecture: 3 Unified Tracks

Track A: Reactive Grievance Operations & Closed-Loop Field Dispatch
- Multilingual Intake: Real-time language detection across 30+ languages, automated English normalization, and speech-to-text voice grievance transcription.
- AI Classification: Scikit-Learn TF-IDF vectorizer + Logistic Regression model calibrated for municipal categories (Water Supply & Drainage, Roads & Infrastructure, Solid Waste Management, Electricity & Street Lighting, Public Health & Sanitation, Traffic & Civil Safety).
- Severity Engine: Multi-factor 0–1.0 score analyzing physical hazard keywords, vulnerable population keywords, school/hospital zones, and category base weights.
- Spatial Deduplication & Hotspots: Geographic proximity clustering (500m radius) with cosine text similarity to detect duplicate complaints, and DBSCAN clustering to identify emergent spatial hotspots.
- Infrastructure Priority Score (IPS): Formula balancing severity, proximity to high-vulnerability civic assets, repeat complaint history, and spatial cluster membership.
- Closed-Loop Field Workflow: Department routing, field crew assignment, mobile status transitions (`ASSIGNED` → `ACCEPTED` → `IN_PROGRESS` → `RESOLVED`), mandatory before/after photo proof, SLA timer tracking, and citizen 5-star feedback rating.

 Track B: Predictive Infrastructure Maintenance & Failure Forecasting
- Asset Health Index (AHI): Continuous 0–100 mathematical health metric evaluating:
  - Complaint frequency & surge velocity over 14-day and 60-day windows.
  - Active DBSCAN spatial hotspot overlap & severity penalty.
  - Asset chronological age vs expected municipal design lifespan.
  - Days elapsed since previous preventive maintenance inspection.
- Calibrated Failure Forecasting: Predictive logistic risk models projecting failure probability over 7-Day, 14-Day, and 30-Day forward time horizons.
- Ward Risk Index (WRI): Macro-level civic risk scoring prioritizing municipal budget allocation across geographic zones.
- Predictive Explainable AI (XAI): Diagnostic narratives outlining the top 3 contributing risk factors and recommended engineering interventions.
- Preventive Maintenance Work Orders: Direct generation of preventive work orders assigned to specialized municipal crews to service assets before catastrophic structural failure occurs.

Track C: Omnichannel Ingestion & Two-Way Citizen Notifications
- Simulated WhatsApp Webhook: Structured payload ingestion (`from`, `sender_name`, `text`, `location`) generating instant acknowledgment messages and tracking IDs.
- Simulated SMS Gateway: Lightweight mobile grievance ingestion with profile-based fallback ward resolution.
- **Partner REST Webhooks**: Third-party civic partner integration with idempotency protection against duplicate external message IDs.
- **Interactive Omnichannel Simulator**: In-browser simulator modal allowing municipal officers to simulate live WhatsApp and SMS citizen grievances on the fly.
- **Two-Way Notification Lifecycle**: Automated citizen notifications at every workflow milestone (`COMPLAINT_RECEIVED`, `AI_ANALYZED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`) with mock SMS/WhatsApp delivery records.

---


 Flagship 6-Step Demonstration Scenario

CivicPulse includes a deterministic, end-to-end demonstration scenario demonstrating the full closed-loop lifecycle:

```
Step 1: Citizen reports major water leakage via WhatsApp Simulator
        ↳ AI Pipeline triggers: auto-classified as "Water Supply", severity scored HIGH (0.78), tracking ID issued.
        ↳ Citizen receives instant WhatsApp notification: "Complaint CP-2026-XXXX received."

Step 2: Municipal Officer reviews complaint in Government Priority Queue
        ↳ Explores XAI rationale and assigns "Ward 4 Water Repair Crew".
        ↳ Citizen receives automated WhatsApp dispatch alert with crew details.

Step 3: Field Crew accepts task, begins excavation, and uploads photo proof
        ↳ Crew transitions ticket: ASSIGNED → ACCEPTED → IN_PROGRESS.
        ↳ Uploads before-and-after photo evidence: "Replaced cracked ductile iron collar; backfilled tarmac."
        ↳ Ticket transitions to RESOLVED upon evidence submission.

Step 4: Citizen verifies resolution on Public Portal
        ↳ Checks tracking status: confirms Before/After photographic evidence.
        ↳ Submits 5-star rating: "Remarkable response speed! Leak fixed within 2 hours."

Step 5: Municipal Officer investigates Predictive Infrastructure Intelligence
        ↳ Discovers aging "Ward 4 Water Main Distribution Valve" with 78.4% 30-Day failure risk.
        ↳ Generates Preventive Work Order for ultrasonic testing and seal replacement.

Step 6: Field Crew executes preventive work order
        ↳ Crew inspects valve, clears cavitation, replaces seals, extending asset lifespan by 4 years.
        ↳ Complete prevention loop achieved!
```

 Run Flagship Verification CLI:
```bash
cd civicpulse/backend
.\venv\Scripts\python.exe tests/verify_flagship_demo.py
```

---
 Demo Reset & Seeding

Restore the database to the pristine demo baseline (22 complaints across all severities, 10 infrastructure assets, 4 spatial hotspots, 8 field crews, 55 notification records, 1 active preventive work order):
 Option A: Via Backend CLI
```bash
cd civicpulse/backend
python -m app.db.reset_demo
```

 Option B: Via REST API
```bash
curl -X POST http://localhost:8000/api/v1/system/demo-reset
```

Option C: Via Web UI
Click the "Reset Demo" button directly in the top navigation bar of the application.

---

 Quickstart Guide

 Prerequisites
- Python: 3.10+ (3.12+ recommended)
- Node.js: 18+ (npm 9+)

---

 1. Backend Setup

```bash
cd civicpulse/backend

# Create and activate virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python main.py
```

- Backend API: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/api/v1/health`
- System Info: `http://localhost:8000/api/v1/system/info`

---

 2. Frontend Setup

```bash
cd civicpulse/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

- Frontend App: `http://localhost:5173`
- Production Build: `npm run build`

---

 Demo Login Credentials

| Role | Email | Password | Primary Capabilities |
|:-----|:------|:---------|:---------------------|
|Citizen| `citizen@civicpulse.ai` | `citizen123` | Submit grievances (multilingual text/voice/GPS), track status, review photo evidence, submit 5-star ratings. |
|Government Officer| `officer@civicpulse.ai` | `gov2026` | Real-time map, priority ranking queue, predictive asset risk, ward index, omnichannel intake view & simulator, field crew dispatch. |
|Field Crew Leader| `crew@civicpulse.ai` | `crew2026` | Mobile task view, status transitions (`ACCEPTED`, `IN_PROGRESS`), photographic evidence upload, preventive maintenance execution. |

---

 Automated Testing Suite

The platform includes **68 comprehensive automated tests** across all 3 tracks with 100% pass rate:

```bash
cd civicpulse/backend
pytest tests/ -v
```

```
======================= 68 passed, 6 warnings in 21.44s =======================
```

### Test Coverage Breakdown:
1. `test_ai_pipeline.py` (9 tests): Language detection, classifier, severity engine, deduplication, DBSCAN, IPS scoring, XAI rationale generator, end-to-end pipeline.
2. `test_api_endpoints.py` (13 tests): Citizen and government REST endpoints, GIS points, re-clustering, trends.
3. `test_db_models.py` (3 tests): Category service, infrastructure spatial queries, complaint audit lifecycle.
4. `test_dispatch_workflow.py` (5 tests): Municipal department routing, field crew assignment, SLA tracking, status validation.
5. `test_flagship_demo.py` (1 test): Complete 6-step deterministic demonstration verification.
6. `test_health.py` (4 tests): Root, health check, system info, demo-reset dev endpoint.
7. `test_omnichannel_webhooks.py` (12 tests): WhatsApp, SMS, partner webhooks, idempotency, failure insulation, notification history.
8. `test_phase3_to_phase7_verification.py` (7 tests): Closed-loop integration, priority sorting, exception handling.
9. `test_predictive_maintenance.py` (13 tests): Asset Health Index (AHI), 7/14/30-day failure risk models, Ward Risk Index (WRI), predictive XAI, preventive work orders.
10. `test_seed_data.py` (1 test): Database initial seeder validation.

---

 REST API Reference

System Management (`/api/v1/system/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/system/info` | Platform runtime status, track indicators, and entity counters |
| `POST` | `/system/demo-reset` | Resets and re-seeds database to clean demonstration baseline |

Citizen Services (`/api/v1/citizen/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/citizen/categories` | List active municipal grievance categories |
| `POST` | `/citizen/complaints` | Submit new grievance with AI pipeline processing |
| `GET` | `/citizen/complaints/{tracking_id}` | Real-time status tracker with crew evidence & notifications |
| `POST` | `/citizen/complaints/{tracking_id}/feedback` | Record citizen satisfaction star rating (1–5) and review |
| `POST` | `/citizen/voice-transcribe` | Transcribe voice audio, detect language, normalize to English |

### Government Command Center (`/api/v1/gov/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/gov/stats/overview` | High-level municipal KPI metrics |
| `GET` | `/gov/complaints` | Filtered, paginated grievance list (channel, status, ward) |
| `GET` | `/gov/complaints/{id}` | Detailed complaint report with XAI rationale & audit history |
| `PATCH`| `/gov/complaints/{id}/status` | Manual status override with audit logging |
| `GET` | `/gov/priority-ranking` | AI-ranked grievance and active hotspot queue |
| `GET` | `/gov/heatmap/points` | Geospatial heatmap coordinate density |
| `GET` | `/gov/hotspots` | Active DBSCAN spatial clusters |
| `POST` | `/gov/hotspots/recluster` | Trigger manual spatial clustering pass |
| `GET` | `/gov/trends` | 14-day category velocity and surge detection |
| `GET` | `/gov/ai-recommendations` | Prescriptive resource allocation recommendations |

 Field Crew Dispatch (`/api/v1/gov/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/gov/departments` | Municipal departments with crew counts |
| `GET` | `/gov/crews` | Active field repair crews with current workloads |
| `POST` | `/gov/complaints/{id}/assign` | Dispatch field crew to grievance ticket |
| `POST` | `/gov/assignments/{id}/accept` | Field crew acknowledges and accepts assignment |
| `POST` | `/gov/assignments/{id}/start` | Field crew arrives on site and begins repair |
| `POST` | `/gov/complaints/{id}/resolution-evidence` | Upload photographic before/after proof & description |
| `POST` | `/gov/assignments/{id}/complete` | Complete assignment and transition ticket to `RESOLVED` |

Predictive Infrastructure Maintenance (`/api/v1/analytics/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/analytics/assets/health` | Asset Health Index (AHI 0–100) across all infrastructure assets |
| `GET` | `/analytics/assets/{id}/health` | Deep health diagnostic for specific asset |
| `GET` | `/analytics/assets/risk` | 7/14/30-day failure risk forecasting and contributing factors |
| `GET` | `/analytics/wards/risk` | Ward Risk Index (WRI) and asset vulnerability aggregation |
| `GET` | `/analytics/predictive/recommendations` | Prescriptive maintenance intervention recommendations |

 Preventive Maintenance Dispatch (`/api/v1/dispatch/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/dispatch/preventive-maintenance` | Create preventive maintenance work order for asset |
| `GET` | `/dispatch/preventive-maintenance` | List preventive maintenance orders with status filters |
| `GET` | `/dispatch/preventive-maintenance/{id}` | Preventive work order detail & history |
| `PUT` | `/dispatch/preventive-maintenance/{id}/status` | Transition status (`ACCEPTED`, `IN_PROGRESS`, `COMPLETED`) |

 Omnichannel Ingestion (`/api/v1/webhooks/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `POST` | `/webhooks/whatsapp` | Ingest WhatsApp webhook payload |
| `POST` | `/webhooks/sms` | Ingest SMS gateway payload |
| `POST` | `/webhooks/generic` | Ingest third-party municipal partner webhook payload |
| `GET` | `/webhooks/stats` | Channel breakdown analytics & volume metrics |
Citizen Notifications (`/api/v1/notifications/`)
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/notifications/complaint/{id}` | Notification audit trail for specific grievance |
| `GET` | `/notifications/stats` | Notification delivery rates and channel statistics |

---

 Docker Deployment

The application includes production-ready Docker and Docker Compose configuration:

```bash
# Build and run containers
docker compose up --build
```

- Frontend: `http://localhost` (Nginx static bundle)
- Backend: `http://localhost:8000` (Uvicorn ASGI server)
- Database: Persistent SQLite volume `civicpulse_data`



---

Engineering Implementation Notes

1. **AI Models vs Calibration**: The text classification engine utilizes a production-grade Scikit-Learn TF-IDF vectorizer + Logistic Regression model trained on municipal grievance corpora. The predictive maintenance models utilize calibrated multi-factor mathematical models integrating spatial proximity, complaint velocity, asset age, and maintenance history.
2. **Mock Webhooks & Notification Dispatch**: WhatsApp, SMS, and partner webhooks use production-schema mock endpoints that execute the authentic end-to-end AI pipeline and store real database audit records without requiring paid external Twilio or Meta WhatsApp Business API credentials.
3. **Fail-Safe Leaflet Map**: The Leaflet map renderer incorporates coordinate validation safeguards ensuring zero frontend crashes even if complaints with invalid or missing GPS coordinates are ingested.

---


