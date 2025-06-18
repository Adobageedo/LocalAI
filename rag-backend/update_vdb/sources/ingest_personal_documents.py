import argparse
import sys
import os
import traceback
import logging
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from typing import Optional, Dict, List, Any
from update_vdb.core.ingest_core import ingest_document
from sources.file_registry import FileRegistry
import hashlib

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("user-document-ingest")

def ingest_user_documents(user_id: str, storage_path: str = None, limit: int = 200, force_reingest: bool = False) -> Dict[str, Any]:
    """
    Ingest all documents in the user's storage directory.
    
    Args:
        user_id: User identifier for which to ingest documents
        storage_path: Path to the storage directory (defaults to data/storage)
        
    Returns:
        Dictionary with ingestion results
    """
    if not storage_path:
        # Default storage path
        storage_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'storage'))
    
    # User-specific directory
    user_dir = os.path.join(storage_path, "user_" + user_id)
    
    if not os.path.exists(user_dir):
        logger.warning(f"No storage directory found for user {user_id} at {user_dir}")
        return {
            "success": False,
            "error": f"No storage directory found for user {user_id}",
            "files_processed": 0,
            "files_ingested": 0
        }
    
    # Initialize FileRegistry for this user
    file_registry = FileRegistry(user_id)
    logger.info(f"File registry loaded for user {user_id}: {len(file_registry.registry)} entries")
    # Find all files in user directory
    files = []
    for root, _, filenames in os.walk(user_dir):
        for fname in filenames:
            files.append(os.path.join(root, fname))
    
    if not files:
        logger.warning(f"No files found in {user_dir}")
        return {
            "success": False,
            "error": f"No files found in {user_dir}",
            "files_processed": 0,
            "files_ingested": 0
        }
    
    # Initialize counters for tracking
    total_files = len(files)
    files_processed = 0
    files_ingested = 0
    files_skipped = 0
    errors = []
    
    # Process each file
    for i, filepath in enumerate(files):
        try:
            # Prepare metadata with original path
            original_path = filepath
            if user_dir and filepath.startswith(user_dir):
                # Keep the relative path from the user directory
                relative_path = filepath[len(user_dir):].lstrip(os.path.sep)
            else:
                relative_path = os.path.basename(filepath)
            
            metadata = {
                "original_path": original_path,
                "relative_path": relative_path,
                "data_dir": user_dir,
                "user_id": user_id,
                "ingestion_date": datetime.now().isoformat(),
                "ingestion_type": "user_storage"
            }
            
            # Log progress
            logger.info(f"[{i+1}/{total_files}] Ingesting document: {filepath}")
            
            # Ingest the document using the user's collection
            ingest_document(
                filepath=filepath,
                user=user_id,
                collection=user_id,
                metadata=metadata,
                file_registry=file_registry
            )
            
            files_ingested += 1
            logger.info(f"Successfully ingested: {filepath}")
            
        except Exception as e:
            error_msg = f"Error processing {filepath}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            errors.append(error_msg)
        
        files_processed += 1
    
    result = {
        "success": files_ingested > 0,
        "total_files": total_files,
        "files_processed": files_processed,
        "files_ingested": files_ingested,
        "files_skipped": files_skipped,
        "errors": errors,
        "user_id": user_id
    }
    
    logger.info(f"Ingestion complete: {files_ingested} files ingested out of {files_processed} processed")
    return result

def main():
    parser = argparse.ArgumentParser(description='Ingest documents from a user\'s storage directory')
    parser.add_argument('--user_id', default= "7EShftbbQ4PPTS4hATplexbrVHh2", help='User ID for which to ingest documents')
    parser.add_argument('--storage_path', help='Path to the storage directory (defaults to data/storage)')
    
    args = parser.parse_args()
    
    result = ingest_user_documents(args.user_id, args.storage_path)
    
    if result["success"]:
        print(f"Successfully ingested {result['files_ingested']} documents for user {args.user_id}")
        sys.exit(0)
    else:
        print(f"Error: {result.get('error', 'Unknown error during ingestion')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
