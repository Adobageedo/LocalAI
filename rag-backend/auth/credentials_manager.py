"""
Gestionnaire de tokens pour l'authentification Google et Microsoft.
Ce module fournit des fonctions pour charger et sauvegarder des tokens
d'authentification dans différents formats (pickle pour Google, JSON pour Microsoft).
"""

import os
import json
import pickle
import logging
from typing import Any, Dict, Optional, Union, Tuple
from pathlib import Path
from google.auth.transport.requests import Request
import msal

# Configuration du logger
logger = logging.getLogger("credentials_manager")

def load_google_token(user_id: str) -> Optional[Any]:
    """
    Charge un token Google à partir d'un fichier pickle.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Objet credentials Google ou None en cas d'erreur
    """
    token_path = os.environ.get("GMAIL_TOKEN_PATH", "token.pickle").replace("user_id", user_id)
    try:
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token_file:
                return pickle.load(token_file)
        else:
            logger.info(f"Fichier token Google non trouvé: {token_path}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors du chargement du token Google: {str(e)}")
        return None

def save_google_token(user_id: str, creds: Any) -> bool:
    """
    Sauvegarde un token Google dans un fichier pickle.
    
    Args:
        user_id: Identifiant de l'utilisateur
        creds: Objet credentials Google à sauvegarder
        
    Returns:
        True si la sauvegarde a réussi, False sinon
    """
    token_path = os.environ.get("GMAIL_TOKEN_PATH", "token.pickle").replace("user_id", user_id)
    try:
        # Vérifier et créer le répertoire si nécessaire
        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        with open(token_path, 'wb') as token_file:
            pickle.dump(creds, token_file)
        logger.info(f"Token Google sauvegardé: {token_path}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du token Google: {str(e)}")
        return False

def load_microsoft_token(user_id: str) -> Optional[Dict]:
    """
    Charge un token Microsoft à partir d'un fichier JSON.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Données du cache de token ou None en cas d'erreur
    """
    token_path = os.environ.get("OUTLOOK_TOKEN_PATH", "outlook_token.json").replace("user_id", user_id)
    try:
        if os.path.exists(token_path):
            with open(token_path, 'r') as token_file:
                cache_data = token_file.read()
                if cache_data:
                    return cache_data  # Retourner les données brutes pour MSAL SerializableTokenCache
                return None
        else:
            logger.info(f"Fichier token Microsoft non trouvé: {token_path}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors du chargement du token Microsoft: {str(e)}")
        return None

def save_microsoft_token(user_id: str, cache_data: str) -> bool:
    """
    Sauvegarde un token Microsoft dans un fichier JSON.
    
    Args:
        user_id: Identifiant de l'utilisateur
        cache_data: Données de cache de token sérialisées
        
    Returns:
        True si la sauvegarde a réussi, False sinon
    """
    token_path = os.environ.get("OUTLOOK_TOKEN_PATH", "outlook_token.json").replace("user_id", user_id)
    try:
        # Vérifier et créer le répertoire si nécessaire
        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        with open(token_path, 'w') as token_file:
            token_file.write(cache_data)
        logger.info(f"Token Microsoft sauvegardé: {token_path}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du token Microsoft: {str(e)}")
        return False

def check_google_credentials(user_id: str) -> Dict[str, Any]:
    """
    Vérifie si des credentials Google valides existent pour un utilisateur donné.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Dictionnaire avec les informations sur les credentials
    """
    
    result = {
        "authenticated": False,
        "valid": False,
        "expired": False,
        "refreshable": False,
        "user_id": user_id,
        "error": None
    }
    
    try:
        creds=load_google_token(user_id)
        if creds is not None:    
            # Vérifier l'authentification et validité
            result["authenticated"] = True  # Le fichier existe, donc une authentification a eu lieu
            result["valid"] = getattr(creds, "valid", False)
            result["expired"] = getattr(creds, "expired", True)
            result["refreshable"] = getattr(creds, "refresh_token", None) is not None
                
            # Tentative de rafraîchissement si nécessaire et possible
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    result["valid"] = True
                    result["expired"] = False
                        
                    # Sauvegarder les credentials rafraîchies
                    save_google_token(user_id, creds)
                    logger.info(f"Google credentials refreshed for user {user_id}")
                except Exception as refresh_error:
                    result["error"] = f"Erreur lors du rafraîchissement: {str(refresh_error)}"
            else:
                result["error"] = f"Pas de token"
        return result
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Erreur lors de la vérification des credentials Google: {str(e)}")
        return result

def check_microsoft_credentials(user_id: str) -> Dict[str, Any]:
    """
    Vérifie si des credentials Microsoft valides existent pour un utilisateur donné.
    
    Args:
        user_id: Identifiant de l'utilisateur
        
    Returns:
        Dictionnaire avec les informations sur les credentials
    """
    token_path = os.environ.get("OUTLOOK_TOKEN_PATH", "outlook_token.json").replace("user_id", user_id)
    
    result = {
        "authenticated": False,
        "valid": False,
        "token_path": token_path,
        "user_id": user_id,
        "error": None,
        "account_info": None
    }
    
    try:
        # Vérifier si le token existe
        if not os.path.exists(token_path):
            result["error"] = f"Fichier token non trouvé: {token_path}"
            return result
            
        # Lire le cache de tokens
        with open(token_path, 'r') as token_file:
            cache_data = token_file.read()
            
            if not cache_data:
                result["error"] = "Cache de token vide"
                return result
                
            # Créer un cache de token
            token_cache = msal.SerializableTokenCache()
            token_cache.deserialize(cache_data)
            
            # Récupérer les identifiants d'application
            client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
            client_secret = os.getenv("OUTLOOK_CLIENT_SECRET", "")
            tenant_id = os.getenv("OUTLOOK_TENANT_ID", "common")
            
            if not all([client_id, client_secret]):
                result["error"] = "Variables d'environnement manquantes pour Outlook"
                return result
                
            # Créer l'application
            app = msal.ConfidentialClientApplication(
                client_id=client_id,
                client_credential=client_secret,
                authority=f"https://login.microsoftonline.com/{tenant_id}",
                token_cache=token_cache
            )
            
            # Trouver les comptes existants dans le cache
            accounts = app.get_accounts()
            
            if not accounts:
                result["error"] = "Aucun compte trouvé dans le cache de tokens"
                return result
                
            # Au moins un compte trouvé
            result["authenticated"] = True
            result["account_info"] = {"username": accounts[0].get("username", "Unknown")}
            
            # Essayer d'acquérir un token silencieusement
            token_result = app.acquire_token_silent(["https://graph.microsoft.com/.default"], account=accounts[0])
            
            if token_result and "access_token" in token_result:
                result["valid"] = True
                
                # Sauvegarder le cache si modifié
                if token_cache.has_state_changed:
                    save_microsoft_token(user_id, token_cache.serialize())
                    
        return result
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Erreur lors de la vérification des credentials Microsoft: {str(e)}")
        return result
