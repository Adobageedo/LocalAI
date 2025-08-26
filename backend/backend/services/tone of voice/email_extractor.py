"""
Outlook Email Extractor

Ce module utilise MSAL pour récupérer les emails envoyés par un utilisateur depuis Outlook.
Il gère l'authentification et l'extraction des métadonnées nécessaires à l'analyse de style.
"""
import traceback
import os
import sys
import json
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

# Ajouter le chemin du backend au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from backend.core.logger import log
from backend.services.auth.microsoft_auth import get_outlook_service

logger = log.bind(name="backend.services.tone_of_voice.email_extractor")

class OutlookEmailExtractor:
    """
    Extracteur d'emails Outlook utilisant Microsoft Graph API via MSAL.
    """
    
    def __init__(self, user_id: str):
        """
        Initialise l'extracteur pour un utilisateur spécifique.
        
        Args:
            user_id: Identifiant de l'utilisateur
        """
        self.user_id = user_id
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.token_data = None
        self._load_token()
    
    def _load_token(self) -> bool:
        """
        Charge le token Microsoft pour l'utilisateur.
        
        Returns:
            True si le token est chargé avec succès, False sinon
        """
        try:
            self.token_data = get_outlook_service(self.user_id)
            if not self.token_data or "access_token" not in self.token_data:
                logger.error(f"Échec de l'authentification à Outlook pour l'utilisateur {self.user_id}")
                return False
            
            logger.info(f"Token Microsoft chargé avec succès pour l'utilisateur {self.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors du chargement du token Microsoft: {str(e)}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Génère les headers pour les requêtes Graph API.
        
        Returns:
            Dict contenant les headers d'authentification
        """
        if not self.token_data or 'access_token' not in self.token_data:
            raise ValueError("Token d'accès non disponible")
        
        return {
            'Authorization': f"Bearer {self.token_data['access_token']}",
            'Content-Type': 'application/json'
        }
    
    def get_sent_emails(self, 
                       days_back: int = 90, 
                       max_emails: int = 500) -> List[Dict[str, Any]]:
        """
        Récupère les emails envoyés par l'utilisateur.
        
        Args:
            days_back: Nombre de jours à remonter dans l'historique
            max_emails: Nombre maximum d'emails à récupérer
            
        Returns:
            Liste des emails avec leurs métadonnées
        """
        if not self.token_data:
            logger.error("Token non disponible pour récupérer les emails")
            return []
        
        try:
            # Calculer la date de début
            start_date = datetime.now() - timedelta(days=days_back)
            start_date_str = start_date.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # Construire l'URL de requête
            url = f"{self.base_url}/me/mailFolders/SentItems/messages"
            
            # Paramètres de la requête
            params = {
                '$select': 'id,subject,body,from,toRecipients,ccRecipients,sentDateTime,conversationId,importance,isRead',
                '$filter': f"sentDateTime ge {start_date_str}",
                '$orderby': 'sentDateTime desc',
                '$top': min(max_emails, 1000)  # Limite Graph API
            }
            
            headers = self._get_headers()
            
            logger.info(f"Récupération des emails envoyés pour {self.user_id} depuis {days_back} jours")
            
            all_emails = []
            
            while url and len(all_emails) < max_emails:
                response = requests.get(url, headers=headers, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Erreur API Graph: {response.status_code} - {response.text}")
                    break
                
                data = response.json()
                emails = data.get('value', [])
                
                if not emails:
                    break
                
                # Traiter chaque email
                for email in emails:
                    processed_email = self._process_email(email)
                    if processed_email:
                        all_emails.append(processed_email)
                
                # Vérifier s'il y a une page suivante
                url = data.get('@odata.nextLink')
                params = None  # Les paramètres sont inclus dans nextLink
                
                if len(all_emails) >= max_emails:
                    break
            
            logger.info(f"Récupéré {len(all_emails)} emails envoyés")
            return all_emails[:max_emails]
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des emails: {str(e)}")
            traceback.print_exc()
            return []
    
    def _process_email(self, email_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Traite un email brut de l'API Graph pour extraire les informations pertinentes.
        
        Args:
            email_data: Données brutes de l'email depuis Graph API
            
        Returns:
            Email traité avec métadonnées ou None si erreur
        """
        try:
            # Extraire le contenu du corps
            body_content = ""
            if email_data.get('body'):
                body_content = email_data['body'].get('content', '')
            
            # Extraire les destinataires
            recipients = []
            
            # Destinataires principaux
            if email_data.get('toRecipients'):
                for recipient in email_data['toRecipients']:
                    if recipient.get('emailAddress'):
                        recipients.append({
                            'type': 'to',
                            'email': recipient['emailAddress'].get('address', ''),
                            'name': recipient['emailAddress'].get('name', '')
                        })
            
            # Destinataires en copie
            if email_data.get('ccRecipients'):
                for recipient in email_data['ccRecipients']:
                    if recipient.get('emailAddress'):
                        recipients.append({
                            'type': 'cc',
                            'email': recipient['emailAddress'].get('address', ''),
                            'name': recipient['emailAddress'].get('name', '')
                        })
            
            # Déterminer le type d'email (nouveau, réponse, transfert)
            email_type = self._determine_email_type(email_data.get('subject', ''))
            
            # Analyser le domaine des destinataires pour déterminer interne/externe
            recipient_analysis = self._analyze_recipients(recipients)
            
            processed_email = {
                'id': email_data.get('id'),
                'subject': email_data.get('subject', ''),
                'body': body_content,
                'sent_datetime': email_data.get('sentDateTime'),
                'conversation_id': email_data.get('conversationId'),
                'importance': email_data.get('importance', 'normal'),
                'recipients': recipients,
                'recipient_count': len(recipients),
                'email_type': email_type,
                'has_external_recipients': recipient_analysis['has_external'],
                'has_internal_recipients': recipient_analysis['has_internal'],
                'primary_domain': recipient_analysis['primary_domain'],
                'sender_email': self._get_sender_email(email_data)
            }
            
            return processed_email
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement de l'email: {str(e)}")
            return None
    
    def _determine_email_type(self, subject: str) -> str:
        """
        Détermine le type d'email basé sur le sujet.
        
        Args:
            subject: Sujet de l'email
            
        Returns:
            Type d'email: 'reply', 'forward', ou 'new'
        """
        subject_lower = subject.lower().strip()
        
        if subject_lower.startswith(('re:', 'réf:', 'ref:')):
            return 'reply'
        elif subject_lower.startswith(('fwd:', 'fw:', 'tr:', 'transf:')):
            return 'forward'
        else:
            return 'new'
    
    def _analyze_recipients(self, recipients: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyse les destinataires pour déterminer les domaines et types.
        
        Args:
            recipients: Liste des destinataires
            
        Returns:
            Analyse des destinataires
        """
        domains = {}
        has_external = False
        has_internal = False
        
        # Obtenir le domaine de l'utilisateur (supposé être le domaine principal)
        user_domain = None
        
        for recipient in recipients:
            email = recipient.get('email', '')
            if '@' in email:
                domain = email.split('@')[1].lower()
                domains[domain] = domains.get(domain, 0) + 1
                
                # Logique simple pour déterminer interne/externe
                # Peut être améliorée avec une liste de domaines internes
                if domain.endswith(('.com', '.org', '.net', '.fr', '.eu')):
                    if user_domain is None:
                        user_domain = domain
                    
                    if domain == user_domain:
                        has_internal = True
                    else:
                        has_external = True
        
        # Déterminer le domaine principal (le plus fréquent)
        primary_domain = max(domains.keys(), key=domains.get) if domains else None
        
        return {
            'has_external': has_external,
            'has_internal': has_internal,
            'primary_domain': primary_domain,
            'domains': domains
        }
    
    def _get_sender_email(self, email_data: Dict[str, Any]) -> str:
        """
        Extrait l'email de l'expéditeur.
        
        Args:
            email_data: Données de l'email
            
        Returns:
            Email de l'expéditeur
        """
        if email_data.get('from') and email_data['from'].get('emailAddress'):
            return email_data['from']['emailAddress'].get('address', '')
        return ''
    
    def get_conversation_context(self, conversation_id: str) -> List[Dict[str, Any]]:
        """
        Récupère le contexte d'une conversation (emails reçus associés).
        
        Args:
            conversation_id: ID de la conversation
            
        Returns:
            Liste des emails de la conversation
        """
        if not self.token_data:
            return []
        
        try:
            url = f"{self.base_url}/me/messages"
            params = {
                '$select': 'id,subject,body,from,sentDateTime,isRead',
                '$filter': f"conversationId eq '{conversation_id}'",
                '$orderby': 'sentDateTime asc'
            }
            
            headers = self._get_headers()
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('value', [])
            else:
                logger.error(f"Erreur récupération conversation: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Erreur récupération contexte conversation: {str(e)}")
            return []
