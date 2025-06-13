"""
Module pour l'authentification Google OAuth2 (Gmail, Drive, etc.).
"""

import os
import logging
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from backend.core.config import (
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
)
from backend.services.auth.credentials_manager import load_google_token, save_google_token
from backend.core.logger import log

logger = logging.getLogger(__name__)

def get_google_service(service_name, version, scopes, user_id, env_prefix="GMAIL"):
    """
    Obtient un service Google API authentifié via OAuth2.
    
    Args:
        service_name (str): Nom du service Google (gmail, drive, etc.)
        version (str): Version de l'API (v1, v3, etc.)
        scopes (list): Liste des scopes OAuth2 requis
        user_id (str): Identifiant de l'utilisateur
        env_prefix (str, optional): Préfixe pour les variables d'environnement. Par défaut "GMAIL".
        
    Returns:
        Resource: Service Google API authentifié
    """
    logger.debug(f"Obtention du service Google {service_name} v{version} pour l'utilisateur {user_id}")
    
    # Charger les credentials existantes
    creds = load_google_token(user_id)
    
    # Si pas de credentials valides, les obtenir via OAuth2
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.debug(f"Token expiré pour {user_id}, rafraîchissement...")
            creds.refresh(Request())
            save_google_token(user_id, creds)
        else:
            logger.debug(f"Aucun token valide pour {user_id}, démarrage du flux OAuth2")
            # Créer le flux OAuth2
            flow = InstalledAppFlow.from_client_config(
                {
                    "web": {
                        "client_id": GMAIL_CLIENT_ID,
                        "client_secret": GMAIL_CLIENT_SECRET,
                        "redirect_uris": [f"{GMAIL_REDIRECT_URI}/api/sources/gmail/oauth2callback"],
                        "auth_uri": os.getenv(f"{env_prefix}_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
                        "token_uri": os.getenv(f"{env_prefix}_TOKEN_URI", "https://oauth2.googleapis.com/token"),
                    }
                },
                scopes=scopes
            )
            # Lancer le serveur local pour l'authentification
            creds = flow.run_local_server(port=0)
            # Sauvegarder les credentials pour la prochaine fois
            save_google_token(user_id, creds)
    
    # Construire et retourner le service
    service = build(service_name, version, credentials=creds)
    logger.debug(f"Service Google {service_name} v{version} obtenu avec succès pour {user_id}")
    return service


def get_gmail_service(user_id):
    """
    Obtient un service Gmail API authentifié.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        Resource: Service Gmail API authentifié
    """
    return get_google_service(
        service_name="gmail",
        version="v1",
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send"
        ],
        user_id=user_id
    )


def get_drive_service(user_id):
    """
    Obtient un service Google Drive API authentifié.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        Resource: Service Google Drive API authentifié
    """
    return get_google_service(
        service_name="drive",
        version="v3",
        scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.metadata.readonly"
        ],
        user_id=user_id,
        env_prefix="GDRIVE"
    )
