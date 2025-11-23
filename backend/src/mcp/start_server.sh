#!/bin/bash
# Quick start script for MCP RAG Retrieval Server

set -e

echo "🚀 Starting MCP RAG Retrieval Server..."
echo ""

# Check if we're in the backend directory
if [ ! -f "src/mcp/server.py" ]; then
    echo "❌ Error: Must be run from the backend directory"
    echo "   cd /Users/edoardo/Documents/LocalAI/backend"
    exit 1
fi

# Check Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Error: Python not found"
    exit 1
fi

# Check MCP is installed
if ! python -c "import mcp" 2>/dev/null; then
    echo "📦 Installing MCP SDK..."
    pip install mcp
    echo "✅ MCP SDK installed"
fi

# Set environment variables
export PYTHONPATH="${PWD}"
export COLLECTION_NAME="${COLLECTION_NAME:-TEST_BAUX}"

echo "📋 Configuration:"
echo "   PYTHONPATH: ${PYTHONPATH}"
echo "   COLLECTION_NAME: ${COLLECTION_NAME}"
echo "   Architecture: Modular (13 files)"
echo ""

# Start the server
echo "▶️  Starting server..."
echo "   Press Ctrl+C to stop"
echo ""

python -m src.mcp
