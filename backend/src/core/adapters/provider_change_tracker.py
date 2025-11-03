"""
Provider Change Tracker
======================
Utility module for tracking changes to provider data (documents, emails, etc.)
across all adapter classes.
"""

import os
import sys
from typing import Dict, Any, Optional, List
from datetime import datetime

# Add the project root to the path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.services.db.provider_changes import ProviderChange
from src.core.logger import log

# Setup logging
logger = log.bind(name="src.core.adapters.provider_change_tracker")

class ProviderChangeTracker:
    """
    Utility class for tracking changes to provider data across all adapter classes.
    This provides a consistent interface for logging changes to the provider_changes table.
    """
    
    @staticmethod
    def log_change(provider: str, user_id: str, change_type: str, 
                  item_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a change to the provider_changes table
        
        Args:
            provider: Provider name (gdrive, gmail, outlook, onedrive, etc.)
            user_id: User identifier
            change_type: Type of change (add, remove, modify, create)
            item_id: ID of the item that was modified/created
            details: Additional details about the change
        """
        try:
            # Create a record in the provider_changes table
            ProviderChange.log_change(
                provider=provider,
                user_id=user_id,
                change_type=change_type,
                item_id=item_id,
                details=details
            )
            logger.debug(f"Logged {change_type} change for {provider} item {item_id} by user {user_id}")
        except Exception as e:
            # Don't let logging failures affect the main process
            logger.error(f"Failed to log provider change: {str(e)}")
    
    @staticmethod
    def log_document_add(provider: str, user_id: str, doc_id: str, 
                        doc_name: str, path: str = "", 
                        extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a document addition
        
        Args:
            provider: Provider name (gdrive, onedrive, personal-storage)
            user_id: User identifier
            doc_id: Document ID
            doc_name: Document name
            path: Document path
            extra_details: Additional details about the document
        """
        details = {
            "name": doc_name,
            "path": path,
            "timestamp": datetime.now().isoformat()
        }
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type="add",
            item_id=doc_id,
            details=details
        )
    
    @staticmethod
    def log_document_modify(provider: str, user_id: str, doc_id: str, 
                           doc_name: str, path: str = "", 
                           extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a document modification
        
        Args:
            provider: Provider name (gdrive, onedrive, personal-storage)
            user_id: User identifier
            doc_id: Document ID
            doc_name: Document name
            path: Document path
            extra_details: Additional details about the document
        """
        details = {
            "name": doc_name,
            "path": path,
            "timestamp": datetime.now().isoformat()
        }
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type="modify",
            item_id=doc_id,
            details=details
        )
    
    @staticmethod
    def log_document_remove(provider: str, user_id: str, doc_id: str, 
                           doc_name: str = "", 
                           extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a document removal
        
        Args:
            provider: Provider name (gdrive, onedrive, personal-storage)
            user_id: User identifier
            doc_id: Document ID
            doc_name: Document name
            extra_details: Additional details about the document
        """
        details = {
            "name": doc_name,
            "timestamp": datetime.now().isoformat()
        }
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type="remove",
            item_id=doc_id,
            details=details
        )
    
    @staticmethod
    def log_email_add(provider: str, user_id: str, email_id: str, 
                     subject: str, sender: str = "", 
                     extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an email addition
        
        Args:
            provider: Provider name (gmail, outlook)
            user_id: User identifier
            email_id: Email ID
            subject: Email subject
            sender: Email sender
            extra_details: Additional details about the email
        """
        details = {
            "subject": subject,
            "sender": sender,
            "timestamp": datetime.now().isoformat()
        }
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type="add",
            item_id=email_id,
            details=details
        )
    
    @staticmethod
    def log_calendar_event_add(provider: str, user_id: str, event_id: str, 
                              title: str, start_time: str = "", 
                              extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a calendar event addition
        
        Args:
            provider: Provider name (google-calendar, outlook-calendar)
            user_id: User identifier
            event_id: Event ID
            title: Event title
            start_time: Event start time
            extra_details: Additional details about the event
        """
        details = {
            "title": title,
            "start_time": start_time,
            "timestamp": datetime.now().isoformat()
        }
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type="add",
            item_id=event_id,
            details=details
        )
    
    @staticmethod
    def log_batch_operation(provider: str, user_id: str, change_type: str,
                           item_count: int, operation_details: str,
                           items: Optional[List[Dict[str, Any]]] = None,
                           extra_details: Optional[Dict[str, Any]] = None) -> None:
        """
        Log a batch operation (multiple items affected)
        
        Args:
            provider: Provider name
            user_id: User identifier
            change_type: Type of change (add, remove, modify)
            item_count: Number of items affected
            operation_details: Description of the operation
            items: List of affected items (limited to avoid excessive data)
            extra_details: Additional details about the operation
        """
        details = {
            "item_count": item_count,
            "operation": operation_details,
            "timestamp": datetime.now().isoformat()
        }
        
        # Include a sample of affected items (limit to avoid excessive data)
        if items:
            # Limit to 10 items to avoid excessive data
            sample_items = items[:10]
            details["sample_items"] = sample_items
            
            if len(items) > 10:
                details["sample_note"] = f"Showing 10 of {len(items)} items"
        
        if extra_details:
            details.update(extra_details)
            
        ProviderChangeTracker.log_change(
            provider=provider,
            user_id=user_id,
            change_type=change_type,
            details=details
        )
