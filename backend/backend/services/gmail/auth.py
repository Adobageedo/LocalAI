"""
Module for Gmail authentication handling.
"""

import os
import logging
import pickle
from typing import Any, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

def get_gmail_service(token_path: Optional[str] = None, user_id: str = "") -> Any:
    """
    Obtient un service Gmail authentifié via OAuth2.
    
    Args:
        token_path: Chemin vers le fichier de token
        user_id: ID utilisateur pour stocker le token
        
    Returns:
        Service Gmail authentifié
    """
    # Configuration
    client_id = os.getenv("GMAIL_CLIENT_ID", "")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET", "")
    redirect_uri = os.getenv("GMAIL_REDIRECT_URI", "")
    
    # Définir le chemin du token utilisateur si non fourni
    if not token_path and user_id:
        token_dir = os.path.join(os.path.expanduser("~"), ".localai", "tokens", user_id)
        os.makedirs(token_dir, exist_ok=True)
        token_path = os.path.join(token_dir, "gmail_token.pickle")
    elif not token_path:
        token_path = "gmail_token.pickle"
    
    creds = None
    
    # Charger les credentials depuis le fichier token s'il existe
    if os.path.exists(token_path):
        try:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        except Exception as e:
            logger.warning(f"Erreur lors du chargement du token: {e}")
    
    # Vérifier si les credentials sont valides
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.error(f"Erreur lors du rafraîchissement du token: {e}")
                creds = None
    
    # Créer le service Gmail
    if creds:
        try:
            service = build('gmail', 'v1', credentials=creds)
            # Sauvegarder les credentials mis à jour
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
            return service
        except Exception as e:
            logger.error(f"Erreur lors de la création du service Gmail: {e}")
    
    # Si nous arrivons ici, c'est que l'authentification a échoué
    logger.error("Authentification Gmail échouée")
    return None

def save_token(token_info: dict, user_id: str = "") -> bool:
    """
    Sauvegarde le token OAuth2 pour Gmail.
    
    Args:
        token_info: Informations de token à sauvegarder
        user_id: ID utilisateur pour stocker le token
        
    Returns:
        True si sauvegardé avec succès, False sinon
    """
    try:
        creds = Credentials(
            token=token_info.get('access_token'),
            refresh_token=token_info.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GMAIL_CLIENT_ID", ""),
            client_secret=os.getenv("GMAIL_CLIENT_SECRET", "")
        )
        
        # Définir le chemin du token utilisateur
        if user_id:
            token_dir = os.path.join(os.path.expanduser("~"), ".localai", "tokens", user_id)
            os.makedirs(token_dir, exist_ok=True)
            token_path = os.path.join(token_dir, "gmail_token.pickle")
        else:
            token_path = "gmail_token.pickle"
        
        # Sauvegarder les credentials
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
        
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du token: {e}")
        return False

def get_auth_url(redirect_uri: str) -> str:
    """
    Génère l'URL d'autorisation OAuth2 pour Gmail.
    
    Args:
        redirect_uri: URI de redirection après authentification
        
    Returns:
        URL d'autorisation OAuth2
    """
    try:
        # Configuration OAuth
        client_config = {
            "web": {
                "client_id": os.getenv("GMAIL_CLIENT_ID", ""),
                "client_secret": os.getenv("GMAIL_CLIENT_SECRET", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri]
            }
        }
        
        # Créer le flow OAuth
        flow = Flow.from_client_config(
            client_config,
            scopes=["https://www.googleapis.com/auth/gmail.readonly", 
                   "https://www.googleapis.com/auth/gmail.modify",
                   "https://www.googleapis.com/auth/gmail.labels",
                   "https://www.googleapis.com/auth/gmail.compose"]
        )
        flow.redirect_uri = redirect_uri
        
        # Générer l'URL d'autorisation
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return auth_url
    except Exception as e:
        logger.error(f"Erreur lors de la génération de l'URL d'autorisation: {e}")
        return ""
