"""
Gestionnaire de tokens pour l'authentification Google et Microsoft.
Ce module fournit des fonctions pour charger et sauvegarder des tokens
d'authentification dans différents formats (pickle pour Google, JSON pour Microsoft).
"""

import os
import json
import pickle
import logging
import glob
from typing import Any, Dict, Optional, Union, Tuple, List
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

def get_authenticated_users_by_provider(provider: str) -> List[str]:
    """
    Récupère la liste des utilisateurs authentifiés pour un provider spécifique.
    
    Args:
        provider: Nom du provider ('gmail' ou 'outlook')
        
    Returns:
        Liste des identifiants utilisateurs ayant des tokens enregistrés
    """
    users = []
    
    try:
        # Déterminer le chemin de base et le pattern selon le provider
        if provider.lower() == 'gmail':
            # On considère TOKEN_DIRECTORY/gmail/*.json comme structure
            token_dir = os.environ.get('GMAIL_TOKEN_PATH', 'token.pickle')
            base_path = token_dir.replace("user_id.pickle", "")
            pattern = '*.pickle'
        elif provider.lower() == 'outlook':
            # On considère TOKEN_DIRECTORY/outlook/*.json comme structure
            token_dir = os.environ.get('OUTLOOK_TOKEN_PATH', 'outlook_token.json')
            base_path = token_dir.replace("user_id.json", "")
            pattern = '*.json'
        else:
            logger.error(f"Provider non supporté: {provider}")
            return []
            
        # Vérifier si le répertoire existe
        if not os.path.exists(base_path):
            logger.warning(f"Répertoire des tokens non trouvé: {base_path}")
            return []
            
        # Rechercher les fichiers de token
        search_pattern = os.path.join(base_path, pattern)
        token_files = glob.glob(search_pattern)
        
        # Extraire les identifiants utilisateurs (nom du fichier sans extension)
        for token_file in token_files:
            user_id = os.path.splitext(os.path.basename(token_file))[0]
            users.append(user_id)
            
        logger.info(f"Trouvé {len(users)} utilisateurs authentifiés pour {provider}: {', '.join(users)}")
        return users
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche des utilisateurs {provider}: {str(e)}")
        return []

def check_microsoft_credentials(user_id: str) -> Dict[str, Any]:
    """
    Vérifie si des credentials Outlook (Microsoft Graph) valides existent pour un utilisateur donné,
    sans tenter de les rafraîchir.

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
        token_data = load_microsoft_token(user_id)  # Doit retourner un dict avec 'access_token', 'expires_at', etc.
        if token_data:
            result["authenticated"] = True
            result["valid"] = True
            result["refreshable"] = "refresh_token" in token_data
    
        else:
            result["error"] = "Aucun token Outlook trouvé"

    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Erreur lors de la vérification des credentials Outlook : {str(e)}")

    return result