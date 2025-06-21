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
    GMAIL_REDIRECT_URI,
    GMAIL_AUTH_URI,
    GMAIL_TOKEN_URI,
    GMAIL_AUTH_PROVIDER_X509_CERT_URL
)
from backend.services.auth.credentials_manager import load_google_token, save_google_token
from backend.core.logger import log

logger = log.bind(name="backend.services.auth.google_auth")

def get_google_service(service_name, version, scopes, user_id, env_prefix="GMAIL"):
    """
    Authentifie l'utilisateur et renvoie un service Google API (Gmail, Drive, etc.).
    Args:
        service_name: Nom du service Google ("gmail", "drive", ...)
        version: Version de l'API ("v1", "v3", ...)
        scopes: Liste des scopes d'accès
        user_id: Identifiant de l'utilisateur
        env_prefix: Préfixe des variables d'environnement ("GMAIL" ou "GOOGLE_DRIVE")
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
    if not all([client_id, client_secret]):
        raise EnvironmentError(f"Variables {env_prefix}_CLIENT_ID et {env_prefix}_CLIENT_SECRET manquantes dans .env")
    logger.info(f"Utilisation des credentials depuis les variables d'environnement pour {service_name}")

    creds=load_google_token(user_id)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
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
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
]

def get_gmail_service(user_id):
    return get_google_service("gmail", "v1", GMAIL_SCOPES, user_id, env_prefix="GMAIL")

def get_drive_service(user_id):
    return get_google_service("drive", "v3", DRIVE_SCOPES, user_id, env_prefix="GOOGLE_DRIVE")
