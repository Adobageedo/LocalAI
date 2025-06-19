from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Base metadata class for all document types
class BaseDocumentMetadata(BaseModel):
    doc_id: str
    user: str
    path: str
    filename: str
    chunk_id: int = 0
    num_chunks: int = 0
    embedded: bool = False
    unique_id: str
    ingestion_date: datetime = Field(default_factory=datetime.now)
    
    # Allow additional fields not explicitly defined in the model
    class Config:
        extra = "allow"
        
    # Convert to dict for storage in Qdrant
    def to_dict(self):
        data = self.dict()
        # Convert datetime to ISO format string for JSON serialization
        if isinstance(data.get('ingestion_date'), datetime):
            data['ingestion_date'] = data['ingestion_date'].isoformat()
        return data

# Email-specific metadata    
class EmailMetadata(BaseDocumentMetadata):
    sender: Optional[str] = None
    receiver: Optional[str] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    subject: Optional[str] = None
    date: Optional[str] = None
    message_id: Optional[str] = None
    document_type: str = "email"
    source: Optional[str] = None
    content_type: Optional[str] = None
    parent_email_id: Optional[str] = None

# User document metadata
class DocumentMetadata(BaseDocumentMetadata):
    document_type: str = None
    relative_path: Optional[str] = None
    data_dir: Optional[str] = None
    file_hash: Optional[str] = None
    last_modified: Optional[str] = None