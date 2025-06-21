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

# Définition des classes pour les emails
class EmailContent:
    """Classe représentant le contenu d'un email."""
    def __init__(self, body_text=None, body_html=None, attachments=None):
        self.body_text = body_text
        self.body_html = body_html
        self.attachments = attachments
        
class EmailAttachment:
    """Classe représentant une pièce jointe d'email."""
    def __init__(self, filename=None, content_type=None, content=None, size=None, id=None):
        self.filename = filename
        self.content_type = content_type
        self.content = content
        self.size = size
        self.id = id
        
class EmailMetadata:
    """Classe représentant les métadonnées d'un email."""
    def __init__(self, doc_id=None, user=None, message_id=None, subject=None, sender=None, 
                 receiver=None, cc=None, bcc=None, date=None, folders=None, source=None,
                 content_type=None, has_attachments=False, parent_email_id=None):
        self.doc_id = doc_id
        self.user = user
        self.message_id = message_id
        self.subject = subject
        self.sender = sender
        self.receiver = receiver
        self.cc = cc
        self.bcc = bcc
        self.date = date
        self.folders = folders or []
        self.source = source
        self.content_type = content_type
        self.has_attachments = has_attachments
        self.parent_email_id = parent_email_id
        
class Email:
    """Classe représentant un email complet."""
    def __init__(self, metadata=None, content=None, attachments=None):
        self.metadata = metadata or EmailMetadata()
        self.content = content or EmailContent()
        self.attachments = attachments or []

# User document metadata
class DocumentMetadata(BaseDocumentMetadata):
    document_type: str = None
    relative_path: Optional[str] = None
    data_dir: Optional[str] = None
    file_hash: Optional[str] = None
    last_modified: Optional[str] = None