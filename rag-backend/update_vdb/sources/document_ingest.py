import argparse
import sys
import os
import traceback
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from typing import Optional, Dict, List, Any
from update_vdb.core.ingest_core import ingest_document

from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
import hashlib

def fetch_local_documents(directory, collection, user):
    # Trouver tous les fichiers dans le répertoire
    files = []
    for root, _, filenames in os.walk(directory):
        for fname in filenames:
            files.append(os.path.join(root, fname))
    
    if not files:
        print(f"No files found in {directory}")
        return {
            "success": False,
            "error": f"No files found in {directory}",
            "files_processed": 0,
            "files_ingested": 0
        }
    
    # Initialiser les compteurs pour le suivi
    total_files = len(files)
    files_processed = 0
    files_ingested = 0
    files_skipped = 0
    errors = []
    
    # Traiter chaque fichier
    for i, filepath in enumerate(files):
        try:           
            # Préparer les métadonnées avec le chemin original
            original_path = filepath
            if directory and filepath.startswith(directory):
                # Conserver le chemin relatif par rapport au répertoire de données
                relative_path = filepath[len(directory):].lstrip(os.path.sep)
            else:
                relative_path = os.path.basename(filepath)
            
            metadata = {
                "original_path": original_path,
                "relative_path": relative_path,
                "data_dir": directory,
                "tmp_path": os.path.join(directory, relative_path) if directory else original_path
            }
            
            # Afficher le suivi de progression
            print(f"[{i+1}/{total_files}] Ingesting document: {filepath}")
            
            # Ingérer le document
            ingest_document(filepath, user=user, metadata=metadata, original_filepath=relative_path)
            
            # Mettre à jour les compteurs
            files_ingested += 1
            files_processed += 1
            
            # Afficher la confirmation
            print(f"[{i+1}/{total_files}] Successfully ingested: {filepath}")
            
        except Exception as e:
            # Gérer les erreurs
            error_msg = f"Error processing file {filepath}: {str(e)}"
            print(f"[{i+1}/{total_files}] {error_msg}")
            errors.append(error_msg)
            files_processed += 1
    
    # Résumé final
    print(f"\nIngestion Summary:")
    print(f"Total files: {total_files}")
    print(f"Files processed: {files_processed}")
    print(f"Files ingested: {files_ingested}")
    print(f"Files skipped (already ingested): {files_skipped}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print("\nError details:")
        for i, error in enumerate(errors, 1):
            print(f"{i}. {error}")
    
    # Retourner un résumé structuré
    return {
        "success": True,
        "files_total": total_files,
        "files_processed": files_processed,
        "files_ingested": files_ingested,
        "files_skipped": files_skipped,
        "errors": errors
    }

def fetch_google_drive_documents(token_path: str, folder_id: str = None, query: str = None, collection: str = 'rag_documents1536', user: str = 'unknown', supported_types: list = None, verbose: bool = False):
    """
    Fetch and ingest documents from Google Drive.
    Args:
        token_path: Path to the Google Drive token file
        folder_id: Google Drive folder ID to fetch from (optional)
        query: Google Drive search query (optional)
        collection: Qdrant collection name
        user: User identifier
        supported_types: List of supported file extensions (['pdf', 'docx', ...])
        verbose: Verbose output
    Returns:
        Structured summary dict
    """
    import tempfile
    import mimetypes
    from auth.google_auth import get_drive_service
    import shutil

    result = {
        "success": False,
        "files_total": 0,
        "files_processed": 0,
        "files_ingested": 0,
        "files_skipped": 0,
        "errors": []
    }

    try:
        drive_service = get_drive_service(token_path)
        files = []
        page_token = None
        query_parts = []
        if folder_id:
            query_parts.append(f"'{folder_id}' in parents")
        if query:
            query_parts.append(query)
        q = ' and '.join(query_parts) if query_parts else None
        while True:
            response = drive_service.files().list(
                q=q,
                spaces='drive',
                fields='nextPageToken, files(id, name, mimeType, modifiedTime, parents)',
                pageToken=page_token
            ).execute()
            files.extend(response.get('files', []))
            page_token = response.get('nextPageToken', None)
            if not page_token:
                break
        result["files_total"] = len(files)
        if verbose:
            print(f"Found {len(files)} files in Google Drive.")
        tmp_dir = tempfile.mkdtemp(prefix="gdrive_ingest_")
        try:
            for i, file in enumerate(files):
                file_id = file['id']
                file_name = file['name']
                mime_type = file['mimeType']
                ext = mimetypes.guess_extension(mime_type) or os.path.splitext(file_name)[1]
                ext = ext.lstrip('.')
                if supported_types and ext and ext.lower() not in supported_types:
                    if verbose:
                        print(f"Skipping unsupported file type: {file_name} ({mime_type})")
                    result["files_skipped"] += 1
                    continue
                local_path = os.path.join(tmp_dir, file_name)
                try:
                    request = drive_service.files().get_media(fileId=file_id)
                    with open(local_path, 'wb') as f:
                        downloader = None
                        try:
                            from googleapiclient.http import MediaIoBaseDownload
                            import io
                            downloader = MediaIoBaseDownload(f, request)
                            done = False
                            while not done:
                                status, done = downloader.next_chunk()
                                if verbose and status:
                                    print(f"Downloading {file_name}: {int(status.progress() * 100)}%.")
                        except Exception as dl_e:
                            raise dl_e
                    # Prepare metadata
                    metadata = {
                        "original_path": file_name,
                        "drive_file_id": file_id,
                        "mime_type": mime_type,
                        "modified_time": file.get("modifiedTime"),
                        "parents": file.get("parents", []),
                        "source": "google_drive"
                    }
                    if verbose:
                        print(f"Ingesting file [{i+1}/{len(files)}]: {file_name}")
                    ingest_document(local_path, user=user, metadata=metadata, original_filepath=file_name)
                    result["files_ingested"] += 1
                except Exception as e:
                    error_msg = f"Error processing file {file_name}: {str(e)}"
                    print(error_msg)
                    result["errors"].append(error_msg)
                result["files_processed"] += 1
        finally:
            shutil.rmtree(tmp_dir)
        result["success"] = True if result["files_ingested"] > 0 else False
    except Exception as e:
        error_msg = f"Error during Google Drive ingestion: {str(e)}"
        print(error_msg)
        result["errors"].append(error_msg)
    return result

def fetch_sharepoint_documents(token_path: str, site_id: str, folder_path: str = None, collection: str = 'rag_documents1536', user: str = 'unknown', supported_types: list = None, verbose: bool = False):
    """
    Fetch and ingest documents from SharePoint using Microsoft Graph API.
    Args:
        token_path: Path to the token cache file
        site_id: SharePoint site ID (or site hostname)
        folder_path: Path within the site drive (e.g., 'Documents/Shared')
        collection: Qdrant collection name
        user: User identifier
        supported_types: List of supported file extensions
        verbose: Verbose output
    Returns:
        Structured summary dict
    """
    import tempfile
    import mimetypes
    import shutil
    from auth.sharepoint_auth import get_graph_token, get_graph_session
    import os

    result = {
        "success": False,
        "files_total": 0,
        "files_processed": 0,
        "files_ingested": 0,
        "files_skipped": 0,
        "errors": []
    }
    try:
        client_id = os.getenv("SHAREPOINT_CLIENT_ID")
        client_secret = os.getenv("SHAREPOINT_CLIENT_SECRET")
        tenant_id = os.getenv("SHAREPOINT_TENANT_ID")
        if not all([client_id, client_secret, tenant_id]):
            raise EnvironmentError("Variables SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, SHAREPOINT_TENANT_ID manquantes dans .env")
        token_dict = get_graph_token(client_id, client_secret, tenant_id, token_path)
        session = get_graph_session(token_dict)
        # Build the API URL
        base_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root"
        if folder_path:
            base_url += f":/{folder_path}:"
        files_url = f"{base_url}/children"
        files = []
        next_url = files_url
        while next_url:
            resp = session.get(next_url)
            if resp.status_code != 200:
                raise Exception(f"Graph API error: {resp.text}")
            data = resp.json()
            files.extend(data.get('value', []))
            next_url = data.get('@odata.nextLink')
        result["files_total"] = len(files)
        if verbose:
            print(f"Found {len(files)} files in SharePoint.")
        tmp_dir = tempfile.mkdtemp(prefix="sharepoint_ingest_")
        try:
            for i, file in enumerate(files):
                if file.get('folder'):
                    # Skip folders
                    continue
                file_name = file['name']
                mime_type = file.get('file', {}).get('mimeType', mimetypes.guess_type(file_name)[0] or '')
                ext = os.path.splitext(file_name)[1].lstrip('.')
                if supported_types and ext and ext.lower() not in supported_types:
                    if verbose:
                        print(f"Skipping unsupported file type: {file_name} ({mime_type})")
                    result["files_skipped"] += 1
                    continue
                download_url = file['@microsoft.graph.downloadUrl']
                local_path = os.path.join(tmp_dir, file_name)
                try:
                    with session.get(download_url, stream=True) as r:
                        r.raise_for_status()
                        with open(local_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=8192):
                                f.write(chunk)
                    metadata = {
                        "original_path": file_name,
                        "sharepoint_id": file['id'],
                        "mime_type": mime_type,
                        "modified_time": file.get("lastModifiedDateTime"),
                        "source": "sharepoint"
                    }
                    if verbose:
                        print(f"Ingesting file [{i+1}/{len(files)}]: {file_name}")
                    ingest_document(local_path, user=user, metadata=metadata, original_filepath=file_name)
                    result["files_ingested"] += 1
                except Exception as e:
                    error_msg = f"Error processing file {file_name}: {str(e)}"
                    print(error_msg)
                    result["errors"].append(error_msg)
                result["files_processed"] += 1
        finally:
            shutil.rmtree(tmp_dir)
        result["success"] = True if result["files_ingested"] > 0 else False
    except Exception as e:
        error_msg = f"Error during SharePoint ingestion: {str(e)}"
        print(error_msg)
        result["errors"].append(error_msg)
    return result

def fetch_and_sync_documents(method: str, **kwargs):
    """
    Fetch and synchronize documents from the specified method (local, google_drive, sharepoint).
    
    Args:
        method: The method to use for fetching documents ('local', 'google_drive', 'sharepoint')
        **kwargs: Additional arguments for the specific fetch method
            - directory: Local directory for documents (for local)
            - collection_name: Qdrant collection name
            - user: User identifier for metadata
    
    Returns:
        Dict with summary of the ingestion process
    """
    method = method.lower()
    result = {
        "method": method,
        "success": False,
        "files_total": 0,
        "files_processed": 0,
        "files_ingested": 0,
        "files_skipped": 0,
        "errors": []
    }
    
    try:
        if method == "local":
            directory = kwargs.get('directory', './data/documents')
            collection = kwargs.get('collection_name', 'rag_documents1536')
            user = kwargs.get('user', 'unknown')
            
            # Appeler fetch_local_documents et récupérer son résultat
            local_result = fetch_local_documents(directory, collection, user)
            
            # Mettre à jour le résultat avec les informations de fetch_local_documents
            if local_result:
                result.update(local_result)
                result["collection"] = collection
                result["user"] = user
                result["directory"] = directory
            
        elif method == "google_drive":
            token_path = kwargs.get('drive_token', 'drive_token.pickle')
            folder_id = kwargs.get('drive_folder_id', None)
            query = kwargs.get('drive_query', None)
            collection = kwargs.get('collection_name', 'rag_documents1536')
            user = kwargs.get('user', 'unknown')
            verbose = kwargs.get('verbose', False)
            # Try to load supported_types from config.yaml if available
            supported_types = None
            try:
                import yaml
                config_path = os.path.join(os.path.dirname(__file__), '../../config.yaml')
                if os.path.exists(config_path):
                    with open(config_path, 'r') as f:
                        config = yaml.safe_load(f)
                        supported_types = config.get('ingestion', {}).get('supported_types', None)
            except Exception:
                pass
            drive_result = fetch_google_drive_documents(
                token_path=token_path,
                folder_id=folder_id,
                query=query,
                collection=collection,
                user=user,
                supported_types=supported_types,
                verbose=verbose
            )
            if drive_result:
                result.update(drive_result)
                result["collection"] = collection
                result["user"] = user
            
        elif method == "sharepoint":
            token_path = kwargs.get('sharepoint_token', 'sharepoint_token.json')
            site_id = kwargs.get('sharepoint_site', None)
            folder_path = kwargs.get('sharepoint_folder', None)
            collection = kwargs.get('collection_name', 'rag_documents1536')
            user = kwargs.get('user', 'unknown')
            verbose = kwargs.get('verbose', False)
            # Try to load supported_types from config.yaml if available
            supported_types = None
            try:
                import yaml
                config_path = os.path.join(os.path.dirname(__file__), '../../config.yaml')
                if os.path.exists(config_path):
                    with open(config_path, 'r') as f:
                        config = yaml.safe_load(f)
                        supported_types = config.get('ingestion', {}).get('supported_types', None)
            except Exception:
                pass
            sharepoint_result = fetch_sharepoint_documents(
                token_path=token_path,
                site_id=site_id,
                folder_path=folder_path,
                collection=collection,
                user=user,
                supported_types=supported_types,
                verbose=verbose
            )
            if sharepoint_result:
                result.update(sharepoint_result)
                result["collection"] = collection
                result["user"] = user
                result["sharepoint_token"] = token_path
                result["sharepoint_site"] = site_id
                result["sharepoint_folder"] = folder_path
    
        else:
            error_msg = f"Unknown document fetch method: {method}"
            result["success"] = False
            result["error"] = error_msg
            raise ValueError(error_msg)
                    
    except Exception as e:
        # Gérer les exceptions non capturées
        result["success"] = False
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        print(f"Error during document fetch: {str(e)}")
            
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch and sync documents from local, Google Drive, or SharePoint.")
    parser.add_argument('--method', required=True, choices=['local', 'google_drive', 'sharepoint'], help='Document fetch method')
    parser.add_argument('--directory', default='./data/documents', help='Local directory for documents (for local)')
    parser.add_argument('--collection_name', default='rag_documents1536', help='Qdrant collection name')
    parser.add_argument('--user', default='unknown', help='User for metadata')
    parser.add_argument('--verbose', action='store_true', help='Show detailed output')
    # Google Drive
    parser.add_argument('--drive-token', default='drive_token.pickle', help='Path to Google Drive token file')
    parser.add_argument('--drive-folder-id', default=None, help='Google Drive folder ID')
    parser.add_argument('--drive-query', default=None, help='Google Drive search query')
    # SharePoint
    parser.add_argument('--sharepoint-token', default='sharepoint_token.json', help='Path to SharePoint token cache file')
    parser.add_argument('--sharepoint-site', default=None, help='SharePoint site ID or hostname')
    parser.add_argument('--sharepoint-folder', default=None, help='SharePoint folder path (e.g., Documents/Shared)')

    args = parser.parse_args()
    
    # Exécuter l'ingestion des documents
    result = fetch_and_sync_documents(
        method=args.method,
        directory=args.directory,
        collection_name=args.collection_name,
        user=args.user,
        drive_token=args.drive_token,
        drive_folder_id=args.drive_folder_id,
        drive_query=args.drive_query,
        sharepoint_token=args.sharepoint_token,
        sharepoint_site=args.sharepoint_site,
        sharepoint_folder=args.sharepoint_folder,
        verbose=args.verbose
    )
    
    # Afficher le résumé
    print("\n" + "=" * 50)
    print("DOCUMENT INGESTION SUMMARY")
    print("=" * 50)
    print(f"Method: {result['method']}")
    if result['method'] == 'local':
        print(f"Directory: {result.get('directory', 'N/A')}")
    print(f"Collection: {result.get('collection', 'N/A')}")
    print(f"User: {result.get('user', 'N/A')}")
    print(f"Success: {result['success']}")
    print(f"Files total: {result.get('files_total', 0)}")
    print(f"Files processed: {result.get('files_processed', 0)}")
    print(f"Files ingested: {result.get('files_ingested', 0)}")
    print(f"Files skipped: {result.get('files_skipped', 0)}")
    
    if result.get('errors') and len(result['errors']) > 0:
        print(f"\nErrors ({len(result['errors'])}):")  
        if args.verbose:
            for i, error in enumerate(result['errors'], 1):
                print(f"{i}. {error}")
        else:
            print(f"Run with --verbose to see error details")
    
    # Retourner le code de sortie approprié
    if not result['success']:
        sys.exit(1)
