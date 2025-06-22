"""
API-specific configuration settings.
This module contains all configuration related to the API functionality.
"""
import os
import sys
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field

# Import core configuration
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from backend.core.config import load_config

# API-specific configuration
class APIConfig(BaseModel):
    """API-specific configuration settings."""
    api_prefix: str = "/api"
    enable_docs: bool = True
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    openapi_url: str = "/openapi.json"
    title: str = "LocalAI API"
    description: str = "API for the LocalAI system with RAG capabilities"
    version: str = "1.0.0"
    cors_origins: List[str] = ["*"]
    debug: bool = True

# Load the core config and extract API-specific settings
config = load_config()
api_config = APIConfig(
    **config.get("api", {})
)

# API route prefixes
ROUTE_PREFIXES = {
    "root": api_config.api_prefix,
    "documents": f"{api_config.api_prefix}/documents",
    "sources": f"{api_config.api_prefix}/sources",
    "db": f"{api_config.api_prefix}/db",
    "nextcloud": f"{api_config.api_prefix}/nextcloud",
    "auth": f"{api_config.api_prefix}/auth",
    "llm": f"{api_config.api_prefix}/llm",
    "openai": api_config.api_prefix,  # OpenAI compatibility uses the root prefix
    "ingest": f"{api_config.api_prefix}/ingest",
}
