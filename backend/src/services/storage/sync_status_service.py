"""
Service for managing sync status operations according to the new refactored schema.
"""

import logging
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class SyncStatusService:
    """
    Service for handling sync status operations with the refactored schema
    using progress-based tracking.
    """
    
    def __init__(self):
        """Initialize the SyncStatus service."""
        from ...core.database import get_session, SyncStatus
        self.session = get_session()
        self.SyncStatus = SyncStatus
    
    def get_status(self, user_id: str, source_type: str) -> Optional[Dict[str, Any]]:
        """
        Get the current sync status for a user and source type.
        
        Args:
            user_id: User ID
            source_type: Source type (e.g. "gmail", "nextcloud")
            
        Returns:
            Dictionary with sync status or None if not found
        """
        try:
            status = self.SyncStatus.get_by_user_source(self.session, user_id, source_type)
            if status:
                return status.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting sync status: {e}")
            return None
    
    def get_all_statuses(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all sync statuses for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of sync status dictionaries
        """
        try:
            statuses = self.SyncStatus.get_by_user_id(self.session, user_id)
            return [status.to_dict() for status in statuses]
        except Exception as e:
            logger.error(f"Error getting sync statuses: {e}")
            return []
    
    def start_sync(self, user_id: str, source_type: str) -> bool:
        """
        Start a sync operation.
        
        Args:
            user_id: User ID
            source_type: Source type
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create a new sync status or update existing one
            status = self.SyncStatus.start_sync(self.session, user_id, source_type)
            return True
        except Exception as e:
            logger.error(f"Error starting sync: {e}")
            return False
    
    def update_progress(self, user_id: str, source_type: str, progress: float) -> bool:
        """
        Update the progress of a sync operation.
        
        Args:
            user_id: User ID
            source_type: Source type
            progress: Progress value between 0.0 and 1.0
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure progress is between 0 and 1
            progress = max(0.0, min(1.0, progress))
            
            # Update the progress
            status = self.SyncStatus.update_progress(self.session, user_id, source_type, progress)
            return True
        except Exception as e:
            logger.error(f"Error updating sync progress: {e}")
            return False
    
    def complete_sync(self, user_id: str, source_type: str) -> bool:
        """
        Mark a sync operation as complete.
        
        Args:
            user_id: User ID
            source_type: Source type
            
        Returns:
            True if successful, False otherwise
        """
        try:
            status = self.SyncStatus.complete_sync(self.session, user_id, source_type)
            return True
        except Exception as e:
            logger.error(f"Error completing sync: {e}")
            return False
    
    def fail_sync(self, user_id: str, source_type: str, error_details: str) -> bool:
        """
        Mark a sync operation as failed.
        
        Args:
            user_id: User ID
            source_type: Source type
            error_details: Details about the error
            
        Returns:
            True if successful, False otherwise
        """
        try:
            status = self.SyncStatus.fail_sync(self.session, user_id, source_type, error_details)
            return True
        except Exception as e:
            logger.error(f"Error marking sync as failed: {e}")
            return False
