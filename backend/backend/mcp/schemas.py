"""
Schemas for the MCP server.
Contains Pydantic models for request and response validation.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class MCPRequest(BaseModel):
    """Base model for MCP tool call requests."""
    tool_name: str = Field(..., description="Name of the tool to call")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the tool")


class RAGQueryRequest(BaseModel):
    """Request model for RAG query."""
    question: str = Field(..., description="Question to query the RAG system with")


class MCPResponse(BaseModel):
    """Base model for MCP tool call responses."""
    success: bool = Field(..., description="Whether the operation was successful")
    data: Optional[Any] = Field(None, description="Response data if successful")
    error: Optional[str] = Field(None, description="Error message if unsuccessful")


class UserConnectedServices(BaseModel):
    """Model for user's connected services."""
    user_id: str = Field(..., description="User ID")
    services: List[str] = Field(default_factory=list, description="List of connected service identifiers")
    providers: Dict[str, str] = Field(default_factory=dict, description="Mapping of service to provider (e.g., email -> gmail)")
    capabilities: Dict[str, List[str]] = Field(default_factory=dict, description="Mapping of provider to available capabilities")


class AdapterStatus(BaseModel):
    """Model for adapter status."""
    adapter_type: str = Field(..., description="Type of adapter")
    is_available: bool = Field(..., description="Whether the adapter is available")
    error: Optional[str] = Field(None, description="Error message if adapter is not available")
