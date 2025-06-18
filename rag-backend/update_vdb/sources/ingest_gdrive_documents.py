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
from typing import List, Dict, Any, Optional, Tuple
import io
from googleapiclient.http import MediaIoBaseDownload

# Ajouter les répertoires parents au chemin
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ingest-gdrive")

# Imports internes
from auth.google_auth import get_drive_service
from update_vdb.core.ingest_core import ingest_document
from update_vdb.sources.file_registry import FileRegistry
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
logging.getLogger("openai._base_client").setLevel(logging.WARNING)
logging.getLogger("unstructured.trace").setLevel(logging.WARNING)
logging.getLogger("chardet.universaldetector").setLevel(logging.WARNING)

# Extensions de fichiers supportées (à adapter selon les besoins)
SUPPORTED_EXTENSIONS = [
    '.pdf', '.txt', '.doc', '.docx', '.csv', '.md', '.xlsx', '.pptx'
]

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

def is_supported_file(file_metadata: Dict) -> bool:
    """
    Vérifie si le fichier est d'un type pris en charge pour l'ingestion.
    
    Args:
        file_metadata: Métadonnées du fichier Google Drive
        
    Returns:
        True si le fichier est supporté, False sinon
    """
    name = file_metadata.get('name', '')
    mime_type = file_metadata.get('mimeType', '')
    
    # Si c'est un dossier ou un fichier Google Docs/Sheets/etc., non pris en charge
    if mime_type == 'application/vnd.google-apps.folder':
        return False
    
    # Pour les fichiers Google natifs (Docs, Sheets, etc.), on peut les exporter
    if mime_type.startswith('application/vnd.google-apps.'):
        return True
    
    # Pour les fichiers standards, vérifier l'extension
    extension = os.path.splitext(name.lower())[1]
    return extension in SUPPORTED_EXTENSIONS

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
        
        # Déterminer l'extension à utiliser
        original_extension = os.path.splitext(file_name)[1].lower()
        if not original_extension and mime_type not in ('application/vnd.google-apps.folder'):
            # Déterminer l'extension en fonction du type MIME
            mime_to_ext = {
                'application/pdf': '.pdf',
                'text/plain': '.txt',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            }
            extension = mime_to_ext.get(mime_type, '.bin')
        else:
            extension = original_extension
        
        # Gérer les fichiers Google Workspace (Docs, Sheets, etc.) qui nécessitent un export
        if mime_type.startswith('application/vnd.google-apps.') and mime_type != 'application/vnd.google-apps.folder':
            export_mime_type = get_export_mime_type(mime_type)
            if not export_mime_type:
                logger.warning(f"Type non supporté pour l'export: {mime_type}")
                return None
            
            request = drive_service.files().export_media(fileId=file_id, mimeType=export_mime_type)
            extension = '.pdf'  # Puisqu'on exporte en PDF
        else:
            # Pour les fichiers standard
            request = drive_service.files().get_media(fileId=file_id)
        
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
        
        logger.info(f"Fichier téléchargé: {file_name} ({len(file_content_bytes)} octets)")
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
        logger.error(f"Erreur lors de la récupération des fichiers Drive: {str(e)}")
        return []


def ingest_gdrive_documents(
    query: str = None,
    limit: int = 10,
    folder_id: str = None,
    force_reingest: bool = False,
    verbose: bool = False,
    user_id: str = "",
    batch_size: int = 10
) -> Dict:
    """
    Ingère les documents depuis Google Drive vers Qdrant et met à jour le registre.
    
    Args:
        query: Requête de filtrage Google Drive
        limit: Nombre maximum de fichiers à ingérer
        folder_id: ID du dossier à explorer (optionnel)
        force_reingest: Force la réingétion même si le document existe
        verbose: Mode verbeux pour le débogage
        user_id: ID de l'utilisateur
        batch_size: Taille des lots pour l'ingétion
        
    Returns:
        Résultat de l'ingétion
    """
    start_time = time.time()
    
    # Initialiser les résultats
    result = {
        "success": False,
        "total_files_found": 0,
        "files_ingested": 0,
        "files_skipped": 0,
        "errors": [],
        "duration": 0
    }
    
    # Authentification Google Drive
    try:
        drive_service = get_drive_service(user_id)
    except Exception as e:
        error_msg = f"Erreur d'authentification Google Drive: {str(e)}"
        logger.error(error_msg)
        result["errors"].append(error_msg)
        return result
    
    # Récupérer les fichiers
    logger.info(f"Récupération des fichiers Drive pour l'utilisateur {user_id}")
    files = fetch_drive_files(drive_service, query=query, limit=limit, folder_id=folder_id)
    result["total_files_found"] = len(files)
    
    if not files:
        logger.warning("Aucun fichier trouvé dans Google Drive")
        result["success"] = True  # Pas d'erreur, juste aucun fichier
        return result
    
    logger.info(f"{len(files)} fichiers trouvés dans Google Drive")
    
    # Initialiser le registre de fichiers
    file_registry = FileRegistry(user_id)
    logger.info(f"Registre de fichiers chargé pour l'utilisateur {user_id}: {len(file_registry.registry)} entrées")
    
    # Liste pour le suivi des fichiers temporaires à nettoyer
    temp_files_to_cleanup = []
    
    # Traiter chaque fichier
    for i, file_metadata in enumerate(files):
        try:
            file_id = file_metadata.get('id')
            file_name = file_metadata.get('name', f"file_{file_id}")
            file_mimetype = file_metadata.get('mimeType', '')
            file_weblink = file_metadata.get('webViewLink', '')
            file_modified = file_metadata.get('modifiedTime', '')
            
            # Vérifier si c'est un type de fichier pris en charge
            if not is_supported_file(file_metadata):
                logger.info(f"[{i+1}/{len(files)}] Type de fichier non supporté: {file_name} ({file_mimetype})")
                result["files_skipped"] += 1
                continue
            
            # Générer un ID unique pour ce fichier
            doc_id = f"gdrive_{user_id}_{file_id}"
            source_path = f"gdrive://{user_id}/{file_id}/{file_name}"
            
            # Télécharger le fichier
            logger.info(f"[{i+1}/{len(files)}] Ingérant document: {file_name}")
            download_result = download_drive_file(drive_service, file_id, file_metadata)
            
            if not download_result:
                error_msg = f"Impossible de télécharger {file_name}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
                continue
                
            temp_file_path, file_content = download_result
            temp_files_to_cleanup.append(temp_file_path)
            
            # Préparer les métadonnées
            file_hash = compute_drive_file_hash(file_metadata, file_content)
            
            metadata = {
                "original_path": source_path,
                "gdrive_id": file_id,
                "gdrive_name": file_name,
                "gdrive_mimetype": file_mimetype,
                "gdrive_weblink": file_weblink,
                "gdrive_modified": file_modified,
                "data_source": "gdrive",
                "user_id": user_id,
                "ingestion_date": datetime.datetime.now().isoformat(),
                "content_hash": file_hash
            }
            
            # Ingérer le document
            ingest_document(
                filepath=temp_file_path,
                user=user_id,
                collection=user_id,
                metadata=metadata,
                file_registry=file_registry,
                doc_id=doc_id
            )
            
            result["files_ingested"] += 1
            logger.info(f"Document ingéré avec succès: {file_name}")
            
        except Exception as e:
            error_msg = f"Erreur traitement fichier {file_metadata.get('name', 'inconnu')}: {str(e)}"
            logger.error(error_msg)
            logger.exception(e)
            result["errors"].append(error_msg)
    
    # Nettoyer les fichiers temporaires
    for temp_file in temp_files_to_cleanup:
        try:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
        except Exception as e:
            logger.warning(f"Erreur lors de la suppression du fichier temporaire {temp_file}: {e}")
    
    # Calculer la durée totale
    end_time = time.time()
    result["duration"] = end_time - start_time
    result["success"] = True
    
    logger.info(f"Ingétion terminée en {result['duration']:.2f}s")
    logger.info(f"Fichiers ingérés: {result['files_ingested']}, ignorés: {result['files_skipped']}")
    if result["errors"]:
        logger.warning(f"Erreurs: {len(result['errors'])}")
    
    return result


def test_drive_connectivity(user_id: str = ""):
    """
    Teste la connectivité avec l'API Google Drive.
    
    Args:
        user_id: ID de l'utilisateur
        
    Returns:
        bool: True si la connexion est établie, False sinon
    """
    try:
        drive_service = get_drive_service(user_id)
        result = drive_service.files().list(pageSize=1).execute()
        logger.info(f"Connexion à Google Drive réussie! Nom de l'utilisateur: {result.get('user_name', 'Non disponible')}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la connexion à Google Drive: {str(e)}")
        return False


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
    
    # Tester la connectivité si demandé
    if args.test_connectivity:
        success = test_drive_connectivity(user_id=args.user_id)
        return 0 if success else 1
    
    # Exécuter l'ingétion
    result = ingest_gdrive_documents(
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
        print(f"- Fichiers ingérés: {result['files_ingested']}")
        print(f"- Fichiers ignorés: {result['files_skipped']}")
        print(f"- Durée: {result['duration']:.2f} secondes")
        
        if result["errors"]:
            print(f"\nAttention: {len(result['errors'])} erreurs rencontrées")
    else:
        print("\nL'ingétion a échoué. Consultez les logs pour plus de détails.")
    
    return 0 if result["success"] and not result["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
