"""
Service pour l'ingestion et la gestion des emails Gmail.
"""

import os
import tempfile
import logging
import base64
import json
import hashlib
import time
import shutil
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Internal imports
from .auth import get_gmail_service
from .models import Email, EmailMetadata, EmailContent, EmailAttachment
from .utils import compute_email_hash, generate_email_id, format_registry_metadata

# Core service imports
from ...services.vectorstore.vectorstore_service import VectorStoreService
from ...core.file_registry import FileRegistry
from ...services.storage.sync_status_service import SyncStatusService

logger = logging.getLogger(__name__)

class GmailService:
    """Service pour l'ingestion et la gestion des emails Gmail."""
    
    def __init__(self, user_id: str = ""):
        """
        Initialise le service Gmail.
        
        Args:
            user_id: ID de l'utilisateur pour les tokens
        """
        self.user_id = user_id
        self.gmail_service = None
        self.vectorstore = VectorStoreService()
        self.file_registry = FileRegistry()
        self.sync_status = SyncStatusService()
    
    def authenticate(self) -> bool:
        """
        Authentifie le service Gmail.
        
        Returns:
            True si l'authentification est réussie, False sinon
        """
        self.gmail_service = get_gmail_service(user_id=self.user_id)
        return self.gmail_service is not None
    
    def parse_gmail_message(self, message: Dict[str, Any]) -> Optional[Email]:
        """
        Parse un message Gmail en un objet Email.
        
        Args:
            message: Message Gmail à parser
            
        Returns:
            Objet Email ou None en cas d'erreur
        """
        try:
            # Récupérer les détails complets du message
            msg = self.gmail_service.users().messages().get(userId='me', id=message['id'], format='full').execute()
            
            payload = msg.get('payload', {})
            headers = payload.get('headers', [])
            
            # Initialiser les métadonnées
            metadata = EmailMetadata(
                gmail_id=msg['id'],
                thread_id=msg.get('threadId'),
                gmail_labels=msg.get('labelIds', [])
            )
            
            # Extraire les informations des en-têtes
            for header in headers:
                name = header.get('name', '').lower()
                value = header.get('value', '')
                if name == 'subject':
                    metadata.subject = value
                elif name == 'from':
                    metadata.sender = value
                elif name == 'to':
                    metadata.recipients = [addr.strip() for addr in value.split(',')]
                elif name == 'cc':
                    metadata.cc = [addr.strip() for addr in value.split(',')]
                elif name == 'bcc':
                    metadata.bcc = [addr.strip() for addr in value.split(',')]
                elif name == 'date':
                    metadata.date = value
                    # Essayer de parser la date
                    try:
                        from email.utils import parsedate_to_datetime
                        metadata.timestamp = parsedate_to_datetime(value)
                    except Exception:
                        pass
                elif name == 'message-id':
                    metadata.message_id = value
            
            # Initialiser le contenu
            content = EmailContent()
            
            # Fonction récursive pour traiter les parties du message
            def process_parts(parts):
                body_text = ""
                body_html = ""
                attachments = []
                
                for part in parts:
                    mime_type = part.get('mimeType', '')
                    part_body = part.get('body', {})
                    
                    if mime_type == 'text/plain' and 'data' in part_body:
                        try:
                            decoded = base64.urlsafe_b64decode(part_body['data']).decode('utf-8')
                            body_text += decoded
                        except Exception as e:
                            logger.error(f"Erreur décodage text/plain: {e}")
                    
                    elif mime_type == 'text/html' and 'data' in part_body:
                        try:
                            decoded = base64.urlsafe_b64decode(part_body['data']).decode('utf-8')
                            body_html += decoded
                        except Exception as e:
                            logger.error(f"Erreur décodage text/html: {e}")
                    
                    elif part_body.get('attachmentId'):
                        # C'est une pièce jointe
                        filename = part.get('filename', '')
                        if filename:  # Ignorer les pièces jointes sans nom de fichier
                            try:
                                att_id = part_body['attachmentId']
                                attachment = self.gmail_service.users().messages().attachments().get(
                                    userId='me', messageId=msg['id'], id=att_id
                                ).execute()
                                
                                data = attachment.get('data', '')
                                content = base64.urlsafe_b64decode(data) if data else b''
                                
                                attachments.append(EmailAttachment(
                                    content_id=part.get('contentId'),
                                    filename=filename,
                                    content=content,
                                    mime_type=mime_type,
                                    size=len(content)
                                ))
                            except Exception as e:
                                logger.error(f"Erreur récupération pièce jointe: {e}")
                    
                    # Traiter les sous-parties si présentes
                    if 'parts' in part:
                        sub_text, sub_html, sub_attachments = process_parts(part['parts'])
                        body_text += sub_text
                        body_html += sub_html
                        attachments.extend(sub_attachments)
                
                return body_text, body_html, attachments
            
            # Traiter la structure du message
            if 'parts' in payload:
                body_text, body_html, attachments = process_parts(payload['parts'])
                content.body_text = body_text
                content.body_html = body_html
                content.attachments = attachments
            else:
                # Message simple
                body = payload.get('body', {})
                if 'data' in body:
                    try:
                        decoded = base64.urlsafe_b64decode(body['data']).decode('utf-8')
                        if payload.get('mimeType') == 'text/html':
                            content.body_html = decoded
                        else:
                            content.body_text = decoded
                    except Exception as e:
                        logger.error(f"Erreur décodage corps simple: {e}")
            
            # Créer l'objet Email complet
            email = Email(
                metadata=metadata,
                content=content,
                raw_data={'gmail_message': msg}
            )
            
            return email
        
        except Exception as e:
            logger.error(f"Erreur parsing message Gmail: {e}")
            return None
    
    def fetch_gmail_emails(self, labels: List[str] = ['INBOX'], limit: int = 10, query: str = None) -> Tuple[List[Email], int]:
        """
        Récupère les emails de Gmail en fonction des critères spécifiés.
        
        Args:
            labels: Labels Gmail à récupérer
            limit: Nombre maximum d'emails à récupérer
            query: Requête de filtrage Gmail
            
        Returns:
            Tuple contenant la liste des emails et le nombre total d'emails trouvés
        """
        if not self.gmail_service:
            if not self.authenticate():
                logger.error("Échec d'authentification Gmail")
                return [], 0
        
        try:
            # Construire la requête
            query_params = {'userId': 'me', 'maxResults': min(limit, 100)}
            
            if labels:
                query_params['labelIds'] = labels
            
            if query:
                query_params['q'] = query
            
            # Exécuter la requête
            results = self.gmail_service.users().messages().list(**query_params).execute()
            messages = results.get('messages', [])
            total = results.get('resultSizeEstimate', len(messages))
            
            # Récupérer les détails de chaque message
            emails = []
            for message in messages:
                email = self.parse_gmail_message(message)
                if email:
                    emails.append(email)
            
            logger.info(f"Récupération de {len(emails)} emails sur {total} trouvés")
            return emails, total
        
        except Exception as e:
            logger.error(f"Erreur récupération emails: {e}")
            return [], 0
    
    def ingest_gmail_emails(self, 
                            labels: List[str] = ["INBOX", "SENT"], 
                            limit: int = 10, 
                            query: str = None, 
                            force_reingest: bool = False,
                            save_attachments: bool = True,
                            user_id: str = "") -> Dict[str, Any]:
        """
        Ingère les emails depuis Gmail vers Qdrant et met à jour le registre.
        
        Args:
            labels: Labels Gmail à traiter
            limit: Nombre maximum d'emails à ingérer
            query: Requête de filtrage Gmail
            force_reingest: Forcer la réingestion même si l'email existe déjà
            save_attachments: Sauvegarder les pièces jointes
            user_id: ID de l'utilisateur
            
        Returns:
            Dictionnaire avec les résultats de l'ingestion
        """
        start_time = time.time()
        user_id = user_id or self.user_id
        
        # Initialiser le résultat
        result = {
            "success": False,
            "total_emails_found": 0,
            "ingested_emails": 0,
            "ingested_attachments": 0,
            "errors": [],
            "duration": 0
        }
        
        # Mettre à jour le statut de synchronisation
        self.sync_status.start_sync(user_id, "gmail")
        
        try:
            # Récupérer les emails
            emails, total_found = self.fetch_gmail_emails(labels, limit, query)
            result["total_emails_found"] = total_found
            
            if not emails:
                logger.warning("Aucun email trouvé à ingérer")
                self.sync_status.complete_sync(user_id, "gmail")
                result["success"] = True
                return result
            
            # Traiter chaque email
            temp_files_to_cleanup = []
            for i, email in enumerate(emails):
                try:
                    # Mettre à jour la progression
                    progress = (i + 1) / len(emails)
                    self.sync_status.update_progress(user_id, "gmail", progress)
                    
                    # Générer un ID pour l'email
                    doc_id = generate_email_id(email)
                    email.doc_id = doc_id
                    
                    # Chemin virtuel pour le registre
                    email_path = f"gmail/{doc_id}.email"
                    
                    # Vérifier si l'email existe déjà dans le registre
                    if not force_reingest and self.file_registry.file_exists(email_path):
                        continue
                    
                    # Sauvegarder le contenu de l'email dans un fichier temporaire
                    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".txt") as temp_file:
                        temp_file.write(f"Subject: {email.metadata.subject}\n")
                        temp_file.write(f"From: {email.metadata.sender}\n")
                        temp_file.write(f"To: {', '.join(email.metadata.recipients)}\n")
                        if email.metadata.cc:
                            temp_file.write(f"Cc: {', '.join(email.metadata.cc)}\n")
                        temp_file.write(f"Date: {email.metadata.date}\n\n")
                        temp_file.write(email.content.body_text or "")
                        temp_filepath = temp_file.name
                    
                    temp_files_to_cleanup.append(temp_filepath)
                    
                    # Créer les métadonnées pour le document
                    metadata = format_registry_metadata(email)
                    
                    # Ingérer l'email dans Qdrant
                    self.vectorstore.ingest_document(
                        filepath=temp_filepath,
                        metadata=metadata,
                        doc_id=doc_id,
                        user_id=user_id
                    )
                    
                    # Enregistrer dans le registre de fichiers
                    self.file_registry.register_file(
                        doc_id=doc_id,
                        source_path=email_path,
                        metadata=metadata
                    )
                    
                    result["ingested_emails"] += 1
                    
                    # Traiter les pièces jointes si demandé
                    if save_attachments and email.content.attachments:
                        for attachment in email.content.attachments:
                            try:
                                if not attachment.filename or not attachment.content:
                                    continue
                                    
                                # Générer un ID unique pour la pièce jointe
                                att_hash = hashlib.md5(attachment.content).hexdigest()
                                att_id = f"{doc_id}_{att_hash}"
                                att_path = f"gmail/attachments/{doc_id}/{attachment.filename}"
                                
                                # Métadonnées de la pièce jointe
                                att_metadata = {
                                    "source_type": "gmail_attachment",
                                    "email_id": email.metadata.message_id,
                                    "gmail_id": email.metadata.gmail_id,
                                    "subject": email.metadata.subject,
                                    "email_date": email.metadata.date,
                                    "email_sender": email.metadata.sender
                                }
                                
                                # Sauvegarder la pièce jointe dans un fichier temporaire
                                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment.filename)[1]) as att_file:
                                    att_file.write(attachment.content)
                                    att_tmp_path = att_file.name
                                
                                temp_files_to_cleanup.append(att_tmp_path)
                                
                                # Ingérer la pièce jointe dans Qdrant
                                self.vectorstore.ingest_document(
                                    filepath=att_tmp_path,
                                    metadata=att_metadata,
                                    doc_id=att_id,
                                    user_id=user_id
                                )
                                
                                # Enregistrer dans le registre de fichiers
                                self.file_registry.register_file(
                                    doc_id=att_id,
                                    source_path=att_path,
                                    metadata=att_metadata
                                )
                                
                                result["ingested_attachments"] += 1
                            except Exception as att_err:
                                logger.error(f"Erreur ingestion pièce jointe: {att_err}")
                                result["errors"].append(f"Erreur pièce jointe {attachment.filename}: {str(att_err)}")
                
                except Exception as email_err:
                    logger.error(f"Erreur ingestion email: {email_err}")
                    result["errors"].append(f"Erreur email {email.metadata.subject}: {str(email_err)}")
            
            # Nettoyer les fichiers temporaires
            for temp_file in temp_files_to_cleanup:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Erreur suppression fichier temporaire: {e}")
            
            # Marquer la synchronisation comme terminée
            self.sync_status.complete_sync(user_id, "gmail")
            
            result["success"] = True
        except Exception as e:
            logger.error(f"Erreur lors de l'ingestion des emails: {e}")
            result["errors"].append(f"Erreur générale: {str(e)}")
            self.sync_status.fail_sync(user_id, "gmail", str(e))
        
        end_time = time.time()
        result["duration"] = end_time - start_time
        
        return result
    
    def get_recent_emails(self, user_id: str = "", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Récupère les emails récents à partir du registre de fichiers.
        
        Args:
            user_id: ID de l'utilisateur
            limit: Nombre maximum d'emails à récupérer
            
        Returns:
            Liste des emails récents avec leurs métadonnées
        """
        user_id = user_id or self.user_id
        
        try:
            # Récupérer les fichiers du registre avec le préfixe "gmail/"
            files = self.file_registry.get_files_by_prefix("gmail/", user_id=user_id)
            
            # Filtrer pour exclure les pièces jointes
            emails = [f for f in files if not f["source_path"].startswith("gmail/attachments/")]
            
            # Trier par date (du plus récent au plus ancien)
            emails.sort(key=lambda x: x.get("metadata", {}).get("date", ""), reverse=True)
            
            # Limiter le nombre de résultats
            emails = emails[:limit]
            
            # Formater les résultats
            results = []
            for email in emails:
                metadata = email.get("metadata", {})
                results.append({
                    "id": email.get("doc_id"),
                    "subject": metadata.get("subject", "(No Subject)"),
                    "sender": metadata.get("sender", ""),
                    "date": metadata.get("date", ""),
                    "has_attachments": metadata.get("has_attachments", False),
                    "labels": metadata.get("labels", []),
                    "doc_id": email.get("doc_id")  # Inclure le doc_id pour les requêtes à Qdrant
                })
            
            return results
        except Exception as e:
            logger.error(f"Erreur récupération emails récents: {e}")
            return []
