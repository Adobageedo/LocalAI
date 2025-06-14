"""
Gmail Email Provider
===================
Provider implementation for Gmail email synchronization.
"""
import os
import logging
import json
from pathlib import Path
from datetime import datetime, timedelta
import sys
import google.oauth2.credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sync_service.utils.logger import setup_logger
from auth.credentials_manager import load_gmail_credentials, save_gmail_credentials

# Setup logging
logger = setup_logger('sync_service.providers.gmail')

class GmailProvider:
    """
    Provider for Gmail email synchronization.
    Handles authentication, token refreshing, and API interaction.
    """
    
    def __init__(self):
        """Initialize the Gmail provider."""
        # Default path for client secrets
        self.client_secrets_file = os.getenv(
            "GMAIL_CLIENT_SECRETS",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                        "auth", "client_secrets.json")
        )
        
        # Scopes required for Gmail API access
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
        
        if not os.path.exists(self.client_secrets_file):
            logger.warning(f"Gmail client secrets file not found at {self.client_secrets_file}")
    
    def check_auth_status(self, user_id):
        """
        Check authentication status for a specific user.
        
        Args:
            user_id: User identifier
            
        Returns:
            dict: Authentication status information
        """
        try:
            # Load the credentials
            creds_data = load_gmail_credentials(user_id)
            if not creds_data:
                return {"authenticated": False, "reason": "no_credentials"}
            
            # Parse credentials
            creds_dict = json.loads(creds_data)
            creds = google.oauth2.credentials.Credentials.from_authorized_user_info(creds_dict)
            
            # Check if credentials are valid or can be refreshed
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    # Try to refresh
                    creds.refresh(Request())
                    
                    # Save refreshed credentials
                    save_gmail_credentials(user_id, creds.to_json())
                    
                    return {
                        "authenticated": True,
                        "username": creds_dict.get("email", user_id),
                        "user_id": user_id,
                        "token_expiry": self._get_token_expiry(creds),
                        "refreshed": True
                    }
                else:
                    return {"authenticated": False, "reason": "invalid_credentials"}
            
            # Credentials are valid
            return {
                "authenticated": True,
                "username": creds_dict.get("email", user_id),
                "user_id": user_id,
                "token_expiry": self._get_token_expiry(creds)
            }
            
        except Exception as e:
            logger.error(f"Error checking Gmail authentication status: {e}", exc_info=True)
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
            # Load the credentials
            creds_data = load_gmail_credentials(user_id)
            if not creds_data:
                logger.error(f"No credentials found for user {user_id}")
                return False
            
            # Parse credentials
            creds_dict = json.loads(creds_data)
            creds = google.oauth2.credentials.Credentials.from_authorized_user_info(creds_dict)
            
            # Check if refresh is needed and possible
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                
                # Save refreshed credentials
                save_gmail_credentials(user_id, creds.to_json())
                logger.info(f"Token refreshed and saved for user {user_id}")
                return True
            elif not creds.expired:
                # Token still valid, no refresh needed
                return True
            else:
                # Token expired and no refresh token
                logger.error(f"Cannot refresh token for user {user_id}: No refresh token")
                return False
            
        except Exception as e:
            logger.error(f"Error refreshing token for user {user_id}: {e}", exc_info=True)
            return False
    
    def _get_token_expiry(self, creds):
        """Extract token expiry timestamp from credentials."""
        if not creds or not creds.expiry:
            return None
        
        return creds.expiry.isoformat()
