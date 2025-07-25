"""
Email sources package for RAG backend.
This package contains modules for different email sources (IMAP, Gmail, Outlook).
"""

from .base import EmailSource, EmailFetchResult
from .imap_source import ImapEmailSource
from .outlook_source import OutlookEmailSource

__all__ = [
    'EmailSource',
    'EmailFetchResult',
    'ImapEmailSource',
    'OutlookEmailSource'
]
