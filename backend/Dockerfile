# syntax=docker/dockerfile:1
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        poppler-utils \
        tesseract-ocr \
        libtesseract-dev \
        cron \
        && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for FastAPI (if used)
EXPOSE 8000

# Write cron job for sync service
RUN echo "*/30 * * * * cd /app && python -m backend.backend.services.sync_service.scheduled_sync_service >> /app/data/sync_cron.log 2>&1" > /etc/cron.d/sync-cron \
    && chmod 0644 /etc/cron.d/sync-cron \
    && crontab /etc/cron.d/sync-cron

# Start both cron and application
CMD service cron start && exec gunicorn --bind :${PORT:-8000} -k uvicorn.workers.UvicornWorker backend.api.main:app
