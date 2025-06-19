import argparse
import sys
import os
import traceback
import logging
from datetime import datetime
import time

# Ajouter le chemin racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from typing import Optional, Dict, List, Any
from backend.services.ingestion.core.ingest_core import batch_ingest_documents
from backend.services.storage.file_registry import FileRegistry
import hashlib

from backend.core.logger import log

# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="backend.services.ingestion.services.ingest_personal_documents")

def batch_ingest_user_documents(user_id: str, storage_path: str = None, limit: int = 200, 
                          force_reingest: bool = False, batch_size: int = 20) -> Dict[str, Any]:
    """
    Ingest all documents in the user's storage directory in batches for improved performance.
    
    Args:
        user_id: User identifier for which to ingest documents
        storage_path: Path to the storage directory (defaults to data/storage)
        limit: Maximum number of files to process
        force_reingest: Whether to force re-ingestion of documents
        batch_size: Number of documents to process in each batch
        
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
    
    # Apply limit if specified
    if limit and len(files) > limit:
        files = files[:limit]
        logger.info(f"Limiting ingestion to {limit} files")
    
    # Initialize result tracking
    result = {
        "success": False,
        "total_files": len(files),
        "files_processed": 0,
        "files_ingested": 0,
        "files_skipped": 0,
        "errors": [],
        "user_id": user_id,
        "batches": 0,
        "start_time": time.time()
    }
    
    # Process files in batches
    batch_documents = []
    
    for file_idx, filepath in enumerate(files):
        try:
            # Prepare metadata with original path
            if user_dir and filepath.startswith(user_dir):
                # Keep the relative path from the user directory
                relative_path = filepath[len(user_dir):].lstrip(os.path.sep)
            else:
                relative_path = os.path.basename(filepath)
            
            # Create document metadata
            metadata = {
                "path": "/Personal_Storage/" + relative_path,
                "user": user_id,
                "ingestion_type": "Personal_Storage",
                "filename": os.path.basename(filepath),
                "ingestion_date": datetime.now().isoformat()
            }
            
            # Add document to batch
            batch_documents.append({
                "tmp_path": filepath,
                "metadata": metadata
            })
            
            # Log progress every 10 files
            if file_idx % 10 == 0:
                logger.info(f"[{file_idx+1}/{len(files)}] Processing documents: {filepath}")
            
            result["files_processed"] += 1
            
            # Process batch when it reaches the batch size
            if len(batch_documents) >= batch_size:
                flush_batch(batch_documents, user_id, result)
                result["batches"] += 1
                
        except Exception as e:
            error_msg = f"Error processing {filepath}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            result["errors"].append(error_msg)
    
    # Process any remaining documents in the batch
    if batch_documents:
        flush_batch(batch_documents, user_id, result, file_registry)
        result["batches"] += 1
    
    # Calculate elapsed time
    elapsed_time = time.time() - result["start_time"]
    result["elapsed_time"] = elapsed_time
    result["success"] = result["files_ingested"] > 0
    
    logger.info(f"Batch ingestion complete: {result['files_ingested']} files ingested out of "
               f"{result['files_processed']} processed in {elapsed_time:.2f} seconds "
               f"({result['batches']} batches)")
    
    return result


def flush_batch(batch_documents, user_id, result, file_registry):
    """
    Ingest a batch of documents and update result statistics.
    """
    if not batch_documents:
        return
    
    try:
        # Ingest the batch of documents
        batch_ingest_documents(
            batch_documents=batch_documents,
            user=user_id,
            collection=user_id,
            file_registry=file_registry
        )
        
        # Update successful ingestion count
        result["files_ingested"] += len(batch_documents)
        logger.info(f"Batch of {len(batch_documents)} documents ingested successfully")
    except Exception as batch_err:
        logger.error(f"Error in batch ingestion: {batch_err}")
        logger.error(traceback.format_exc())
        result["errors"].append(f"Batch error: {str(batch_err)}")
    finally:
        # Clear the batch list for the next batch
        batch_documents.clear()


def main():
    parser = argparse.ArgumentParser(description='Ingest documents from a user\'s storage directory')
    parser.add_argument('--user_id', default= "TEST_NEW_ARCHITECTURE", help='User ID for which to ingest documents')
    parser.add_argument('--storage_path', default= "/Users/edoardo/Documents/LocalAI/rag-backend/data/storage", help='Path to the storage directory (defaults to data/storage)')
    parser.add_argument('--batch_size', type=int, default=20, help='Number of documents to process in each batch')
    parser.add_argument('--limit', type=int, default=None, help='Maximum number of files to process')
    parser.add_argument('--force_reingest', action='store_true', help='Force reingestion of documents already in Qdrant')
    
    args = parser.parse_args()
    
    result = batch_ingest_user_documents(args.user_id, args.storage_path, 
                                          limit=args.limit or 200, 
                                          force_reingest=args.force_reingest, 
                                          batch_size=args.batch_size)
    
    if result["success"]:
        print(f"Successfully ingested {result['files_ingested']} documents for user {args.user_id}")
        sys.exit(0)
    else:
        print(f"Error: {result.get('error', 'Unknown error during ingestion')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
