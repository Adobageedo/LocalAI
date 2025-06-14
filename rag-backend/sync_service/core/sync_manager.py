"""
Email Synchronization Manager
============================
Central component responsible for orchestrating the synchronization process
for all email providers and users.
"""
import os
import json
import sys
from typing import Dict, List, Any
from pathlib import Path

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))  

# Import user authentication and credential management
from auth.credentials_manager import get_authenticated_users_by_provider

# Import the email ingestion modules
from update_vdb.sources.ingest_gmail_emails import ingest_gmail_emails_to_qdrant
from update_vdb.sources.ingest_outlook_emails import ingest_outlook_emails_to_qdrant

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
        
        # Directory where user tokens are stored
        self.tokens_dir = Path(os.getenv('TOKEN_DIRECTORY', os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'auth',
            'tokens'
        )))
        
        # Ensure tokens directory exists
        if not self.tokens_dir.exists():
            logger.warning(f"Tokens directory not found at {self.tokens_dir}. Using current directory.")
            self.tokens_dir = Path('.')
            
        logger.info(f"Initialized SyncManager with token directory: {self.tokens_dir}")
    
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
        logger.info("Starting synchronization for all users")
        
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
        
        logger.info(f"Completed synchronization for all {total_users} users")
    
    def sync_provider(self, user_id: str, provider_name: str):
        """Synchronize emails for a specific user and provider."""
        logger.info(f"Synchronizing {provider_name} for user {user_id}")
        
        # Skip disabled providers
        provider_config = self.config.get('sync', {}).get(provider_name, {})
        if not provider_config.get('enabled', True):
            logger.info(f"Provider {provider_name} is disabled in config")
            return
            
        # Récupérer la requête de filtrage depuis la configuration
        query = provider_config.get('query', '')
        if not query and provider_name == 'gmail':
            query = None  # Valeur par défaut pour Gmail
        elif not query and provider_name == 'outlook':
            query = None  # Valeur par défaut pour Outlook
        
        try:
            # Execute provider-specific synchronization
            if provider_name == 'gmail':
                self._sync_gmail(user_id, query)
            elif provider_name == 'outlook':
                self._sync_outlook(user_id, query)
            else:
                logger.warning(f"Unknown provider: {provider_name}")
        except Exception as e:
            logger.error(f"Error synchronizing {provider_name} for user {user_id}: {e}", exc_info=True)
    
    def _sync_gmail(self, user_id: str, query: str = None):
        """Synchronize Gmail emails for a specific user."""
        logger.info(f"Synchronizing Gmail for user {user_id}")
        
        try:
            # Default parameters for Gmail sync
            folders = self.config.get('sync', {}).get('gmail', {}).get('folders', ["INBOX", "SENT"])
            limit = self.config.get('sync', {}).get('gmail', {}).get('limit_per_folder', 50)
            force_reingest = self.config.get('sync', {}).get('gmail', {}).get('force_reingest', False)
            
            # Call the Gmail ingestion function with the user_id, query and file registry
            result = ingest_gmail_emails_to_qdrant(
                labels=folders,
                limit=limit,
                user_id=user_id,
                query=query,
                force_reingest=force_reingest,
            )
            logger.info(f"Gmail sync completed for user {user_id}. Result: {result}")
            return result
        except Exception as e:
            logger.error(f"Error ingesting Gmail emails for user {user_id}: {e}", exc_info=True)
            raise
    
    def _sync_outlook(self, user_id: str, query: str):
        """Synchronize Outlook emails for a specific user."""
        logger.info(f"Synchronizing Outlook for user {user_id}")
        
        try:
            # Default parameters for Outlook sync
            folders = self.config.get('sync', {}).get('outlook', {}).get('folders', ["inbox", "sentitems"])
            limit = self.config.get('sync', {}).get('outlook', {}).get('limit_per_folder', 50)
            force_reingest = self.config.get('sync', {}).get('outlook', {}).get('force_reingest', False)
            save_attachments = self.config.get('sync', {}).get('outlook', {}).get('save_attachments', True)
            
            # Call the Outlook ingestion function with the user_id, query and file registry
            result = ingest_outlook_emails_to_qdrant(
                user_id=user_id,
                query=query,
                limit=limit,
                folders=folders,
                save_attachments=save_attachments,
                force_reingest=force_reingest
            )
            logger.info(f"Outlook sync completed for user {user_id}. Result: {result}")
            return result
        except Exception as e:
            logger.error(f"Failed to sync Outlook for user {user_id}: {e}", exc_info=True)
            raise
