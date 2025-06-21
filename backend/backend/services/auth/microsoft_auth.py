"""
Module pour l'authentification Microsoft OAuth2 (Outlook, Graph API, etc.).
"""

import os
import logging
import json
import msal
import requests
import time
from pathlib import Path
from typing import Optional, Dict
from backend.core.config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID
)
from backend.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
from backend.core.logger import log

logger = logging.getLogger("backend.services.auth.microsoft_auth")

SCOPES = ['Mail.Read', 'User.Read']

def get_outlook_token(user_id: str) -> Optional[Dict]:
    """
    Authentifie l'utilisateur et renvoie un token d'accès à Microsoft Graph.
    Args:
        client_id: ID client Azure
        client_secret: Secret client Azure
        tenant_id: ID du tenant Azure
        user_id: Identifiant de l'utilisateur
    Returns:
        Token d'accès ou None en cas d'erreur
    """
    client_id = OUTLOOK_CLIENT_ID
    client_secret = OUTLOOK_CLIENT_SECRET
    tenant_id = OUTLOOK_TENANT_ID
    
    try:
        # Utilisation de la fonction de chargement du token depuis credentials_manager
        cache_data = load_microsoft_token(user_id)
        token_cache = msal.SerializableTokenCache()
        if cache_data:
            token_cache.deserialize(cache_data)
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        accounts = app.get_accounts()
        result = None
        if accounts:
            logger.info(f"Compte trouvé dans le cache : {accounts[0].get('username', 'compte inconnu')}")
            result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if not result:
            logger.info("Aucun token valide trouvé, lancement de l'authentification interactive")
            result = app.acquire_token_interactive(
                scopes=SCOPES,
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
            logger.error(f"Erreur d'authentification: {error_desc}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Outlook: {str(e)}")
        return None
