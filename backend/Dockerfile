# ============================================================
# CivicPulse AI — Backend Dockerfile
# FastAPI + SQLAlchemy + SQLite + scikit-learn
# ============================================================

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies (no virtual env needed in Docker)
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source
COPY . .

# Pre-create data directories so SQLite and AI model can write on startup
RUN mkdir -p data/models data/seed

# Ensure Python output is unbuffered (important for container log streaming)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose backend API port
EXPOSE 8000

# Production startup — no reload flag
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
