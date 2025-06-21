#!/usr/bin/env python3
"""
Script de test pour le SyncManager
===================================
Ce script permet de tester les fonctionnalités du SyncManager
sans nécessairement synchroniser tous les emails.
"""

import os
import sys
import json
from pathlib import Path

# Ajouter les chemins nécessaires au path
current_dir = Path(__file__).parent
root_dir = current_dir.parent
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))  
sys.path.append(str(current_dir))

# Configurer le logger
from backend.core.logger import log
logger = log.bind(name="backend.services.sync_service.test_sync_manager")

# Importer SyncManager
from core.sync_manager import SyncManager
from backend.core.config import load_config

def test_get_authenticated_users(sync_manager):
    """Teste la fonction get_authenticated_users du SyncManager"""
    logger.info("=== Test: get_authenticated_users ===")
    users = sync_manager.get_authenticated_users()
    logger.info(f"Utilisateurs trouvés: {json.dumps(users, indent=2)}")
    return users

def test_sync_provider(sync_manager, user_id, provider):
    """Teste la synchronisation pour un utilisateur et un provider spécifiques"""
    logger.info(f"=== Test: sync_provider pour {user_id} / {provider} ===")
    try:
        sync_manager.sync_provider(user_id, provider)
        logger.info(f"Synchronisation réussie pour {user_id}/{provider}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la synchronisation: {e}", exc_info=True)
        return False

def test_sync_all_users(sync_manager):
    """Teste la synchronisation pour tous les utilisateurs"""
    logger.info("=== Test: sync_all_users ===")
    try:
        sync_manager.sync_all_users()
        logger.info("Synchronisation complète réussie")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la synchronisation complète: {e}", exc_info=True)
        return False

def print_config_info(config):
    """Affiche les informations de configuration"""
    logger.info("=== Configuration ===")
    
    # Afficher les détails de configuration pour chaque provider
    for provider in ['gmail', 'outlook']:
        if provider in config.get('sync', {}):
            logger.info(f"Provider {provider}:")
            logger.info(f"  - Activé: {config['sync'][provider].get('enabled', True)}")
            logger.info(f"  - Requête: {config['sync'][provider].get('query', 'default')}")
            logger.info(f"  - Dossiers: {config['sync'][provider].get('folders', [])}")
            logger.info(f"  - Limite par dossier: {config['sync'][provider].get('limit_per_folder', 50)}")
    
    # Vérifier les chemins pour les tokens
    gmail_path = os.environ.get('GMAIL_TOKEN_PATH', 'Non défini')
    outlook_path = os.environ.get('OUTLOOK_TOKEN_PATH', 'Non défini')
    token_dir = os.environ.get('TOKEN_DIRECTORY', 'Non défini')
    
    logger.info(f"Chemins de tokens:")
    logger.info(f"  - TOKEN_DIRECTORY: {token_dir}")
    logger.info(f"  - GMAIL_TOKEN_PATH: {gmail_path}")
    logger.info(f"  - OUTLOOK_TOKEN_PATH: {outlook_path}")

def main():
    # Charger la configuration
    config = load_config()
    print_config_info(config)
    
    # Création du SyncManager
    sync_manager = SyncManager(config)
    
    sync_manager.sync_all_users()
    # Test des fonctions principales
    users = test_get_authenticated_users(sync_manager)
    
    # Si aucun utilisateur n'est trouvé
    if not users:
        logger.warning("Aucun utilisateur authentifié trouvé.")
        logger.info("Vérifiez les chemins des tokens et assurez-vous qu'ils existent.")
        return
    
    # Pour chaque utilisateur et provider, tester la synchronisation si demandé
    choice = input("Voulez-vous tester la synchronisation d'un utilisateur spécifique? (o/n): ").lower()
    if choice == 'o':
        # Afficher les utilisateurs disponibles
        print("\nUtilisateurs disponibles:")
        for i, (user_id, providers) in enumerate(users.items(), 1):
            print(f"{i}. {user_id} ({', '.join(providers)})")
        
        # Demander à l'utilisateur de choisir
        try:
            user_index = int(input("\nEntrez le numéro de l'utilisateur: ")) - 1
            if 0 <= user_index < len(users):
                user_id = list(users.keys())[user_index]
                providers = users[user_id]
                
                print(f"\nProviders disponibles pour {user_id}:")
                for i, provider in enumerate(providers, 1):
                    print(f"{i}. {provider}")
                
                provider_index = int(input("\nEntrez le numéro du provider: ")) - 1
                if 0 <= provider_index < len(providers):
                    provider = providers[provider_index]
                    test_sync_provider(sync_manager, user_id, provider)
                else:
                    logger.error("Choix de provider invalide")
            else:
                logger.error("Choix d'utilisateur invalide")
        except ValueError:
            logger.error("Veuillez entrer un nombre valide")
    
    # Tester la synchronisation complète si demandé
    choice = input("\nVoulez-vous tester la synchronisation complète pour tous les utilisateurs? (o/n): ").lower()
    if choice == 'o':
        test_sync_all_users(sync_manager)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTest interrompu par l'utilisateur.")
    except Exception as e:
        logger.error(f"Erreur non gérée: {e}", exc_info=True)
