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
from typing import List, Dict, Any, Optional, Tuple
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import json
# Ajouter les répertoires parents au chemin
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Importer les modules nécessaires
from update_vdb.sources.email_sources.base import Email, EmailAttachment, EmailContent, EmailMetadata
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from rag_engine.config import load_config
from update_vdb.core.ingest_core import ingest_document, batch_ingest_documents

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ingest-gmail")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
logging.getLogger("openai._base_client").setLevel(logging.WARNING)
logging.getLogger("unstructured.trace").setLevel(logging.WARNING)
logging.getLogger("chardet.universaldetector").setLevel(logging.WARNING)

# --- IMPORTED FROM auth/google_gmail_auth.py ---
from auth.google_auth import get_gmail_service

def compute_email_hash(email: Email) -> str:
    """
    Calcule un hash unique pour un email basé sur ses métadonnées et son contenu.
    
    Args:
        email: L'objet Email à hasher
        
    Returns:
        Le hash SHA-256 de l'email
    """
    hasher = hashlib.sha256()
    # Utiliser message_id comme base principale si disponible
    if email.metadata.message_id:
        hasher.update(email.metadata.message_id.encode('utf-8'))
    
    # Ajouter d'autres métadonnées pour garantir l'unicité
    if email.metadata.subject:
        hasher.update(email.metadata.subject.encode('utf-8'))
    if email.metadata.date:
        hasher.update(email.metadata.date.encode('utf-8'))
    if email.metadata.sender:
        hasher.update(email.metadata.sender.encode('utf-8'))
    
    # Ajouter un échantillon du corps du texte s'il est disponible
    if email.content.body_text:
        body_sample = email.content.body_text[:1000]  # Limiter pour les performances
        hasher.update(body_sample.encode('utf-8'))
    
    return hasher.hexdigest()

def generate_email_id(email: Email) -> str:
    """
    Génère un ID unique pour un email basé sur son hash.
    
    Args:
        email: L'objet Email
        
    Returns:
        Un ID unique pour l'email
    """
    hash_value = compute_email_hash(email)
    return hashlib.md5(hash_value.encode('utf-8')).hexdigest()

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
            date=next((h['value'] for h in headers if h['name'].lower() == 'date'), None)
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
                            content_type=mime_type,
                            parent_email_id=temp_doc_id  # Ajouter l'ID de l'email parent
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

def ingest_gmail_emails_to_qdrant(
    labels: List[str] = ["INBOX", "SENT"],
    limit: int = 10,
    query: str = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False,
    user_id: str = "",
    min_date: Optional[datetime.datetime] = None,
    credit_limit: Optional[int] = None,
    return_count: bool = False,
    batch_size: int = 20
) -> Dict[str, Any]:
    """
    Ingère les emails depuis Gmail vers Qdrant et met à jour le registre.
    
    Args:
        labels: Labels Gmail à traiter
        limit: Nombre maximum d'emails à ingérer
        query: Requête de filtrage Gmail
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder les pièces jointes
        verbose: Mode verbeux
        user_id: Identifiant de l'utilisateur
        min_date: Date minimale pour filtrer les emails (ne traite que les emails postérieurs à cette date)
        credit_limit: Limite maximale d'emails à ingérer (basée sur les crédits utilisateur)
        return_count: Si True, retourne le nombre d'emails traités plutôt que le résultat complet
        batch_size: Taille des lots pour le traitement par lots

    Returns:
        Dictionnaire avec les résultats de l'ingestion ou nombre d'emails traités si return_count=True
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    result = {
        "success": True,
        "ingested_emails": 0,
        "ingested_attachments": 0,
        "errors": [],
        "duration": 0,
        "total_emails_found": 0
    }
    
    start_time = time.time()
    
    # Authentification et initialisation du service Gmail
    try:
        gmail_service = get_gmail_service(user_id)
        logger.info("Connexion à Gmail établie")
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Gmail: {e}")
        result["success"] = False
        result["errors"].append(f"Erreur authentification Gmail: {str(e)}")
        return result
    
    # Récupérer l'adresse email de l'utilisateur
    try:
        profile = gmail_service.users().getProfile(userId='me').execute()
        gmail_user = profile['emailAddress']
        logger.info(f"Utilisateur Gmail connecté: {gmail_user}")
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du profil Gmail: {e}")
        gmail_user = "unknown_user"
    
    # Mise à jour de la requête pour inclure la date minimale si elle est spécifiée
    if min_date and query:
        date_filter = f"after:{min_date.strftime('%Y/%m/%d')}"
        query = f"{query} {date_filter}"
    elif min_date:
        query = f"after:{min_date.strftime('%Y/%m/%d')}"
    
    # Si une limite de crédits est spécifiée, ajuster la limite d'emails
    if credit_limit is not None and credit_limit < limit:
        original_limit = limit
        limit = credit_limit
        logger.info(f"Limite d'emails ajustée de {original_limit} à {limit} en fonction des crédits disponibles")

    # Récupérer les emails
    emails, total_found = fetch_gmail_emails(
        gmail_service=gmail_service,
        user=gmail_user,
        labels=labels,
        limit=limit,
        query=query
    )
    
    result["total_emails_found"] = total_found
    
    if not emails:
        logger.warning("Aucun email trouvé ou erreur lors de la récupération")
        return result
    
    # Traiter les emails récupérés
    for email_idx, email in enumerate(emails, 1):
        try:
            email_id = generate_email_id(email)
            email_hash = compute_email_hash(email)
            email_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}"
            
            logger.info(f"Traitement de l'email {email_idx}/{len(emails)}: {email.metadata.subject}")
                        
            # --- STATUS FILE: Write current subject for frontend polling ---
            try:
                status_path = "/tmp/gmail_ingest_status.json"
                with open(status_path, "w", encoding="utf-8") as f:
                    import json
                    json.dump({"subject": email.metadata.subject or "(sans sujet)"}, f)
            except Exception as e:
                logger.warning(f"Failed to write Gmail ingest status file: {e}")
            # Formats personnalisés pour les chemins
            email_subject_safe = email.metadata.subject.replace('/', '_').replace('\\', '_') if email.metadata.subject else 'sans_sujet'
            formatted_path = f"{email_id}+{email_subject_safe}"
            formatted_original_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}"
            
            # Préparer les métadonnées pour l'ingestion
            metadata = {
                "source": "gmail",
                "source_path": email_path,
                "original_path": formatted_original_path,
                "original_filename": formatted_path,
                "subject": email.metadata.subject,
                "sender": email.metadata.sender,
                "receiver": email.metadata.receiver,
                "cc": email.metadata.cc,
                "date": email.metadata.date,
                "message_id": email.metadata.message_id,
                "document_type": "email",
                "gmail_user": gmail_user,
                "labels": ",".join(labels)
            }
            
            # Créer un fichier temporaire pour le corps de l'email
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".eml") as tmp_file:
                # Préférer le HTML s'il est disponible, sinon utiliser le texte brut
                body_content = email.content.body_html or email.content.body_text or ""
                tmp_file.write(body_content)
                tmp_path = tmp_file.name
            
            # Ingérer le corps de l'email
            try:
                ingest_document(
                    filepath=tmp_path,
                    user=user_id,
                    collection=(user_id + "eml"),
                    doc_id=email_id,
                    metadata=metadata,
                    original_filepath=email_path
                )
                                
                result["ingested_emails"] += 1
                logger.info(f"Email ingéré avec succès: {email.metadata.subject}")
                
                # Supprimer le fichier temporaire
                os.unlink(tmp_path)
                
                # Traiter les pièces jointes si demandé
                if save_attachments and email.content.attachments:
                    for att_idx, attachment in enumerate(email.content.attachments, 1):
                        if not attachment.filename or not attachment.content:
                            continue
                        
                        # Générer un ID unique pour la pièce jointe
                        att_hash = hashlib.sha256(attachment.content).hexdigest()
                        att_id = f"{email_id}_att{att_idx}"
                        att_path = f"{email_path}/attachments/{attachment.filename}"
                        
                        # Créer un fichier temporaire pour la pièce jointe
                        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment.filename)[1]) as att_file:
                            att_file.write(attachment.content)
                            att_tmp_path = att_file.name
                        
                        # Formats personnalisés pour les pièces jointes
                        email_subject_safe = email.metadata.subject.replace('/', '_').replace('\\', '_') if email.metadata.subject else 'sans_sujet'
                        att_filename_safe = attachment.filename.replace('/', '_').replace('\\', '_') if attachment.filename else 'sans_nom'
                        formatted_att_path = f"{email_id}+{email_subject_safe}+attachments+{att_filename_safe}"
                        formatted_att_original_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}/attachments/{attachment.filename}"
                        
                        # Métadonnées spécifiques pour la pièce jointe
                        att_metadata = {
                            "source": "gmail_attachment",
                            "source_path": att_path,
                            "original_path": formatted_att_original_path,
                            "original_filename": formatted_att_path,
                            "document_type": "email_attachment",
                            "parent_email_id": email_id,
                            "content_type": attachment.content_type,
                            "filename": attachment.filename,
                            "email_subject": email.metadata.subject,
                            "email_date": email.metadata.date,
                            "email_sender": email.metadata.sender,
                            "gmail_user": gmail_user
                        }
                        
                        try:
                            # Ingérer la pièce jointe
                            ingest_document(
                                filepath=att_tmp_path,
                                user=user_id,
                                collection=(user_id + "eml"),
                                doc_id=att_id,
                                metadata=att_metadata,
                                original_filepath=att_path,
                                original_filename=attachment.filename
                            )
                            
                            result["ingested_attachments"] += 1
                            logger.info(f"Pièce jointe ingérée: {attachment.filename}")
                        except Exception as att_err:
                            logger.error(f"Erreur lors de l'ingestion de la pièce jointe {attachment.filename}: {att_err}")
                            result["errors"].append(f"Erreur pièce jointe: {str(att_err)}")
                        finally:
                            # Supprimer le fichier temporaire de la pièce jointe
                            os.unlink(att_tmp_path)
                
            except Exception as email_err:
                logger.error(f"Erreur lors de l'ingestion de l'email: {email_err}")
                result["errors"].append(f"Erreur ingestion email: {str(email_err)}")
                try:
                    os.unlink(tmp_path)
                except:
                    pass
        
        except Exception as process_err:
            logger.error(f"Erreur lors du traitement de l'email: {process_err}")
            result["errors"].append(f"Erreur traitement: {str(process_err)}")
    
    # Calculer la durée
    end_time = time.time()
    duration = end_time - start_time
    result["duration"] = duration
    
    # Si return_count est True, renvoyer uniquement le nombre d'emails traités
    if return_count:
        return result["ingested_emails"]

    # --- STATUS FILE: Clear at end of ingestion ---
    try:
        status_path = "/tmp/gmail_ingest_status.json"
        if os.path.exists(status_path):
            os.remove(status_path)
    except Exception as e:
        logger.warning(f"Failed to clear Gmail ingest status file: {e}")

    # Résumé
    logger.info(f"Ingestion terminée en {duration:.2f} secondes")
    logger.info(f"Emails ingérés: {result['ingested_emails']}")
    logger.info(f"Pièces jointes ingérées: {result['ingested_attachments']}")    
    if result["errors"]:
        logger.warning(f"Erreurs rencontrées: {len(result['errors'])}")
    
    return result

def batch_ingest_gmail_emails_to_qdrant(
    labels: List[str] = ["INBOX", "SENT"],
    limit: int = 10,
    query: str = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False,
    user_id: str = "",
    min_date: Optional[datetime.datetime] = None,
    credit_limit: Optional[int] = None,
    return_count: bool = False,
    batch_size: int = 20
) -> Dict[str, Any]:
    """
    Ingère les emails depuis Gmail vers Qdrant par lots.
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    result = {
        "success": True,
        "ingested_emails": 0,
        "ingested_attachments": 0,
        "errors": [],
        "duration": 0,
        "total_emails_found": 0
    }

    start_time = time.time()

    try:
        gmail_service = get_gmail_service(user_id)
        logger.info("Connexion à Gmail établie")
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Gmail: {e}")
        result["success"] = False
        result["errors"].append(f"Erreur authentification Gmail: {str(e)}")
        return result

    try:
        profile = gmail_service.users().getProfile(userId='me').execute()
        gmail_user = profile['emailAddress']
        logger.info(f"Utilisateur Gmail connecté: {gmail_user}")
    except Exception as e:
        logger.error(f"Erreur profil Gmail: {e}")
        gmail_user = "unknown_user"

    if min_date and query:
        query = f"{query} after:{min_date.strftime('%Y/%m/%d')}"
    elif min_date:
        query = f"after:{min_date.strftime('%Y/%m/%d')}"

    if credit_limit is not None and credit_limit < limit:
        original_limit = limit
        limit = credit_limit
        logger.info(f"Limite ajustée de {original_limit} à {limit} selon crédits")

    emails, total_found = fetch_gmail_emails(
        gmail_service=gmail_service,
        user=gmail_user,
        labels=labels,
        limit=limit,
        query=query
    )

    result["total_emails_found"] = total_found

    if not emails:
        logger.warning("Aucun email trouvé")
        return result

    batch_documents = []
    temp_files_to_cleanup = []

    def flush_batch():
        nonlocal batch_documents, temp_files_to_cleanup
        if not batch_documents:
            return
        try:
            batch_ingest_documents(
                batch_documents=batch_documents,
                user=user_id,
                collection=(user_id + "eml")
            )
            result["ingested_emails"] += sum(1 for d in batch_documents if d["metadata"]["document_type"] == "email")
            result["ingested_attachments"] += sum(1 for d in batch_documents if d["metadata"]["document_type"] == "email_attachment")
            logger.info(f"Batch de {len(batch_documents)} documents ingéré")
        except Exception as batch_err:
            logger.error(f"Erreur ingestion batch: {batch_err}")
            result["errors"].append(f"Erreur batch: {str(batch_err)}")
        finally:
            for f in temp_files_to_cleanup:
                try:
                    os.unlink(f)
                except:
                    pass
            batch_documents.clear()
            temp_files_to_cleanup.clear()

    for email_idx, email in enumerate(emails, 1):
        try:
            email_id = generate_email_id(email)
            email_hash = compute_email_hash(email)
            email_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}"

            logger.info(f"Email {email_idx}/{len(emails)}: {email.metadata.subject}")

            try:
                with open("/tmp/gmail_ingest_status.json", "w", encoding="utf-8") as f:
                    json.dump({"subject": email.metadata.subject or "(sans sujet)"}, f)
            except Exception as e:
                logger.warning(f"Écriture status ingestion: {e}")

            email_subject_safe = email.metadata.subject.replace('/', '_').replace('\\', '_') if email.metadata.subject else 'sans_sujet'
            formatted_path = f"{email_id}+{email_subject_safe}"
            formatted_original_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}"

            metadata = {
                "source": "gmail",
                "source_path": email_path,
                "original_path": formatted_original_path,
                "original_filename": formatted_path,
                "subject": email.metadata.subject,
                "sender": email.metadata.sender,
                "receiver": email.metadata.receiver,
                "cc": email.metadata.cc,
                "date": email.metadata.date,
                "message_id": email.metadata.message_id,
                "document_type": "email",
                "gmail_user": gmail_user,
                "labels": ",".join(labels)
            }

            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".eml") as tmp_file:
                body_content = email.content.body_html or email.content.body_text or ""
                tmp_file.write(body_content)
                tmp_path = tmp_file.name

            batch_documents.append({
                "filepath": tmp_path,
                "metadata": metadata,
                "doc_id": email_id,
                "original_filepath": email_path,
                "original_filename": formatted_path
            })
            temp_files_to_cleanup.append(tmp_path)

            if save_attachments and email.content.attachments:
                for att_idx, attachment in enumerate(email.content.attachments, 1):
                    if not attachment.filename or not attachment.content:
                        continue

                    att_id = f"{email_id}_att{att_idx}"
                    att_path = f"{email_path}/attachments/{attachment.filename}"
                    att_filename_safe = attachment.filename.replace('/', '_').replace('\\', '_') if attachment.filename else 'sans_nom'
                    formatted_att_path = f"{email_id}+{email_subject_safe}+attachments+{att_filename_safe}"
                    formatted_att_original_path = f"/Gmail/{gmail_user}/{email.metadata.date}/{email_id}/attachments/{attachment.filename}"

                    att_metadata = {
                        "source": "gmail_attachment",
                        "source_path": att_path,
                        "original_path": formatted_att_original_path,
                        "original_filename": formatted_att_path,
                        "document_type": "email_attachment",
                        "parent_email_id": email_id,
                        "content_type": attachment.content_type,
                        "filename": attachment.filename,
                        "email_subject": email.metadata.subject,
                        "email_date": email.metadata.date,
                        "email_sender": email.metadata.sender,
                        "gmail_user": gmail_user
                    }

                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment.filename)[1]) as att_file:
                        att_file.write(attachment.content)
                        att_tmp_path = att_file.name

                    batch_documents.append({
                        "filepath": att_tmp_path,
                        "metadata": att_metadata,
                        "doc_id": att_id,
                        "original_filepath": att_path,
                        "original_filename": attachment.filename
                    })
                    temp_files_to_cleanup.append(att_tmp_path)

            if len(batch_documents) >= batch_size:
                logger.info(f"Traitement batch de {len(batch_documents)} documents")
                flush_batch()

        except Exception as process_err:
            logger.error(f"Erreur traitement email: {process_err}")
            result["errors"].append(f"Erreur traitement: {str(process_err)}")

    flush_batch()

    try:
        status_path = "/tmp/gmail_ingest_status.json"
        if os.path.exists(status_path):
            os.remove(status_path)
    except Exception as e:
        logger.warning(f"Suppression status: {e}")

    end_time = time.time()
    result["duration"] = end_time - start_time

    if return_count:
        return result["ingested_emails"]

    logger.info(f"Ingestion terminée en {result['duration']:.2f}s")
    logger.info(f"Emails: {result['ingested_emails']}, Pièces jointes: {result['ingested_attachments']}")
    if result["errors"]:
        logger.warning(f"Erreurs: {len(result['errors'])}")

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
    parser.add_argument('--user-id', default="7EShftbbQ4PPTS4hATplexbrVHh2", help='Identifiant de l\'utilisateur')
    parser.add_argument('--batch-size', type=int, default=20, help='Taille des lots pour l\'ingestion')
    
    args = parser.parse_args()
    
    # Exécuter l'ingestion
    result = ingest_gmail_emails_to_qdrant(
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
        print(f"- Emails ingérés: {result['ingested_emails']}")
        print(f"- Pièces jointes ingérées: {result['ingested_attachments']}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingestion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1

if __name__ == "__main__":
    sys.exit(main())
