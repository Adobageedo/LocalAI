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


class SendEmailRequest(BaseModel):
    """Request model for sending an email."""
    to: List[str] = Field(..., description="List of recipient email addresses")
    subject: str = Field(..., description="Subject of the email")
    body: str = Field(..., description="Body content of the email")
    provider: Optional[str] = Field(None, description="Email provider (gmail or outlook)")


class ReplyEmailRequest(BaseModel):
    """Request model for replying to an email."""
    email_id: str = Field(..., description="ID of the email to reply to")
    body: str = Field(..., description="Body content of the reply")
    provider: Optional[str] = Field(None, description="Email provider (gmail or outlook)")


class ForwardEmailRequest(BaseModel):
    """Request model for forwarding an email."""
    email_id: str = Field(..., description="ID of the email to forward")
    to: List[str] = Field(..., description="List of recipient email addresses")
    additional_comment: Optional[str] = Field(None, description="Optional comment to add to the forwarded email")
    provider: Optional[str] = Field(None, description="Email provider (gmail or outlook)")


class MoveEmailRequest(BaseModel):
    """Request model for moving an email to a folder."""
    email_id: str = Field(..., description="ID of the email to move")
    folder: str = Field(..., description="Destination folder name")
    provider: Optional[str] = Field(None, description="Email provider (gmail or outlook)")


class RetrieveConversationRequest(BaseModel):
    """Request model for retrieving conversation history."""
    conversation_id: str = Field(..., description="ID of the conversation to retrieve")
    provider: Optional[str] = Field(None, description="Email provider (gmail or outlook)")


class RAGQueryRequest(BaseModel):
    """Request model for RAG query."""
    question: str = Field(..., description="Question to query the RAG system with")


class MCPResponse(BaseModel):
    """Base model for MCP tool call responses."""
    success: bool = Field(..., description="Whether the operation was successful")
    data: Optional[Any] = Field(None, description="Response data if successful")
    error: Optional[str] = Field(None, description="Error message if unsuccessful")
