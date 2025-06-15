"""
Email Synchronization Manager
============================
Central component responsible for orchestrating the synchronization process
for all email providers and users.

Handles user credit limits and document date thresholds for ingestion.
"""
import os
import json
import sys
from typing import Dict, List, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))  

# Import user authentication and credential management
from auth.credentials_manager import get_authenticated_users_by_provider

# Import the email ingestion modules
from update_vdb.sources.ingest_gmail_emails import ingest_gmail_emails_to_qdrant
from update_vdb.sources.ingest_outlook_emails import ingest_outlook_emails_to_qdrant

# Import credits manager for ingestion limits
from sync_service.core.credits_manager import UserCreditsManager

# Import file registry for tracking document counts
from update_vdb.sources.file_registry import FileRegistry

from sync_service.utils.logger import setup_logger

# Setup logging
logger = setup_logger('sync_service.sync_manager')

class SyncManager:
    """
    Manages the synchronization process for all email providers and users.
    
    This class is responsible for:
    - Finding all authenticated users
    - Determining which email providers each user has configured
    - Initiating synchronization for each user+provider combination
    - Handling errors and maintaining synchronization state
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the sync manager.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Initialize credits manager for user ingestion limits
        self.credits_manager = UserCreditsManager()
        
    def get_authenticated_users(self) -> Dict[str, List[str]]:
        """
        Find all authenticated users and their configured providers.
        
        Returns:
            Dict mapping user IDs to lists of provider names
        """
        users = {}
        
        # Utiliser la fonction de credentials_manager pour obtenir les utilisateurs Gmail
        try:
            gmail_users = get_authenticated_users_by_provider('gmail')
            for user_id in gmail_users:
                if user_id not in users:
                    users[user_id] = []
                users[user_id].append('gmail')
                logger.debug(f"Found Gmail credentials for user {user_id}")
        except Exception as e:
            logger.error(f"Error retrieving Gmail users: {e}")
        
        # Utiliser la fonction de credentials_manager pour obtenir les utilisateurs Outlook
        try:
            outlook_users = get_authenticated_users_by_provider('outlook')
            for user_id in outlook_users:
                if user_id not in users:
                    users[user_id] = []
                users[user_id].append('outlook')
                logger.debug(f"Found Outlook credentials for user {user_id}")
        except Exception as e:
            logger.error(f"Error retrieving Outlook users: {e}")
        
        return users
    
    def sync_all_users(self):
        """Synchronize emails for all authenticated users."""
        
        # Get all authenticated users
        users = self.get_authenticated_users()
        if not users:
            logger.info("No authenticated users found")
            return
        
        total_users = len(users)
        logger.info(f"Found {total_users} authenticated users")
        
        # Synchronize each user's emails
        for user_id, providers in users.items():
            for provider_name in providers:
                self.sync_provider(user_id, provider_name)
    
    def sync_provider(self, user_id: str, provider_name: str):
        """Synchronize emails for a specific user and provider."""
        
        # Skip disabled providers
        provider_config = self.config.get('sync', {}).get(provider_name, {})
        if not provider_config.get('enabled', True):
            logger.info(f"Provider {provider_name} is disabled in config")
            return
        
        # Check if user has available credits
        if not self.credits_manager.has_available_credits(user_id):
            logger.warning(f"User {user_id} has no available credits for {provider_name} synchronization")
            return
            
        # Get date threshold for filtering old documents
        date_threshold = self.credits_manager.get_date_threshold(user_id)
        logger.info(f"Using date threshold for {user_id}: {date_threshold.isoformat()[:10]} ({date_threshold.strftime('%Y-%m-%d')})")
            
        # Get query from config
        query = provider_config.get('query', '')
        if not query and provider_name == 'gmail':
            query = None  # Default value for Gmail
        elif not query and provider_name == 'outlook':
            query = None  # Default value for Outlook
        
        try:
            # Execute provider-specific synchronization
            if provider_name == 'gmail':
                self._sync_gmail(user_id, query, date_threshold)
            elif provider_name == 'outlook':
                self._sync_outlook(user_id, query, date_threshold)
            else:
                logger.warning(f"Unknown provider: {provider_name}")
            
            # After sync is complete, get new document count from file registry
            registry = FileRegistry(user_id)  # Reload registry to see changes
            final_docs = registry.count_user_documents()
            # Deduct credits based on actual new documents added to the registry
            if final_docs > 0:
                self.credits_manager.use_credits(user_id, final_docs)
                logger.info(f"User {user_id} used {final_docs} credits for {provider_name} sync")
        
        except Exception as e:
            logger.error(f"Error synchronizing {provider_name} for user {user_id}: {e}", exc_info=True)
    
    def _sync_gmail(self, user_id: str, query: str = None, date_threshold: Optional[datetime] = None) -> int:
        """Synchronize Gmail emails for a specific user.
        
        Args:
            user_id: User identifier
            query: Gmail search query
            date_threshold: Oldest allowable date for emails
        
        Returns:
            Number of processed emails (for credit tracking)
        """
        try:
            # Default parameters for Gmail sync
            labels = self.config.get('sync', {}).get('gmail', {}).get('folders', ["INBOX", "SENT"])
            limit = self.config.get('sync', {}).get('gmail', {}).get('limit_per_folder', 2)
            
            # Add date threshold to query if specified
            if date_threshold:
                date_str = date_threshold.strftime("%Y/%m/%d")
                after_query = f"after:{date_str}"
                if query:
                    query = f"{query} {after_query}"
                else:
                    query = after_query
                logger.info(f"Added date filter to Gmail query: {after_query}")
            
            force_reingest = self.config.get('sync', {}).get('gmail', {}).get('force_reingest', False)
            
            # Call the Gmail ingestion function with the user_id, query and file registry
            ingest_gmail_emails_to_qdrant(
                user_id=user_id,
                query=query,
                labels=labels,  # Gmail uses 'labels' instead of 'folders'
                limit=2000,
                force_reingest=force_reingest,
                min_date=date_threshold,  # Pass the date threshold to the ingest function
                return_count=True  # Request count of processed emails
            )
            
            logger.info(f"Gmail sync completed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Gmail sync error for {user_id}: {e}")
    
    def _sync_outlook(self, user_id: str, query: str = None, date_threshold: Optional[datetime] = None) -> int:
        """Synchronize Outlook emails for a specific user.
        
        Args:
            user_id: User identifier
            query: Outlook search filter
            date_threshold: Oldest allowable date for emails
        
        Returns:
            Number of processed emails (for credit tracking)
        """
        try:
            # Default parameters for Outlook sync
            folders = self.config.get('sync', {}).get('outlook', {}).get('folders', ["inbox", "sentitems"])
            limit = self.config.get('sync', {}).get('outlook', {}).get('limit_per_folder', 50)
            
            # Format date for Outlook filtering if needed
            # Format the date correctly for Microsoft Graph API
            if date_threshold:
                # Format without microseconds, with Z suffix for UTC
                formatted_date = date_threshold.strftime('%Y-%m-%dT%H:%M:%SZ')
                date_filter = f"receivedDateTime ge {formatted_date}"
                if query:
                    query = f"{query} and {date_filter}"
                else:
                    query = date_filter
                logger.info(f"Added date filter to Outlook query: {date_filter}")
            
            force_reingest = self.config.get('sync', {}).get('outlook', {}).get('force_reingest', False)
            save_attachments = self.config.get('sync', {}).get('outlook', {}).get('save_attachments', True)
            
            # Call the Outlook ingestion function with the user_id, query and file registry
            ingest_outlook_emails_to_qdrant(
                user_id=user_id,
                query=query,
                limit=200,
                save_attachments=save_attachments,
                force_reingest=force_reingest,
                min_date=date_threshold,
                return_count=True
            )
            logger.info(f"Outlook sync completed for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to sync Outlook for user {user_id}: {e}", exc_info=True)
