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
from backend.services.auth.google_auth import get_gmail_service

logger = log.bind(name="backend.services.style_analysis.email_extractor")

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


class GmailEmailExtractor:
    """
    Extracteur d'emails Gmail utilisant Gmail API via Google OAuth2.
    """
    
    def __init__(self, user_id: str):
        """
        Initialise l'extracteur pour un utilisateur spécifique.
        
        Args:
            user_id: Identifiant de l'utilisateur
        """
        self.user_id = user_id
        self.service = None
        self._load_service()
    
    def _load_service(self) -> bool:
        """
        Charge le service Gmail pour l'utilisateur.
        
        Returns:
            True si le service est chargé avec succès, False sinon
        """
        try:
            self.service = get_gmail_service(self.user_id)
            if not self.service:
                logger.error(f"Échec de l'authentification à Gmail pour l'utilisateur {self.user_id}")
                return False
            
            logger.info(f"Service Gmail chargé avec succès pour l'utilisateur {self.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors du chargement du service Gmail: {str(e)}")
            return False
    
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
        if not self.service:
            logger.error("Service Gmail non disponible pour récupérer les emails")
            return []
        
        try:
            # Calculer la date de début
            start_date = datetime.now() - timedelta(days=days_back)
            start_date_str = start_date.strftime('%Y/%m/%d')
            
            # Construire la requête de recherche Gmail
            query = f"in:sent after:{start_date_str}"
            
            logger.info(f"Récupération des emails envoyés Gmail pour {self.user_id} depuis {days_back} jours")
            
            all_emails = []
            page_token = None
            
            while len(all_emails) < max_emails:
                try:
                    # Récupérer la liste des messages
                    result = self.service.users().messages().list(
                        userId='me',
                        q=query,
                        maxResults=min(100, max_emails - len(all_emails)),
                        pageToken=page_token
                    ).execute()
                    
                    messages = result.get('messages', [])
                    if not messages:
                        break
                    
                    # Récupérer les détails de chaque message
                    for message in messages:
                        try:
                            email_data = self.service.users().messages().get(
                                userId='me',
                                id=message['id'],
                                format='full'
                            ).execute()
                            
                            processed_email = self._process_email(email_data)
                            if processed_email:
                                all_emails.append(processed_email)
                                
                        except Exception as e:
                            logger.warning(f"Erreur traitement email {message['id']}: {str(e)}")
                            continue
                    
                    # Vérifier s'il y a plus de pages
                    page_token = result.get('nextPageToken')
                    if not page_token:
                        break
                        
                except Exception as e:
                    logger.error(f"Erreur récupération page d'emails: {str(e)}")
                    break
            
            logger.info(f"Récupéré {len(all_emails)} emails envoyés Gmail pour {self.user_id}")
            return all_emails
            
        except Exception as e:
            logger.error(f"Erreur récupération emails Gmail: {str(e)}")
            traceback.print_exc()
            return []
    
    def _process_email(self, email_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Traite un email brut de l'API Gmail pour extraire les informations pertinentes.
        
        Args:
            email_data: Données brutes de l'email depuis Gmail API
            
        Returns:
            Email traité avec métadonnées ou None si erreur
        """
        try:
            payload = email_data.get('payload', {})
            headers = payload.get('headers', [])
            
            # Extraire les headers importants
            header_dict = {}
            for header in headers:
                header_dict[header['name'].lower()] = header['value']
            
            subject = header_dict.get('subject', '')
            from_email = header_dict.get('from', '')
            to_emails = header_dict.get('to', '')
            cc_emails = header_dict.get('cc', '')
            date_str = header_dict.get('date', '')
            
            # Extraire le corps de l'email
            body = self._extract_email_body(payload)
            
            # Parser les destinataires
            to_recipients = self._parse_recipients(to_emails)
            cc_recipients = self._parse_recipients(cc_emails)
            all_recipients = to_recipients + cc_recipients
            
            # Analyser les destinataires
            recipient_analysis = self._analyze_recipients(all_recipients)
            
            # Déterminer le type d'email
            email_type = self._determine_email_type(subject)
            
            # Construire l'email traité
            processed_email = {
                'id': email_data.get('id', ''),
                'thread_id': email_data.get('threadId', ''),
                'subject': subject,
                'body': body,
                'from': from_email,
                'to_recipients': to_recipients,
                'cc_recipients': cc_recipients,
                'sent_date': date_str,
                'email_type': email_type,
                'recipient_analysis': recipient_analysis,
                'provider': 'gmail'
            }
            
            return processed_email
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement de l'email Gmail: {str(e)}")
            return None
    
    def _extract_email_body(self, payload: Dict[str, Any]) -> str:
        """
        Extrait le corps de l'email depuis le payload Gmail.
        
        Args:
            payload: Payload de l'email Gmail
            
        Returns:
            Corps de l'email en texte
        """
        body = ""
        
        try:
            # Si le message a des parties multiples
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        data = part['body'].get('data', '')
                        if data:
                            import base64
                            body = base64.urlsafe_b64decode(data).decode('utf-8')
                            break
                    elif part['mimeType'] == 'text/html' and not body:
                        data = part['body'].get('data', '')
                        if data:
                            import base64
                            html_body = base64.urlsafe_b64decode(data).decode('utf-8')
                            # Convertir HTML en texte (basique)
                            import re
                            body = re.sub(r'<[^>]+>', '', html_body)
            else:
                # Message simple
                if payload.get('mimeType') == 'text/plain':
                    data = payload['body'].get('data', '')
                    if data:
                        import base64
                        body = base64.urlsafe_b64decode(data).decode('utf-8')
                elif payload.get('mimeType') == 'text/html':
                    data = payload['body'].get('data', '')
                    if data:
                        import base64
                        html_body = base64.urlsafe_b64decode(data).decode('utf-8')
                        # Convertir HTML en texte (basique)
                        import re
                        body = re.sub(r'<[^>]+>', '', html_body)
            
            return body.strip()
            
        except Exception as e:
            logger.error(f"Erreur extraction corps email Gmail: {str(e)}")
            return ""
    
    def _parse_recipients(self, recipients_str: str) -> List[Dict[str, Any]]:
        """
        Parse une chaîne de destinataires en liste structurée.
        
        Args:
            recipients_str: Chaîne de destinataires (ex: "Name <email@domain.com>, Other <other@domain.com>")
            
        Returns:
            Liste de destinataires structurés
        """
        recipients = []
        
        if not recipients_str:
            return recipients
        
        try:
            import re
            # Pattern pour extraire nom et email
            pattern = r'([^<,]+)?\s*<([^>]+)>|([^<,]+@[^,\s]+)'
            matches = re.findall(pattern, recipients_str)
            
            for match in matches:
                name, email, direct_email = match
                if email:
                    recipients.append({
                        'name': name.strip() if name else '',
                        'email': email.strip()
                    })
                elif direct_email:
                    recipients.append({
                        'name': '',
                        'email': direct_email.strip()
                    })
            
            return recipients
            
        except Exception as e:
            logger.error(f"Erreur parsing destinataires: {str(e)}")
            return []
    
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
    
    def get_conversation_context(self, thread_id: str) -> List[Dict[str, Any]]:
        """
        Récupère le contexte d'une conversation (thread Gmail).
        
        Args:
            thread_id: ID du thread Gmail
            
        Returns:
            Liste des emails du thread
        """
        if not self.service:
            return []
        
        try:
            thread = self.service.users().threads().get(
                userId='me',
                id=thread_id
            ).execute()
            
            messages = thread.get('messages', [])
            context_emails = []
            
            for message in messages:
                processed_email = self._process_email(message)
                if processed_email:
                    context_emails.append(processed_email)
            
            return context_emails
            
        except Exception as e:
            logger.error(f"Erreur récupération contexte thread Gmail: {str(e)}")
            return []
