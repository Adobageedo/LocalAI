"""
Email Preprocessor

Ce module nettoie et prétraite les emails pour l'analyse de style.
Il supprime les signatures automatiques, disclaimers, et autres éléments parasites
tout en préservant les informations importantes comme les noms et prénoms.
"""

import re
import os
import sys
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Ajouter le chemin du backend au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from src.core.logger import log

logger = log.bind(name="backend.services.style_analysis.email_preprocessor")

class EmailPreprocessor:
    """
    Préprocesseur d'emails pour nettoyer le contenu avant analyse de style.
    """
    
    def __init__(self):
        """Initialise le préprocesseur avec les patterns de nettoyage."""
        self._init_patterns()
    
    def _init_patterns(self):
        """Initialise les expressions régulières pour le nettoyage."""
        
        # Patterns pour les disclaimers uniquement
        self.disclaimer_patterns = [
            # Disclaimers de confidentialité
            r'(?:^|\n)(?:CONFIDENTIAL|CONFIDENTIEL|AVERTISSEMENT|DISCLAIMER).*?(?:\n.*?)*?(?=\n\n|\n$|$)',
            r'(?:^|\n).*?(?:confidential|confidentiel|proprietary|propriétaire).*?(?:\n.*?)*?(?=\n\n|\n$|$)',
            r'(?:^|\n).*?(?:intended recipient|destinataire prévu).*?(?:\n.*?)*?(?=\n\n|\n$|$)',
            
            # Disclaimers légaux
            r'(?:^|\n).*?(?:legal|légal|juridique|attorney|avocat).*?(?:\n.*?)*?(?=\n\n|\n$|$)',
            r'(?:^|\n).*?(?:privilege|privilège|attorney-client).*?(?:\n.*?)*?(?=\n\n|\n$|$)',
        ]
    
    def preprocess_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prétraite un email complet.
        
        Args:
            email_data: Données de l'email à prétraiter
            
        Returns:
            Email prétraité avec contenu nettoyé et métadonnées extraites
        """
        try:
            # Copier les données originales
            processed_email = email_data.copy()
            
            # Nettoyer le corps de l'email
            original_body = email_data.get('body', '')
            cleaned_body, extracted_info = self.clean_email_body(original_body)
            
            # Ajouter les métadonnées de l'email à la fin du corps nettoyé
            email_metadata = self._format_email_metadata(email_data)
            if email_metadata:
                cleaned_body += "\n\n" + email_metadata
            
            # Mettre à jour le corps nettoyé
            processed_email['body'] = cleaned_body
            processed_email['original_body'] = original_body
            
            # Ajouter les informations extraites
            processed_email.update(extracted_info)
            
            # Analyser la structure de l'email
            structure_analysis = self.analyze_email_structure(cleaned_body)
            processed_email['structure_analysis'] = structure_analysis
            
            # Calculer des métriques de base
            metrics = self.calculate_basic_metrics(cleaned_body)
            processed_email['metrics'] = metrics
            
            return processed_email
            
        except Exception as e:
            logger.error(f"Erreur lors du prétraitement de l'email: {str(e)}")
            return email_data
    
    def _format_email_metadata(self, email_data: Dict[str, Any]) -> str:
        """
        Formate les métadonnées de l'email (sujet, expéditeur, destinataires, CC).
        
        Args:
            email_data: Données de l'email
            
        Returns:
            Chaîne formatée avec les métadonnées
        """
        metadata_parts = []
        
        # Sujet
        subject = email_data.get('subject', '').strip()
        if subject:
            metadata_parts.append(f"Sujet: {subject}")
        
        # Expéditeur
        sender = email_data.get('sender_email', '')
        if isinstance(sender, dict):
            sender_email = sender.get('emailAddress', {}).get('address', '')
            sender_name = sender.get('emailAddress', {}).get('name', '')
            if sender_email:
                if sender_name:
                    metadata_parts.append(f"De: {sender_name} <{sender_email}>")
                else:
                    metadata_parts.append(f"De: {sender_email}")
        elif isinstance(sender, str) and sender:
            metadata_parts.append(f"De: {sender}")
        
        # Destinataires
        recipients = email_data.get('recipients', []) or email_data.get('toRecipients', [])
        if recipients:
            recipient_list = []
            for recipient in recipients:
                if isinstance(recipient, dict):
                    email_addr = recipient.get('emailAddress', {}).get('address', '') or recipient.get('email', '')
                    name = recipient.get('emailAddress', {}).get('name', '') or recipient.get('name', '')
                    if email_addr:
                        if name:
                            recipient_list.append(f"{name} <{email_addr}>")
                        else:
                            recipient_list.append(email_addr)
                elif isinstance(recipient, str):
                    recipient_list.append(recipient)
            
            if recipient_list:
                metadata_parts.append(f"À: {', '.join(recipient_list)}")
        
        # CC
        cc_recipients = email_data.get('ccRecipients', [])
        if cc_recipients:
            cc_list = []
            for cc_recipient in cc_recipients:
                if isinstance(cc_recipient, dict):
                    email_addr = cc_recipient.get('emailAddress', {}).get('address', '') or cc_recipient.get('email', '')
                    name = cc_recipient.get('emailAddress', {}).get('name', '') or cc_recipient.get('name', '')
                    if email_addr:
                        if name:
                            cc_list.append(f"{name} <{email_addr}>")
                        else:
                            cc_list.append(email_addr)
                elif isinstance(cc_recipient, str):
                    cc_list.append(cc_recipient)
            
            if cc_list:
                metadata_parts.append(f"CC: {', '.join(cc_list)}")
        
        return "\n".join(metadata_parts) if metadata_parts else ""
    
    def clean_email_body(self, body: str) -> Tuple[str, Dict[str, Any]]:
        """
        Nettoie le corps d'un email en supprimant les éléments parasites.
        
        Args:
            body: Corps de l'email à nettoyer
            
        Returns:
            Tuple (corps nettoyé, informations extraites)
        """
        if not body:
            return "", {}
        
        # Initialiser les informations extraites
        extracted_info = {
            'disclaimers_removed': 0
        }
        
        # Convertir HTML en texte si nécessaire
        if '<' in body and '>' in body:
            cleaned_body = self._html_to_text(body)
        else:
            cleaned_body = body
        
        # Supprimer les disclaimers
        for pattern in self.disclaimer_patterns:
            matches = re.findall(pattern, cleaned_body, re.MULTILINE | re.IGNORECASE)
            extracted_info['disclaimers_removed'] += len(matches)
            cleaned_body = re.sub(pattern, '', cleaned_body, flags=re.MULTILINE | re.IGNORECASE)
        
        # Nettoyer les espaces et lignes vides multiples
        cleaned_body = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_body)
        cleaned_body = re.sub(r'[ \t]+', ' ', cleaned_body)
        cleaned_body = cleaned_body.strip()
        
        return cleaned_body, extracted_info
    
    def _html_to_text(self, html_content: str) -> str:
        """
        Convertit le contenu HTML en texte brut.
        
        Args:
            html_content: Contenu HTML
            
        Returns:
            Texte brut
        """
        # Supprimer les balises HTML courantes
        text = re.sub(r'<br\s*/?>', '\n', html_content, flags=re.IGNORECASE)
        text = re.sub(r'<p\s*/?>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'<div[^>]*>', '\n', text, flags=re.IGNORECASE)
        text = re.sub(r'</div>', '\n', text, flags=re.IGNORECASE)
        
        # Supprimer toutes les autres balises HTML
        text = re.sub(r'<[^>]+>', '', text)
        
        # Décoder les entités HTML courantes
        html_entities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&eacute;': 'é',
            '&egrave;': 'è',
            '&agrave;': 'à',
            '&ccedil;': 'ç'
        }
        
        for entity, char in html_entities.items():
            text = text.replace(entity, char)
        
        return text
    

    
    def analyze_email_structure(self, text: str) -> Dict[str, Any]:
        """
        Analyse la structure de l'email.
        
        Args:
            text: Texte de l'email nettoyé
            
        Returns:
            Analyse de la structure
        """
        if not text:
            return {}
        
        lines = text.split('\n')
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        return {
            'line_count': len(lines),
            'paragraph_count': len(paragraphs),
            'avg_paragraph_length': sum(len(p) for p in paragraphs) / len(paragraphs) if paragraphs else 0,
            'question_count': text.count('?'),
            'exclamation_count': text.count('!'),
        }
    
    def calculate_basic_metrics(self, text: str) -> Dict[str, Any]:
        """
        Calcule des métriques de base sur le texte.
        
        Args:
            text: Texte à analyser
            
        Returns:
            Métriques calculées
        """
        if not text:
            return {}
        
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return {
            'character_count': len(text),
            'word_count': len(words),
            'sentence_count': len(sentences),
            'avg_word_length': sum(len(word) for word in words) / len(words) if words else 0,
            'avg_sentence_length': sum(len(sentence.split()) for sentence in sentences) / len(sentences) if sentences else 0,
            'punctuation_density': (text.count('.') + text.count('!') + text.count('?')) / len(text) if text else 0,
        }
    
    def preprocess_email_batch(self, emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prétraite un lot d'emails.
        
        Args:
            emails: Liste des emails à prétraiter
            
        Returns:
            Liste des emails prétraités
        """
        processed_emails = []
        
        for i, email in enumerate(emails):
            try:
                processed_email = self.preprocess_email(email)
                processed_emails.append(processed_email)
                                    
            except Exception as e:
                logger.error(f"Erreur lors du prétraitement de l'email {i}: {str(e)}")
                # Ajouter l'email original en cas d'erreur
                processed_emails.append(email)
        return processed_emails
