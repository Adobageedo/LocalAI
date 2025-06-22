"""
Document-related Pydantic models.
"""
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel
from datetime import datetime

class DocumentMeta(BaseModel):
    doc_id: str
    document_type: str
    source_path: Optional[str] = None
    attachment_name: Optional[str] = None
    subject: Optional[str] = None
    user: Optional[str] = None
    date: Optional[str] = None

class DocumentContent(BaseModel):
    content: str
    metadata: Dict[str, Any]

class SourceUsed(BaseModel):
    content: str
    metadata: Dict[str, Any]

class DocumentStats(BaseModel):
    total_documents: int
    user_count: int
    type_count: int
    users: List[Dict[str, Any]]
    document_types: List[Dict[str, str]]
    available_metadata_fields: List[str]
