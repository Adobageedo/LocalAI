"""
Script to ingest documents from MinIO to Qdrant.
"""
import os
import tempfile
from typing import Tuple, Optional, Dict, Any, List
import hashlib
import logging
from minio import Minio
from minio.error import S3Error

from ..core.ingest_core import ingest_document
from ..core.vectorstore import VectorStoreManager
from ..core.file_registry import FileRegistry

logger = logging.getLogger(__name__)

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "miniouser")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "miniopassword")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "documents")
USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"

def get_minio_client():
    """Get MinIO client."""
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=USE_SSL,
    )

async def process_document(
    object_name: str, 
    collection: str, 
    force_reingest: bool = False, 
    vector_store: Optional[VectorStoreManager] = None,
    file_registry: Optional[FileRegistry] = None, 
    user_id: Optional[str] = None
) -> bool:
    """Process a single document from MinIO."""
    minio_client = get_minio_client()
    
    try:
        # Create a temporary file to store the document
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file_path = temp_file.name
        
        # Download the document
        minio_client.fget_object(MINIO_BUCKET, object_name, temp_file_path)
        
        # Calculate hash
        file_hash = hashlib.sha256()
        with open(temp_file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                file_hash.update(chunk)
        file_hash = file_hash.hexdigest()
        
        # Get metadata
        stat = minio_client.stat_object(MINIO_BUCKET, object_name)
        
        # Prepare metadata
        metadata = {
            "source": "minio",
            "source_path": object_name,
            "filename": os.path.basename(object_name),
            "extension": os.path.splitext(object_name)[1].lower(),
            "size": stat.size,
            "last_modified": stat.last_modified.isoformat(),
            "hash": file_hash,
        }
        
        # Add user_id to metadata if provided
        if user_id:
            metadata["user_id"] = user_id
        
        # Process the document
        ingest_document(
            filepath=temp_file_path,
            user=user_id or "minio",
            collection=collection,
            metadata=metadata,
            original_filepath=object_name
        )
        
        # Clean up
        os.unlink(temp_file_path)
        return True
        
    except S3Error as e:
        logger.error(f"MinIO error processing {object_name}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error processing {object_name}: {str(e)}")
        return False

async def process_directory(
    prefix: str,
    collection: str,
    force_reingest: bool = False,
    vector_store: Optional[VectorStoreManager] = None,
    file_registry: Optional[FileRegistry] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Process all documents in a MinIO directory/prefix."""
    minio_client = get_minio_client()
    
    # Stats to track progress
    stats = {
        "processed": 0,
        "skipped": 0,
        "failed": 0,
        "total": 0
    }
    
    try:
        # List all objects with the given prefix
        objects = minio_client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True)
        
        for obj in objects:
            stats["total"] += 1
            
            # Skip directories/folders
            if obj.object_name.endswith('/'):
                continue
                
            # Process the document
            success = await process_document(
                obj.object_name,
                collection,
                force_reingest,
                vector_store,
                file_registry,
                user_id
            )
            
            if success:
                stats["processed"] += 1
            else:
                stats["failed"] += 1
                
        return {
            "status": "success",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error processing directory {prefix}: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "stats": stats
        }