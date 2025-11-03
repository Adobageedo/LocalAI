"""
Credits Manager for Document Ingestion Limits
This module provides a class to manage user credits and limits for document ingestion.
It includes fallback to default values in case of database errors.
"""

import sys
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))  

# Import PostgresManager if available
try:
    from backend.services.db.postgres_manager import PostgresManager
except ImportError:
    PostgresManager = None

from backend.core.logger import log

logger = log.bind(name="backend.services.sync_service.core.credits_manager")

# Default values used when database is not available
from backend.core.constants import (
    DEFAULT_TOTAL_CREDITS,
    DEFAULT_USED_CREDITS,
    DEFAULT_MAX_DOCUMENT_AGE_DAYS
)


class UserCreditsManager:
    """
    Manages user ingestion credits and limits.
    
    Provides fallback to default values in case of database errors
    to ensure the sync service can continue operating even with DB issues.
    """
    
    def __init__(self):
        """Initialize the credits manager with optional database connection."""
        self.db = PostgresManager() if PostgresManager else None
            
        if not self.db:
            logger.warning("PostgresManager not available. Using in-memory defaults for all users.")
            # In-memory cache of credit usage when DB not available
            self._memory_credits = {}
    
    def get_user_limits(self, user_id: str) -> Dict[str, Any]:
        """
        Get a user's ingestion limits and credits.
        Falls back to default values if database access fails.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with user limits and credits
        """
        # If database not available, use in-memory defaults
        if not self.db:
            return self._get_default_limits(user_id)
        
        try:
            query = """
                SELECT 
                    user_id, total_credits, used_credits, 
                    max_document_age_days, updated_at
                FROM user_ingestion_limits 
                WHERE user_id = %s
            """
            
            result = self.db.execute_query(query, (user_id,), fetch_one=True)
            
            if not result:
                # Try to create default limits
                try:
                    self._create_default_limits(user_id)
                    # Query again after creating defaults
                    result = self.db.execute_query(query, (user_id,), fetch_one=True)
                except Exception as e:
                    logger.error(f"Error creating default limits for {user_id}: {e}")
                    return self._get_default_limits(user_id)
                
                if not result:
                    return self._get_default_limits(user_id)
            
            return result
        except Exception as e:
            logger.error(f"Database error retrieving limits for user {user_id}: {e}")
            return self._get_default_limits(user_id)
    
    def _get_default_limits(self, user_id: str) -> Dict[str, Any]:
        """Get default limits when database is unavailable."""
        # Use in-memory cache if we have it
        if not self.db and user_id in self._memory_credits:
            return self._memory_credits[user_id]
        
        # Otherwise return system defaults
        default_limits = {
            "user_id": user_id,
            "total_credits": DEFAULT_TOTAL_CREDITS,
            "used_credits": DEFAULT_USED_CREDITS,
            "max_document_age_days": DEFAULT_MAX_DOCUMENT_AGE_DAYS,
            "updated_at": datetime.now()
        }
        
        # Store in memory if no DB
        if not self.db:
            self._memory_credits[user_id] = default_limits
            
        return default_limits
    
    def _create_default_limits(self, user_id: str) -> None:
        """Create default limits for a new user."""
        if not self.db:
            self._memory_credits[user_id] = self._get_default_limits(user_id)
            return
            
        query = """
            INSERT INTO user_ingestion_limits 
            (user_id, total_credits, used_credits, max_document_age_days)
            VALUES (%s, %s, %s, %s)
        """
        
        self.db.execute_query(
            query, 
            (user_id, DEFAULT_TOTAL_CREDITS, DEFAULT_USED_CREDITS, DEFAULT_MAX_DOCUMENT_AGE_DAYS)
        )
        logger.info(f"Created default ingestion limits for user {user_id}")
    
    def has_available_credits(self, user_id: str) -> bool:
        """
        Check if the user has credits available for ingestion.
        Returns True as a fallback if database is unavailable.
        
        Args:
            user_id: User identifier
            
        Returns:
            Boolean indicating if user has available credits
        """
        limits = self.get_user_limits(user_id)
        return limits["used_credits"] < limits["total_credits"]
    
    def get_date_threshold(self, user_id: str) -> datetime:
        """
        Get the oldest date allowed for document ingestion.
        
        Args:
            user_id: User identifier
            
        Returns:
            Datetime representing the oldest allowed document date
        """
        limits = self.get_user_limits(user_id)
        days = limits.get("max_document_age_days", DEFAULT_MAX_DOCUMENT_AGE_DAYS)
        return datetime.now() - timedelta(days=days)
    
    def use_credits(self, user_id: str, count: int = 1) -> bool:
        """
        Use a specified number of credits for document ingestion.
        If count exceeds available credits, will use all remaining credits.
        Updates in-memory tracking if database is unavailable.
        
        Args:
            user_id: User identifier
            count: Number of credits to use
            
        Returns:
            Boolean indicating if credits were successfully used
        """
        if count <= 0:
            return True
            
        # Handle in-memory case when DB not available
        if not self.db:
            # Get existing or create new
            if user_id not in self._memory_credits:
                self._memory_credits[user_id] = self._get_default_limits(user_id)
                
            limits = self._memory_credits[user_id]
            # Calculate actual credits to use (don't go below 0)
            available = limits["total_credits"] - limits["used_credits"]
            actual_count = min(available, count)
            
            if actual_count > 0:
                self._memory_credits[user_id]["used_credits"] += actual_count
                remaining = limits["total_credits"] - self._memory_credits[user_id]["used_credits"]
                logger.info(f"User {user_id} used {actual_count} credits (memory mode). Remaining: {remaining}")
                return True
            else:
                logger.warning(f"User {user_id} has no credits left (memory mode): {limits['used_credits']}/{limits['total_credits']}")
                return False
                
        # Database available - try to update
        try:
            query = """
                UPDATE user_ingestion_limits
                SET used_credits = LEAST(total_credits, used_credits + %s), 
                    updated_at = NOW()
                WHERE user_id = %s 
                RETURNING used_credits, total_credits
            """
            
            result = self.db.execute_query(query, (count, user_id), fetch_one=True)
            
            if result:
                used = result['used_credits']
                total = result['total_credits']
                consumed = min(count, total - (used - count))  # Calculate how many credits were actually consumed
                logger.info(f"User {user_id} used {consumed} credits. Remaining: {total - used}")
                return True
            else:
                # This should rarely happen - mostly when the user doesn't exist in the database
                logger.warning(f"User {user_id} not found in database when attempting to use credits")
                return False
                
        except Exception as e:
            logger.error(f"Database error when using credits for {user_id}: {e}")
            # Fall back to in-memory tracking
            if not hasattr(self, '_memory_credits'):
                self._memory_credits = {}
                
            # Create default if needed
            if user_id not in self._memory_credits:
                self._memory_credits[user_id] = self._get_default_limits(user_id)
                
            # Try to use credits from memory with the same partial credit logic
            limits = self._memory_credits[user_id]
            available = limits["total_credits"] - limits["used_credits"]
            actual_count = min(available, count)
            
            if actual_count > 0:
                self._memory_credits[user_id]["used_credits"] += actual_count
                remaining = limits["total_credits"] - self._memory_credits[user_id]["used_credits"]
                logger.info(f"User {user_id} used {actual_count} credits (fallback mode). Remaining: {remaining}")
                return True
            else:
                logger.warning(f"User {user_id} has no credits left (fallback mode): {limits['used_credits']}/{limits['total_credits']}")
                return False
            
    def reset_monthly_credits(self) -> int:
        """
        Reset all users' used_credits to 0. Typically run monthly.
        Also resets in-memory credits if database is unavailable.
        
        Returns:
            Number of users whose credits were reset
        """
        if not self.db:
            count = len(self._memory_credits)
            for user_id in self._memory_credits:
                self._memory_credits[user_id]["used_credits"] = 0
                self._memory_credits[user_id]["updated_at"] = datetime.now()
            logger.info(f"Reset credits for {count} users (memory mode)")
            return count
            
        try:
            query = """
                UPDATE user_ingestion_limits
                SET used_credits = 0, updated_at = NOW()
                RETURNING user_id
            """
            
            results = self.db.execute_query(query)
            count = len(results) if results else 0
            
            logger.info(f"Reset credits for {count} users")
            return count
        except Exception as e:
            logger.error(f"Database error when resetting credits: {e}")
            
            # Fall back to resetting in-memory credits
            if hasattr(self, '_memory_credits'):
                count = len(self._memory_credits)
                for user_id in self._memory_credits:
                    self._memory_credits[user_id]["used_credits"] = 0
                logger.info(f"Reset credits for {count} users (fallback mode)")
                return count
            return 0
