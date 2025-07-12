#!/usr/bin/env python3
"""
Script for ingesting documents from Microsoft OneDrive into Qdrant using OAuth2.
"""

import os
import sys
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
from backend.services.auth.microsoft_auth import get_drive_service
from backend.services.ingestion.core.ingest_core import flush_batch
from backend.services.storage.file_registry import FileRegistry
from backend.services.db.models import SyncStatus

# Microsoft Graph API endpoint
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"

def _is_recent_file(file_metadata: Dict, days_filter: int) -> bool:
    """
    Check if a file is recent based on its creation or modification date.
    
    Args:
        file_metadata: OneDrive file metadata
        days_filter: Number of days to consider as recent
        
    Returns:
        True if the file was created or modified within the specified number of days, False otherwise
    """
    if not days_filter:
        return True  # No filter means all files are considered recent
        
    try:
        # Get current time and calculate the cutoff date
        now = datetime.datetime.now(datetime.timezone.utc)
        cutoff_date = now - datetime.timedelta(days=days_filter)
        
        # Check last modified date
        last_modified_str = file_metadata.get('lastModifiedDateTime')
        if last_modified_str:
            # Parse ISO 8601 date format
            last_modified = datetime.datetime.fromisoformat(last_modified_str.replace('Z', '+00:00'))
            if last_modified >= cutoff_date:
                return True
                
        # Check creation date
        created_str = file_metadata.get('createdDateTime')
        if created_str:
            # Parse ISO 8601 date format
            created = datetime.datetime.fromisoformat(created_str.replace('Z', '+00:00'))
            if created >= cutoff_date:
                return True
                
        # If we get here, the file is older than the specified number of days
        return False
        
    except Exception as e:
        logger.warning(f"Error checking file date: {e}. Considering file as recent.")
        return True  # In case of error, include the file to be safe


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
        
        logger.info(f"Downloading file: {file_name} (ID: {file_id}, MIME: {mime_type})")
        
        # Check if it's a folder
        if file_metadata.get('folder'):
            logger.warning(f"Cannot download a folder: {file_name}")
            return None
        
        # Download URL
        download_url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{file_id}/content"
        
        # Set up headers with access token
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
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


def fetch_onedrive_files(access_token: str, query: str = None, limit: int = 100, folder_id: str = None, days_filter: int = None) -> List[Dict[str, Any]]:
    """
    Fetch files from OneDrive using Microsoft Graph API.
    
    Args:
        access_token: Microsoft Graph API access token
        query: Search query to filter files
        limit: Maximum number of files to return
        folder_id: ID of the folder to explore (optional, defaults to root)
        days_filter: Only return files created or modified in the last N days
        
    Returns:
        List of file metadata dictionaries
    """
    try:
        logger.info(f"Starting fetch_onedrive_files with params: query={query}, limit={limit}, folder_id={folder_id}")
        
        # Set up headers with access token
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        # If search query is provided, use the search endpoint
        if query:
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/search(q='{query}')"
            logger.info(f"Using search URL with query '{query}': {url}")
            
            params = {
                '$top': min(100, limit),
                '$select': 'id,name,file,folder,lastModifiedDateTime,createdDateTime,size,webUrl,parentReference'
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            items = data.get('value', [])
            
            # Process search results (only include files)
            results = []
            for item in items:
                if 'file' in item:
                    # Apply date filter if specified
                    if days_filter and not _is_recent_file(item, days_filter):
                        logger.info(f"Skipping file {item.get('name', 'unnamed')} - older than {days_filter} days")
                        continue
                        
                    results.append(item)
                    if len(results) >= limit:
                        break
            
            # Handle pagination for search results
            while '@odata.nextLink' in data and len(results) < limit:
                next_link = data['@odata.nextLink']
                logger.info(f"Following pagination link: {next_link}")
                
                response = requests.get(next_link, headers=headers)
                response.raise_for_status()
                
                data = response.json()
                items = data.get('value', [])
                
                for item in items:
                    if 'file' in item:
                        results.append(item)
                        if len(results) >= limit:
                            break
            
            logger.info(f"Returning {len(results)} files from search results")
            return results[:limit]
        
        # If not searching, use recursive directory structure to get all files
        # Determine the root folder ID
        root_id = folder_id if folder_id else 'root'
        
        # Get the complete directory structure
        url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{root_id}/children"
        if root_id == 'root':
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/children"
        
        logger.info(f"Getting files from: {url}")
        
        # Initialize results list
        results = []
        
        # Function to recursively get all files
        def get_all_files(url, max_items=limit):
            nonlocal results
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            items = data.get('value', [])
            
            # Process items at this level
            for item in items:
                if 'file' in item:
                    # Apply date filter if specified
                    if days_filter and not _is_recent_file(item, days_filter):
                        logger.info(f"Skipping file {item.get('name', 'unnamed')} - older than {days_filter} days")
                        continue
                        
                    # It's a file, add it to results
                    results.append(item)
                    if len(results) >= max_items:
                        return
                elif 'folder' in item and len(results) < max_items:
                    # It's a folder, recursively get its contents
                    folder_id = item.get('id')
                    folder_url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{folder_id}/children"
                    get_all_files(folder_url, max_items)
                    if len(results) >= max_items:
                        return
            
            # Handle pagination at this level
            if '@odata.nextLink' in data and len(results) < max_items:
                get_all_files(data['@odata.nextLink'], max_items)
        
        # Start recursive file collection
        get_all_files(url, limit)
        
        logger.info(f"Retrieved {len(results)} files recursively from OneDrive")
        return results[:limit]
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error fetching files: {e}")
        if hasattr(e, 'response'):
            logger.error(f"Response status code: {e.response.status_code}")
            logger.error(f"Response content: {e.response.text}")
        logger.error(traceback.format_exc())
        return []
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
    syncstatus: SyncStatus = None,
    days_filter: int = 2
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
        days_filter: Only ingest files created or modified in the last N days (default: 2)
        
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
        token_data = get_drive_service(user_id)
        if not token_data or "access_token" not in token_data:
            error_msg = "Failed to get Microsoft access token"
            logger.error(error_msg)
            result["errors"].append(error_msg)
            result["success"] = False
            return result
            
        access_token = token_data["access_token"]
        logger.info("Microsoft Graph API access token obtained successfully")
        
        # Fetch files from OneDrive
        files = fetch_onedrive_files(access_token, query, limit, folder_id, days_filter)
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
                    logger.info(f"Temporary file deleted: {temp_file}")
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
    parser.add_argument('--user-id', default="test", help='User identifier')
    parser.add_argument('--batch-size', type=int, default=10, help='Batch size for ingestion')
    parser.add_argument('--days-filter', type=int, default=2, help='Only ingest files created or modified in the last N days (default: 2, 0 for no filter)')
    
    args = parser.parse_args()
    
    # Execute batch ingestion
    result = batch_ingest_onedrive_documents(
        query=args.query,
        limit=args.limit,
        folder_id=args.folder_id,
        force_reingest=args.force_reingest,
        verbose=args.verbose,
        user_id=args.user_id,
        batch_size=args.batch_size,
        days_filter=args.days_filter
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
