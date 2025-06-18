"""
Module defining models for Gmail email data structures.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field

@dataclass
class EmailAttachment:
    """Représente une pièce jointe d'un email."""
    content_id: Optional[str] = None
    filename: str = ""
    content: bytes = b""
    mime_type: str = "application/octet-stream"
    size: int = 0

@dataclass
class EmailContent:
    """Contenu d'un email avec les différents formats possibles."""
    body_text: str = ""
    body_html: str = ""
    attachments: List[EmailAttachment] = field(default_factory=list)

@dataclass
class EmailMetadata:
    """Métadonnées d'un email."""
    message_id: Optional[str] = None
    thread_id: Optional[str] = None
    gmail_id: Optional[str] = None
    gmail_labels: List[str] = field(default_factory=list)
    subject: str = ""
    sender: str = ""
    recipients: List[str] = field(default_factory=list)
    cc: List[str] = field(default_factory=list)
    bcc: List[str] = field(default_factory=list)
    date: str = ""
    timestamp: Optional[datetime] = None

@dataclass
class Email:
    """Représentation complète d'un email."""
    metadata: EmailMetadata
    content: EmailContent
    raw_data: Dict[str, Any] = field(default_factory=dict)
    doc_id: Optional[str] = None
