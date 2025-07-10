#!/usr/bin/env python3
"""
Script for ingesting documents from Microsoft OneDrive into Qdrant using OAuth2.
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
import requests

# Add project path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from backend.core.logger import log
logger = log.bind(name="backend.services.ingestion.services.ingest_onedrive_documents")

# Internal imports
from backend.services.auth.microsoft_auth import get_outlook_token
from backend.services.ingestion.core.ingest_core import flush_batch
from backend.services.storage.file_registry import FileRegistry
from backend.services.db.models import SyncStatus

# Microsoft Graph API endpoint
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"

def compute_onedrive_file_hash(file_metadata: Dict, file_content: Optional[bytes] = None) -> str:
    """
    Compute a unique hash for a OneDrive file based on its metadata and content.
    
    Args:
        file_metadata: OneDrive file metadata
        file_content: Binary content of the file (optional)
        
    Returns:
        SHA-256 hash of the file
    """
    hasher = hashlib.sha256()
    
    # Use ID as primary base
    if file_metadata.get('id'):
        hasher.update(file_metadata['id'].encode('utf-8'))
    
    # Add other metadata to ensure uniqueness
    if file_metadata.get('name'):
        hasher.update(file_metadata['name'].encode('utf-8'))
    if file_metadata.get('lastModifiedDateTime'):
        hasher.update(file_metadata['lastModifiedDateTime'].encode('utf-8'))
    if file_metadata.get('file', {}).get('mimeType'):
        hasher.update(file_metadata['file']['mimeType'].encode('utf-8'))
    
    # If content is provided, use it for the hash
    if file_content:
        # Limit to 10KB for performance
        content_sample = file_content[:10240] if len(file_content) > 10240 else file_content
        hasher.update(content_sample)
    
    return hasher.hexdigest()

def get_file_extension_from_mime(mime_type: str) -> str:
    """
    Determine file extension based on MIME type.
    
    Args:
        mime_type: MIME type string
        
    Returns:
        Appropriate file extension including the dot
    """
    # Mapping of MIME types to file extensions
    mime_map = {
        'application/pdf': '.pdf',
        'text/plain': '.txt',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'application/msword': '.doc',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.ms-powerpoint': '.ppt',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'application/json': '.json',
        'text/html': '.html',
        'text/csv': '.csv',
    }
    
    return mime_map.get(mime_type, '.bin')


def download_onedrive_file(access_token: str, file_id: str, file_metadata: Dict) -> Optional[Tuple[str, bytes]]:
    """
    Download a file from OneDrive.
    
    Args:
        access_token: Microsoft Graph API access token
        file_id: ID of the file to download
        file_metadata: Metadata of the file
        
    Returns:
        Tuple containing the temporary file path and the file content, or None if error
    """
    try:
        file_name = file_metadata.get('name', f"file_{file_id}")
        mime_type = file_metadata.get('file', {}).get('mimeType', 'application/octet-stream')
        
        logger.debug(f"Downloading file: {file_name} (ID: {file_id}, MIME: {mime_type})")
        
        # Check if it's a folder
        if file_metadata.get('folder'):
            logger.warning(f"Cannot download a folder: {file_name}")
            return None
        
        # Download URL
        download_url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{file_id}/content"
        
        # Make the request to download the file
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
        }
        
        response = requests.get(download_url, headers=headers, stream=True)
        
        if response.status_code != 200:
            logger.error(f"Error downloading file {file_name}: {response.status_code} {response.text}")
            return None
        
        # Get the content
        file_content = response.content
        
        # Determine the extension to use
        original_extension = os.path.splitext(file_name)[1].lower()
        if original_extension:
            extension = original_extension
        else:
            extension = get_file_extension_from_mime(mime_type)
        
        # Create a temporary file with the right extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(file_content)
        
        logger.info(f"File downloaded successfully: {file_name} ({len(file_content)} bytes)")
        return temp_file_path, file_content
        
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        logger.error(traceback.format_exc())
        return None


def fetch_onedrive_files(access_token: str, query: str = None, limit: int = 10, folder_id: str = None) -> List[Dict]:
    """
    Fetch the list of files from OneDrive.
    
    Args:
        access_token: Microsoft Graph API access token
        query: Search query for OneDrive files
        limit: Maximum number of files to retrieve
        folder_id: ID of the folder to explore (optional)
        
    Returns:
        List of files with their metadata
    """
    try:
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
        }
        
        # Build the URL based on whether we're looking at a specific folder or not
        if folder_id:
            url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{folder_id}/children"
        else:
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/children"
        
        # Add query parameters
        params = {
            '$top': min(100, limit),  # Maximum items per page
            '$select': 'id,name,file,folder,lastModifiedDateTime,createdDateTime,size,webUrl,parentReference'
        }
        
        # If a search query is provided, use the search endpoint instead
        if query:
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/search(q='{query}')"
        
        results = []
        next_link = url
        
        # Handle pagination
        while next_link and len(results) < limit:
            response = requests.get(next_link, headers=headers, params=params)
            
            if response.status_code != 200:
                logger.error(f"Error fetching files: {response.status_code} {response.text}")
                break
            
            data = response.json()
            items = data.get('value', [])
            results.extend(items)
            
            # Check if there are more results
            next_link = data.get('@odata.nextLink')
            
            # Clear params for subsequent requests as they're included in the nextLink
            params = {}
            
            # Break if we've reached the limit
            if len(results) >= limit:
                break
        
        return results[:limit]  # Limit to the first 'limit' results
        
    except Exception as e:
        logger.error(f"Error fetching files: {e}")
        logger.error(traceback.format_exc())
        return []


def batch_ingest_onedrive_documents(
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
    Ingest documents from OneDrive into Qdrant in batches for better performance.
    Uses FileRegistry to avoid duplications and follows a consistent approach with other sources.
    
    Args:
        query: OneDrive search query
        limit: Maximum number of files to ingest
        folder_id: ID of the folder to explore (optional)
        force_reingest: Force re-ingestion even if the file already exists in the registry
        verbose: Verbose mode for more logs
        user_id: User identifier
        batch_size: Batch size for ingestion to optimize performance
        syncstatus: SyncStatus object to track progress
        
    Returns:
        Dictionary containing ingestion statistics:
        - success: Boolean indicating if ingestion was successful
        - total_files_found: Total number of files found
        - items_ingested: Number of files ingested
        - files_skipped: Number of files skipped
        - batches: Number of batches processed
        - errors: List of errors encountered
        - duration: Total duration of ingestion in seconds
    """
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)    
    
    # Create temporary directory for files
    temp_dir = tempfile.mkdtemp(prefix="onedrive_ingest_")
    logger.info(f"Temporary directory created: {temp_dir}")
    
    # Initialize file registry
    file_registry = FileRegistry(user_id)
    logger.info(f"File registry loaded for {user_id}: {len(file_registry.registry)} entries")
    
    # Initialize statistics
    start_time = time.time()
    result = {
        "success": False,
        "total_files_found": 0,
        "items_ingested": 0,
        "files_skipped": 0,
        "batches": 0,
        "errors": [],
        "start_time": start_time,
        "duration": 0
    }
    
    # List to collect documents to ingest in batches
    batch_documents = []
    temp_files_to_cleanup = []
    
    try:
        # Get Microsoft Graph API access token
        token_data = get_outlook_token(user_id)
        if not token_data or "access_token" not in token_data:
            error_msg = "Failed to get Microsoft access token"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["success"] = False
            return result
            
        access_token = token_data["access_token"]
        logger.info("Microsoft Graph API access token obtained successfully")
        
        # Fetch files from OneDrive
        files = fetch_onedrive_files(access_token, query, limit, folder_id)
        result["total_files_found"] = len(files)
        
        if syncstatus:
            syncstatus.total_documents = len(files)
            
        if not files:
            logger.info("No files found in OneDrive with the specified criteria")
            result["success"] = True
            return result
        
        logger.info(f"Processing {len(files)} OneDrive files")
        
        # Process OneDrive files in batches
        for file_idx, file_metadata in enumerate(files):
            try:
                file_id = file_metadata.get('id')
                file_name = file_metadata.get('name', 'Unnamed file')
                file_mimetype = file_metadata.get('file', {}).get('mimeType', 'application/octet-stream')
                file_weblink = file_metadata.get('webUrl', '')
                file_modified = file_metadata.get('lastModifiedDateTime', '')
                
                # Build normalized source path
                source_path = f"/microsoft_storage/{user_id}/{file_id}/{file_name}"
                
                # Generate unique hash for this file
                file_hash = compute_onedrive_file_hash(file_metadata)
                doc_id = file_hash
                
                # Check if file already exists in registry
                if not force_reingest and file_registry.file_exists(source_path):
                    logger.info(f"[SKIP] File already ingested: {file_name} (path: {source_path})")
                    result['files_skipped'] += 1
                    continue
                
                # Progress log
                logger.info(f"[{file_idx+1}/{len(files)}] Downloading and processing: {file_name}")
                
                # Download the file
                download_result = download_onedrive_file(access_token, file_id, file_metadata)
                if not download_result:
                    logger.warning(f"[ERROR] Download failed: {file_name}")
                    result['errors'].append(f"Download failed: {file_name}")
                    continue
                    
                temp_file_path, file_content = download_result
                temp_files_to_cleanup.append(temp_file_path)
                
                # Create document metadata
                metadata = {
                    "path": source_path,
                    "doc_id": doc_id,
                    "ingestion_type": "microsoft_storage",
                    "filename": file_name,
                    "user": user_id,
                    "ingestion_date": datetime.datetime.now().isoformat()
                }
                
                # Add to the list of documents to process in batch
                batch_documents.append({
                    "tmp_path": temp_file_path,
                    "metadata": metadata
                })
                
                # Process the batch if maximum size is reached
                if len(batch_documents) >= batch_size:
                    flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
                    result["batches"] += 1
                    logger.info(f"Batch #{result['batches']} processed. Total ingested: {result['items_ingested']}")
                    batch_documents = []
                    
            except Exception as e:
                error_msg = f"Error processing file {file_metadata.get('name', 'unknown')}: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                result["errors"].append(error_msg)
        
        # Process the last batch if there are remaining documents
        if batch_documents:
            logger.info(f"Processing the last batch of {len(batch_documents)} documents")
            flush_batch(batch_documents, user_id, result, file_registry, syncstatus)
            result["batches"] += 1
            
        # Clean up temporary files
        for temp_file in temp_files_to_cleanup:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    logger.debug(f"Temporary file deleted: {temp_file}")
            except Exception as e:
                logger.warning(f"Error deleting temporary file {temp_file}: {e}")
                
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"Temporary directory deleted: {temp_dir}")
            except Exception as cleanup_err:
                logger.warning(f"Error cleaning up temporary directory: {cleanup_err}")
        
        # Finalize statistics
        end_time = time.time()
        result["duration"] = end_time - start_time
        result["success"] = True
        
        logger.info(f"Ingestion completed in {result['duration']:.2f}s")
        logger.info(f"Files ingested: {result['items_ingested']}, skipped: {result['files_skipped']}, batches: {result['batches']}")
        if result["errors"]:
            logger.warning(f"Errors encountered: {len(result['errors'])}")
        
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        logger.error(traceback.format_exc())
        result["errors"].append(f"Initialization error: {str(e)}")
        result["success"] = False
        
    return result


def main():
    """
    Main entry point of the script.
    """
    parser = argparse.ArgumentParser(description="Ingest documents from Microsoft OneDrive into Qdrant.")
    parser.add_argument('--query', default=None, help='OneDrive search query') 
    parser.add_argument('--limit', type=int, default=50, help='Maximum number of files to ingest')
    parser.add_argument('--folder-id', default=None, help='ID of the OneDrive folder to explore (optional)')
    parser.add_argument('--force-reingest', action='store_true', help='Force re-ingestion even if the file already exists')
    parser.add_argument('--verbose', action='store_true', help='Verbose mode')
    parser.add_argument('--user-id', default="", help='User identifier')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for ingestion')
    
    args = parser.parse_args()
    
    # Execute batch ingestion
    result = batch_ingest_onedrive_documents(
        query=args.query,
        limit=args.limit,
        folder_id=args.folder_id,
        force_reingest=args.force_reingest,
        verbose=args.verbose,
        user_id=args.user_id,
        batch_size=args.batch_size
    )
    
    # Display final results
    if result["success"]:
        print(f"\nIngestion Summary:")
        print(f"- Files found: {result['total_files_found']}")
        print(f"- Files ingested: {result['items_ingested']}")
        print(f"- Files skipped: {result['files_skipped']}")
        print(f"- Duration: {result['duration']:.2f} seconds")
        if result["errors"]:
            print(f"- Errors: {len(result['errors'])}")
            for i, error in enumerate(result["errors"][:5]):
                print(f"  {i+1}. {error}")
            if len(result["errors"]) > 5:
                print(f"  ... and {len(result['errors']) - 5} more errors")
    else:
        print(f"\nIngestion failed!")
        print(f"Errors:")
        for error in result["errors"]:
            print(f"- {error}")


if __name__ == "__main__":
    main()
