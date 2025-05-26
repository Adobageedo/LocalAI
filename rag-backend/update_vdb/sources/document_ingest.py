import argparse
import sys
import os
import traceback
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from typing import Optional, Dict, List, Any
from update_vdb.core.ingest_core import ingest_document

from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
import hashlib

def compute_file_doc_id(filepath):
    # Use file content hash for stable doc_id
    with open(filepath, "rb") as fobj:
        file_hash = hashlib.sha256(fobj.read()).hexdigest()
    return file_hash

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
    
    # Récupérer les documents existants dans Qdrant
    manager = VectorStoreManager(collection)
    existing_doc_ids = manager.fetch_existing_doc_ids()
    print(f"Fetched {len(existing_doc_ids)} existing doc_ids from Qdrant.")
    
    # Initialiser les compteurs pour le suivi
    total_files = len(files)
    files_processed = 0
    files_ingested = 0
    files_skipped = 0
    errors = []
    
    # Traiter chaque fichier
    for i, filepath in enumerate(files):
        try:
            # Calculer l'identifiant du document
            doc_id = compute_file_doc_id(filepath)
            
            # Vérifier si le document existe déjà
            if doc_id in existing_doc_ids:
                print(f"[{i+1}/{total_files}] Skipping already ingested document: {filepath}")
                files_skipped += 1
                files_processed += 1
                continue
            
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
            ingest_document(filepath, user=user, collection=collection, doc_id=doc_id, metadata=metadata)
            
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

def fetch_google_drive_documents(**kwargs):
    print("Fetching documents from Google Drive...")
    print("Google Drive fetch not implemented yet.")

def fetch_sharepoint_documents(**kwargs):
    print("Fetching documents from SharePoint...")
    print("SharePoint fetch not implemented yet.")

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
            # Pour l'instant, juste un placeholder
            fetch_google_drive_documents(**kwargs)
            result["success"] = False
            result["error"] = "Google Drive fetch not implemented yet"
            
        elif method == "sharepoint":
            # Pour l'instant, juste un placeholder
            fetch_sharepoint_documents(**kwargs)
            result["success"] = False
            result["error"] = "SharePoint fetch not implemented yet"
            
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
    args = parser.parse_args()
    
    # Exécuter l'ingestion des documents
    result = fetch_and_sync_documents(
        method=args.method,
        directory=args.directory,
        collection_name=args.collection_name,
        user=args.user
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
