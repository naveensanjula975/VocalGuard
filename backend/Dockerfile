# =============================================================================
# VocalGuard Backend — Multi‑stage Dockerfile
# =============================================================================
# Stage 1: Install Python dependencies in a builder layer
# Stage 2: Copy only the runtime artefacts into a slim image
#
# Build args:
#   BUILD_DATE  – ISO 8601 timestamp (set by CI)
#   GIT_SHA     – commit hash for traceability
#
# Usage:
#   docker build -t vocalguard-api:latest -f Dockerfile .
#   docker run -p 8000:8000 --env-file .env vocalguard-api:latest
# =============================================================================

# --------------- Stage 1: Builder ---------------
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps needed to compile native wheels (torch, librosa, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libsndfile1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --------------- Stage 2: Runtime ---------------
FROM python:3.11-slim

# Labels for container registries and traceability
ARG BUILD_DATE
ARG GIT_SHA
LABEL org.opencontainers.image.title="VocalGuard API" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.source="https://github.com/naveensanjula975/VocalGuard"

# Runtime system deps (no compilers — keeps the image small)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libsndfile1 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
WORKDIR /app
COPY . .

# Non-root user for security
RUN groupadd -r vocalguard && useradd -r -g vocalguard vocalguard \
    && chown -R vocalguard:vocalguard /app
USER vocalguard

# Uvicorn config
ENV PORT=8000 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
