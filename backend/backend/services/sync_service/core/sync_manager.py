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
from backend.services.ingestion.services.ingest_onedrive import batch_ingest_onedrive_documents

# Import credits manager for ingestion limits
from backend.services.sync_service.core.credits_manager import UserCreditsManager

from backend.services.db.models import SyncStatus
# Import file registry for tracking document counts
from backend.services.storage.file_registry import FileRegistry

# Import email processor for classification after sync
from backend.services.email.email_processor import EmailProcessor, EmailProvider

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
        try:
            # Get date threshold for this user based on credits
            date_threshold = datetime.now() - timedelta(days=2)
            
            # Create a sync status record
            syncstatus = SyncStatus(user_id=user_id, source_type=provider_name, total_documents=50)
            syncstatus.upsert_status(status="in_progress", progress=0.0)
            
            # Determine which sync method to call based on provider
            if provider_name == "gmail":
                # Get Gmail-specific config
                gmail_config = self.config.get('sync', {}).get('gmail', {})
                query = gmail_config.get('query')
                
                # Sync Gmail emails
                self._sync_gmail(user_id, query, date_threshold, syncstatus)
                
                # Process and classify emails after sync
                self._process_emails_after_sync(user_id, "gmail", syncstatus)
                
            elif provider_name == "outlook":
                # Get Outlook-specific config
                outlook_config = self.config.get('sync', {}).get('outlook', {})
                query = outlook_config.get('query')
                
                # Sync Outlook emails
                self._sync_outlook(user_id, query, date_threshold, syncstatus)
                
                # Process and classify emails after sync
                self._process_emails_after_sync(user_id, "outlook", syncstatus)
                
            elif provider_name == "personal_storage":
                self._sync_personal_storage(user_id, syncstatus=syncstatus)
            elif provider_name == "gdrive":
                self._sync_gdrive(user_id, syncstatus=syncstatus)
            elif provider_name == "onedrive":
                self._sync_onedrive(user_id, syncstatus=syncstatus)
            else:
                logger.warning(f"Unknown provider: {provider_name}")
                return
                
            # Process emails after sync (for email providers)
            if provider_name in ["gmail", "outlook"]:
                self._process_emails_after_sync(user_id, provider_name, syncstatus)
                
            # Update sync status
            syncstatus.status = "completed"
            
            logger.info(f"Sync completed for {user_id} with provider {provider_name}")
            
        except Exception as e:
            logger.error(f"Error syncing {provider_name} for user {user_id}: {str(e)}", exc_info=True)
            # Mark sync as failed
            if 'syncstatus' in locals():
                syncstatus.upsert_status(status="failed", progress=1.0)
            logger.error(traceback.format_exc())

    
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
            limit = self.config.get('sync', {}).get('gmail', {}).get('limit_per_folder', 30)
            
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
                limit=limit,
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
                folders=folders,
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
                        syncstatus: SyncStatus = None) -> Dict[str, Any]:
        """Synchronize Google Drive documents for a specific user.
        
        Args:
            user_id: User identifier
            query: Google Drive search query
            folder_id: ID of folder to sync (optional)
            limit: Maximum number of files to sync
            force_reingest: Whether to force reingestion of all documents
            syncstatus: Optional SyncStatus object for tracking
        """
        try:
            # Get provider-specific config
            provider_config = self.config.get('sync', {}).get('gdrive', {})
            limit = provider_config.get('limit', 50)
            batch_size = provider_config.get('batch_size', 10)
            force_reingest = provider_config.get('force_reingest', force_reingest)
            verbose = provider_config.get('verbose', False)
            days_filter = provider_config.get('days_filter', 2)  # Default to 2 days
                
            # Call the Google Drive ingestion function
            result = batch_ingest_gdrive_documents(
                query=query,
                limit=limit,
                folder_id=folder_id,
                force_reingest=force_reingest,
                verbose=verbose,
                user_id=user_id,
                batch_size=batch_size,
                syncstatus=syncstatus,
                days_filter=days_filter
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

    def _sync_onedrive(self, user_id: str, query: str = None, folder_id: str = None,
                         limit: int = 10, force_reingest: bool = False, syncstatus: SyncStatus = None) -> Dict[str, Any]:
        """Synchronize OneDrive documents for a specific user.
        
        Args:
            user_id: User identifier
            query: OneDrive search query
            folder_id: ID of folder to sync (optional)
            limit: Maximum number of files to sync
            force_reingest: Whether to force reingestion of all documents
            syncstatus: Optional SyncStatus object for tracking
        """
        try:
            # Get OneDrive sync configuration
            provider_config = self.config.get('sync', {}).get('onedrive', {})
            limit = provider_config.get('limit', 50)
            batch_size = provider_config.get('batch_size', 10)
            force_reingest = provider_config.get('force_reingest', force_reingest)
            verbose = provider_config.get('verbose', False)
            days_filter = provider_config.get('days_filter', 2)  # Default to 2 days
                
            # Call the OneDrive ingestion function
            result = batch_ingest_onedrive_documents(
                query=query,
                limit=limit,
                folder_id=folder_id,
                force_reingest=force_reingest,
                verbose=verbose,
                user_id=user_id,
                batch_size=batch_size,
                syncstatus=syncstatus,
                days_filter=days_filter
            )
            
            # Safely access result dictionary keys
            files_ingested = result.get('items_ingested', 0)
            files_skipped = result.get('files_skipped', 0)
                
            logger.info(f"OneDrive sync completed for user {user_id}: "
                        f"{files_ingested} ingested, {files_skipped} skipped")
                
            return result
                
        except Exception as e:
            error_msg = f"OneDrive sync error for {user_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return {
                "success": False,
                "files_ingested": 0,
                "files_skipped": 0,
                "errors": [error_msg]
            }
    
    def _process_emails_after_sync(self, user_id: str, provider_name: str, syncstatus: Optional[SyncStatus] = None) -> Dict[str, Any]:
        """Process and classify emails after synchronization.
        
        Args:
            user_id: User identifier
            provider_name: Name of the email provider (gmail, outlook)
            syncstatus: Optional SyncStatus object for tracking
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Update sync status if provided
            if syncstatus:
                syncstatus.update_status(f"Processing emails from {provider_name}")
            
            # Get email processing config
            processing_config = self.config.get('sync', {}).get('email_processing', {})
            logger.info(f"Email processing config: {processing_config}")
            limit = processing_config.get('limit_per_sync', 500)
            auto_actions = processing_config.get('auto_actions', True)
            
            # Create email processor
            processor = EmailProcessor()
            
            # Process emails from database (already synced)
            logger.info(f"Processing emails for user {user_id} after {provider_name} sync")
            result = processor.process_emails(
                user_id=user_id,
                provider=EmailProvider.DATABASE,
                limit=limit,
                auto_actions=auto_actions
            )
            
            # Log results
            processed_count = result.get('processed_count', 0)
            classified_count = result.get('classified_count', 0)
            actions_taken = result.get('actions_taken', 0)
            
            logger.info(f"Email processing completed for user {user_id} after {provider_name} sync: "
                       f"{processed_count} emails processed, {classified_count} classified, "
                       f"{actions_taken} actions taken")
            
            # Update sync status if provided
            if syncstatus:
                syncstatus.update_status(f"Completed processing {processed_count} emails")
            
            return result
            
        except Exception as e:
            error_msg = f"Email processing error for user {user_id} after {provider_name} sync: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            # Update sync status if provided
            if syncstatus:
                syncstatus.update_status(f"Error processing emails: {str(e)}")
            
            return {
                "success": False,
                "processed_count": 0,
                "classified_count": 0,
                "actions_taken": 0,
                "errors": [error_msg]
            }
