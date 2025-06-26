"""
Document Synchronization Manager
==============================
Central component responsible for orchestrating the synchronization process
for all document sources (email providers, cloud storage) and users.

Handles:
- User credit limits and document date thresholds for ingestion
- Provider-specific synchronization methods
- Error handling and retry logic
- Sync status reporting
"""
import os
import sys
# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))  
import traceback
import time
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from pathlib import Path
from datetime import datetime, timedelta
from functools import wraps


# Import user authentication and credential management
from backend.services.auth.credentials_manager import get_authenticated_users_by_provider

# Import document ingestion modules
from backend.services.ingestion.services.ingest_google_emails import batch_ingest_gmail_emails_to_qdrant
from backend.services.ingestion.services.ingest_microsoft_emails import ingest_outlook_emails_to_qdrant
from backend.services.ingestion.services.ingest_google_storage import batch_ingest_gdrive_documents
from backend.services.ingestion.services.ingest_personal_storage import batch_ingest_user_documents

# Import credits manager for ingestion limits
from backend.services.sync_service.core.credits_manager import UserCreditsManager

from backend.services.db.models import SyncStatus
# Import file registry for tracking document counts
from backend.services.storage.file_registry import FileRegistry

from backend.core.logger import log
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
# Setup logging
logger = log.bind(name="backend.services.sync_service.core.sync_manager")


def retry(max_retries=3, delay=2):
    """Decorator for retrying failed operations with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay in seconds between retries (will be doubled each retry)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempts = 0
            current_delay = delay
            
            while attempts < max_retries + 1:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempts += 1
                    if attempts > max_retries:
                        logger.error(f"Maximum retries ({max_retries}) exceeded for {func.__name__}")
                        raise
                    
                    logger.warning(f"Attempt {attempts} failed for {func.__name__}: {str(e)}. "
                                  f"Retrying in {current_delay}s...")
                    time.sleep(current_delay)
                    current_delay *= 2  # Exponential backoff
        return wrapper
    return decorator

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
        import os
        import glob
        
        users = {}
        
        # Direct implementation of user discovery
        for provider_name in ['gmail', 'outlook', 'gdrive', 'personal-storage']:
                
            try:
                # Determine base path and pattern based on provider
                if provider_name.lower() == 'gmail' or provider_name.lower() == 'gdrive':
                    token_dir = os.environ.get('GMAIL_TOKEN_PATH', 'data/auth/google_user_token/user_id.pickle')
                    base_path = os.path.join(BASE_DIR, token_dir.replace("user_id.pickle", ""))
                    pattern = '*.pickle'
                elif provider_name.lower() == 'outlook':
                    token_dir = os.environ.get('OUTLOOK_TOKEN_PATH', 'data/auth/microsoft_user_token/user_id.json')
                    base_path = os.path.join(BASE_DIR, token_dir.replace("user_id.json", ""))
                    pattern = '*.json'
                elif provider_name.lower() == 'personal-storage':
                    data_dir = os.environ.get('STORAGE_PATH', 'data/storage/user_user_id/')
                    base_path = os.path.join(BASE_DIR, data_dir.replace("user_user_id/", ""))
                    pattern = 'user_*'
                else:
                    logger.warning(f"Provider non supporté: {provider_name}")
                    continue
                
                # Check if directory exists
                if not os.path.exists(base_path):
                    logger.warning(f"Répertoire des tokens non trouvé: {base_path}")
                    continue
                
                # Find token files
                search_pattern = os.path.join(base_path, pattern)
                logger.debug(f"Searching for {provider_name} tokens with pattern: {search_pattern}")
                token_files = glob.glob(search_pattern)
                
                # Extract user IDs from filenames
                for token_file in token_files:
                    if provider_name.lower() == 'personal-storage':
                        # For personal storage, directory name is user_USERID
                        dir_name = os.path.basename(token_file)
                        if dir_name.startswith('user_'):
                            user_id = dir_name[5:] # Remove 'user_' prefix
                        else:
                            continue
                    else:
                        # For other providers, extract from filename
                        user_id = os.path.splitext(os.path.basename(token_file))[0]
                    
                    # Add to users dict
                    if user_id not in users:
                        users[user_id] = []
                    users[user_id].append(provider_name)
                    logger.debug(f"Found {provider_name.capitalize()} credentials for user {user_id}")
                    
            except Exception as e:
                logger.error(f"Error retrieving {provider_name} users: {e}", exc_info=True)
        
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
                logger.info(f"Synchronizing {provider_name} for user {user_id}")
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
        
        try:
            limit=100#self.credits_manager.get_limit(user_id)
            # Create sync status record
            syncstatus = SyncStatus(user_id=user_id, source_type=provider_name, total_documents=limit)
            syncstatus.upsert_status(status="in_progress", progress=0.0)
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
                    logger.info(f"Syncing Gmail for user {user_id}")
                    self._sync_gmail(user_id=user_id, query=query, date_threshold=date_threshold, syncstatus=syncstatus)
                elif provider_name == 'outlook':
                    logger.info(f"Syncing Outlook for user {user_id}")
                    self._sync_outlook(user_id=user_id, query=query, date_threshold=date_threshold, syncstatus=syncstatus)
                elif provider_name == 'gdrive':
                    logger.info(f"Syncing Google Drive for user {user_id}")
                    self._sync_gdrive(user_id=user_id, query=query, syncstatus=syncstatus)
                elif provider_name == 'personal-storage':
                    logger.info(f"Syncing Personal Storage for user {user_id}")
                    self._sync_personal_storage(user_id=user_id, syncstatus=syncstatus)
                else:
                    logger.warning(f"Unknown provider: {provider_name}")
            
                # After sync is complete, get new document count from file registry
                registry = FileRegistry(user_id)  # Reload registry to see changes
                final_docs = registry.count_user_documents()
                # Deduct credits based on actual new documents added to the registry
                syncstatus.update_status(status="completed", progress=1.0)
                if final_docs > 0:
                    self.credits_manager.use_credits(user_id, final_docs)
                # Update sync status
                
            except Exception as e:
                logger.error(f"Error synchronizing {provider_name} for user {user_id}: {e}", exc_info=True)
                syncstatus.update_status(status="failed")
        except Exception as e:
            logger.error(f"Error synchronizing {provider_name} for user {user_id}: {e}", exc_info=True)
            SyncStatus.create(user_id=user_id, source_type=provider_name, status="error")
        
    def _sync_gmail(self, user_id: str, query: str = None, date_threshold: Optional[datetime] = None, syncstatus: SyncStatus = None) -> int:
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
            batch_ingest_gmail_emails_to_qdrant(
                user_id=user_id,
                query=query,
                labels=labels,  # Gmail uses 'labels' instead of 'folders'
                limit=2,
                force_reingest=force_reingest,
                min_date=date_threshold,  # Pass the date threshold to the ingest function
                return_count=True,  # Request count of processed emails
                syncstatus=syncstatus
            )
            
            logger.info(f"Gmail sync completed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Gmail sync error for {user_id}: {e}")
    
    def _sync_outlook(self, user_id: str, query: str = None, date_threshold: Optional[datetime] = None, syncstatus: SyncStatus = None) -> int:
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
                limit=limit,
                save_attachments=save_attachments,
                force_reingest=force_reingest,
                min_date=date_threshold,
                return_count=True,
                syncstatus=syncstatus
            )
            logger.info(f"Outlook sync completed for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to sync Outlook for user {user_id}: {e}", exc_info=True)

    def _sync_personal_storage(self, user_id: str, syncstatus: SyncStatus = None) -> int:
            """Synchronize personal storage for a specific user.
            
            Args:
                user_id: User identifier
            
            Returns:
                Number of processed documents (for credit tracking)
            """
            try:
                # Default parameters for Outlook sync
                limit = self.config.get('sync', {}).get('outlook', {}).get('limit_per_folder', 50)
                
                force_reingest = self.config.get('sync', {}).get('outlook', {}).get('force_reingest', False)

                storage_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'data', 'storage'))
    
                # User-specific directory
                user_dir = os.path.join(storage_path, "user_" + user_id)
                
                # Call the personal ingestion function with the user_id, limit and force_reingest
                batch_ingest_user_documents(
                    user_id=user_id,
                    storage_path=user_dir,
                    limit=limit,
                    force_reingest=force_reingest,
                    syncstatus=syncstatus
                )
                logger.info(f"Personal storage sync completed for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to sync personal storage for user {user_id}: {e}", exc_info=True)

    def _sync_gdrive(self, user_id: str, query: str = None, folder_id: str = None, 
                        limit: int = 100, force_reingest: bool = False, syncstatus: SyncStatus = None) -> Dict[str, Any]:
        """Synchronize Google Drive documents for a specific user.
            
        Args:
            user_id: User identifier
            query: Google Drive search query
            folder_id: ID of folder to sync (optional)
            limit: Maximum number of files to sync
            force_reingest: Whether to force re-ingestion of existing files
            
        Returns:
            Dict with sync results including counts and errors
        """
        try:
            # Get provider-specific config
            provider_config = self.config.get('sync', {}).get('gdrive', {})
            batch_size = provider_config.get('batch_size', 10)
            skip_duplicate_check = provider_config.get('skip_duplicate_check', False)
            verbose = provider_config.get('verbose', False)
                
            # Call the Google Drive ingestion function
            result = batch_ingest_gdrive_documents(
                query=query,
                limit=limit,
                folder_id=folder_id,
                force_reingest=force_reingest,
                verbose=verbose,
                user_id=user_id,
                batch_size=batch_size,
                syncstatus=syncstatus
            )
            
            # Safely access result dictionary keys
            files_ingested = result.get('items_ingested', 0)
            files_skipped = result.get('items_skipped', 0)
                
            logger.info(f"Google Drive sync completed for user {user_id}: "
                        f"{files_ingested} ingested, {files_skipped} skipped")
                
            return result
                
        except Exception as e:
            error_msg = f"Google Drive sync error for {user_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "files_ingested": 0,
                "files_skipped": 0,
                "errors": [error_msg]
            }
