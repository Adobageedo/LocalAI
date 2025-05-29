#!/usr/bin/env python3
"""
Script d'ingestion d'emails Outlook dans Qdrant avec OAuth2 et intégration du registre JSON.
"""

import os
import sys
import logging
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
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

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
logger = logging.getLogger("ingest-outlook")
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
logging.getLogger("openai._base_client").setLevel(logging.WARNING)
logging.getLogger("unstructured.trace").setLevel(logging.WARNING)
logging.getLogger("chardet.universaldetector").setLevel(logging.WARNING)

# Définir la portée de l'accès à Outlook/Microsoft Graph
SCOPES = ['Mail.Read', 'User.Read']
GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'

def get_outlook_token(client_id: str, client_secret: str, tenant_id: str, token_path: str) -> Optional[Dict]:
    """
    Authentifie l'utilisateur et renvoie un token d'accès à Microsoft Graph.
    
    Args:
        client_id: ID client Azure
        client_secret: Secret client Azure
        tenant_id: ID du tenant Azure
        token_path: Chemin vers le fichier de token cache
        
    Returns:
        Token d'accès ou None en cas d'erreur
    """
    try:
        # Vérifier si un token cache existe
        token_cache = msal.SerializableTokenCache()
        
        if os.path.exists(token_path):
            with open(token_path, 'r') as token_file:
                token_cache.deserialize(token_file.read())
        
        # Créer l'application MSAL comme client public
        # C'est plus adapté pour une application bureau où l'utilisateur est présent
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        
        # Essayer de récupérer le token depuis le cache
        accounts = app.get_accounts()
        result = None
        
        if accounts:
            # Si un compte est déjà connecté, utiliser le refresh token
            logger.info(f"Compte trouvé dans le cache : {accounts[0].get('username', 'compte inconnu')}")
            result = app.acquire_token_silent(SCOPES, account=accounts[0])
        
        if not result:
            logger.info("Aucun token valide trouvé, lancement de l'authentification interactive")
            
            # Pour une application bureau, utiliser le flux d'authentification avec serveur local
            # comme pour Gmail, qui est plus convivial pour l'utilisateur
            result = app.acquire_token_interactive(
                scopes=SCOPES,
                prompt="select_account"  # Permet à l'utilisateur de choisir un compte
                # Ne pas spécifier port ici car cela crée un conflit avec redirect_uri
            )
            
            # Vérifier si l'authentification a réussi
            if "error" in result:
                error_msg = result.get("error_description", "Erreur inconnue")
                logger.error(f"Erreur lors de l'authentification interactive: {error_msg}")
                raise Exception(f"Échec de l'authentification: {error_msg}")
        
        # Sauvegarder le token pour les prochaines fois
        if token_cache.has_state_changed:
            with open(token_path, 'w') as token_file:
                token_file.write(token_cache.serialize())
        
        if "access_token" in result:
            # Extraire des informations sur l'utilisateur si disponibles
            username = "outlook_user"
            if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
                username = result["id_token_claims"]["preferred_username"]
            elif accounts and accounts[0].get("username"):
                username = accounts[0].get("username")
                
            logger.info(f"Authentification à Outlook réussie pour {username}")
            
            # Ajouter des informations sur le compte pour utilisation ultérieure
            result["account"] = {"username": username}
            return result
        else:
            error_desc = result.get('error_description', 'Erreur inconnue')
            logger.error(f"Erreur d'authentification: {error_desc}")
            return None
            
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Outlook: {str(e)}")
        return None

def compute_email_hash(email: Email) -> str:
    """
    Calcule un hash SHA-256 pour un email.
    
    Args:
        email: L'objet Email
        
    Returns:
        Le hash SHA-256 de l'email
    """
    # Créer une chaîne représentant le contenu complet de l'email
    content_parts = [
        email.metadata.message_id or "",
        email.metadata.subject or "",
        email.metadata.sender or "",
        email.metadata.receiver or "",
        email.metadata.date or "",
        email.content.body_text or "",
        email.content.body_html or ""
    ]
    
    email_content = "||".join(content_parts)
    
    # Calculer le hash SHA-256
    hasher = hashlib.sha256()
    hasher.update(email_content.encode('utf-8', errors='replace'))
    
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

def parse_outlook_message(message: Dict, access_token: str, user: str) -> Optional[Email]:
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
            message_id=message.get('internetMessageId', None),
            subject=message.get('subject', 'Sans sujet'),
            sender=message.get('from', {}).get('emailAddress', {}).get('address', None),
            receiver="; ".join([r.get('emailAddress', {}).get('address', '') for r in message.get('toRecipients', [])]),
            cc="; ".join([r.get('emailAddress', {}).get('address', '') for r in message.get('ccRecipients', [])]),
            date=message.get('receivedDateTime', None),
            source="outlook"
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
        query: Requête de recherche Outlook (syntaxe OData)
        
    Returns:
        Tuple contenant la liste des emails et le nombre total d'emails trouvés
    """
    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        emails = []
        total_messages = 0
        
        for folder in folders:
            # Construire la requête
            endpoint = f"{GRAPH_API_ENDPOINT}/me/mailFolders/{folder}/messages"
            params = {
                '$top': min(limit, 50),  # Max 50 par requête API
                '$expand': 'attachments'
            }
            
            if query:
                params['$filter'] = query
            
            # Exécuter la requête
            response = requests.get(endpoint, headers=headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"Erreur lors de la récupération des emails depuis {folder}: {response.status_code} - {response.text}")
                continue
            
            messages = response.json().get('value', [])
            total_messages += len(messages)
            
            # Parser chaque message
            for message in messages:
                email = parse_outlook_message(message, access_token, user)
                if email:
                    emails.append(email)
                
                # Respecter la limite totale
                if len(emails) >= limit:
                    break
            
            # Respecter la limite totale
            if len(emails) >= limit:
                break
        
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
    client_id: str,
    client_secret: str,
    tenant_id: str,
    token_path: str,
    folders: List[str] = ["inbox", "sentitems"],
    limit: int = 50,
    query: str = None,
    collection: str = None,
    registry_path: str = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False
) -> Dict:
    """
    Ingère des emails Outlook dans Qdrant.
    
    Args:
        client_id: ID client Azure
        client_secret: Secret client Azure
        tenant_id: ID du tenant Azure
        token_path: Chemin vers le fichier de token
        folders: Liste des dossiers Outlook à parcourir
        limit: Nombre maximum d'emails à ingérer
        query: Requête de recherche Outlook (OData)
        collection: Nom de la collection Qdrant
        registry_path: Chemin vers le fichier de registre
        force_reingest: Forcer la réingestion même si l'email existe déjà
        save_attachments: Sauvegarder les pièces jointes
        verbose: Mode verbeux
        
    Returns:
        Un dictionnaire avec les résultats de l'ingestion
    """
    start_time = time.time()
    
    # Résultat par défaut
    result = {
        "success": False,
        "ingested_emails": 0,
        "skipped_emails": 0,
        "ingested_attachments": 0,
        "total_emails_found": 0,
        "errors": [],
        "duration": 0
    }
    
    try:
        # Charger la configuration
        config = load_config()
        
        # Initialiser le registre de fichiers
        registry = FileRegistry(registry_path=registry_path)
        logger.info(f"Registre de fichiers chargé: {len(registry.registry)} entrées")
        
        # Initialiser le gestionnaire de vectorstore
        if not collection:
            collection = config.get("retrieval", {}).get("vectorstore", {}).get("collection", "rag_documents1536")
        
        vectorstore_manager = VectorStoreManager(collection_name=collection)
        logger.info(f"Connexion à Qdrant établie, collection: {collection}")
        
        # Récupérer le token Outlook
        token_result = get_outlook_token(client_id, client_secret, tenant_id, token_path)
        if not token_result or "access_token" not in token_result:
            raise Exception("Échec de l'authentification à Outlook")
        
        access_token = token_result["access_token"]
        outlook_user = token_result.get("account", {}).get("username", "outlook_user")
        
        # Récupérer les emails
        emails, total_found = fetch_outlook_emails(
            access_token=access_token,
            user=outlook_user,
            folders=folders,
            limit=limit,
            query=query
        )
        
        result["total_emails_found"] = total_found
        
        if not emails:
            logger.warning("Aucun email trouvé ou erreur lors de la récupération")
            result["success"] = True
            return result
        
        # Créer un répertoire temporaire pour les pièces jointes
        temp_dir = None
        if save_attachments:
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Répertoire temporaire créé pour les pièces jointes: {temp_dir}")
        
        # Ingérer chaque email
        for email in emails:
            try:
                # Générer un ID unique pour l'email
                email_id = generate_email_id(email)
                email.metadata.doc_id = email_id
                
                # Vérifier si l'email existe déjà dans le registre
                email_path = f"/Outlook/{outlook_user}/{email.metadata.date}/{email_id}"
                
                if not force_reingest and registry.file_exists(email_path):
                    logger.info(f"Email déjà présent dans le registre, ignoré: {email.metadata.subject}")
                    result["skipped_emails"] += 1
                    continue
                
                # Sauvegarder les pièces jointes si nécessaire
                attachment_paths = []
                if save_attachments and email.content.attachments and temp_dir:
                    email_dir = os.path.join(temp_dir, email_id)
                    attachment_paths = save_attachments(email, email_dir)
                    
                    # Mettre à jour le compteur de pièces jointes
                    result["ingested_attachments"] += len(attachment_paths)
                
                # Préparer le contenu de l'email pour l'ingestion
                email_content = f"Sujet: {email.metadata.subject}\n"
                email_content += f"De: {email.metadata.sender}\n"
                email_content += f"À: {email.metadata.receiver}\n"
                
                if email.metadata.cc:
                    email_content += f"CC: {email.metadata.cc}\n"
                    
                email_content += f"Date: {email.metadata.date}\n\n"
                email_content += email.content.body_text or "Contenu non disponible"
                
                # Préparer les métadonnées
                metadata = email.metadata.to_dict()
                metadata["file_name"] = f"Email: {email.metadata.subject}"
                metadata["extension"] = ".eml"
                metadata["source_path"] = email_path
                
                # Ajouter des métadonnées supplémentaires pour les pièces jointes
                if attachment_paths:
                    metadata["has_attachments"] = True
                    metadata["attachment_count"] = len(attachment_paths)
                
                # Écrire le contenu de l'email dans un fichier temporaire
                with tempfile.NamedTemporaryFile('w+', suffix='.eml', delete=False) as temp_email_file:
                    temp_email_file.write(email_content)
                    temp_email_file_path = temp_email_file.name

                try:
                    ingest_document(
                        filepath=temp_email_file_path,
                        user=outlook_user,
                        collection=collection,
                        doc_id=email_id,
                        metadata=metadata,
                        original_filepath=email_path,
                        original_filename=email.metadata.subject
                    )
                finally:
                    # Nettoyer le fichier temporaire de l'email
                    if os.path.exists(temp_email_file_path):
                        os.remove(temp_email_file_path)

                
                # Ingérer les pièces jointes
                for attachment_path in attachment_paths:
                    try:
                        attachment_name = os.path.basename(attachment_path)
                        attachment_id = hashlib.md5(f"{email_id}_{attachment_name}".encode()).hexdigest()
                        
                        # Métadonnées de la pièce jointe
                        attachment_metadata = {
                            "doc_id": attachment_id,
                            "file_name": attachment_name,
                            "extension": os.path.splitext(attachment_name)[1].upper(),
                            "source_path": f"{email_path}/attachments/{attachment_name}",
                            "is_attachment": True,
                            "parent_email_id": email_id
                        }
                        
                        # Ingérer la pièce jointe
                        ingest_document(
                            filepath=attachment_path,
                            user=outlook_user,
                            collection=collection,
                            doc_id=attachment_id,
                            metadata=attachment_metadata,
                            original_filepath=attachment_metadata["source_path"],
                            original_filename=attachment_name
                        )
                    
                    except Exception as e:
                        error_msg = f"Erreur lors de l'ingestion de la pièce jointe {attachment_path}: {str(e)}"
                        logger.error(error_msg)
                        result["errors"].append(error_msg)
                
                # Mettre à jour le compteur d'emails ingérés
                result["ingested_emails"] += 1
                
                if verbose:
                    logger.info(f"Email ingéré: {email.metadata.subject} ({email_id})")
            
            except Exception as e:
                error_msg = f"Erreur lors de l'ingestion de l'email {email.metadata.subject}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
        
        # Nettoyer le répertoire temporaire
        if temp_dir and os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir)
        
        # Marquer comme succès même s'il y a des erreurs individuelles
        result["success"] = True
        
    except Exception as e:
        error_msg = f"Erreur globale lors de l'ingestion des emails Outlook: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
    
    # Calculer la durée
    result["duration"] = time.time() - start_time
    
    return result

def main():
    # Parser les arguments en ligne de commande
    parser = argparse.ArgumentParser(description="Script d'ingestion d'emails Outlook dans Qdrant")
    
    parser.add_argument("--client-id", help="ID client Azure")
    parser.add_argument("--client-secret", help="Secret client Azure")
    parser.add_argument("--tenant-id", help="ID du tenant Azure")
    parser.add_argument("--token", default="outlook_token.json", help="Chemin vers le fichier de token")
    parser.add_argument("--folders", nargs="+", default=["inbox", "sentitems"], help="Dossiers Outlook à parcourir")
    parser.add_argument("--limit", type=int, default=50, help="Nombre maximum d'emails à ingérer")
    parser.add_argument("--query", help="Requête de recherche Outlook (OData)")
    parser.add_argument("--collection", help="Nom de la collection Qdrant")
    parser.add_argument("--registry-path", help="Chemin vers le fichier de registre")
    parser.add_argument("--force-reingest", action="store_true", help="Forcer la réingestion même si l'email existe déjà")
    parser.add_argument("--no-attachments", action="store_true", help="Ne pas sauvegarder les pièces jointes")
    parser.add_argument("--verbose", action="store_true", help="Mode verbeux")
    
    args = parser.parse_args()
    
    # Utiliser les variables d'environnement si non spécifiées
    client_id = args.client_id or os.environ.get("OUTLOOK_CLIENT_ID")
    client_secret = args.client_secret or os.environ.get("OUTLOOK_CLIENT_SECRET")
    tenant_id = args.tenant_id or os.environ.get("OUTLOOK_TENANT_ID")
    
    if not client_id:
        logger.error(f"OUTLOOK_CLIENT_ID manquant ou non défini dans .env")
        return 1
    if not client_secret:
        logger.error(f"OUTLOOK_CLIENT_SECRET manquant ou non défini dans .env")
        return 1
    if not tenant_id:
        logger.error(f"OUTLOOK_TENANT_ID manquant ou non défini dans .env")
        return 1
        
    logger.info(f"Utilisation des identifiants Outlook: Client ID={client_id}, Tenant ID={tenant_id}")
    
    
    # Exécuter l'ingestion
    result = ingest_outlook_emails_to_qdrant(
        client_id=client_id,
        client_secret=client_secret,
        tenant_id=tenant_id,
        token_path=args.token,
        folders=args.folders,
        limit=args.limit,
        query=args.query,
        collection=args.collection,
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
