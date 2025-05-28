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
from typing import List, Dict, Any, Optional, Tuple
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Ajouter les répertoires parents au chemin
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Importer les modules nécessaires
from update_vdb.sources.email_sources.base import Email, EmailAttachment, EmailContent, EmailMetadata
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from rag_engine.config import load_config
from update_vdb.sources.file_registry import FileRegistry
from update_vdb.core.ingest_core import ingest_document

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

# Définir la portée de l'accès à Gmail
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service(credentials_path: str, token_path: str) -> Any:
    """
    Authentifie l'utilisateur et renvoie un service Gmail.
    
    Args:
        credentials_path: Chemin vers le fichier de credentials OAuth2
        token_path: Chemin vers le fichier de token
        
    Returns:
        Service Gmail authentifié
    """
    creds = None
    
    # Charger les credentials depuis .env
    client_id = os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv("GMAIL_CLIENT_SECRET")
    redirect_uri = os.getenv("GMAIL_REDIRECT_URI")

    if not all([client_id, client_secret, redirect_uri]):
        raise EnvironmentError("Variables .env manquantes pour OAuth2")

    # Vérifier si un token existe déjà
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # Si les credentials ne sont pas valides, demander une nouvelle authentification
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(
                {
                    "installed": {
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uris": [redirect_uri],
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token"
                    }
                },
                SCOPES
            )
            #flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Sauvegarder les credentials pour la prochaine exécution
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    
    # Construire le service Gmail
    return build('gmail', 'v1', credentials=creds)

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
    credentials_path: str,
    token_path: str,
    labels: List[str],
    collection: str,
    limit: int = 10,
    query: str = None,
    registry_path: Optional[str] = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False
) -> Dict[str, Any]:
    """
    Ingère les emails depuis Gmail vers Qdrant et met à jour le registre.
    
    Args:
        credentials_path: Chemin vers le fichier de credentials OAuth2
        token_path: Chemin vers le fichier de token
        labels: Labels Gmail à traiter
        collection: Collection Qdrant cible
        limit: Nombre maximum d'emails à ingérer
        query: Requête de recherche Gmail (syntaxe Gmail)
        registry_path: Chemin vers le fichier de registre JSON
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder les pièces jointes
        verbose: Mode verbeux
    
    Returns:
        Un dictionnaire contenant les résultats de l'ingestion
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    result = {
        "success": True,
        "ingested_emails": 0,
        "ingested_attachments": 0,
        "skipped_emails": 0,
        "errors": [],
        "duration": 0,
        "total_emails_found": 0
    }
    
    start_time = datetime.datetime.now()
    
    # Initialiser le registre de fichiers
    file_registry = None
    if registry_path:
        file_registry = FileRegistry(registry_path=registry_path)
        logger.info(f"Registre de fichiers chargé: {len(file_registry.registry)} entrées")
    
    # Initialiser le gestionnaire de vectorstore
    try:
        vector_store = VectorStoreManager(collection)
        logger.info(f"Connexion à Qdrant établie, collection: {collection}")
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation de la connexion à Qdrant: {e}")
        result["success"] = False
        result["errors"].append(f"Erreur Qdrant: {str(e)}")
        return result
    
    # Authentification et initialisation du service Gmail
    try:
        gmail_service = get_gmail_service(credentials_path, token_path)
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
            
            # Vérifier si l'email existe déjà dans le registre
            if file_registry and not force_reingest:
                if file_registry.file_exists(email_path):
                    if not file_registry.has_changed(email_path, email_hash):
                        logger.info(f"Email déjà présent dans le registre (inchangé): {email_path}")
                        result["skipped_emails"] += 1
                        continue
                    else:
                        logger.info(f"Email modifié, réingestion: {email_path}")
                        # Supprimer l'ancien document de Qdrant
                        old_doc_id = file_registry.get_doc_id(email_path)
                        if old_doc_id:
                            logger.info(f"Suppression de l'ancien document: {old_doc_id}")
                            vector_store.delete_by_doc_id(old_doc_id)
            
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
                    user=gmail_user,
                    collection=collection,
                    doc_id=email_id,
                    metadata=metadata,
                    original_filepath=email_path
                )
                
                # Mettre à jour le registre
                if file_registry:
                    file_registry.add_file(
                        file_path=email_path,
                        doc_id=email_id,
                        file_hash=email_hash,
                        source_path=email_path,
                        last_modified=email.metadata.date,
                        metadata={
                            "file_name": f"Email: {email.metadata.subject}",
                            "extension": ".eml"
                        }
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
                        
                        # Vérifier si la pièce jointe existe déjà
                        if file_registry and not force_reingest:
                            if file_registry.file_exists(att_path):
                                if not file_registry.has_changed(att_path, att_hash):
                                    logger.info(f"Pièce jointe déjà présente (inchangée): {attachment.filename}")
                                    continue
                        
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
                                user=gmail_user,
                                collection=collection,
                                doc_id=att_id,
                                metadata=att_metadata,
                                original_filepath=att_path,
                                original_filename=attachment.filename
                            )
                            
                            # Mettre à jour le registre pour la pièce jointe
                            if file_registry:
                                file_registry.add_file(
                                    file_path=att_path,
                                    doc_id=att_id,
                                    file_hash=att_hash,
                                    source_path=att_path,
                                    last_modified=email.metadata.date,
                                    metadata={
                                        "file_name": attachment.filename,
                                        "extension": os.path.splitext(attachment.filename)[1],
                                        "parent_email_id": email_id
                                    }
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
    end_time = datetime.datetime.now()
    duration = (end_time - start_time).total_seconds()
    result["duration"] = duration
    
    # Résumé
    logger.info(f"Ingestion terminée en {duration:.2f} secondes")
    logger.info(f"Emails ingérés: {result['ingested_emails']}")
    logger.info(f"Pièces jointes ingérées: {result['ingested_attachments']}")
    logger.info(f"Emails ignorés (déjà présents): {result['skipped_emails']}")
    
    if result["errors"]:
        logger.warning(f"Erreurs rencontrées: {len(result['errors'])}")
    
    return result

def main():
    """Point d'entrée principal du script."""
    parser = argparse.ArgumentParser(description="Ingestion d'emails Gmail dans Qdrant avec authentification OAuth2.")
    parser.add_argument('--credentials', default="credentials.json", help='Chemin vers le fichier de credentials OAuth2 (à télécharger depuis Google Cloud Console)')
    parser.add_argument('--token', default="token.pickle", help='Chemin pour stocker le token d\'authentification')
    parser.add_argument('--labels', nargs='+', default=['INBOX', 'SENT'], help='Labels Gmail à traiter (liste séparée par des espaces)')
    parser.add_argument('--query', default=None, help='Requête de recherche Gmail (ex: "after:2023/01/01 before:2023/12/31")')
    parser.add_argument('--collection', default="rag_documents1536", help='Collection Qdrant cible')
    parser.add_argument('--limit', type=int, default=50, help='Nombre maximum d\'emails à ingérer')
    parser.add_argument('--registry-path', default='/Users/edoardo/Documents/LocalAI/rag-backend/update_vdb/data/file_registry.json', help='Chemin vers le fichier de registre JSON')
    parser.add_argument('--force-reingest', action='store_true', help='Forcer la réingestion même si l\'email existe déjà')
    parser.add_argument('--no-attachments', action='store_true', help='Ne pas ingérer les pièces jointes')
    parser.add_argument('--verbose', action='store_true', help='Mode verbeux')
    
    args = parser.parse_args()
    
    # Exécuter l'ingestion
    result = ingest_gmail_emails_to_qdrant(
        credentials_path=args.credentials,
        token_path=args.token,
        labels=args.labels,
        query=args.query,
        collection=args.collection,
        limit=args.limit,
        registry_path=args.registry_path,
        force_reingest=args.force_reingest,
        save_attachments=not args.no_attachments,
        verbose=args.verbose
    )
    
    # Afficher les résultats finaux
    if result["success"]:
        print(f"\nRésumé de l'ingestion:")
        print(f"- Emails trouvés: {result['total_emails_found']}")
        print(f"- Emails ingérés: {result['ingested_emails']}")
        print(f"- Pièces jointes ingérées: {result['ingested_attachments']}")
        print(f"- Emails ignorés (déjà présents): {result['skipped_emails']}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingestion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1

if __name__ == "__main__":
    sys.exit(main())
