"""
Module pour l'authentification Google OAuth2 (Gmail, Drive, etc.).
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any, Union
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from backend.core.config import (
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI,
    GMAIL_AUTH_URI,
    GMAIL_TOKEN_URI,
    GMAIL_AUTH_PROVIDER_X509_CERT_URL
)
from backend.services.auth.credentials_manager import load_google_token, save_google_token
from backend.core.logger import log

logger = log.bind(name="backend.services.auth.google_auth")

def get_google_service(service_name, version, scopes, user_id):
    """
    Authentifie l'utilisateur et renvoie un service Google API (Gmail, Drive, etc.).
    Args:
        service_name: Nom du service Google ("gmail", "drive", ...)
        version: Version de l'API ("v1", "v3", ...)
        scopes: Liste des scopes d'accès
        user_id: Identifiant de l'utilisateur
        env_prefix: Préfixe des variables d'environnement ("GMAIL" ou "GOOGLE_DRIVE")
        required_scopes: Liste des scopes requis (en plus de ceux du token actuel)
    Returns:
        Service Google authentifié
    """
    creds = None
    client_id = GMAIL_CLIENT_ID
    client_secret = GMAIL_CLIENT_SECRET
    redirect_uri = GMAIL_REDIRECT_URI
    auth_uri = GMAIL_AUTH_URI
    token_uri = GMAIL_TOKEN_URI
    cert_url = GMAIL_AUTH_PROVIDER_X509_CERT_URL

    creds = load_google_token(user_id)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_config(
            {
                "installed": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uris": [redirect_uri],
                    "auth_uri": auth_uri,
                    "token_uri": token_uri,
                    "auth_provider_x509_cert_url": cert_url
                }
            },
            scopes
        )
        creds = flow.run_local_server(port=0)
        save_google_token(user_id, creds)

    # Check if required_scopes are present
    if scopes:
        token_scopes = set(creds.scopes or [])
        missing_scopes = [scope for scope in scopes if scope not in token_scopes]
        if missing_scopes:
            # Re-authenticate with union of current and required scopes
            new_scopes = list(token_scopes.union(set(scopes)))
            flow = InstalledAppFlow.from_client_config(
                {
                    "installed": {
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uris": [redirect_uri],
                        "auth_uri": auth_uri,
                        "token_uri": token_uri,
                        "auth_provider_x509_cert_url": cert_url
                    }
                },
                new_scopes
            )
            creds = flow.run_local_server(port=0)
            save_google_token(user_id, creds)

    return build(service_name, version, credentials=creds)

# Scopes spécifiques
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
]
DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive'
]
CALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar'
]

def get_gmail_service(user_id):
    return get_google_service("gmail", "v1", GMAIL_SCOPES, user_id)

def get_drive_service(user_id):
    return get_google_service("drive", "v3", DRIVE_SCOPES, user_id)

def get_calendar_service(user_id):
    return get_google_service("calendar", "v3", CALENDAR_SCOPES, user_id)

def check_google_auth_services(user_id):
    """
    Check if the user is authenticated with Google and which services they have access to.
    
    Args:
        user_id: The user ID to check authentication for
        
    Returns:
        Dictionary with authentication status and available services
    """
    result = {
        "authenticated": False,
        "services": []
    }
    
    try:
        # Load the token and check if it's valid
        creds = load_google_token(user_id)
        logger.debug(f"Google token for user {user_id}: {creds} and valid: {creds.valid}")
        if creds and creds.valid:
            result["authenticated"] = True
            
            # Check which services the user has access to based on scopes
            token_scopes = set(creds.scopes or [])
            
            # Check for Gmail access
            gmail_required = set(GMAIL_SCOPES)
            if all(scope in token_scopes for scope in gmail_required):
                result["services"].append("gmail")
            
            # Check for Drive access
            drive_required = set(DRIVE_SCOPES)
            if all(scope in token_scopes for scope in drive_required):
                result["services"].append("gdrive")
            
            # Check for Calendar access
            calendar_required = set(CALENDAR_SCOPES)
            if all(scope in token_scopes for scope in calendar_required):
                result["services"].append("gcalendar")
        
        logger.debug(f"Google auth check for user {user_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"Error checking Google authentication for user {user_id}: {str(e)}")
        return result