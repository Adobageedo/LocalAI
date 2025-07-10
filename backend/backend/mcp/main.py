"""
Main module for the MCP server.
Implements a FastAPI server that conforms to the Model Context Protocol.
"""

import os
import sys
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from backend.core.logger import log

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.mcp.mcp_router import router as mcp_router

# Setup logger
logger = log.bind(name="backend.mcp.main")

# Create FastAPI app
app = FastAPI(
    title="LocalAI MCP Server",
    description="Model Context Protocol server for LocalAI",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include MCP router
app.include_router(mcp_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware to log all requests"""
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mcp"}


if __name__ == "__main__":
    # Run the server
    port = int(os.environ.get("MCP_PORT", 8001))
    logger.info(f"Starting MCP server on port {port}")
    uvicorn.run("backend.mcp.main:app", host="0.0.0.0", port=port, reload=True)
