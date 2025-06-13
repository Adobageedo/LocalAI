"""
Utilitaire pour vérifier et récupérer les informations d'authentification
pour Gmail et Outlook.
"""

import os
import json
import pathlib
import logging
import pickle
from typing import Dict, Optional, Tuple, Any

# Import des modules d'authentification existants
from google.auth.transport.requests import Request
import msal

# Configuration du logger
logger = logging.getLogger("email_credentials")

def get_credentials_paths(user_id: str = None) -> Dict[str, str]:
    """
    Retourne les chemins des fichiers de credentials pour un utilisateur donné.
    
    Args:
        user_id: Identifiant de l'utilisateur
    
    Returns:
        Dictionnaire avec les chemins des tokens Gmail et Outlook
    """
    # Récupération des chemins depuis les variables d'environnement
    gmail_token_path = os.getenv("GMAIL_TOKEN_PATH", "token.pickle")
    outlook_token_path = os.getenv("OUTLOOK_TOKEN_PATH", "outlook_token.json")
    
    # Remplacer 'user_id' par l'ID réel de l'utilisateur
    if user_id:
        gmail_token_path = gmail_token_path.replace("user_id", user_id)
        outlook_token_path = outlook_token_path.replace("user_id", user_id)
    
    return {
        "gmail": gmail_token_path,
        "outlook": outlook_token_path
    }

def check_gmail_credentials(user_id: str = None) -> Dict[str, Any]:
    """
    Vérifie si des credentials Gmail existent et retourne leur statut.
    
    Args:
        user_id: Identifiant de l'utilisateur
    
    Returns:
        Dictionnaire avec les informations sur les credentials Gmail
    """
    token_path = get_credentials_paths(user_id)["gmail"]
    
    result = {
        "authenticated": False,
        "token_path": token_path,
        "user_id": user_id,
        "error": None
    }
    
    try:
        # Vérifier si le token existe
        if pathlib.Path(token_path).exists():
            # Tenter de lire le token pour vérifier sa validité
            with open(token_path, 'rb') as token_file:
                creds = pickle.load(token_file)
                result["authenticated"] = creds.valid
                result["expired"] = creds.expired if hasattr(creds, "expired") else False
                result["email"] = creds.id_token.get('email', None) if hasattr(creds, "id_token") else None
        
        return result
    except Exception as e:
        logger.error(f"Erreur lors de la vérification des credentials Gmail: {str(e)}")
        result["error"] = str(e)
        return result

def check_outlook_credentials(user_id: str = None) -> Dict[str, Any]:
    """
    Vérifie si des credentials Outlook existent et retourne leur statut.
    
    Args:
        user_id: Identifiant de l'utilisateur
    
    Returns:
        Dictionnaire avec les informations sur les credentials Outlook
    """
    token_path = get_credentials_paths(user_id)["outlook"]
    
    result = {
        "authenticated": False,
        "token_path": token_path,
        "user_id": user_id,
        "error": None
    }
    
    try:
        # Vérifier si le token existe
        if pathlib.Path(token_path).exists():
            # Charger le token pour vérifier sa validité
            with open(token_path, 'r') as token_file:
                cache_data = token_file.read()
                
                if cache_data:
                    # Créer un cache de token
                    token_cache = msal.SerializableTokenCache()
                    token_cache.deserialize(cache_data)
                    
                    # Créer une application pour vérifier la validité des tokens
                    client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
                    authority = f"https://login.microsoftonline.com/common"
                    app = msal.PublicClientApplication(client_id, authority=authority, token_cache=token_cache)
                    
                    accounts = app.get_accounts()
                    if accounts:
                        result["authenticated"] = True
                        result["email"] = accounts[0].get("username")
        
        return result
    except Exception as e:
        logger.error(f"Erreur lors de la vérification des credentials Outlook: {str(e)}")
        result["error"] = str(e)
        return result

def get_gmail_credentials(user_id: str = None) -> Optional[Any]:
    """
    Récupère et rafraîchit si nécessaire les credentials Gmail pour un utilisateur donné.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Credentials Google valides ou None en cas d'erreur
    """
    # Obtenir le chemin du token pour cet utilisateur
    token_path = get_credentials_paths(user_id)["gmail"]
    logger.info(f"Loading token from: {os.path.abspath(token_path)}")
    creds = None
    
    try:
        # Vérifier si le token existe
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
                
        # Vérifier la validité des credentials et rafraîchir si nécessaire
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                # Sauvegarder les credentials rafraîchies
                os.makedirs(os.path.dirname(token_path), exist_ok=True)
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
                logger.info(f"Gmail credentials refreshed for user {user_id}")
            else:
                logger.warning(f"No valid Gmail credentials found for user {user_id}")
                return None
                
        return creds
    except Exception as e:
        logger.error(f"Error getting Gmail credentials: {str(e)}")
        return None

def get_outlook_credentials(user_id: str = None) -> Optional[Dict]:
    """
    Récupère et rafraîchit si nécessaire les tokens Microsoft Graph pour Outlook.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Token d'accès Microsoft Graph valide ou None en cas d'erreur
    """
    # Obtenir le chemin du token pour cet utilisateur
    token_path = get_credentials_paths(user_id)["outlook"]
    
    # Récupérer les identifiants d'application depuis les variables d'environnement
    client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
    client_secret = os.getenv("OUTLOOK_CLIENT_SECRET", "")
    tenant_id = os.getenv("OUTLOOK_TENANT_ID", "common")
    
    if not all([client_id, client_secret]):
        logger.error("Variables d'environnement OUTLOOK_CLIENT_ID et OUTLOOK_CLIENT_SECRET manquantes")
        return None
    
    try:
        # Vérifier si un cache de token existe
        token_cache = msal.SerializableTokenCache()
        
        if os.path.exists(token_path):
            with open(token_path, 'r') as token_file:
                cache_data = token_file.read()
                if cache_data:
                    token_cache.deserialize(cache_data)
        
        # Créer l'application confidentielle
        app = msal.ConfidentialClientApplication(
            client_id=client_id,
            client_credential=client_secret,
            authority=f"https://login.microsoftonline.com/{tenant_id}",
            token_cache=token_cache
        )
        
        # Trouver les comptes existants dans le cache
        accounts = app.get_accounts()
        result = None
        
        # Essayer d'acquérir un token silencieusement
        if accounts:
            logger.info(f"Compte Outlook trouvé dans le cache pour l'utilisateur {user_id}")
            # Trouver le premier compte disponible
            result = app.acquire_token_silent(["https://graph.microsoft.com/.default"], account=accounts[0])
        
        # Si on a un résultat valide, sauvegarder le cache si nécessaire
        if result and "access_token" in result:
            if token_cache.has_state_changed:
                with open(token_path, 'w') as token_file:
                    token_file.write(token_cache.serialize())
            return result
        else:
            logger.warning(f"Impossible de rafraîchir silencieusement les tokens Outlook pour l'utilisateur {user_id}")
            # Comme il s'agit d'un scénario backend, la réauthentification complète nécessite
            # une interaction utilisateur, on renvoie donc None
            return None
    
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des tokens Outlook: {str(e)}")
        return None

def get_recent_emails_collection(user_id: str, provider: str) -> str:
    """
    Détermine le nom de la collection pour les emails récents basé sur l'utilisateur et le provider.
    
    Args:
        user_id: Identifiant de l'utilisateur
        provider: Fournisseur d'emails ('gmail' ou 'outlook')
    
    Returns:
        Nom de la collection Qdrant
    """
    if provider.lower() == "gmail":
        return user_id  # Gmail uses user_id as collection name
    elif provider.lower() == "outlook":
        return f"{user_id}eml"  # Outlook uses user_id + "eml" suffix
    else:
        return user_id  # Default fallback
