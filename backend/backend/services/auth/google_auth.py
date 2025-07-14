"""
Module pour l'authentification Google OAuth2 (Gmail, Drive, etc.).
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
import json
from backend.core.config import (
    GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_AUTH_URI, GMAIL_TOKEN_URI,
    GMAIL_REDIRECT_URI, GMAIL_SCOPES, GDRIVE_SCOPES, GCALENDAR_SCOPES, GMAIL_AUTH_PROVIDER_X509_CERT_URL
)
from backend.services.auth.credentials_manager import load_google_token, save_google_token, check_google_credentials
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

def get_gmail_service(user_id):
    return get_google_service("gmail", "v1", GMAIL_SCOPES, user_id)

def get_drive_service(user_id):
    return get_google_service("drive", "v3", GDRIVE_SCOPES, user_id)

def get_calendar_service(user_id):
    return get_google_service("calendar", "v3", GCALENDAR_SCOPES, user_id)

def get_google_auth_url_for_scope(user_id, requested_scope):
    """
    Generate a Google OAuth URL for the requested scope. If the user already has a token,
    include the existing scopes to preserve them.
    
    Args:
        user_id: The user ID to check authentication for
        requested_scope: The service scope requested ("gmail", "drive", "calendar")
        
    Returns:
        Dictionary with authentication status, auth_url if needed, and current scopes
    """
    result = {
        "authenticated": False,
        "auth_url": None,
        "current_scopes": [],
        "requested_service": requested_scope
    }
    
    # Map the requested scope to the appropriate scope list
    if requested_scope == "gmail":
        selected_scopes = GMAIL_SCOPES
        service_name = "gmail"
    elif requested_scope == "drive":
        selected_scopes = GDRIVE_SCOPES
        service_name = "drive"
    elif requested_scope == "calendar":
        selected_scopes = GCALENDAR_SCOPES
        service_name = "calendar"
    else:
        # Default to Gmail scopes if no specific scope is requested
        selected_scopes = GMAIL_SCOPES
        service_name = "gmail"
    
    # Check if the user already has a valid token
    creds_status = check_google_credentials(user_id)
    
    if creds_status["authenticated"] and creds_status["valid"]:
        # Load the token to check scopes
        creds = load_google_token(user_id)
        if creds and creds.valid:
            token_scopes = set(creds.scopes or [])
            result["current_scopes"] = list(token_scopes)
            selected_scopes = list(token_scopes.union(set(selected_scopes)))
            if selected_scopes == token_scopes:
                result["authenticated"] = True
                return result
    # Generate OAuth URL with the appropriate scopes
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": GMAIL_AUTH_URI,
                "token_uri": GMAIL_TOKEN_URI,
            }
        },
        scopes=selected_scopes,
        redirect_uri=GMAIL_REDIRECT_URI + "api/auth/google/callback"
    )
    
    # Encode user_id and scope in the state parameter as JSON
    state_data = json.dumps({"user_id": user_id, "scope": selected_scopes})
    state_encoded = base64.urlsafe_b64encode(state_data.encode()).decode()
    
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='false',  # Include granted scopes for better token management
        state=state_encoded
    )
    
    result["auth_url"] = auth_url
    logger.debug(f"[GOOGLE AUTH] Generated auth URL for {service_name} with scopes: {selected_scopes}")
    
    return result

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
    check_google_credentials(user_id)
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
            drive_required = set(GDRIVE_SCOPES)
            if all(scope in token_scopes for scope in drive_required):
                result["services"].append("gdrive")
            
            # Check for Calendar access
            calendar_required = set(GCALENDAR_SCOPES)
            if all(scope in token_scopes for scope in calendar_required):
                result["services"].append("gcalendar")
        
        logger.debug(f"Google auth check for user {user_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"Error checking Google authentication for user {user_id}: {str(e)}")
        return result