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
from backend.core.config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID
)
from backend.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
from backend.core.logger import log

logger = log.bind(name="backend.services.auth.microsoft_auth")

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
        logger.debug(f"Missing scopes: {missing_scopes}")
        # If we have accounts in the cache, try to get a token silently
        if accounts and not missing_scopes:
            result = app.acquire_token_silent(scopes, account=accounts[0])
        if not result:
            logger.debug(f"No token acquired silently, attempting interactive authentication with scopes: {scopes}")
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

OUTLOOK_SCOPES = ['Mail.Read', 'User.Read', 'Mail.ReadWrite', 'Mail.Send']

DRIVE_SCOPES = ['Files.ReadWrite.All']

CALENDAR_SCOPES = ['Calendars.Read', 'Calendars.ReadWrite']

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
    