#!/usr/bin/env python3
"""
Script d'ingestion d'emails Outlook dans Qdrant avec OAuth2 et intégration du registre JSON.
"""

import os
import sys
import hashlib
import argparse
import datetime
import tempfile
import base64
import json
import time
from typing import List, Dict, Any, Optional, Tuple
import msal
import requests

# Ajouter le chemin racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..',)))

# Importer les modules nécessaires
from src.services.ingestion.services.ingest_google_emails import parse_email_date
from src.services.ingestion.core.ingest_core import flush_batch
from src.services.storage.file_registry import FileRegistry
from src.core.logger import log
from src.services.auth.microsoft_auth import get_outlook_service
from src.services.ingestion.core.model import Email, EmailAttachment, EmailContent, EmailMetadata
from src.services.ingestion.core.utils import generate_email_id
from src.services.db.models import SyncStatus
from src.services.db.email_manager import EmailManager
# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="src.services.ingestion.services.ingest_outlook_emails")
# Définir la portée de l'accès à Outlook/Microsoft Graph
GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'

def parse_outlook_message(message: Dict, access_token: str, user: str, folder: str) -> Optional[Email]:
    """
    Parse un message Outlook en un objet Email.
    
    Args:
        message: Message Outlook à parser
        access_token: Token d'accès Microsoft Graph
        user: Adresse email de l'utilisateur
        
    Returns:
        Objet Email ou None en cas d'erreur
    """
    try:
        # Générer un doc_id temporaire à partir de l'ID du message
        temp_doc_id = hashlib.md5(message['id'].encode('utf-8')).hexdigest()
        
        # Extraire les métadonnées
        metadata = EmailMetadata(
            doc_id=temp_doc_id,
            user=user,
            message_id=message.get('id', None),
            provider_id=message.get('id', None),
            subject=message.get('subject', 'Sans sujet'),
            sender=message.get('from', {}).get('emailAddress', {}).get('address', None),
            receiver="; ".join([r.get('emailAddress', {}).get('address', '') for r in message.get('toRecipients', [])]),
            cc="; ".join([r.get('emailAddress', {}).get('address', '') for r in message.get('ccRecipients', [])]),
            date=message.get('receivedDateTime', None),
            source="microsoft_email",
            conversation_id=message.get('conversationId', None),
            folders=folder
        )
        
        # Récupérer le contenu du message
        body_text = ""
        body_html = ""
        
        if 'body' in message:
            if message['body'].get('contentType', '') == 'html':
                body_html = message['body'].get('content', '')
                # Essayer d'extraire le texte brut du HTML
                from bs4 import BeautifulSoup
                try:
                    soup = BeautifulSoup(body_html, 'html.parser')
                    body_text = soup.get_text()
                except:
                    body_text = "Contenu HTML non analysable"
            else:
                body_text = message['body'].get('content', '')
        
        # Récupérer les pièces jointes
        attachments = []
        
        if 'hasAttachments' in message and message['hasAttachments']:
            try:
                # Récupérer les pièces jointes via l'API Graph
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                attachment_url = f"{GRAPH_API_ENDPOINT}/me/messages/{message['id']}/attachments"
                response = requests.get(attachment_url, headers=headers)
                
                if response.status_code == 200:
                    attachment_data = response.json()
                    for attachment in attachment_data.get('value', []):
                        if 'contentBytes' in attachment:
                            content = base64.b64decode(attachment['contentBytes'])
                            attachments.append(EmailAttachment(
                                filename=attachment.get('name', 'sans-nom'),
                                content=content,
                                content_type=attachment.get('contentType', 'application/octet-stream')
                            ))
            except Exception as e:
                logger.warning(f"Erreur lors de la récupération des pièces jointes: {e}")
        
        # Créer l'objet de contenu de l'email
        content = EmailContent(
            body_text=body_text,
            body_html=body_html,
            attachments=attachments
        )
        
        # Créer et retourner l'objet Email complet
        return Email(metadata=metadata, content=content)
    
    except Exception as e:
        logger.error(f"Erreur lors du parsing du message {message.get('id', 'inconnu')}: {e}")
        return None

def fetch_outlook_emails(
    access_token: str,
    user: str,
    folders: List[str] = ['inbox'],
    limit: int = 10,
    query: str = None
) -> Tuple[List[Email], int]:
    """
    Récupère les emails d'Outlook en fonction des critères spécifiés.
    
    Args:
        access_token: Token d'accès Microsoft Graph
        user: Adresse email de l'utilisateur
        folders: Dossiers Outlook à rechercher (inbox, drafts, sentitems, etc.)
        limit: Nombre maximum d'emails à récupérer
        query: Requête de recherche Outlook (OData)
    
    Returns:
        Tuple contenant la liste des emails et le nombre total d'emails trouvés
    """
    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            #'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        emails = []
        total_messages = 0
        
        # Parcourir chaque dossier demandé
        for folder in folders:
            # Construire la requête
            endpoint = f"{GRAPH_API_ENDPOINT}/me/mailFolders/{folder}/messages"
            params = {
                '$top': min(limit, 50),  # Max 50 par requête API
                '$expand': 'attachments'
                #'$orderby': 'receivedDateTime desc',  # Plus récent d'abord
                #'$select': 'id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,hasAttachments,internetMessageId,body,conversationId'
            }
            
            if query:
                params['$filter'] = query
            
            # Exécuter la requête
            try:
                response = requests.get(endpoint, headers=headers, params=params)
                response.raise_for_status()  # Déclencher une exception si la requête échoue
                
                messages = response.json().get('value', [])
                total_messages += len(messages)
                
                # Parser chaque message
                for message in messages:
                    email = parse_outlook_message(message, access_token, user, folder)
                    if email:
                        emails.append(email)
                        
            except requests.exceptions.RequestException as e:
                logger.error(f"Erreur lors de la récupération des emails depuis {folder}: {str(e)}")
                continue
        
        logger.info(f"Récupération terminée: {len(emails)}/{total_messages} emails trouvés et parsés")
        return emails, total_messages
    
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des emails Outlook: {e}")
        return [], 0

def save_attachments(email: Email, output_dir: str) -> List[str]:
    """
    Sauvegarde les pièces jointes d'un email dans un répertoire et renvoie leurs chemins.
    
    Args:
        email: L'email contenant les pièces jointes
        output_dir: Le répertoire de sortie
        
    Returns:
        Liste des chemins des pièces jointes sauvegardées
    """
    attachment_paths = []
    
    if not email.content.attachments:
        return attachment_paths
    
    # Créer le répertoire de sortie s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)
    
    # Sauvegarder chaque pièce jointe
    for idx, attachment in enumerate(email.content.attachments):
        # Nettoyer le nom de fichier
        safe_filename = "".join([c for c in attachment.filename if c.isalnum() or c in "._- "]).strip()
        
        if not safe_filename:
            safe_filename = f"attachment_{idx}"
        
        # Ajouter l'extension si elle n'est pas présente
        if '.' not in safe_filename and hasattr(attachment, 'content_type'):
            ext_map = {
                'application/pdf': '.pdf',
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'text/plain': '.txt',
                'text/html': '.html',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-powerpoint': '.ppt',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
            }
            safe_filename += ext_map.get(attachment.content_type, '.bin')
        
        # Chemin complet du fichier
        file_path = os.path.join(output_dir, safe_filename)
        
        # Éviter les collisions de noms
        counter = 1
        base_name, ext = os.path.splitext(file_path)
        while os.path.exists(file_path):
            file_path = f"{base_name}_{counter}{ext}"
            counter += 1
        
        # Sauvegarder la pièce jointe
        try:
            with open(file_path, 'wb') as f:
                f.write(attachment.content)
            attachment_paths.append(file_path)
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de la pièce jointe {safe_filename}: {e}")
    
    return attachment_paths

def ingest_outlook_emails_to_qdrant(
    folders: List[str] = ["inbox", "sentitems"],
    limit: int = 50,
    query: str = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    user_id: str = "default",
    min_date: Optional[datetime.datetime] = None,
    batch_size: int = 10,
    return_count: bool = False,
    syncstatus: SyncStatus = None
) -> Dict[str, Any]:
    """
    Ingère des emails Outlook dans Qdrant.
    
    Args:
        folders: Liste des dossiers Outlook à parcourir
        limit: Nombre maximum d'emails à ingérer
        query: Requête de recherche Outlook (OData)
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder les pièces jointes
        user_id: Identifiant de l'utilisateur
        min_date: Date minimale pour filtrer les emails (ne traite que les emails postérieurs à cette date)
        credit_limit: Limite maximale d'emails à ingérer (basée sur les crédits utilisateur)
        return_count: Si True, retourne le nombre d'emails traités plutôt que le résultat complet
        
    Returns:
        Dictionnaire avec les résultats de l'ingestion ou nombre d'emails traités si return_count=True
    """
    start_time = time.time()
    
    # Résultat par défaut
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

    if syncstatus is None:
        syncstatus = SyncStatus(user_id=user_id, source_type="microsoft_email", total_documents=limit)
        syncstatus.upsert_status(status="in_progress", progress=0.0)
    
    # Initialize FileRegistry for this user
    file_registry = FileRegistry(user_id)
    logger.info(f"File registry loaded for user {user_id}: {len(file_registry.registry)} entries")
    email_manager = EmailManager()
    # Initialize batch for documents
    batch_documents = []
    
    try:
        # Récupérer le token Outlook
        token_result = get_outlook_service(user_id)
        if not token_result or "access_token" not in token_result:
            raise Exception("Échec de l'authentification à Outlook")
        
        access_token = token_result["access_token"]
        outlook_user = token_result.get("account", {}).get("username", "outlook_user")
        
        # Appliquer le filtre de date si spécifié
        date_filter = None
        if min_date:
            # Format without microseconds, with Z suffix for UTC (required by Microsoft Graph API)
            date_str = min_date.strftime('%Y-%m-%dT%H:%M:%SZ')
            date_filter = f"receivedDateTime ge {date_str}"
            
            # Combiner avec la requête existante
            if query:
                query = f"{query} and {date_filter}"
            else:
                query = date_filter
            logger.info(f"Filtre de date appliqué: {date_filter}")
            
        # Récupérer les emails
        emails, total_found = fetch_outlook_emails(
            access_token=access_token,
            user=outlook_user,
            folders=folders,
            limit=limit,
            query=query
        )
        
        result["total_emails_found"] = total_found
        syncstatus.total_documents = total_found
        logger.info(f"Nombre d'emails trouvés: {total_found}")
        # Si aucun email trouvé, terminer
        if not emails:
            logger.info("Aucun email trouvé correspondant aux critères")
            result["success"] = True
            return result
        
        # Créer un répertoire temporaire pour les pièces jointes
        temp_dir = None
        if save_attachments:
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Répertoire temporaire pour les pièces jointes: {temp_dir}")
        
        # Parcourir chaque email pour la préparation des batch
        for email_idx, email in enumerate(emails):
            try:
                # Générer un ID unique pour l'email
                email_id = generate_email_id(email)
                email.metadata.doc_id = email_id
                
                # Vérifier si l'email existe déjà dans le registre
                source_path = f"/microsoft_email/{user_id}/{email.metadata.conversation_id}/{email_id}"
                
                # Créer un fichier temporaire avec le contenu de l'email
                with tempfile.NamedTemporaryFile(mode='w+', suffix='.eml', delete=False) as temp_file:
                    # Écrire le contenu de l'email dans le fichier temporaire
                    temp_file.write(email.content.body_text or email.content.body_html or "")
                    filepath = temp_file.name
                # Préparer les métadonnées
                if email.metadata.folders=="inbox":
                    folder="inbox"
                elif email.metadata.folders=="sentitems":
                    folder="sent"

                metadata = {
                    "doc_id": email_id,
                    "path": source_path,
                    "user": user_id,
                    "filename": f"{email.metadata.subject or 'No subject'}.eml",
                    "sender": email.metadata.sender,
                    "receiver": email.metadata.receiver,
                    "cc": email.metadata.cc,
                    "bcc": email.metadata.bcc,
                    "subject": email.metadata.subject,
                    "date": email.metadata.date,
                    "provider_id": email.metadata.provider_id,
                    "has_attachments": email.metadata.has_attachments,
                    "content_type": email.metadata.content_type or "text/plain",
                    "ingestion_date": datetime.datetime.now().isoformat(),
                    "ingestion_type": "microsoft_email",
                    "body_text": email.content.body_text,
                    "conversation_id": email.metadata.conversation_id,
                    "folder": folder
                }
                
                # Ajouter le document au batch
                batch_documents.append({
                    "tmp_path": filepath,
                    "metadata": metadata
                })
                
                # Log progress every 5 emails
                if email_idx % 5 == 0:
                    logger.info(f"[{email_idx+1}/{len(emails)}] Préparation des emails pour ingestion")
                # Traitement des pièces jointes
                if save_attachments and email.attachments and temp_dir:
                    attachment_paths = save_attachments(email, temp_dir)
                    
                    for idx, attachment_path in enumerate(attachment_paths):
                        # Nom du fichier de la pièce jointe
                        attachment_name = os.path.basename(attachment_path)
                        
                        # Générer un ID unique pour la pièce jointe
                        attachment_id = hashlib.md5(f"{email_id}_{attachment_name}_{idx}".encode('utf-8')).hexdigest()
                        # Métadonnées pour la pièce jointe
                        attachment_metadata = {
                            "doc_id": attachment_id,
                            "path": f"/microsoft_email/{user_id}/{email.metadata.conversation_id}/attachments/{attachment_name}",
                            "user": user_id,
                            "filename": attachment_name,
                            "provider_id": email.metadata.provider_id,
                            "parent_email_id": email_id,
                            "subject": email.metadata.subject,
                            "date": email.metadata.date,
                            "sender": email.metadata.sender,
                            "receiver": email.metadata.receiver,
                            "content_type": "attachment",
                            "ingestion_date": datetime.datetime.now().isoformat(),
                            "ingestion_type": "microsoft_email_attachment",
                            "conversation_id": email.metadata.conversation_id,
                            "folder": folder
                        }
                        
                        # Ajouter la pièce jointe au batch
                        batch_documents.append({
                            "tmp_path": attachment_path,
                            "metadata": attachment_metadata
                        })
                        
                        result["ingested_attachments"] += 1
                # After preparing metadata, save to the email database
                try:
                    # Parse the email date string into a datetime object
                    parsed_date = parse_email_date(email.metadata.date)
                    
                    email_manager.save_email(
                        user_id=user_id,
                        email_id=email.metadata.provider_id,
                        sender=email.metadata.sender,
                        recipients=[email.metadata.receiver],  # Convert to list if needed
                        subject=email.metadata.subject or '',
                        body=email.content.body_text or '',
                        #html_body=email.content.body_html or '',
                        sent_date=parsed_date,
                        source_type="microsoft_email",
                        conversation_id=email.metadata.conversation_id,
                        folder=folder
                    )
                except Exception as e:
                    logger.error(f"Error saving email to database: {e}")
                # Procéder par lots de batch_size documents
                if len(batch_documents) >= batch_size:
                    flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
                    result["batches"] += 1
                    
            except Exception as e:
                error_msg = f"Erreur lors de la préparation de l'email {email.metadata.subject}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
        
        # Traiter les documents restants dans le batch
        if batch_documents:
            logger.info(f"Traitement du dernier lot de {len(batch_documents)} documents")
            flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
            result["batches"] += 1
        
        # Nettoyer le répertoire temporaire
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"Répertoire temporaire supprimé: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Erreur lors du nettoyage du répertoire temporaire: {cleanup_err}")
        
        # Marquer comme succès même s'il y a des erreurs individuelles
        result["success"] = result["items_ingested"] > 0 or result["ingested_attachments"] > 0
        
    except Exception as e:
        error_msg = f"Erreur globale lors de l'ingestion des emails Outlook: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
    
    # Calculer la durée
    result["duration"] = time.time() - start_time
    
    # Ajouter le nombre de lots traités au résultat
    result["batches_processed"] = result["batches"]
    
    logger.info(f"Ingestion d'emails Outlook terminée: {result['items_ingested']} emails ingérés avec "  
              f"{result['ingested_attachments']} pièces jointes en {result['duration']:.2f} secondes")
    
    # Si return_count est True, renvoyer uniquement le nombre d'emails traités
    if return_count:
        return result["items_ingested"]
        
    return result

def main():
    # Parser les arguments en ligne de commande
    parser = argparse.ArgumentParser(description="Script d'ingestion d'emails Outlook dans Qdrant via traitement par lots")
    
    parser.add_argument("--folders", nargs="+", default=["inbox", "sentitems"], help="Dossiers Outlook à parcourir")
    parser.add_argument("--limit", type=int, default=50, help="Nombre maximum d'emails à ingérer")
    parser.add_argument("--query", help="Requête de recherche Outlook (OData)")
    parser.add_argument("--force-reingest", action="store_true", help="Forcer la réingestion même si l'email existe déjà")
    parser.add_argument("--no-attachments", action="store_true", help="Ne pas sauvegarder les pièces jointes")
    parser.add_argument("--user-id", default="6NtmIVkebWgJWs6cyjtjKVO4Wxp1", help="Identifiant de l'utilisateur")
    parser.add_argument("--batch-size", type=int, default=10, help="Nombre de documents à traiter dans chaque lot")
    parser.add_argument("--min-date", help="Date minimale pour filtrer les emails (format YYYY-MM-DD)")
    
    args = parser.parse_args()
    
    # Convertir la date minimale en objet datetime si fournie
    min_date = None
    if args.min_date:
        try:
            min_date = datetime.datetime.fromisoformat(args.min_date)
            logger.info(f"Filtrage des emails antérieurs à {min_date}")
        except ValueError:
            logger.error(f"Format de date invalide: {args.min_date}. Utiliser le format YYYY-MM-DD")
            return 1
    print(args.force_reingest)
    # Exécuter l'ingestion
    result = ingest_outlook_emails_to_qdrant(
        folders=args.folders,
        limit=args.limit,
        query=args.query,
        force_reingest=args.force_reingest,
        save_attachments=not args.no_attachments,
        user_id=args.user_id,
        min_date=min_date,
        batch_size=args.batch_size
    )
    
    # Afficher les résultats finaux
    if result["success"]:
        print(f"\nRésumé de l'ingestion:")
        print(f"- Emails trouvés: {result['total_emails_found']}")
        print(f"- Emails ingérés: {result['items_ingested']}")
        print(f"- Pièces jointes ingérées: {result['ingested_attachments']}")
        print(f"- Emails ignorés (déjà présents): {result['skipped_emails']}")
        print(f"- Lots traités: {result.get('batches_processed', 0)}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingestion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1

if __name__ == "__main__":
    sys.exit(main())
