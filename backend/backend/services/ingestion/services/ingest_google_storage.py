#!/usr/bin/env python3
"""
Script d'ingestion de documents Google Drive dans Qdrant avec OAuth2.
"""

import os
import sys
import logging
import hashlib
import argparse
import datetime
import tempfile
import time
import traceback
from typing import List, Dict, Any, Optional, Tuple
import io
from googleapiclient.http import MediaIoBaseDownload

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from backend.core.logger import log
logger = log.bind(name="backend.services.ingestion.services.ingest_gdrive_documents")

# Imports internes
from backend.services.auth.google_auth import get_drive_service
from backend.services.ingestion.core.ingest_core import flush_batch
from backend.services.storage.file_registry import FileRegistry
from backend.services.db.models import SyncStatus

def compute_drive_file_hash(file_metadata: Dict, file_content: Optional[bytes] = None) -> str:
    """
    Calcule un hash unique pour un fichier Google Drive basé sur ses métadonnées et son contenu.
    
    Args:
        file_metadata: Métadonnées du fichier Google Drive
        file_content: Contenu binaire du fichier (optionnel)
        
    Returns:
        Le hash SHA-256 du fichier
    """
    hasher = hashlib.sha256()
    
    # Utiliser l'ID comme base principale
    if file_metadata.get('id'):
        hasher.update(file_metadata['id'].encode('utf-8'))
    
    # Ajouter d'autres métadonnées pour garantir l'unicité
    if file_metadata.get('name'):
        hasher.update(file_metadata['name'].encode('utf-8'))
    if file_metadata.get('modifiedTime'):
        hasher.update(file_metadata['modifiedTime'].encode('utf-8'))
    if file_metadata.get('mimeType'):
        hasher.update(file_metadata['mimeType'].encode('utf-8'))
    
    # Si le contenu est fourni, l'utiliser pour le hash
    if file_content:
        # Limiter à 10Ko pour les performances
        content_sample = file_content[:10240] if len(file_content) > 10240 else file_content
        hasher.update(content_sample)
    
    return hasher.hexdigest()

def get_export_mime_type(drive_mime_type: str) -> Optional[str]:
    """
    Détermine le type MIME pour l'exportation des fichiers Google Workspace.
    
    Args:
        drive_mime_type: Type MIME Google Drive
        
    Returns:
        Type MIME pour l'exportation ou None si non supporté
    """
    # Mapping des types MIME Google vers les formats d'export
    mime_map = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/pdf',
        'application/vnd.google-apps.presentation': 'application/pdf',
        'application/vnd.google-apps.drawing': 'application/pdf',
        'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json',
        'application/vnd.google-apps.form': 'application/pdf',
        'application/vnd.google-apps.site': 'text/plain',
        'application/vnd.google-apps.jam': 'application/pdf'
    }
    
    return mime_map.get(drive_mime_type)


def download_drive_file(drive_service, file_id: str, file_metadata: Dict) -> Optional[Tuple[str, bytes]]:
    """
    Télécharge un fichier depuis Google Drive.
    
    Args:
        drive_service: Service Google Drive authentifié
        file_id: ID du fichier à télécharger
        file_metadata: Métadonnées du fichier
        
    Returns:
        Tuple contenant le chemin temporaire et le contenu du fichier, ou None en cas d'erreur
    """
    try:
        mime_type = file_metadata.get('mimeType', '')
        file_name = file_metadata.get('name', f"file_{file_id}")
        
        logger.debug(f"Téléchargement du fichier: {file_name} (ID: {file_id}, MIME: {mime_type})")
        
        # Vérifier si c'est un dossier Google Drive
        if mime_type == 'application/vnd.google-apps.folder':
            logger.warning(f"Impossible de télécharger un dossier: {file_name}")
            return None
        
        # Gérer les fichiers Google Workspace (Docs, Sheets, etc.) qui nécessitent un export
        if mime_type.startswith('application/vnd.google-apps.'):
            logger.debug(f"Détecté comme fichier Google Workspace: {mime_type}")
            export_mime_type = get_export_mime_type(mime_type)
            
            if not export_mime_type:
                logger.warning(f"Type Google Workspace non supporté pour l'export: {mime_type}")
                return None
                
            try:
                logger.debug(f"Export du fichier Google Workspace au format {export_mime_type}")
                request = drive_service.files().export_media(fileId=file_id, mimeType=export_mime_type)
                # Déterminer l'extension appropriée pour le format d'export
                if export_mime_type == 'application/pdf':
                    extension = '.pdf'
                elif export_mime_type == 'text/plain':
                    extension = '.txt'
                elif export_mime_type == 'application/vnd.google-apps.script+json':
                    extension = '.json'
                else:
                    extension = '.bin'
            except Exception as export_err:
                logger.error(f"Erreur lors de l'export du fichier {file_name} ({mime_type}): {export_err}")
                return None
        else:
            # Pour les fichiers standard
            logger.debug(f"Détecté comme fichier standard: {mime_type}")
            try:
                request = drive_service.files().get_media(fileId=file_id)
                
                # Déterminer l'extension à utiliser
                original_extension = os.path.splitext(file_name)[1].lower()
                if original_extension:
                    extension = original_extension
                else:
                    # Assigner une extension basée sur le type MIME
                    mime_to_ext = {
                        'application/pdf': '.pdf',
                        'text/plain': '.txt',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                    }
                    extension = mime_to_ext.get(mime_type, '.bin')
            except Exception as media_err:
                logger.error(f"Erreur lors de la préparation du téléchargement du fichier {file_name}: {media_err}")
                return None
        
        # Télécharger le contenu
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            logger.debug(f"Téléchargement {int(status.progress() * 100)}%")
        
        # Créer un fichier temporaire avec la bonne extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
            temp_file_path = temp_file.name
            file_content_bytes = file_content.getvalue()
            temp_file.write(file_content_bytes)
        
        logger.info(f"Fichier téléchargé avec succès: {file_name} ({len(file_content_bytes)} octets)")
        return temp_file_path, file_content_bytes
        
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement du fichier {file_id}: {str(e)}")
        return None


def fetch_drive_files(drive_service, query: str = None, limit: int = 10, folder_id: str = None) -> List[Dict]:
    """
    Récupère la liste des fichiers depuis Google Drive.
    
    Args:
        drive_service: Service Google Drive authentifié
        query: Requête de recherche Google Drive
        limit: Nombre maximum de fichiers à récupérer
        folder_id: ID du dossier à explorer (optionnel)
        
    Returns:
        Liste des fichiers avec leurs métadonnées
    """
    try:
        # Construire la requête
        if folder_id:
            q = f"'{folder_id}' in parents and trashed = false"
        else:
            q = "trashed = false"
        
        # Ajouter la requête personnalisée si spécifiée
        if query:
            q += f" and {query}"
        
        # Champs à récupérer
        fields = "nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, parents, size, webViewLink)"
        
        # Exécuter la requête de recherche avec pagination
        results = []
        page_token = None
        while True:
            response = drive_service.files().list(
                q=q,
                spaces='drive',
                fields=fields,
                pageToken=page_token,
                pageSize=min(100, limit - len(results))
            ).execute()
            
            results.extend(response.get('files', []))
            page_token = response.get('nextPageToken')
            
            # Vérifier si on a atteint la limite ou s'il n'y a plus de résultats
            if not page_token or len(results) >= limit:
                break
        
        return results[:limit]  # Limiter aux premiers résultats
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers: {e}")
        return []


def batch_ingest_gdrive_documents(
    query: str = None,
    limit: int = 10,
    folder_id: str = None,
    force_reingest: bool = False,
    verbose: bool = False,
    user_id: str = "",
    batch_size: int = 10,
    syncstatus: SyncStatus = None
) -> Dict[str, Any]:
    """
    Ingère les documents depuis Google Drive vers Qdrant par lots pour de meilleures performances.
    Utilise FileRegistry pour éviter les duplications et suit une approche cohérente avec les autres sources.
    
    Args:
        query: Requête de filtrage Google Drive (ex: "mimeType='application/pdf'")
        limit: Nombre maximum de fichiers à ingérer
        folder_id: ID du dossier à explorer (optionnel)
        force_reingest: Forcer la réingestion même si le fichier existe déjà dans le registre
        verbose: Mode verbeux pour plus de logs
        user_id: Identifiant de l'utilisateur
        batch_size: Taille des lots d'ingestion pour optimiser les performances
        collection: Collection Qdrant cible (par défaut user_id)
        
    Returns:
        Dictionnaire contenant les statistiques d'ingestion:
        - success: Booléen indiquant si l'ingestion a réussi
        - total_files_found: Nombre total de fichiers trouvés
        - items_ingested: Nombre de fichiers ingérés
        - files_skipped: Nombre de fichiers ignorés
        - batches: Nombre de lots traités
        - errors: Liste des erreurs rencontrées
        - duration: Durée totale de l'ingestion en secondes
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)    
    # Créer le répertoire temporaire pour les fichiers
    temp_dir = tempfile.mkdtemp(prefix="gdrive_ingest_")
    logger.info(f"Répertoire temporaire créé: {temp_dir}")
    
    # Initialiser le registre de fichiers
    file_registry = FileRegistry(user_id)
    logger.info(f"Registre de fichiers chargé pour {user_id}: {len(file_registry.registry)} entrées")
    
    # Initialiser les statistiques
    start_time = time.time()
    result = {
        "success": False,
        "total_files_found": 0,
        "items_ingested": 0,  # Utiliser items_ingested pour être cohérent avec flush_batch
        "files_skipped": 0,
        "batches": 0,
        "errors": [],
        "start_time": start_time,
        "duration": 0
    }
    
    # Liste pour collecter les documents à ingérer par lot
    batch_documents = []
    temp_files_to_cleanup = []
    
    try:
        # Obtenir le service Google Drive authentifié
        drive_service = get_drive_service(user_id)
        logger.info("Service Google Drive initialisé avec succès")
        
        # Récupérer les fichiers depuis Google Drive
        files = fetch_drive_files(drive_service, query, limit, folder_id)
        result["total_files_found"] = len(files)
        syncstatus.total_documents = len(files)
        if not files:
            logger.info("Aucun fichier trouvé dans Google Drive avec les critères spécifiés")
            result["success"] = True
            return result
        
        logger.info(f"Traitement de {len(files)} fichiers Google Drive")
        
        # Traitement par lot des fichiers Google Drive
        for file_idx, file_metadata in enumerate(files):
            try:
                file_id = file_metadata.get('id')
                file_name = file_metadata.get('name', 'Fichier sans nom')
                file_mimetype = file_metadata.get('mimeType', 'application/octet-stream')
                file_weblink = file_metadata.get('webViewLink', '')
                file_modified = file_metadata.get('modifiedTime', '')
                
                # Construire le chemin source normalisé
                source_path = f"/google_storage/{user_id}/{file_id}/{file_name}"
                
                # Générer un hash unique pour ce fichier
                file_hash = compute_drive_file_hash(file_metadata)
                doc_id = file_hash
                
                # Vérifier si le fichier existe déjà dans le registre
                if not force_reingest and file_registry.file_exists(source_path):
                    logger.info(f"[SKIP] Fichier déjà ingéré: {file_name} (path: {source_path})")
                    result['files_skipped'] += 1
                    continue
                
                # Log de progression
                logger.info(f"[{file_idx+1}/{len(files)}] Téléchargement et traitement: {file_name}")
                
                # Télécharger le fichier
                download_result = download_drive_file(drive_service, file_id, file_metadata)
                if not download_result:
                    logger.warning(f"[ERROR] Échec du téléchargement: {file_name}")
                    result['errors'].append(f"Téléchargement échoué: {file_name}")
                    continue
                    
                temp_file_path, file_content = download_result
                temp_files_to_cleanup.append(temp_file_path)
                
                # Création des métadonnées du document
                metadata = {
                    "path": source_path,
                    "doc_id": doc_id,
                    "ingestion_type": "google_storage",
                    "filename": file_name,
                    "user": user_id,
                    "ingestion_date": datetime.datetime.now().isoformat()
                }
                
                # Ajouter à la liste de documents à traiter par lot
                batch_documents.append({
                    "tmp_path": temp_file_path,
                    "metadata": metadata
                })
                
                # Traiter le lot si la taille maximale est atteinte
                if len(batch_documents) >= batch_size:
                    flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
                    result["batches"] += 1
                    logger.info(f"Lot #{result['batches']} traité. Total ingéré: {result['items_ingested']}")
                    
            except Exception as e:
                error_msg = f"Erreur traitement fichier {file_metadata.get('name', 'inconnu')}: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                result["errors"].append(error_msg)
        
        # Traiter le dernier lot s'il reste des documents
        if batch_documents:
            logger.info(f"Traitement du dernier lot de {len(batch_documents)} documents")
            flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
            result["batches"] += 1
            
        # Nettoyer les fichiers temporaires
        for temp_file in temp_files_to_cleanup:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    logger.debug(f"Fichier temporaire supprimé: {temp_file}")
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression du fichier temporaire {temp_file}: {e}")
                
        # Nettoyer le répertoire temporaire
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"Répertoire temporaire supprimé: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Erreur lors du nettoyage du répertoire temporaire: {cleanup_err}")
        
        # Finaliser les statistiques
        end_time = time.time()
        result["duration"] = end_time - start_time
        result["success"] = True
        
        logger.info(f"Ingestion terminée en {result['duration']:.2f}s")
        logger.info(f"Fichiers ingérés: {result['items_ingested']}, ignorés: {result['files_skipped']}, lots: {result['batches']}")
        if result["errors"]:
            logger.warning(f"Erreurs rencontrées: {len(result['errors'])}")
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation: {e}")
        logger.error(traceback.format_exc())
        result["errors"].append(f"Erreur initialisation: {str(e)}")
        result["success"] = False
        
    return result

def main():
    """
    Point d'entrée principal du script.
    """
    parser = argparse.ArgumentParser(description="Ingétion de documents Google Drive dans Qdrant.")
    parser.add_argument('--query', default=None, help='Requête de recherche Google Drive (ex: "mimeType=\'application/pdf\' and modifiedTime > \'2023-01-01T00:00:00\'")') 
    parser.add_argument('--limit', type=int, default=50, help='Nombre maximum de fichiers à ingérer')
    parser.add_argument('--folder-id', default=None, help='ID du dossier Google Drive à explorer (optionnel)')
    parser.add_argument('--force-reingest', action='store_true', help='Forcer la réingétion même si le fichier existe déjà')
    parser.add_argument('--verbose', action='store_true', help='Mode verbeux')
    parser.add_argument('--user-id', default="7EShftbbQ4PPTS4hATplexbrVHh2", help='Identifiant de l\'utilisateur')
    parser.add_argument('--batch-size', type=int, default=10, help='Taille des lots pour l\'ingétion')
    parser.add_argument('--test-connectivity', action='store_true', help='Tester la connectivité avec Google Drive')
    
    args = parser.parse_args()
    
    # Exécuter l'ingestion par lots
    result = batch_ingest_gdrive_documents(
        query=args.query,
        limit=args.limit,
        folder_id=args.folder_id,
        force_reingest=args.force_reingest,
        verbose=args.verbose,
        user_id=args.user_id,
        batch_size=args.batch_size
    )
    
    # Afficher les résultats finaux
    if result["success"]:
        print(f"\nRésumé de l'ingétion:")
        print(f"- Fichiers trouvés: {result['total_files_found']}")
        print(f"- Fichiers ingérés: {result['items_ingested']}")
        print(f"- Fichiers ignorés: {result['files_skipped']}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingétion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
