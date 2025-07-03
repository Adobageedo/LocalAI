#!/usr/bin/env python3
"""
Script d'ingestion d'emails Gmail dans Qdrant avec OAuth2 et intégration du registre JSON.
"""

import os
import sys
import logging
import hashlib
import argparse
import datetime
import tempfile
import base64
import pickle
import time
import traceback
from typing import List, Dict, Any, Optional, Tuple
import json
import email.utils
import dateutil.parser
# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

# Importer les modules nécessaires
from backend.services.ingestion.core.model import Email, EmailAttachment, EmailContent, EmailMetadata
from backend.core.logger import log
from backend.services.ingestion.core.ingest_core import flush_batch
from backend.services.storage.file_registry import FileRegistry
from backend.services.ingestion.core.utils import generate_email_id
from backend.services.db.models import SyncStatus
from backend.services.db.email_manager import EmailManager
# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="backend.services.ingestion.services.ingest_gmail_emails")

# --- IMPORTED FROM auth/google_gmail_auth.py ---
from backend.services.auth.google_auth import get_gmail_service

def parse_gmail_message(message: Dict, gmail_service: Any, user: str) -> Optional[Email]:
    """
    Parse un message Gmail en un objet Email.
    
    Args:
        message: Message Gmail à parser
        gmail_service: Service Gmail authentifié
        user: Adresse email de l'utilisateur
        
    Returns:
        Objet Email ou None en cas d'erreur
    """
    try:
        # Récupérer les détails complets du message
        msg = gmail_service.users().messages().get(userId='me', id=message['id'], format='full').execute()
        
        payload = msg.get('payload', {})
        headers = payload.get('headers', [])
        folder = "other"
        if "INBOX" in msg.get('labelIds', []):
            folder = "inbox"
        elif "SENT" in msg.get('labelIds', []):
            folder = "sent"

        # Générer un doc_id temporaire à partir de l'ID du message
        temp_doc_id = hashlib.md5(message['id'].encode('utf-8')).hexdigest()
        
        # Extraire les métadonnées
        metadata = EmailMetadata(
            doc_id=temp_doc_id,  # Ajouter doc_id requis
            user=user,           # Ajouter user requis
            message_id=next((h['value'] for h in headers if h['name'].lower() == 'message-id'), None),
            subject=next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'Sans sujet'),
            sender=next((h['value'] for h in headers if h['name'].lower() == 'from'), None),
            receiver=next((h['value'] for h in headers if h['name'].lower() == 'to'), None),
            cc=next((h['value'] for h in headers if h['name'].lower() == 'cc'), None),
            date=next((h['value'] for h in headers if h['name'].lower() == 'date'), None),
            conversation_id = msg.get('threadId', ''),
            folders=folder
        )
        
        # Initialiser le contenu et les pièces jointes
        body_text = ""
        body_html = ""
        attachments = []
        
        # Fonction récursive pour traiter les parties du message
        def process_parts(parts):
            nonlocal body_text, body_html, attachments
            
            for part in parts:
                mime_type = part.get('mimeType', '')
                
                # Traiter le corps du message
                if mime_type == 'text/plain' and 'data' in part.get('body', {}):
                    data = part['body']['data']
                    text = base64.urlsafe_b64decode(data).decode('utf-8')
                    body_text += text
                
                elif mime_type == 'text/html' and 'data' in part.get('body', {}):
                    data = part['body']['data']
                    html = base64.urlsafe_b64decode(data).decode('utf-8')
                    body_html += html
                
                # Traiter les pièces jointes
                elif 'filename' in part and part['filename'] and part['body'].get('attachmentId'):
                    filename = part['filename']
                    attachment_id = part['body']['attachmentId']
                    
                    # Récupérer le contenu de la pièce jointe
                    attachment = gmail_service.users().messages().attachments().get(
                        userId='me',
                        messageId=message['id'],
                        id=attachment_id
                    ).execute()
                    
                    if 'data' in attachment:
                        content = base64.urlsafe_b64decode(attachment['data'])
                        attachments.append(EmailAttachment(
                            filename=filename,
                            content=content,
                            content_type=mime_type
                        ))
                
                # Traiter les parties imbriquées
                if 'parts' in part:
                    process_parts(part['parts'])
        
        # Traiter le corps principal
        if 'body' in payload and 'data' in payload['body']:
            mime_type = payload.get('mimeType', '')
            data = payload['body']['data']
            content = base64.urlsafe_b64decode(data).decode('utf-8')
            
            if mime_type == 'text/plain':
                body_text = content
            elif mime_type == 'text/html':
                body_html = content
        
        # Traiter les parties multipart
        if 'parts' in payload:
            process_parts(payload['parts'])
        
        # Créer l'objet de contenu de l'email
        content = EmailContent(
            body_text=body_text,
            body_html=body_html,
            attachments=attachments
        )
        
        # Créer et retourner l'objet Email complet
        return Email(metadata=metadata, content=content)
    
    except Exception as e:
        logger.error(f"Erreur lors du parsing du message {message['id']}: {e}")
        return None

def parse_email_date(date_str):
    """
    Parse email date string into a datetime object using various methods.
    
    Args:
        date_str: The date string to parse
        
    Returns:
        datetime.datetime: The parsed datetime object or current time if parsing fails
    """
    if not date_str:
        return datetime.datetime.now()
        
    try:
        # First try email.utils parser which handles most standard email date formats
        return email.utils.parsedate_to_datetime(date_str)
    except Exception:
        # Remove timezone name in parentheses if present
        if '(' in date_str and ')' in date_str:
            clean_date_str = date_str.split('(')[0].strip()
        else:
            clean_date_str = date_str
            
        # Try various date formats
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",  # RFC 2822 format with timezone
            "%a, %d %b %Y %H:%M:%S",     # RFC 2822 format without timezone
            "%a, %d %b %Y %H:%M:%S %Z",  # With timezone name
            "%d %b %Y %H:%M:%S %z",      # Without weekday
            "%Y-%m-%dT%H:%M:%S%z"        # ISO format
        ]
        
        for fmt in formats:
            try:
                return datetime.datetime.strptime(clean_date_str, fmt)
            except ValueError:
                continue
                
        # If all parsing attempts fail, log error and return current time
        logging.error(f"Failed to parse date: '{date_str}'")
        return datetime.datetime.now()

def fetch_gmail_emails(
    gmail_service: Any,
    user: str,
    labels: List[str] = ['INBOX'],
    limit: int = 10,
    query: str = None
) -> Tuple[List[Email], int]:
    """
    Récupère les emails de Gmail en fonction des critères spécifiés.
    
    Args:
        gmail_service: Service Gmail authentifié
        user: Adresse email de l'utilisateur
        labels: Labels Gmail à rechercher (INBOX, SENT, etc.)
        limit: Nombre maximum d'emails à récupérer
        query: Requête de recherche Gmail (syntaxe Gmail)
        
    Returns:
        Tuple contenant la liste des emails et le nombre total d'emails trouvés
    """
    try:
        # Construire la requête
        q = query or ""
        label_query = " OR ".join([f"label:{label}" for label in labels])
        if label_query:
            q = f"({q}) AND ({label_query})" if q else label_query
        
        # Récupérer les messages correspondant à la requête
        response = gmail_service.users().messages().list(
            userId='me',
            q=q,
            maxResults=limit
        ).execute()
        
        messages = response.get('messages', [])
        total_messages = len(messages)
        
        # Récupérer et parser chaque message
        emails = []
        for msg_data in messages:
            email = parse_gmail_message(msg_data, gmail_service, user)
            if email:
                emails.append(email)
        
        logger.info(f"Récupération terminée: {len(emails)}/{total_messages} emails trouvés et parsés")
        return emails, total_messages
    
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des emails Gmail: {e}")
        return [], 0

def batch_ingest_gmail_emails_to_qdrant(
    labels: List[str] = ["INBOX", "SENT"],
    limit: int = 500,
    query: str = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False,
    user_id: str = "",
    min_date: Optional[datetime.datetime] = None,
    return_count: bool = False,
    batch_size: int = 20,
    syncstatus: SyncStatus = None
) -> Dict[str, Any]:
    """
    Ingère les emails depuis Gmail vers Qdrant par lots.
    
    Args:
        labels: Liste des labels Gmail à traiter
        limit: Nombre maximum d'emails à ingérer
        query: Requête de recherche Gmail
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder et ingérer les pièces jointes
        verbose: Mode verbeux
        user_id: ID de l'utilisateur
        min_date: Date minimale des emails à traiter
        return_count: Si True, renvoie uniquement le nombre d'emails ingérés
        batch_size: Nombre de documents à traiter dans chaque lot
        collection: Collection Qdrant cible (par défaut user_id)
    
    Returns:
        Dictionnaire avec les résultats de l'ingestion
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Créer le répertoire temporaire pour les fichiers
    temp_dir = tempfile.mkdtemp(prefix="gmail_ingest_")
    logger.info(f"Répertoire temporaire créé: {temp_dir}")

    # Initialiser le registre de fichiers
    file_registry = FileRegistry(user_id)

    # Initialiser le manager d'emails
    email_manager = EmailManager()

    # Initialiser les statistiques
    start_time = time.time()
    result = {
        "success": False,
        "total_emails_found": 0,
        "items_ingested": 0,
        "ingested_attachments": 0,
        "skipped_emails": 0,
        "errors": [],
        "duration": 0,
        "batches": 0
    }

    start_time = time.time()

    # Liste pour collecter les documents à ingérer par lot
    batch_documents = []
    
    # Authentification Gmail
    try:
        gmail_service = get_gmail_service(user_id)
        logger.info("Connexion à Gmail établie avec succès")
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Gmail: {e}")
        result["errors"].append(f"Erreur authentification Gmail: {str(e)}")
        return result

    # Récupération du profil utilisateur Gmail
    try:
        profile = gmail_service.users().getProfile(userId='me').execute()
        gmail_user = profile['emailAddress']
        logger.info(f"Utilisateur Gmail authentifié: {gmail_user}")
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du profil Gmail: {e}")
        gmail_user = "unknown_user"

    # Construction de la requête de recherche avec date minimale si spécifiée
    if min_date and query:
        query = f"{query} after:{min_date.strftime('%Y/%m/%d')}"
    elif min_date:
        query = f"after:{min_date.strftime('%Y/%m/%d')}"

    # Récupération des emails
    logger.info(f"Récupération des emails depuis Gmail avec les labels: {labels}")
    try:
        emails, total_found = fetch_gmail_emails(
            gmail_service=gmail_service,
            user=gmail_user,
            labels=labels,
            limit=limit,
            query=query
        )
        
        result["total_emails_found"] = total_found
        syncstatus.total_documents = total_found
        logger.info(f"Nombre d'emails trouvés: {total_found}")
        
        if not emails:
            logger.warning("Aucun email trouvé correspondant aux critères")
            result["success"] = True  # C'est un succès même s'il n'y a pas d'emails à ingérer
            return result
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des emails: {e}")
        result["errors"].append(f"Erreur récupération emails: {str(e)}")
        return result

    # Traiter chaque email
    for email_idx, email in enumerate(emails, 1):
        try:
            # Générer l'identifiant unique de l'email
            email_id = generate_email_id(email)
            email_path = f"/google_email/{user_id}/{email.metadata.conversation_id}/{email_id}"

            logger.info(f"Préparation de l'email {email_idx}/{len(emails)}: {email.metadata.subject or '(sans sujet)'}")

            # Stocker l'email en cours de traitement pour suivi
            try:
                with open("/tmp/gmail_ingest_status.json", "w", encoding="utf-8") as f:
                    json.dump({"subject": email.metadata.subject or "(sans sujet)"}, f)
            except Exception as e:
                logger.warning(f"Erreur d'écriture du fichier de statut: {e}")

            # Normaliser le sujet pour les chemins de fichiers
            email_subject_safe = email.metadata.subject.replace('/', '_').replace('\\', '_') if email.metadata.subject else 'sans_sujet'

            logger.info(f"Folder: {email.metadata.folders} and conversation_id: {email.metadata.conversation_id}")

            # Construire les métadonnées pour l'email
            metadata = {
                "doc_id": email_id,
                "path": email_path,
                "user": user_id,
                "filename": f"{email_subject_safe}.eml",
                "ingestion_type": "google_email",
                "ingestion_date": datetime.datetime.now().isoformat(),
                "subject": email.metadata.subject,
                "sender": email.metadata.sender,
                "receiver": email.metadata.receiver,
                "cc": email.metadata.cc,
                "date": email.metadata.date,
                "message_id": email.metadata.message_id,
                "has_attachments": bool(email.content.attachments),
                "gmail_user": gmail_user,
                "conversation_id": email.metadata.conversation_id,
                "folder": email.metadata.folders,
                "body_text": email.content.body_text,
                
            }

            # Créer un fichier temporaire pour le contenu de l'email
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".eml", dir=temp_dir) as tmp_file:
                body_content = email.content.body_html or email.content.body_text or ""
                tmp_file.write(body_content)
                tmp_path = tmp_file.name

            # Ajouter le document au lot
            batch_documents.append({
                "tmp_path": tmp_path,  # Pour le nettoyage ultérieur
                "metadata": metadata
            })

            # Traiter les pièces jointes si activé
            if save_attachments and email.content.attachments:
                for att_idx, attachment in enumerate(email.content.attachments, 1):
                    if not attachment.filename or not attachment.content:
                        continue

                    # Générer un ID unique pour la pièce jointe
                    attachment_id = hashlib.md5(f"{email_id}_{attachment.filename}_{idx}".encode('utf-8')).hexdigest()
                    att_path = f"/google_email/{user_id}/{email.metadata.conversation_id}/attachments/{attachment.filename}"
                    
                    # Construire les métadonnées pour la pièce jointe
                    att_metadata = {
                        "doc_id": attachment_id,
                        "path": att_path,
                        "user": user_id,
                        "filename": attachment.filename,
                        "document_type": "email_attachment",
                        "ingestion_type": "google_email",
                        "ingestion_date": datetime.datetime.now().isoformat(),
                        "parent_email_id": email_id,
                        "content_type": attachment.content_type,
                        "gmail_user": gmail_user,
                        "conversation_id": email.metadata.conversation_id,
                        "folder": email.metadata.folders
                    }

                    # Créer un fichier temporaire pour la pièce jointe
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment.filename)[1], dir=temp_dir) as att_file:
                        att_file.write(attachment.content)
                        att_tmp_path = att_file.name

                    # Ajouter la pièce jointe au lot
                    batch_documents.append({
                        "tmp_path": att_tmp_path,  # Pour le nettoyage ultérieur
                        "metadata": att_metadata,
                    })
            # After preparing metadata, save to the email database
            try:
                # Parse the email date string into a datetime object
                parsed_date = parse_email_date(email.metadata.date)
                
                email_manager.save_email(
                    user_id=user_id,
                    email_id=email_id,
                    sender=email.metadata.sender,
                    recipients=[email.metadata.receiver],  # Convert to list if needed
                    subject=email.metadata.subject or '',
                    body=email.content.body_text or '',
                    html_body=email.content.body_html or '',
                    sent_date=parsed_date,
                    source_type="google_email",
                    conversation_id=email.metadata.conversation_id,
                    folder=email.metadata.folders
                )
                logger.info(f"Email {email_id} saved to database")
            except Exception as e:
                logger.error(f"Error saving email to database: {e}")

            # Traiter le lot quand il atteint la taille spécifiée
            if len(batch_documents) >= batch_size:
                logger.info(f"Traitement d'un lot de {len(batch_documents)} documents")
                flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
                result["batches"] += 1

        except Exception as process_err:
            logger.error(f"Erreur lors du traitement de l'email: {process_err}")
            logger.error(f"Trace: {traceback.format_exc()}")
            result["errors"].append(f"Erreur traitement: {str(process_err)}")

    try:
        # Traiter les documents restants dans le lot
        if batch_documents:
            logger.info(f"Traitement du dernier lot de {len(batch_documents)} documents")
            flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
            result["batches"] += 1
            
        # Nettoyer les fichiers temporaires
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"Répertoire temporaire supprimé: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Erreur lors du nettoyage du répertoire temporaire: {cleanup_err}")
                    
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage: {e}")
    
    # Finaliser les statistiques
    end_time = time.time()
    result["duration"] = end_time - start_time
    result["success"] = (result["items_ingested"] > 0 or result["total_emails_found"] == 0) and not any("authentification" in err for err in result["errors"])
    result["batches_processed"] = result["batches"]

    # Log résumé de l'exécution
    logger.info(f"Ingestion terminée en {result['duration']:.2f}s")
    logger.info(f"Emails trouvés: {result['total_emails_found']}, ingérés: {result['items_ingested']}, "  
             f"ignorés: {result['skipped_emails']}")
    if result["errors"]:
        logger.warning(f"Erreurs rencontrées: {len(result['errors'])}")

    # Renvoyer uniquement le nombre d'emails si demandé
    if return_count:
        return result["items_ingested"]
        
    return result

def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(description="Ingestion d'emails Gmail dans Qdrant avec authentification OAuth2.")
    parser.add_argument('--labels', nargs='+', default=['INBOX', 'SENT'], help='Labels Gmail à traiter (liste séparée par des espaces)')
    parser.add_argument('--query', default=None, help='Requête de recherche Gmail (ex: "after:2023/01/01 before:2023/12/31")')
    parser.add_argument('--limit', type=int, default=50, help='Nombre maximum d\'emails à ingérer')
    parser.add_argument('--force-reingest', action='store_true', help='Forcer la réingestion même si l\'email existe déjà')
    parser.add_argument('--no-attachments', action='store_true', help='Ne pas ingérer les pièces jointes')
    parser.add_argument('--verbose', action='store_true', help='Mode verbeux')
    parser.add_argument('--user-id', default="hupTIQvuO4R3BxklIWs1AqbKDP13", help='Identifiant de l\'utilisateur')
    parser.add_argument('--batch-size', type=int, default=20, help='Taille des lots pour l\'ingestion')
    
    args = parser.parse_args()
    
    # Exécuter l'ingestion
    result = batch_ingest_gmail_emails_to_qdrant(
        labels=args.labels,
        query=args.query,
        limit=args.limit,
        force_reingest=args.force_reingest,
        save_attachments=not args.no_attachments,
        verbose=args.verbose,
        user_id=args.user_id,
        batch_size=args.batch_size
    )
    
    # Afficher les résultats finaux
    if result["success"]:
        print(f"\nRésumé de l'ingestion:")
        print(f"- Emails trouvés: {result['total_emails_found']}")
        print(f"- Emails ingérés: {result['items_ingested']}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingestion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1

if __name__ == "__main__":
    sys.exit(main())
