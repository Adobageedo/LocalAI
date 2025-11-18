#!/bin/bash

# FastAPI Server Startup Script
# Starts the Python backend on port 8000

echo "🚀 Starting FastAPI Backend..."
echo "================================"
echo "Port: 8000"
echo "Docs: http://localhost:8000/docs"
echo "Health: http://localhost:8000/health"
echo "================================"
echo ""

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "✅ Activating virtual environment..."
    source venv/bin/activate
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Create .env with OPENAI_API_KEY=your_key"
    echo ""
fi

# Test imports first
echo "🧪 Testing imports..."
python test_imports.py
if [ $? -ne 0 ]; then
    echo "❌ Import test failed! Please fix errors above."
    exit 1
fi
echo ""

# Start uvicorn with auto-reload
echo "🌐 Starting server..."
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
