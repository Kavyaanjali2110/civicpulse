CivicPulse AI

> **AI-Powered Multilingual Citizen Feedback and Public Infrastructure Intelligence Platform**

CivicPulse AI aggregates citizen feedback across languages and modalities (text, voice, GPS coordinates, photo attachments) and transforms raw complaints into high-value **infrastructure intelligence** — detecting localized breakdowns, geographical hotspots, population impact, and generating explainable priority rankings for municipal authorities.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-40%20passed-brightgreen)](./backend/tests/) [![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://python.org) [![React](https://img.shields.io/badge/react-18-61dafb)](https://react.dev)

---

 Project Architecture

```
civicpulse/
├── backend/                  # FastAPI + SQLAlchemy 2.0 + SQLite
│   ├── app/
│   │   ├── api/v1/endpoints/ # API Routes (Citizen, Gov, Analytics, Health, Recommendations)
│   │   ├── core/             # Configuration & DB connection
│   │   ├── models/           # SQLAlchemy ORM models (Complaints, Hotspots, Infrastructure, Audit)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Business logic layer (CRUD)
│   │   ├── ai/               # AI/ML Pipeline:
│   │   │   ├── language/     #   Language detection & multilingual normalization
│   │   │   ├── nlp/          #   TF-IDF complaint classifier
│   │   │   ├── severity/     #   Multi-factor severity scoring engine
│   │   │   ├── clustering/   #   DBSCAN spatial hotspot clustering
│   │   │   ├── scoring/      #   Infrastructure Priority Score (IPS)
│   │   │   ├── explainability/ # Explainable AI rationale generator
│   │   │   ├── trends/       #   Trend analysis & surge detection
│   │   │   └── pipeline.py   #   Main orchestration pipeline
│   │   └── db/               # Database init, seeders & session management
│   ├── data/                 # Serialized ML models & SQLite database
│   ├── tests/                # 40-test automated pytest suite (100% pass)
│   ├── requirements.txt
│   └── main.py               # FastAPI entry point (uvicorn)
│
└── frontend/                 # React 18 + Vite + Tailwind CSS + React Leaflet
    └── src/
        ├── components/
        │   ├── citizen/      # ComplaintForm, ComplaintTracker, VoiceRecorder,
        │   │                 #   LocationPicker, ImageUploader, FeedbackModal
        │   ├── dashboard/    # InteractiveMap, OverviewStats, PriorityTable,
        │   │                 #   TrendAnalytics, RecommendationsPanel, StatusUpdateModal, CrewAssignmentModal
        │   ├── crew/         # ResolutionUploadModal
        │   └── common/       # Navbar, Footer, SeverityBadge, LanguageSwitcher
        ├── context/          # AuthContext, LanguageContext
        ├── hooks/            # Custom hooks (Geolocation, Speech-to-Text)
        ├── pages/            # CitizenDashboard, GovernmentDashboard, FieldCrewDashboard, LoginSelection, NotFound
        └── services/         # Axios API clients (citizenService, govService, crewService, authService)
```

---

Quickstart Guide

### Prerequisites
- **Python**: 3.10+ (3.12+ recommended)
- **Node.js**: 18+ (npm 9+)

---

### 1. Backend Setup

```bash
cd civicpulse/backend

# Create and activate virtual environment
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (auto-seeds database on first run)
python main.py
```

Backend starts at: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **Health Check**: `http://localhost:8000/api/v1/health`

---

### 2. Frontend Setup

```bash
cd civicpulse/frontend
npm install
npm run dev
```

Frontend available at: `http://localhost:5173`

---

Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Citizen** | `citizen@civicpulse.ai` | `citizen123` |
| **Government Officer** | `officer@civicpulse.ai` | `gov2026` |
| **Field Crew** | `crew@civicpulse.ai` | `crew2026` |

---

AI Pipeline Overview

| Stage | Implementation | Description |
|-------|---------------|-------------|
| **Language Detection** | langdetect + heuristics | Detects 30+ languages, translates to English |
| **Classification** | TF-IDF + Logistic Regression | 6-category civic complaint classifier |
| **Severity Scoring** | Rule-based + keyword weight | 0–1.0 multi-factor severity with hazard keywords |
| **Duplicate Detection** | TF-IDF cosine similarity | Spatial + semantic deduplication (500m radius) |
| **Spatial Clustering** | DBSCAN | Groups nearby complaints into hotspot zones |
| **Priority Score (IPS)** | Weighted formula | Severity × proximity-to-infrastructure × cluster bonus |
| **Explainable AI** | Template reasoning | Human-readable XAI rationale for each complaint |
| **Trend Analysis** | Time-series aggregation | 14-day intake velocity + category surge detection |

---

Testing

```bash
cd civicpulse/backend

# Activate venv first, then:
pytest tests/ -v
```

**Current test results: 40/40 passed ✅**

Test coverage:
- `test_ai_pipeline.py` — Language detection, classifier, severity engine, DBSCAN clustering, IPS scoring, XAI, end-to-end pipeline
- `test_api_endpoints.py` — Citizen & government API endpoints
- `test_dispatch_workflow.py` — Department dispatch, field crew workflows & SLA resolution lifecycles
- `test_phase3_to_phase7_verification.py` — Complete end-to-end closed loop, XAI, map analytics, dispatch, crew resolution & error checks
- `test_db_models.py` — ORM models, services & audit lifecycle
- `test_health.py` — Health & root endpoints
- `test_seed_data.py` — Database seed data generation

---

API Reference

### Citizen Endpoints (`/api/v1/citizen/`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/categories` | List available complaint categories |
| `POST` | `/complaints` | Submit new complaint (runs full AI pipeline) |
| `GET` | `/complaints/{tracking_id}` | Track complaint by ID |
| `POST` | `/voice-transcribe` | Transcribe & classify voice grievance |

### Government Endpoints (`/api/v1/gov/`)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/stats/overview` | KPI dashboard statistics |
| `GET` | `/complaints` | Paginated & filtered complaint list |
| `GET` | `/complaints/{id}` | Full detail + XAI rationale |
| `PATCH` | `/complaints/{id}/status` | Update workflow status + audit |
| `GET` | `/heatmap/points` | Heatmap intensity data |
| `GET` | `/hotspots` | Active DBSCAN cluster list |
| `POST` | `/hotspots/recluster` | Trigger spatial recluster |
| `GET` | `/priority-ranking` | AI priority-ranked complaints & hotspots |
| `GET` | `/trends` | 14-day trend series + surge alerts |
| `GET` | `/ai-recommendations` | Prescriptive AI recommendations |

---

Development Roadmap

- [x] **Phase 1: Project Scaffolding & Setup**
- [x] **Phase 2: Database Schema, ORM Models & Seed Data Engine**
- [x] **Phase 3: AI/ML Pipeline (NLP, DBSCAN, Priority Index, XAI, Trends)**
- [x] **Phase 4: API Endpoints (Citizen & Government Services)**
- [x] **Phase 5: Citizen Portal (Voice Recording, GPS Leaflet, Multilingual UI, Tracking)**
- [x] **Phase 6: Government Dashboard (Interactive Map, Heatmap, Priority Queue, AI Recs)**
- [x] **Phase 7: End-to-End Testing, Live Data Integration & UI Polish**

---

Docker Deployment

Run the entire CivicPulse AI stack with a single command using Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine (Linux)
- Docker Compose v2+ (included with Docker Desktop)

### Quick Start

```bash
# 1. Clone the repository (if not done already)
git clone <repo-url>
cd civicpulse

# 2. Build and start all containers
docker compose up --build

# Wait for both containers to be healthy (usually 30–60 seconds on first run).
# You will see log output from both backend and frontend containers.
```

### Access the Application

| Service | URL |
|:--------|:----|
| **Frontend** (React App) | http://localhost |
| **Backend API** | http://localhost:8000 |
| **Swagger Docs** | http://localhost:8000/api/v1/docs |
| **Health Check** | http://localhost:8000/api/v1/health |

### Demo Credentials

| Role | Email | Password |
|:-----|:------|:---------|
| Citizen | `citizen@civicpulse.ai` | `Citizen@123` |
| Government | `admin@civicpulse.gov` | `Admin@123` |
| Field Crew | `crew@civicpulse.ai` | `Crew@123` |

---

### Docker Commands

**Start (detached background mode):**
```bash
docker compose up -d --build
```

**Stop containers:**
```bash
docker compose down
```

**View live logs:**
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

**Rebuild after code changes:**
```bash
docker compose up --build --force-recreate
```

**Remove containers AND volumes (full reset):**
```bash
docker compose down -v
```

---

### Container Architecture

```
Browser (http://localhost)
    │
    ▼
┌─────────────────────────────┐
│  civicpulse-frontend        │  Port 80
│  Nginx (React SPA)          │
│  Serves static build files  │
└─────────────────────────────┘
    │ API calls (localhost:8000)
    ▼
┌─────────────────────────────┐
│  civicpulse-backend         │  Port 8000
│  FastAPI + uvicorn          │
│  AI Pipeline + SQLAlchemy   │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│  civicpulse_data (volume)   │
│  SQLite database            │
│  AI model cache             │
└─────────────────────────────┘
```

**Key architecture notes:**
- The frontend is a pre-built static bundle served by Nginx on port 80
- API calls from the browser go directly to `localhost:8000` (not through Nginx)
- `VITE_API_BASE_URL=http://localhost:8000/api/v1` is baked into the JS bundle at build time
- The database is stored in a named Docker volume `civicpulse_data`

---

### Environment Configuration

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|:---------|:--------|:------------|
| `DATABASE_URL` | `sqlite:////app/data/civicpulse.db` | SQLite path (absolute, inside container) |
| `ENVIRONMENT` | `production` | Runtime environment |
| `DEBUG` | `false` | SQLAlchemy query logging |
| `BACKEND_CORS_ORIGINS` | `http://localhost,...` | Allowed browser origins |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend API URL visible from browser |

---

### Database Persistence

The SQLite database is stored in a named Docker volume:

```
Volume: civicpulse_data → /app/data (inside backend container)
```

> **Note:** The application re-seeds the database on every startup (`force_seed=True`). This ensures consistent demo data and avoids migration issues during development. If you require persistence of user-submitted complaints across restarts, the `force_seed` flag can be changed to `False` in `backend/main.py`.

---

### Troubleshooting

**Frontend shows blank page or "Cannot connect to API":**
- Ensure the backend container is healthy: `docker compose ps`
- Check backend logs: `docker compose logs backend`
- The frontend container waits for backend health check before starting

**Port 80 already in use:**
```bash
# Change frontend port in docker-compose.yml:
ports:
  - "8080:80"
# Then access via: http://localhost:8080
```

**Port 8000 already in use (local dev server running):**
```bash
# Stop any existing backend: Ctrl+C in backend terminal
# Or change port in docker-compose.yml:
ports:
  - "8001:8000"
```

**Backend crashes at startup:**
```bash
docker compose logs backend
# Common cause: volume permissions or DATABASE_URL misconfiguration
```

**Full reset (rebuild from scratch):**
```bash
docker compose down -v --rmi all
docker compose up --build
```
