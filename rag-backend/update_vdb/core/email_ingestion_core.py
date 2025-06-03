"""
Shared logic for email ingestion (Gmail, Outlook, IMAP, etc).
Handles:
- Email normalization and parsing
- Attachment extraction
- Metadata construction for Qdrant
- Common error handling
"""
import os
from typing import Dict, Any, List
from email.utils import parseaddr


def normalize_email_address(address: str) -> str:
    """Return the normalized email address (lowercase, stripped)."""
    return parseaddr(address)[1].strip().lower()


def extract_attachments(email_message) -> List[Dict[str, Any]]:
    """Extract attachments from an email.message.Message object."""
    attachments = []
    for part in email_message.walk():
        if part.get_content_disposition() == 'attachment':
            filename = part.get_filename()
            content = part.get_payload(decode=True)
            attachments.append({
                'filename': filename,
                'content': content,
                'content_type': part.get_content_type()
            })
    return attachments


def build_email_metadata(email_obj, user_id: str, source: str) -> Dict[str, Any]:
    """Build standardized metadata for an ingested email."""
    meta = {
        'user_id': user_id,
        'source': source,
        'subject': getattr(email_obj, 'subject', None),
        'from': getattr(email_obj, 'from_', None),
        'to': getattr(email_obj, 'to', None),
        'cc': getattr(email_obj, 'cc', None),
        'date': getattr(email_obj, 'date', None),
        'message_id': getattr(email_obj, 'message_id', None),
        # Add more fields as needed
    }
    return meta
