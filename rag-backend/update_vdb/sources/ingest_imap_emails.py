#!/usr/bin/env python3
"""
Script d'ingestion d'emails IMAP dans Qdrant avec intégration du registre JSON.
"""

import os
import sys
import logging
import hashlib
import argparse
import datetime
from typing import List, Dict, Any, Optional

# Ajouter les répertoires parents au chemin
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importer les modules nécessaires
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from update_vdb.sources.email_sources.imap_source import ImapEmailSource
from update_vdb.sources.email_sources.base import EmailFetchResult, Email, EmailAttachment, EmailContent, EmailMetadata
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from rag_engine.config import load_config
from update_vdb.sources.file_registry import FileRegistry
from update_vdb.core.ingest_core import ingest_document

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ingest-imap")

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

def ingest_emails_to_qdrant(
    imap_server: str,
    imap_port: int,
    imap_user: str,
    imap_password: str,
    imap_folders: List[str],
    collection: str,
    limit: int = 10,
    registry_path: Optional[str] = None,
    force_reingest: bool = False,
    save_attachments: bool = True,
    verbose: bool = False
) -> Dict[str, Any]:
    """
    Ingère les emails depuis un serveur IMAP vers Qdrant et met à jour le registre.
    
    Args:
        imap_server: Serveur IMAP
        imap_port: Port IMAP
        imap_user: Nom d'utilisateur IMAP
        imap_password: Mot de passe IMAP
        imap_folders: Dossiers IMAP à traiter
        collection: Collection Qdrant cible
        limit: Nombre maximum d'emails à ingérer
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
        "duration": 0
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
    
    # Créer la source d'emails IMAP
    email_source = ImapEmailSource(
        collection_name=collection,
        user=imap_user,
        limit=limit,
        save_attachments=save_attachments,
        save_email_body=True,
        delete_after_import=False
    )
    
    # Récupérer les emails
    fetch_result, emails = email_source.fetch_emails(
        imap_server=imap_server,
        imap_port=imap_port,
        imap_user=imap_user,
        imap_password=imap_password,
        imap_folders=imap_folders
    )
    
    if not fetch_result.success:
        logger.error(f"Erreur lors de la récupération des emails: {fetch_result.error}")
        result["success"] = False
        result["errors"].append(f"Erreur IMAP: {fetch_result.error}")
        return result
    
    logger.info(f"Récupération terminée: {len(emails)} emails trouvés")
    
    # Traiter les emails récupérés
    for email_idx, email in enumerate(emails, 1):
        try:
            email_id = generate_email_id(email)
            email_hash = compute_email_hash(email)
            email_path = f"/IMAP/{imap_user}/{email.metadata.date}/{email_id}"
            
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
            
            # Préparer les métadonnées pour l'ingestion
            metadata = {
                "source": "imap",
                "source_path": email_path,
                "subject": email.metadata.subject,
                "sender": email.metadata.sender,
                "receiver": email.metadata.receiver,
                "cc": email.metadata.cc,
                "date": email.metadata.date,
                "message_id": email.metadata.message_id,
                "document_type": "email",
                "imap_user": imap_user,
                "imap_server": imap_server
            }
            
            # Créer un fichier temporaire pour le corps de l'email
            import tempfile
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".eml") as tmp_file:
                # Préférer le HTML s'il est disponible, sinon utiliser le texte brut
                body_content = email.content.body_html or email.content.body_text or ""
                tmp_file.write(body_content)
                tmp_path = tmp_file.name
            
            # Ingérer le corps de l'email
            try:
                ingest_document(
                    filepath=tmp_path,
                    user=imap_user,
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
                        
                        # Métadonnées spécifiques pour la pièce jointe
                        att_metadata = {
                            "source": "imap_attachment",
                            "source_path": att_path,
                            "document_type": "email_attachment",
                            "parent_email_id": email_id,
                            "content_type": attachment.content_type,
                            "filename": attachment.filename,
                            "email_subject": email.metadata.subject,
                            "email_date": email.metadata.date,
                            "email_sender": email.metadata.sender,
                            "imap_user": imap_user
                        }
                        
                        try:
                            # Ingérer la pièce jointe
                            ingest_document(
                                filepath=att_tmp_path,
                                user=imap_user,
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
    parser = argparse.ArgumentParser(description="Ingestion d'emails IMAP dans Qdrant avec registre JSON.")
    parser.add_argument('--server', default="mail.newsflix.fr", help='Serveur IMAP')
    parser.add_argument('--port', type=int, default=993, help='Port IMAP')
    parser.add_argument('--user', default="noreply@newsflix.fr", help='Utilisateur IMAP')
    parser.add_argument('--password', default="enzo789luigi", help='Mot de passe IMAP')
    parser.add_argument('--folders', nargs='+', default=['INBOX'], help='Dossiers IMAP (liste séparée par des espaces)')
    parser.add_argument('--collection', default="rag_documents1536", help='Collection Qdrant cible')
    parser.add_argument('--limit', type=int, default=10, help='Nombre maximum d\'emails à ingérer')
    parser.add_argument('--registry-path', help='Chemin vers le fichier de registre JSON (utilise le chemin par défaut si non spécifié)')
    parser.add_argument('--force-reingest', action='store_true', help='Forcer la réingestion même si l\'email existe déjà')
    parser.add_argument('--no-attachments', action='store_true', help='Ne pas ingérer les pièces jointes')
    parser.add_argument('--verbose', action='store_true', help='Mode verbeux')
    
    args = parser.parse_args()
    
    # Exécuter l'ingestion
    result = ingest_emails_to_qdrant(
        imap_server=args.server,
        imap_port=args.port,
        imap_user=args.user,
        imap_password=args.password,
        imap_folders=args.folders,
        collection=args.collection,
        limit=args.limit,
        registry_path=args.registry_path,
        force_reingest=args.force_reingest,
        save_attachments=not args.no_attachments,
        verbose=args.verbose
    )
    
    # Afficher un résumé des résultats
    print("\n===== Résultats de l'ingestion IMAP =====")
    print(f"Statut: {'Succès' if result['success'] else 'Échec'}")
    print(f"Emails ingérés: {result['ingested_emails']}")
    print(f"Pièces jointes ingérées: {result['ingested_attachments']}")
    print(f"Emails ignorés (déjà présents): {result['skipped_emails']}")
    print(f"Durée totale: {result['duration']:.2f} secondes")
    
    if result["errors"]:
        print(f"\nErreurs rencontrées ({len(result['errors'])}):")
        for i, error in enumerate(result["errors"][:10], 1):
            print(f"{i}. {error}")
        
        if len(result["errors"]) > 10:
            print(f"... et {len(result['errors']) - 10} autres erreurs")

if __name__ == "__main__":
    main()
