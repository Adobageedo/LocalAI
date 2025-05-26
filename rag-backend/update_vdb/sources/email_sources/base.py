"""
Base classes and utilities for email sources.
"""

import os
import tempfile
import logging
import datetime
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple

# Configure logging
logger = logging.getLogger("rag-backend.email_sources")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

@dataclass
class EmailMetadata:
    """Metadata for an email."""
    doc_id: str
    message_id: str
    subject: str
    sender: str
    receiver: str
    date: str
    user: str
    document_type: str = "email"
    cc: str = ""
    bcc: str = ""
    ingest_date: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    source: str = "unknown"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary."""
        return {k: v for k, v in self.__dict__.items()}
    
    def update(self, additional_metadata: Dict[str, Any]) -> None:
        """Update metadata with additional fields."""
        for key, value in additional_metadata.items():
            setattr(self, key, value)

@dataclass
class EmailAttachment:
    """Representation of an email attachment."""
    filename: str
    content: bytes
    content_type: str
    parent_email_id: str
    
    @property
    def clean_filename(self) -> str:
        """Get a clean version of the filename."""
        import re
        return re.sub(r'[^\w\-\.]', '_', self.filename)

@dataclass
class EmailContent:
    """Content of an email."""
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: List[EmailAttachment] = field(default_factory=list)

@dataclass
class Email:
    """Representation of an email."""
    metadata: EmailMetadata
    content: EmailContent
    raw_data: Optional[bytes] = None
    
    def save_to_temp_file(self) -> Tuple[str, str]:
        """
        Save the email to a temporary file.
        
        Returns:
            Tuple[str, str]: Path to the temporary file and the suffix used.
        """
        suffix = '.eml'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            if self.raw_data:
                tmp_file.write(self.raw_data)
            else:
                # If no raw data, create a simple text representation
                content = f"Subject: {self.metadata.subject}\n"
                content += f"From: {self.metadata.sender}\n"
                content += f"To: {self.metadata.receiver}\n"
                if self.metadata.cc:
                    content += f"Cc: {self.metadata.cc}\n"
                if self.metadata.bcc:
                    content += f"Bcc: {self.metadata.bcc}\n"
                content += f"Date: {self.metadata.date}\n"
                content += f"Message-ID: {self.metadata.message_id}\n\n"
                
                if self.content.body_text:
                    content += self.content.body_text
                elif self.content.body_html:
                    content += self.content.body_html
                
                tmp_file.write(content.encode('utf-8'))
            
            return tmp_file.name, suffix

@dataclass
class EmailFetchResult:
    """Result of fetching emails from a source."""
    success: bool = True
    emails_processed: int = 0
    attachments_processed: int = 0
    errors: List[str] = field(default_factory=list)
    error: Optional[str] = None
    traceback: Optional[str] = None

class EmailSource(ABC):
    """Base class for email sources."""
    
    def __init__(self, collection_name: str, user: str, limit: int = 10,
                 save_attachments: bool = True, save_email_body: bool = True,
                 delete_after_import: bool = False, additional_metadata: Optional[Dict[str, Any]] = None):
        """
        Initialize the email source.
        
        Args:
            collection_name: Name of the collection to store emails in.
            user: User identifier for metadata.
            limit: Maximum number of emails to fetch.
            save_attachments: Whether to save email attachments.
            save_email_body: Whether to save email body.
            delete_after_import: Whether to delete emails after import.
            additional_metadata: Additional metadata to include with each document.
        """
        self.collection_name = collection_name
        self.user = user
        self.limit = limit
        self.save_attachments = save_attachments
        self.save_email_body = save_email_body
        self.delete_after_import = delete_after_import
        self.additional_metadata = additional_metadata or {}
        self.source_name = self.__class__.__name__.replace('EmailSource', '').lower()
        
        self.logger = logging.getLogger(f"rag-backend.email_sources.{self.source_name}")
    
    @staticmethod
    def compute_doc_id(msg_id: str, extra: Optional[str] = None) -> str:
        """Generate a unique document ID based on the message ID."""
        base = msg_id if extra is None else f"{msg_id}:{extra}"
        return hashlib.sha256(base.encode()).hexdigest()
    
    @abstractmethod
    def fetch_emails(self, **kwargs) -> EmailFetchResult:
        """
        Fetch emails from the source.
        
        Args:
            **kwargs: Additional arguments specific to the email source.
            
        Returns:
            EmailFetchResult: Result of the fetch operation.
        """
        pass
    
    def clean_header(self, header_value: Optional[str]) -> str:
        """Clean and decode email headers."""
        if header_value is None:
            return ""
        
        from email.header import decode_header
        
        if isinstance(header_value, bytes):
            header_value = header_value.decode(errors="ignore")
        
        dh = decode_header(header_value)
        return ''.join([
            (t.decode(enc or 'utf-8') if isinstance(t, bytes) else t)
            for t, enc in dh
        ])
    
    def parse_date(self, date_str: Optional[str]) -> Optional[str]:
        """Parse date string to ISO format."""
        if not date_str:
            return None
        
        try:
            from email.utils import parsedate_to_datetime
            date = parsedate_to_datetime(date_str)
            if date:
                return date.isoformat()
        except Exception as e:
            self.logger.warning(f"Could not parse date '{date_str}': {e}")
        
        return date_str
