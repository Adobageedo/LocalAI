# syntax=docker/dockerfile:1
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        poppler-utils \
        tesseract-ocr \
        libtesseract-dev \
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

# Create directory for logs
RUN mkdir -p /app/data

# Create startup script
RUN echo '#!/bin/bash\n\
# Start sync service in background\n\
# nohup python -m backend.services.sync_service.scheduled_sync_service > /app/data/sync.log 2>&1 &\n\
# \n\
# Start main application\n\
exec gunicorn --bind :${PORT:-8000} -k uvicorn.workers.UvicornWorker backend.api.main:app\n\
' > /app/start.sh && chmod +x /app/start.sh

# Start application with sync service
CMD ["/app/start.sh"]
