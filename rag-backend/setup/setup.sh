#!/bin/bash
set -e

# This script sets up the Python environment and launches Qdrant via Docker Compose.
# Run from the project root: bash setup/setup.sh

# 1. Install Python dependencies
if [ -f requirements.txt ]; then
    echo "Installing Python dependencies from requirements.txt..."
    pip install -r requirements.txt
elif [ -f setup/requirements.txt ]; then
    echo "Installing Python dependencies from setup/requirements.txt..."
    pip install -r setup/requirements.txt
else
    echo "requirements.txt not found!"
    exit 1
fi

# 2. Start Qdrant with Docker Compose
if [ -f docker-compose.yml ]; then
    echo "Starting Qdrant using docker-compose.yml..."
    docker-compose up -d
elif [ -f setup/docker-compose.yml ]; then
    echo "Starting Qdrant using setup/docker-compose.yml..."
    (cd setup && docker-compose up -d)
else
    echo "docker-compose.yml not found!"
    exit 1
fi

# 3. (Optional) Install Tesseract (for OCR)
if ! command -v tesseract &> /dev/null; then
    echo "Tesseract not found. Attempting to install (macOS only)..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install tesseract || echo "Please install Homebrew and rerun this script or install Tesseract manually."
    else
        echo "Please install Tesseract manually for your OS."
    fi
else
    echo "Tesseract is already installed."
fi

# 4. Done

echo "\nSetup complete!"
echo "- Python dependencies installed."
echo "- Qdrant running at http://localhost:6333"
echo "- Tesseract OCR: $(command -v tesseract || echo 'not installed')"
