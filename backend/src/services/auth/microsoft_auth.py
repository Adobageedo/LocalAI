"""
Module pour l'authentification Microsoft OAuth2 (Outlook, Graph API, etc.).
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import json
import msal
import requests
import time
import base64
import traceback
from pathlib import Path
from typing import Optional, Dict, List, Any, Union
from src.core.config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID,
    OUTLOOK_SCOPES, ONEDRIVE_SCOPES, OUTLOOK_CALENDAR_SCOPES, OUTLOOK_REDIRECT_URI
)
from src.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
from src.core.logger import log

logger = log.bind(name="src.services.auth.microsoft_auth")

def get_microsoft_token(user_id: str, required_scopes: list) -> Optional[Dict]:
    """
    Authentifie l'utilisateur et renvoie un token d'accès à Microsoft Graph.
    Args:
        user_id: Identifiant de l'utilisateur
        required_scopes: List of required scopes for the token
    Returns:
        Token d'accès ou None en cas d'erreur
    """
    client_id = OUTLOOK_CLIENT_ID
    #client_secret = OUTLOOK_CLIENT_SECRET
    #tenant_id = OUTLOOK_TENANT_ID
    try:
        # Utilisation de la fonction de chargement du token depuis credentials_manager
        cache_data = load_microsoft_token(user_id)
        # Parse le token scope en JSON
        scopes = required_scopes
        missing_scopes = []
        if cache_data:
            target_json = json.loads(cache_data)
            for token_dict in target_json.get("AccessToken", {}).values():
                token_scopes = token_dict.get("target")
                token_scopes = set(token_scopes.split())
                token_scopes.discard("offline_access")
                token_scopes.discard("profile")
                token_scopes.discard("openid")
                missing_scopes = [scope for scope in required_scopes if scope not in token_scopes]
                scopes = list(token_scopes.union(set(required_scopes)))
                
        token_cache = msal.SerializableTokenCache()
        
        if cache_data:
            token_cache.deserialize(cache_data)
        
        # First try with PublicClientApplication for cached tokens
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        
        # Try to get an account from the cache
        accounts = app.get_accounts()
        result = None
        # If we have accounts in the cache, try to get a token silently
        if accounts and not missing_scopes:
            result = app.acquire_token_silent(scopes, account=accounts[0])
        if not result:
            result = app.acquire_token_interactive(
                scopes=scopes,
                prompt="select_account"
            )
            # Vérifier si l'authentification a réussi
            if "error" in result:
                error_msg = result.get("error_description", "Erreur inconnue")
                logger.error(f"Erreur lors de l'authentification interactive: {error_msg}")
                raise Exception(f"Échec de l'authentification: {error_msg}")
        

        if token_cache.has_state_changed:
            # Utilisation de la fonction de sauvegarde du token depuis credentials_manager
            save_microsoft_token(user_id, token_cache.serialize())
        if "access_token" in result:
            username = "outlook_user"
            if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
                username = result["id_token_claims"]["preferred_username"]
            elif accounts and accounts[0].get("username"):
                username = accounts[0].get("username")
            
            logger.info(f"Authentification à Outlook réussie pour {username}")
            result["account"] = {"username": username}
            return result
        else:
            error_desc = result.get('error_description', 'Erreur inconnue')
            error_code = result.get('error', 'Unknown error code')
            logger.error(f"Erreur d'authentification: {error_desc}")
            logger.debug(f"Authentication error details - Code: {error_code}, Description: {error_desc}")
            logger.debug(f"Full error response: {result}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Outlook: {str(e)}")
        logger.debug(f"Authentication exception details: {type(e).__name__}: {str(e)}", exc_info=True)
        traceback.print_exc()
        return None

def get_outlook_service(user_id: str) -> Optional[Dict]:
    token = get_microsoft_token(user_id, OUTLOOK_SCOPES)
    if token:
        return token

def get_drive_service(user_id: str) -> Optional[Dict]:
    token = get_microsoft_token(user_id, DRIVE_SCOPES)
    if token:
        return token

def get_calendar_service(user_id: str) -> Optional[Dict]:
    token = get_microsoft_token(user_id, CALENDAR_SCOPES)
    if token:
        return token

def get_microsoft_auth_url_for_scope(user_id: str, requested_scope: str) -> Dict[str, Any]:
    """
    Generate a Microsoft OAuth URL for the requested scope. If the user already has a token,
    include the existing scopes to preserve them.
    
    Args:
        user_id: The user ID to check authentication for
        requested_scope: The service scope requested ("mail", "files", "calendar")
        
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
    if requested_scope == "mail":
        selected_scopes = OUTLOOK_SCOPES
    elif requested_scope == "files":
        selected_scopes = ONEDRIVE_SCOPES
    elif requested_scope == "calendar":
        selected_scopes = OUTLOOK_CALENDAR_SCOPES
    else:
        selected_scopes = OUTLOOK_SCOPES
    logger.debug(f"Selected scopes: {selected_scopes}")
    # Load the token to check scopes
    cache_data = load_microsoft_token(user_id)
    if cache_data:
        try:
            target_json = json.loads(cache_data)
            for token_dict in target_json.get("AccessToken", {}).values():
                token_scopes = token_dict.get("target", "")
                if token_scopes:
                    token_scopes = set(token_scopes.split())
                    token_scopes.discard("offline_access")
                    token_scopes.discard("profile")
                    token_scopes.discard("openid")
                    result["current_scopes"] = list(token_scopes)
                    selected_scopes = list(token_scopes.union(set(selected_scopes)))
                    if selected_scopes == token_scopes:
                        result["authenticated"] = True
                        return result
        except Exception as e:
            logger.error(f"Error parsing token cache: {str(e)}")
    logger.debug(f"Current scopes: {result['current_scopes']}")
    # Generate OAuth URL with the appropriate scopes
    redirect_uri = OUTLOOK_REDIRECT_URI + "api/auth/microsoft/callback"
    # Create token cache
    token_cache = msal.SerializableTokenCache()
    cache_data = load_microsoft_token(user_id)
    if cache_data:
        token_cache.deserialize(cache_data)
    # Create MSAL application
    app = msal.PublicClientApplication(
        client_id=OUTLOOK_CLIENT_ID,
        authority="https://login.microsoftonline.com/common",
        token_cache=token_cache
    )
    
    # Encode user_id and scope in the state parameter as JSON
    state_data = json.dumps({"user_id": user_id, "redirect_uri": redirect_uri, "scope": selected_scopes})
    state_encoded = base64.urlsafe_b64encode(state_data.encode()).decode()
    
    # Generate auth URL
    auth_url = app.get_authorization_request_url(
        scopes=selected_scopes,
        redirect_uri=redirect_uri,
        state=state_encoded,
        prompt="select_account"
    )
    
    result["auth_url"] = auth_url
    return result

def check_microsoft_auth_services(user_id: str) -> Dict[str, Any]:
    """
    Check if the user is authenticated with Microsoft and which services they have access to.
    
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
        # Load the token cache data
        cache_data = load_microsoft_token(user_id)
        if not cache_data:
            return result
            
        # Parse the token cache to check for valid tokens and scopes
        target_json = json.loads(cache_data)
        
        # Check if there are any valid access tokens
        access_tokens = target_json.get("AccessToken", {})
        if not access_tokens:
            return result
            
        result["authenticated"] = True
        
        # Check which services the user has access to based on scopes
        for token_dict in access_tokens.values():
            token_scopes = token_dict.get("target", "")
            if not token_scopes:
                continue
                
            token_scopes = set(token_scopes.split())
            token_scopes.discard("offline_access")
            token_scopes.discard("profile")
            token_scopes.discard("openid")
            
            # Check for Outlook email access
            outlook_required = set(OUTLOOK_SCOPES)
            if all(scope in token_scopes for scope in outlook_required):
                result["services"].append("outlook")
            
            # Check for OneDrive access
            drive_required = set(ONEDRIVE_SCOPES)
            if all(scope in token_scopes for scope in drive_required):
                result["services"].append("onedrive")
            
            # Check for Outlook Calendar access
            calendar_required = set(OUTLOOK_CALENDAR_SCOPES)
            if all(scope in token_scopes for scope in calendar_required):
                result["services"].append("outlook_calendar")
        
        logger.debug(f"Microsoft auth check for user {user_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"Error checking Microsoft authentication for user {user_id}: {str(e)}")
        return result