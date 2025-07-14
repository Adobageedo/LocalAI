"""
Module centralisé pour gérer les identifiants d'authentification pour les différents services.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import glob
import pickle
import json
from backend.core.logger import log
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from typing import List

logger = log.bind(name="backend.services.auth.credentials_manager")
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
def load_google_token(user_id):
    """
    Charge un token Google OAuth2 depuis un fichier pickle.
    
    Args:
        user_id (str): Identifiant de l'utilisateur

    Returns:
        Credentials: Objet de credentials Google ou None si non trouvé/invalide
    """
    try:
        from backend.core.config import GMAIL_TOKEN_PATH
        
        token_path = GMAIL_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        #logger.debug(f"Tentative de chargement du token Google pour {user_id} depuis {token_path}")
        
        if not os.path.exists(token_path):
            logger.debug(f"Fichier de token non trouvé: {token_path}")
            return None
            
        with open(token_path, 'rb') as token:
            credentials = pickle.load(token)
            
        #logger.debug(f"Token Google chargé avec succès pour {user_id}")
        return credentials
    except Exception as e:
        logger.error(f"Erreur lors du chargement du token Google pour {user_id}: {str(e)}")
        return None

def save_google_token(user_id, credentials):
    """
    Sauvegarde un token Google OAuth2 dans un fichier pickle.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        credentials: Objet credentials Google à sauvegarder
        
    Returns:
        bool: True si sauvegarde réussie, False sinon
    """
    try:
        from backend.core.config import GMAIL_TOKEN_PATH
        token_path = GMAIL_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        #logger.debug(f"Sauvegarde du token Google pour {user_id} dans {token_path}")
        
        # Créer le répertoire parent s'il n'existe pas
        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        
        with open(token_path, 'wb') as token:
            pickle.dump(credentials, token)
            
        #logger.debug(f"Token Google sauvegardé avec succès pour {user_id}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du token Google pour {user_id}: {str(e)}")
        return False

def check_google_credentials(user_id):
    """
    Vérifie si les credentials Google sont présents et valides.
    Si le token est expiré mais rafraîchissable, il est automatiquement rafraîchi.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        dict: Dictionnaire contenant l'état d'authentification et des informations supplémentaires
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
        creds = load_google_token(user_id)
        
        if not creds:
            result["error"] = "No credentials found"
            return result
            
        # Si nous avons des credentials, l'utilisateur est authentifié
        result["authenticated"] = True
        
        # Vérifier si les credentials sont valides
        if creds.valid:
            result["valid"] = True
            return result
            
        # Vérifier si les credentials sont expirés
        if creds.expired:
            result["expired"] = True
            
            # Vérifier si nous pouvons rafraîchir
            if creds.refresh_token:
                result["refreshable"] = True
                
                try:
                    # Tenter de rafraîchir le token
                    creds.refresh(Request())
                    save_google_token(user_id, creds)
                    result["valid"] = True
                    #logger.debug(f"Token Google rafraîchi avec succès pour {user_id}")
                except Exception as refresh_error:
                    result["error"] = f"Error refreshing token: {str(refresh_error)}"
                    logger.error(f"Erreur lors du rafraîchissement du token Google pour {user_id}: {str(refresh_error)}")
            else:
                result["error"] = "Token expired and no refresh token available"
        #logger.debug(f"Résultat de la vérification des credentials Google pour {user_id}: {result}")
        return result
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Erreur lors de la vérification des credentials Google pour {user_id}: {str(e)}")
        return result

def load_microsoft_token(user_id):
    """
    Charge un token Microsoft OAuth2 depuis un fichier JSON.
    
    Args:
        user_id (str): Identifiant de l'utilisateur

    Returns:
        dict: Contenu du token ou None si non trouvé/invalide
    """
    try:
        from backend.core.config import OUTLOOK_TOKEN_PATH
        token_path = OUTLOOK_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        #logger.debug(f"Tentative de chargement du token Microsoft pour {user_id} depuis {token_path}")
        
        if not os.path.exists(token_path):
            logger.debug(f"Fichier de token non trouvé: {token_path}")
            return None
            
        with open(token_path, 'r') as token_file:
            token_cache = json.load(token_file)
            
        #logger.debug(f"Token Microsoft chargé avec succès pour {user_id}")
        return token_cache
    except Exception as e:
        logger.error(f"Erreur lors du chargement du token Microsoft pour {user_id}: {str(e)}")
        return None

def save_microsoft_token(user_id, token_cache):
    """
    Sauvegarde un token Microsoft OAuth2 dans un fichier JSON.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        token_cache: Contenu du cache de token à sauvegarder
        
    Returns:
        bool: True si sauvegarde réussie, False sinon
    """
    try:
        from backend.core.config import OUTLOOK_TOKEN_PATH
        token_path = OUTLOOK_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        
        #logger.debug(f"Sauvegarde du token Microsoft pour {user_id} dans {token_path}")
        
        # Créer le répertoire parent s'il n'existe pas
        os.makedirs(os.path.dirname(token_path), exist_ok=True)
        
        with open(token_path, 'w') as token_file:
            json.dump(token_cache, token_file)
            
        #logger.debug(f"Token Microsoft sauvegardé avec succès pour {user_id}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde du token Microsoft pour {user_id}: {str(e)}")
        return False

def check_microsoft_credentials(user_id):
    """
    Vérifie si les credentials Microsoft sont présents et valides.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        dict: Dictionnaire contenant l'état d'authentification et des informations supplémentaires
    """
    result = {
        "authenticated": False,
        "valid": False,
        "user_id": user_id,
        "error": None,
        "account_info": None
    }
    
    try:
        token_cache = load_microsoft_token(user_id)
        
        if not token_cache:
            result["error"] = "No credentials found"
            return result
            
        # Si nous avons des credentials, l'utilisateur est authentifié
        result["authenticated"] = True
        
        # Vérifier le contenu du token pour la validité
        # Cette vérification est simplifiée et devrait être adaptée selon la structure exacte du token
        if "Account" in token_cache:
            result["valid"] = True
        else:
            result["error"] = "Invalid token format or expired token"
        
        return result
    except Exception as e:
        result["error"] = str(e)
        logger.error(f"Erreur lors de la vérification des credentials Microsoft pour {user_id}: {str(e)}")
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
        if provider.lower() == 'gmail' or provider.lower() == 'gdrive':
            # On considère TOKEN_DIRECTORY/gmail/*.json comme structure
            token_dir = os.environ.get('GMAIL_TOKEN_PATH', 'token.pickle')
            base_path = os.path.join(BASE_DIR, token_dir.replace("user_id.pickle", ""))
            pattern = '*.pickle'
        elif provider.lower() == 'outlook':
            # On considère TOKEN_DIRECTORY/outlook/*.json comme structure
            token_dir = os.environ.get('OUTLOOK_TOKEN_PATH', 'outlook_token.json')
            base_path = os.path.join(BASE_DIR, token_dir.replace("user_id.json", ""))
            pattern = '*.json'
        elif provider.lower() == 'personal-storage':
            # On considère TOKEN_DIRECTORY/personal-storage/*.json comme structure
            data_dir = os.environ.get('STORAGE_PATH', 'data/auth/personal_storage_token/user_id.json')
            base_path = os.path.join(BASE_DIR, data_dir.replace("user_id.json", ""))
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
            
        return users
        
    except Exception as e:
        logger.error(f"Erreur lors de la recherche des utilisateurs {provider}: {str(e)}")
        return []

def delete_google_token(user_id):
    """
    Supprime un token Google OAuth2 pour un utilisateur spécifique.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        bool: True si suppression réussie, False sinon
    """
    try:
        from backend.core.config import GMAIL_TOKEN_PATH
        
        token_path = GMAIL_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        logger.debug(f"Tentative de suppression du token Google pour {user_id} depuis {token_path}")
        
        if not os.path.exists(token_path):
            logger.debug(f"Fichier de token non trouvé: {token_path}")
            return False
            
        os.remove(token_path)
        logger.debug(f"Token Google supprimé avec succès pour {user_id}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du token Google pour {user_id}: {str(e)}")
        return False

def delete_microsoft_token(user_id):
    """
    Supprime un token Microsoft OAuth2 pour un utilisateur spécifique.
    
    Args:
        user_id (str): Identifiant de l'utilisateur
        
    Returns:
        bool: True si suppression réussie, False sinon
    """
    try:
        from backend.core.config import OUTLOOK_TOKEN_PATH
        
        token_path = OUTLOOK_TOKEN_PATH.replace("user_id", user_id)
        token_path = os.path.join(BASE_DIR, token_path)
        logger.debug(f"Tentative de suppression du token Microsoft pour {user_id} depuis {token_path}")
        
        if not os.path.exists(token_path):
            logger.debug(f"Fichier de token non trouvé: {token_path}")
            return False
            
        os.remove(token_path)
        logger.debug(f"Token Microsoft supprimé avec succès pour {user_id}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du token Microsoft pour {user_id}: {str(e)}")
        return False

def main():
    users = load_google_token('gmail')
    print(users)

if __name__ == '__main__':
    main()
