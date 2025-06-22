"""
General response models used throughout the API.
"""
from typing import Dict, List, Optional, Any, Union, Generic, TypeVar
from pydantic import BaseModel
from datetime import datetime

T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    """Generic API response model with consistent structure."""
    success: bool
    message: Optional[str] = None
    data: Optional[T] = None
    error: Optional[str] = None

class PromptResponse(BaseModel):
    """Response model for LLM prompt completions."""
    answer: str
    sources: List[str]
    
class StatusResponse(BaseModel):
    """Response model for operation status."""
    success: bool
    message: str
    status_code: int = 200
    
class CountResponse(BaseModel):
    """Response for count operations."""
    success: bool
    count: int
    details: Optional[Dict[str, Any]] = None
    
class BatchOperationResponse(BaseModel):
    """Response for batch operations like ingestion."""
    success: bool
    items_processed: int
    items_succeeded: int
    items_failed: int
    errors: Optional[List[Dict[str, Any]]] = None
