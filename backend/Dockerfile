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

# Start the app with Gunicorn and Uvicorn worker, bind to $PORT (Heroku)
CMD exec gunicorn --bind :${PORT:-8000} -k uvicorn.workers.UvicornWorker backend.api.main:app
