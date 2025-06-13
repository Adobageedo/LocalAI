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

from backend.core.config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID
)
from backend.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
from backend.core.logger import log

logger = logging.getLogger(__name__)

def get_outlook_token(user_id):
    """
    Obtient un token OAuth pour Microsoft Outlook en utilisant MSAL.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        dict: Le token d'accès si l'authentification réussit, None sinon
    """
    logger.debug(f"Obtention du token Outlook pour l'utilisateur {user_id}")
    
    # Scopes pour l'API Microsoft Graph
    scopes = [
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.ReadWrite",
        "https://graph.microsoft.com/User.Read",
        "offline_access"
    ]
    
    # Charger le cache de token existant
    token_cache = load_microsoft_token(user_id)
    
    # Créer l'application MSAL à partir du cache
    app = msal.ConfidentialClientApplication(
        client_id=OUTLOOK_CLIENT_ID,
        client_credential=OUTLOOK_CLIENT_SECRET,
        authority=f"https://login.microsoftonline.com/{OUTLOOK_TENANT_ID}",
        token_cache=msal.SerializableTokenCache()
    )
    
    # Si nous avons un cache de token, le charger dans l'application
    if token_cache:
        app.token_cache._deserialize(json.dumps(token_cache))
        
    # Tenter d'acquérir un token silencieusement à partir du cache
    accounts = app.get_accounts()
    result = None
    
    if accounts:
        logger.debug(f"Compte trouvé dans le cache, tentative d'acquisition silencieuse")
        result = app.acquire_token_silent(scopes, account=accounts[0])
    
    # Si nous n'avons pas de token valide, utiliser le device code flow
    if not result:
        logger.debug("Aucun token valide trouvé, démarrage du device code flow")
        # Créer une application PublicClientApplication pour le device code flow
        public_app = msal.PublicClientApplication(
            client_id=OUTLOOK_CLIENT_ID,
            authority=f"https://login.microsoftonline.com/{OUTLOOK_TENANT_ID}"
        )
        
        # Demander le device code
        flow = public_app.initiate_device_flow(scopes)
        
        # Afficher les instructions à l'utilisateur (elles seraient normalement envoyées à l'interface utilisateur)
        logger.info(f"Device code flow initié. Instructions pour l'utilisateur: {flow['message']}")
        print(f"\nInstructions d'authentification Microsoft:\n{flow['message']}\n")
        
        # Attendre que l'utilisateur s'authentifie
        device_code = flow.get("device_code")
        expires_at = time.time() + flow.get("expires_in", 300)
        interval = flow.get("interval", 5)
        
        # Boucler jusqu'à expiration ou authentification
        while time.time() < expires_at:
            # Attendre l'intervalle spécifié
            time.sleep(interval)
            
            # Tenter d'échanger le device code contre un token
            temp_result = public_app.acquire_token_by_device_flow(flow)
            
            if "access_token" in temp_result:
                logger.info("Authentification réussie via device code flow")
                
                # Une fois que nous avons le token de l'application publique, l'échanger dans l'application confidentielle
                result = app.acquire_token_by_authorization_code(
                    code=temp_result.get("id_token"),  # Utiliser le id_token comme code d'autorisation
                    scopes=scopes
                )
                
                # Si ça ne fonctionne pas, utiliser directement le token de l'application publique
                if "access_token" not in result:
                    result = temp_result
                break
                
            elif "error" in temp_result and temp_result["error"] == "authorization_pending":
                # Normal, l'utilisateur n'a pas encore complété l'authentification
                pass
            else:
                # Une erreur s'est produite
                logger.error(f"Erreur lors de l'authentification: {temp_result.get('error_description', 'Unknown error')}")
                break
    
    # Si nous avons un résultat valide, sauvegarder le cache de token
    if result and "access_token" in result:
        logger.debug("Token d'accès obtenu avec succès")
        
        # Sérialiser et sauvegarder le cache de token
        token_cache = json.loads(app.token_cache.serialize())
        save_microsoft_token(user_id, token_cache)
        
        return result
    else:
        logger.error("Échec de l'acquisition du token")
        return None
