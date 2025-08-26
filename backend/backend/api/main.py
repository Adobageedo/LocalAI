import sys
import os
import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from backend.core.logger import log

logger = log.bind(name="backend.api.main")

app = FastAPI()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# Import des routeurs
from .router.outlook.email_template_router import router as outlook_router
from .router.outlook.summarize_router import router as summarize_router
from .router.outlook.compose_router import router as compose_router
from .router.outlook.auth import router as outlook_auth_router
from .router.gmail.auth import router as gmail_auth_router
# Configuration des préfixes API centralisée
app.include_router(outlook_auth_router, prefix="/api")
app.include_router(summarize_router, prefix="/api")
app.include_router(compose_router, prefix="/api")
app.include_router(gmail_auth_router, prefix="/api")
app.include_router(outlook_auth_router, prefix="/api")
# Add middleware
# 1. Compression for better network performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3000",  # HTTPS frontend in development
        "http://localhost:3000",   # HTTP frontend in development
        "*"                       # Allow all origins for testing
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Uid", "*"],
)

# Health check endpoint at the application root
@app.get("/")
async def root():
    """API root health check endpoint."""
    return {
        "status": "online",
        "version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "timestamp": datetime.datetime.now().isoformat()
    }
