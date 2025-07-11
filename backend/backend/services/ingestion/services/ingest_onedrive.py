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


def fetch_onedrive_files(access_token: str, query: str = None, limit: int = 100, folder_id: str = None) -> List[Dict[str, Any]]:
    """
    Fetch files from OneDrive using Microsoft Graph API.
    
    Args:
        access_token: Microsoft Graph API access token
        query: Search query to filter files
        limit: Maximum number of files to return
        folder_id: ID of the folder to explore (optional)
        
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
        logger.info("Headers configured with access token")
        
        # Construct the base URL for OneDrive files based on Microsoft Graph API documentation
        if folder_id:
            # If folder_id is provided, get files from that specific folder
            url = f"{GRAPH_API_ENDPOINT}/me/drive/items/{folder_id}/children"
            logger.info(f"Using folder-specific URL: {url}")
        else:
            # Try the recommended endpoint for accessing root folder items
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/children"
            logger.info(f"Using root folder URL: {url}")
        
        # Add search query if provided
        if query:
            # Use search endpoint instead
            url = f"{GRAPH_API_ENDPOINT}/me/drive/root/search(q='{query}')"
            logger.info(f"Using search URL with query '{query}': {url}")
        
        # Add parameters for pagination and fields
        params = {
            '$top': min(100, limit),
            '$select': 'id,name,file,folder,lastModifiedDateTime,createdDateTime,size,webUrl,parentReference'
        }
        
        # Make the initial request
        logger.info(f"Making request to: {url}")
        response = requests.get(url, headers=headers, params=params)
        
        # Log response details for infoging
        logger.info(f"Response status code: {response.status_code}")
        
        # Handle error responses
        if response.status_code != 200:
            logger.error(f"Error response: {response.status_code} - {response.text}")
            return []
            
        data = response.json()
        logger.info(f"Response data keys: {list(data.keys())}")
        
        # Process results
        results = []
        items = data.get('value', [])
        items_in_response = len(items)
        logger.info(f"Received {items_in_response} items in response")
        
        for item in items:
            # Log item details for infoging
            item_name = item.get('name', 'unnamed')
            item_id = item.get('id', 'no-id')
            is_folder = 'folder' in item
            is_file = 'file' in item
            item_type = "folder" if is_folder else "file" if is_file else "unknown"
            
            logger.info(f"Processing item: {item_name} (type: {item_type}, id: {item_id})")
            
            # Skip folders unless we're explicitly looking at folder contents
            if is_folder and not folder_id:
                logger.info(f"Skipping folder: {item_name}")
                continue
                
            # Only include files (skip folders in search results)
            if is_file:
                logger.info(f"Adding file to results: {item_name}")
                results.append(item)
            else:
                logger.info(f"Skipping non-file item: {item_name}")
        
        # Handle pagination if there are more results
        while '@odata.nextLink' in data and len(results) < limit:
            next_link = data['@odata.nextLink']
            logger.info(f"Following pagination link: {next_link}")
            
            response = requests.get(next_link, headers=headers)
            if response.status_code != 200:
                logger.error(f"Error in pagination response: {response.status_code} - {response.text}")
                break
                
            data = response.json()
            
            items_in_page = len(data.get('value', []))
            logger.info(f"Received {items_in_page} items in pagination response")
        
            # Add files from subsequent pages
            for item in data.get('value', []):
                item_name = item.get('name', 'unnamed')
                is_file = 'file' in item
                is_folder = 'folder' in item
                item_type = "folder" if is_folder else "file" if is_file else "unknown"
                
                logger.info(f"Processing paginated item: {item_name} (type: {item_type})")
                
                # Only include files (skip folders)
                if is_file:
                    logger.info(f"Adding paginated file to results: {item_name}")
                    results.append(item)
                    if len(results) >= limit:
                        logger.info(f"Reached limit of {limit} files, stopping pagination")
                        break
        
        # Try listing all drives as a fallback
        if not results:
            logger.info("No files found in default approach, trying to list all drives")
            drives_url = f"{GRAPH_API_ENDPOINT}/me/drives"
            drives_response = requests.get(drives_url, headers=headers)
            if drives_response.status_code == 200:
                drives_data = drives_response.json()
                drives = drives_data.get('value', [])
                logger.info(f"Found {len(drives)} drives")
                
                # Try to access each drive directly
                for drive in drives:
                    drive_id = drive.get('id')
                    drive_name = drive.get('name', 'Unnamed Drive')
                    logger.info(f"Found drive: {drive_name} (id: {drive_id})")
                    
                    # Try different approaches for this drive based on the documentation
                    approaches = [
                        # Standard approach for drive root children
                        f"{GRAPH_API_ENDPOINT}/drives/{drive_id}/root/children",
                        # Alternative approach using drive items
                        f"{GRAPH_API_ENDPOINT}/drives/{drive_id}/items/root/children",
                        # Special folders approach
                        f"{GRAPH_API_ENDPOINT}/drives/{drive_id}/special/documents/children"
                    ]
                    
                    for approach_url in approaches:
                        logger.info(f"Trying to access drive {drive_name} using URL: {approach_url}")
                        approach_response = requests.get(approach_url, headers=headers)
                        
                        if approach_response.status_code == 200:
                            approach_data = approach_response.json()
                            approach_items = approach_data.get('value', [])
                            logger.info(f"Found {len(approach_items)} items using {approach_url}")
                            
                            # Process items from this approach
                            for item in approach_items:
                                item_name = item.get('name', 'unnamed')
                                is_file = 'file' in item
                                is_folder = 'folder' in item
                                item_type = "folder" if is_folder else "file" if is_file else "unknown"
                                logger.info(f"Drive item: {item_name} (type: {item_type})")
                                
                                # Add files to results
                                if is_file:
                                    logger.info(f"Adding drive file to results: {item_name}")
                                    results.append(item)
                                    
                            # If we found items, no need to try other approaches for this drive
                            if approach_items:
                                break
                        else:
                            logger.info(f"Failed with approach {approach_url}: {approach_response.status_code}")
            
            # Try additional approaches based on the Microsoft documentation
            if not results:
                # Try different approaches for accessing files
                additional_approaches = [
                    # Try using the /items endpoint
                    f"{GRAPH_API_ENDPOINT}/me/drive/items/root/children",
                    # Try using the special folders approach
                    f"{GRAPH_API_ENDPOINT}/me/drive/special/documents/children",
                    # Try using the path-based approach
                    f"{GRAPH_API_ENDPOINT}/me/drive/root:/Documents:/children",
                    # Try using the delta endpoint
                    f"{GRAPH_API_ENDPOINT}/me/drive/root/delta"
                ]
                
                for idx, approach_url in enumerate(additional_approaches):
                    logger.info(f"Trying additional approach #{idx+1}: {approach_url}")
                    approach_response = requests.get(approach_url, headers=headers)
                    
                    if approach_response.status_code == 200:
                        approach_data = approach_response.json()
                        approach_items = approach_data.get('value', [])
                        logger.info(f"Found {len(approach_items)} items using approach #{idx+1}")
                        
                        for item in approach_items:
                            item_name = item.get('name', 'unnamed')
                            is_file = 'file' in item
                            if is_file:
                                logger.info(f"Adding item to results: {item_name}")
                                results.append(item)
                        
                        # If we found items, no need to try other approaches
                        if approach_items:
                            break
                    else:
                        logger.info(f"Failed with approach #{idx+1}: {approach_response.status_code}")
                        
            # Try uploading a test file if no files are found
            if not results:
                logger.info("No files found in OneDrive. This could be because the account is new or empty.")
                logger.info("You may need to upload files to OneDrive first before they can be ingested.")
        
        final_count = len(results[:limit])
        logger.info(f"Returning {final_count} files from OneDrive")
        return results[:limit]  # Limit to the first 'limit' results
        
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


def flush_batch(batch_documents: List[Dict], user_id: str, result: Dict, file_registry: FileRegistry, syncstatus: SyncStatus = None) -> None:
    """
    Process a batch of documents for ingestion.
    
    Args:
        batch_documents: List of documents to process
        user_id: User identifier
        result: Dictionary to update with results
        file_registry: FileRegistry instance
        syncstatus: SyncStatus object to track progress
    """
    if not batch_documents:
        return
        
    try:
        # Prepare documents for ingestion
        documents_to_ingest = []
        for doc in batch_documents:
            tmp_path = doc["tmp_path"]
            metadata = doc["metadata"]
            
            # Create document for ingestion
            document = Document(
                path=metadata["path"],
                metadata=metadata,
                user_id=user_id
            )
            
            # Load content from temporary file
            document.load_from_file(tmp_path)
            
            # Add to list for batch ingestion
            documents_to_ingest.append(document)
            
        # Ingest the batch
        if documents_to_ingest:
            logger.info(f"Ingesting batch of {len(documents_to_ingest)} documents")
            ingest_documents_batch(documents_to_ingest)
            
            # Update registry and statistics
            for doc in documents_to_ingest:
                file_registry.add_file(doc.path)
                result["items_ingested"] += 1
                
                if syncstatus:
                    syncstatus.processed_documents += 1
                    
    except Exception as e:
        logger.error(f"Error processing batch: {e}")
        logger.error(traceback.format_exc())
        result["errors"].append(f"Batch processing error: {str(e)}")



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
