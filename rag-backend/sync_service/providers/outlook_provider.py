"""
Outlook Email Provider
=====================
Provider implementation for Microsoft Outlook email synchronization.
"""
import os
import logging
from pathlib import Path
from datetime import datetime, timedelta

import msal

from sync_service.utils.logger import setup_logger
from auth.credentials_manager import load_microsoft_token, save_microsoft_token

# Setup logging
logger = setup_logger('sync_service.providers.outlook')

class OutlookProvider:
    """
    Provider for Outlook email synchronization.
    Handles authentication, token refreshing, and API interaction.
    """
    
    def __init__(self):
        """Initialize the Outlook provider."""
        self.client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
        # Note: Not using client_secret as we're configured as a public client
        
        # Using 'common' for both personal and work accounts - same as in ingest_router.py
        self.authority = "https://login.microsoftonline.com/common"
        
        if not self.client_id:
            logger.warning("OUTLOOK_CLIENT_ID environment variable not set")
    
    def check_auth_status(self, user_id):
        """
        Check authentication status for a specific user.
        
        Args:
            user_id: User identifier
            
        Returns:
            dict: Authentication status information
        """
        try:
            # Load the token cache
            cache_data = load_microsoft_token(user_id)
            if not cache_data:
                return {"authenticated": False, "reason": "no_token_cache"}
            
            # Create a SerializableTokenCache and populate it with the loaded cache data
            token_cache = msal.SerializableTokenCache()
            token_cache.deserialize(cache_data)
            
            # Create the MSAL application
            app = msal.PublicClientApplication(
                client_id=self.client_id,
                authority=self.authority,
                token_cache=token_cache
            )
            
            # Look for tokens in the cache
            accounts = app.get_accounts()
            if not accounts:
                return {"authenticated": False, "reason": "no_accounts"}
            
            # Get account and try silent token acquisition
            account = accounts[0]
            scopes = ['Mail.Read', 'User.Read']
            
            # Try to acquire token silently
            result = app.acquire_token_silent(scopes, account=account)
            
            if not result:
                # Token is expired and couldn't be refreshed silently
                return {
                    "authenticated": False,
                    "reason": "token_expired",
                    "account": account.get("username", "unknown")
                }
            
            # Token acquired successfully
            return {
                "authenticated": True, 
                "username": account.get("username", "unknown"),
                "user_id": user_id,
                "token_expiry": self._get_token_expiry(result)
            }
            
        except Exception as e:
            logger.error(f"Error checking Outlook authentication status: {e}", exc_info=True)
            return {"authenticated": False, "error": str(e)}
    
    def refresh_token(self, user_id):
        """
        Attempt to refresh the access token for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            bool: True if token refreshed successfully, False otherwise
        """
        try:
            # Load the token cache
            cache_data = load_microsoft_token(user_id)
            if not cache_data:
                logger.error(f"No token cache found for user {user_id}")
                return False
            
            # Create a SerializableTokenCache and populate it with the loaded cache data
            token_cache = msal.SerializableTokenCache()
            token_cache.deserialize(cache_data)
            
            # Create the MSAL application
            app = msal.PublicClientApplication(
                client_id=self.client_id,
                authority=self.authority,
                token_cache=token_cache
            )
            
            # Look for tokens in the cache
            accounts = app.get_accounts()
            if not accounts:
                logger.error(f"No accounts found in token cache for user {user_id}")
                return False
            
            # Get account and try silent token acquisition to refresh
            account = accounts[0]
            scopes = ['Mail.Read', 'User.Read']
            
            # Try to acquire token silently (triggers refresh if necessary)
            result = app.acquire_token_silent(scopes, account=account)
            
            if not result:
                logger.error(f"Failed to refresh token silently for user {user_id}")
                return False
            
            # If token cache state changed, save it
            if token_cache.has_state_changed:
                save_microsoft_token(user_id, token_cache.serialize())
                logger.info(f"Token refreshed and saved for user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error refreshing token for user {user_id}: {e}", exc_info=True)
            return False
    
    def _get_token_expiry(self, result):
        """Extract token expiry timestamp from token result."""
        if not result or "expires_in" not in result:
            return None
        
        # Calculate expiration time
        expires_in = result.get("expires_in", 3600)  # Default to 1 hour
        expiry_time = datetime.now() + timedelta(seconds=expires_in)
        return expiry_time.isoformat()
