#!/usr/bin/env python3
"""
Generate Style Profiles Script

Ce script génère automatiquement des profils de style d'écriture pour tous les utilisateurs
connectés à Outlook qui n'ont pas encore de profil dans la base de données.

Usage:
    python generate_style_profiles.py [--dry-run] [--user-id USER_ID] [--force]
    
Options:
    --dry-run    Affiche ce qui serait fait sans exécuter les actions
    --user-id    Traite uniquement l'utilisateur spécifié
    --force      Force la régénération même si un profil existe déjà
"""

import os
import sys
import asyncio
import argparse
from datetime import datetime
from typing import List, Dict, Any, Optional

# Ajouter le chemin du backend au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.core.logger import log
from backend.services.auth.credentials_manager import get_authenticated_users_by_provider, check_microsoft_credentials
from backend.services.db.models import ToneProfile, User
from email_extractor import OutlookEmailExtractor
from email_preprocessor import EmailPreprocessor
from style_analyzer import StyleAnalyzer

logger = log.bind(name="backend.services.tone_of_voice.generate_style_profiles")


class StyleProfileGenerator:
    """Générateur de profils de style pour les utilisateurs Outlook"""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.email_preprocessor = EmailPreprocessor()
        self.style_analyzer = StyleAnalyzer()
        
        logger.info(f"StyleProfileGenerator initialisé (dry_run={dry_run})")
    
    async def generate_profile_for_user(self, user_id: str, force: bool = False) -> Dict[str, Any]:
        """
        Génère un profil de style pour un utilisateur spécifique.
        
        Args:
            user_id: Identifiant de l'utilisateur
            force: Force la régénération même si un profil existe
            
        Returns:
            Dictionnaire avec les résultats de l'opération
        """
        result = {
            'user_id': user_id,
            'success': False,
            'profile_created': False,
            'profile_updated': False,
            'email_count': 0,
            'error': None,
            'existing_profile': None
        }
        
        try:
            logger.info(f"Traitement de l'utilisateur {user_id}")
            self.email_extractor = OutlookEmailExtractor(user_id)

            # Vérifier si un profil existe déjà
            existing_profile = ToneProfile.get_by_user_and_provider(user_id, 'outlook')
            if existing_profile:
                result['existing_profile'] = existing_profile.to_dict()
                if not force:
                    logger.info(f"Profil existant trouvé pour {user_id}, passage au suivant (utilisez --force pour régénérer)")
                    result['success'] = True
                    return result
                else:
                    logger.info(f"Profil existant trouvé pour {user_id}, régénération forcée")
            
            # Vérifier les credentials Microsoft
            creds_check = check_microsoft_credentials(user_id)
            if not creds_check.get('authenticated', False):
                result['error'] = f"Utilisateur {user_id} non authentifié avec Microsoft"
                logger.warning(result['error'])
                return result
            
            # Extraire les emails
            logger.info(f"Extraction des emails pour {user_id}")
            emails = await self.email_extractor.get_sent_emails()
            
            if not emails:
                result['error'] = f"Aucun email trouvé pour {user_id}"
                logger.warning(result['error'])
                return result
            
            logger.info(f"{len(emails)} emails extraits pour {user_id}")
            result['email_count'] = len(emails)
            
            # Prétraiter les emails
            logger.info(f"Prétraitement des emails pour {user_id}")
            processed_emails = []
            for email in emails:
                try:
                    processed_email = self.email_preprocessor.preprocess_email(email)
                    if processed_email and processed_email.get('body', '').strip():
                        processed_emails.append(processed_email)
                except Exception as e:
                    logger.warning(f"Erreur lors du prétraitement d'un email pour {user_id}: {str(e)}")
                    continue
            
            if not processed_emails:
                result['error'] = f"Aucun email valide après prétraitement pour {user_id}"
                logger.warning(result['error'])
                return result
            
            logger.info(f"{len(processed_emails)} emails prétraités pour {user_id}")
            
            # Limiter le nombre d'emails pour l'analyse (pour éviter les tokens excessifs)
            max_emails_for_analysis = 20
            if len(processed_emails) > max_emails_for_analysis:
                processed_emails = processed_emails[:max_emails_for_analysis]
                logger.info(f"Limitation à {max_emails_for_analysis} emails pour l'analyse")
            
            if self.dry_run:
                logger.info(f"[DRY RUN] Analyserait {len(processed_emails)} emails pour {user_id}")
                result['success'] = True
                return result
            
            # Analyser le style avec LLM
            logger.info(f"Analyse du style avec LLM pour {user_id}")
            analysis_result = await self.style_analyzer.analyze_user_style(processed_emails)
            
            if not analysis_result or 'style_analysis' not in analysis_result:
                result['error'] = f"Échec de l'analyse de style pour {user_id}"
                logger.error(result['error'])
                return result
            
            style_analysis = analysis_result['style_analysis']
            analysis_metadata = analysis_result.get('analysis_metadata', {})
            
            # Sauvegarder ou mettre à jour le profil
            if existing_profile and force:
                # Mettre à jour le profil existant
                existing_profile.update(
                    style_analysis=style_analysis,
                    email_count=len(processed_emails)
                )
                logger.info(f"Profil mis à jour pour {user_id}")
                result['profile_updated'] = True
            else:
                # Créer un nouveau profil
                profile = ToneProfile.create(
                    user_id=user_id,
                    provider='outlook',
                    style_analysis=style_analysis,
                    email_count=len(processed_emails),
                    analysis_date=datetime.now()
                )
                
                if profile:
                    logger.info(f"Nouveau profil créé pour {user_id}")
                    result['profile_created'] = True
                else:
                    result['error'] = f"Échec de la création du profil pour {user_id}"
                    logger.error(result['error'])
                    return result
            
            result['success'] = True
            logger.info(f"Profil de style généré avec succès pour {user_id}")
            
        except Exception as e:
            result['error'] = f"Erreur lors du traitement de {user_id}: {str(e)}"
            logger.error(result['error'])
        
        return result
    
    async def generate_profiles_for_all_users(self, force: bool = False) -> Dict[str, Any]:
        """
        Génère des profils de style pour tous les utilisateurs Outlook authentifiés.
        
        Args:
            force: Force la régénération même si des profils existent
            
        Returns:
            Dictionnaire avec les résultats globaux
        """
        logger.info("Début de la génération de profils pour tous les utilisateurs Outlook")
        
        # Obtenir la liste des utilisateurs authentifiés avec Outlook
        authenticated_users = get_authenticated_users_by_provider('outlook')
        
        if not authenticated_users:
            logger.warning("Aucun utilisateur authentifié avec Outlook trouvé")
            return {
                'total_users': 0,
                'processed_users': 0,
                'successful_profiles': 0,
                'failed_profiles': 0,
                'skipped_profiles': 0,
                'results': []
            }
        
        logger.info(f"{len(authenticated_users)} utilisateurs Outlook trouvés")
        
        results = []
        successful_profiles = 0
        failed_profiles = 0
        skipped_profiles = 0
        
        for user_id in authenticated_users:
            logger.info(f"Traitement de l'utilisateur {user_id} ({len(results) + 1}/{len(authenticated_users)})")
            
            result = await self.generate_profile_for_user(user_id, force)
            results.append(result)
            
            if result['success']:
                if result['profile_created'] or result['profile_updated']:
                    successful_profiles += 1
                else:
                    skipped_profiles += 1
            else:
                failed_profiles += 1
            
            # Petite pause entre les utilisateurs pour éviter la surcharge
            await asyncio.sleep(1)
        
        summary = {
            'total_users': len(authenticated_users),
            'processed_users': len(results),
            'successful_profiles': successful_profiles,
            'failed_profiles': failed_profiles,
            'skipped_profiles': skipped_profiles,
            'results': results
        }
        
        logger.info(f"Génération terminée: {successful_profiles} succès, {failed_profiles} échecs, {skipped_profiles} ignorés")
        return summary


async def main():
    """Fonction principale du script"""
    parser = argparse.ArgumentParser(description='Génère des profils de style pour les utilisateurs Outlook')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Affiche ce qui serait fait sans exécuter les actions')
    parser.add_argument('--user-id', type=str, 
                       help='Traite uniquement l\'utilisateur spécifié')
    parser.add_argument('--force', action='store_true',
                       help='Force la régénération même si un profil existe déjà')
    
    args = parser.parse_args()
    
    logger.info("=== Début du script de génération de profils de style ===")
    logger.info(f"Options: dry_run={args.dry_run}, user_id={args.user_id}, force={args.force}")
    
    generator = StyleProfileGenerator(dry_run=args.dry_run)
    
    try:
        if args.user_id:
            # Traiter un utilisateur spécifique
            logger.info(f"Traitement de l'utilisateur spécifique: {args.user_id}")
            result = await generator.generate_profile_for_user(args.user_id, args.force)
            
            print(f"\n=== Résultat pour {args.user_id} ===")
            print(f"Succès: {result['success']}")
            print(f"Emails traités: {result['email_count']}")
            print(f"Profil créé: {result['profile_created']}")
            print(f"Profil mis à jour: {result['profile_updated']}")
            if result['error']:
                print(f"Erreur: {result['error']}")
            
        else:
            # Traiter tous les utilisateurs
            logger.info("Traitement de tous les utilisateurs Outlook")
            summary = await generator.generate_profiles_for_all_users(args.force)
            
            print(f"\n=== Résumé de la génération ===")
            print(f"Utilisateurs trouvés: {summary['total_users']}")
            print(f"Utilisateurs traités: {summary['processed_users']}")
            print(f"Profils créés/mis à jour: {summary['successful_profiles']}")
            print(f"Échecs: {summary['failed_profiles']}")
            print(f"Ignorés (profils existants): {summary['skipped_profiles']}")
            
            # Afficher les détails des échecs
            failed_results = [r for r in summary['results'] if not r['success']]
            if failed_results:
                print(f"\n=== Détails des échecs ===")
                for result in failed_results:
                    print(f"- {result['user_id']}: {result['error']}")
    
    except Exception as e:
        logger.error(f"Erreur fatale dans le script principal: {str(e)}")
        print(f"Erreur fatale: {str(e)}")
        sys.exit(1)
    
    logger.info("=== Fin du script de génération de profils de style ===")


if __name__ == "__main__":
    asyncio.run(main())
