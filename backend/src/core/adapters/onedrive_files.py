"""
OneDrive adapter for managing files using Microsoft Graph API.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import datetime
import time
import functools
import io
import json
import mimetypes
from typing import Dict, List, Optional, Any, Union, Callable, BinaryIO

import requests
from requests.exceptions import RequestException

from src.services.auth.microsoft_auth import get_drive_service
from src.core.logger import log
from src.core.adapters.provider_change_tracker import ProviderChangeTracker

# Retry decorator for handling transient API errors
def retry_with_backoff(max_retries: int = 3, initial_backoff: float = 1, 
                      backoff_factor: float = 2, retryable_errors: tuple = (RequestException,)):
    """
    Decorator that retries the decorated function with exponential backoff
    when specified exceptions occur.
    
    Args:
        max_retries: Maximum number of retries before giving up
        initial_backoff: Initial backoff time in seconds
        backoff_factor: Factor by which to multiply backoff after each failure
        retryable_errors: Tuple of exceptions that trigger a retry
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            retries = 0
            
            while True:
                try:
                    return func(*args, **kwargs)
                except retryable_errors as error:
                    # Only retry on certain HTTP status codes
                    if isinstance(error, RequestException) and hasattr(error, 'response') and error.response is not None:
                        status_code = error.response.status_code
                        # Don't retry on client errors (except rate limiting)
                        if status_code < 500 and status_code != 429:
                            raise
                    
                    retries += 1
                    if retries > max_retries:
                        # If we've exceeded max retries, re-raise the exception
                        raise
                    
                    # Log the retry attempt
                    log.warning(
                        f"Retry {retries}/{max_retries} for {func.__name__} after error: {error}. "
                        f"Waiting {backoff} seconds..."
                    )
                    
                    # Wait with exponential backoff
                    time.sleep(backoff)
                    
                    # Increase backoff for next retry
                    backoff *= backoff_factor
        
        return wrapper
    return decorator

logger = log.bind(name="src.core.adapters.onedrive_files")

# Microsoft Graph API endpoints
GRAPH_API_BASE_URL = "https://graph.microsoft.com/v1.0"
DRIVE_ENDPOINT = f"{GRAPH_API_BASE_URL}/me/drive"


class OneDrive:
    """
    Adapter for managing OneDrive files using Microsoft Graph API.
    
    This class provides methods for:
    - Authenticating with Microsoft Graph API
    - Listing files and folders
    - Creating folders
    - Uploading files
    - Downloading files
    - Deleting files and folders
    - Getting file metadata
    - Searching for files
    - Sharing files
    
    All methods follow a consistent interface pattern with error handling and logging.
    """
    
    # Class-level cache for directory structures
    _directory_cache = {}
    # Cache expiration time in seconds (30 minutes)
    _cache_expiration = 24 * 30 * 60
    
    def __init__(self, user_id: str):
        """
        Initialize the OneDrive adapter.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.access_token = None
        self.authenticated = False
        
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def authenticate(self) -> bool:
        """
        Authenticate with Microsoft Graph API using the provided user_id.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            # Get Microsoft auth token using microsoft_auth module
            token_info = get_drive_service(self.user_id)
            
            if not token_info or 'access_token' not in token_info:
                logger.error("Failed to get Microsoft access token")
                return False
                
            self.access_token = token_info['access_token']
            
            # Test the connection by getting the user's drive info
            headers = {"Authorization": f"Bearer {self.access_token}"}
            response = requests.get(f"{DRIVE_ENDPOINT}", headers=headers)
            response.raise_for_status()
            
            # Get user display name for logging
            user_info = requests.get(f"{GRAPH_API_BASE_URL}/me", headers=headers)
            user_info.raise_for_status()
            display_name = user_info.json().get('displayName', 'Unknown User')
            
            self.authenticated = True
            logger.info(f"Successfully authenticated with Microsoft Graph API for OneDrive: {display_name}")
            return True
            
        except RequestException as error:
            logger.error(f"Request error during authentication: {error}")
            return False
            
        except Exception as error:
            logger.error(f"Error during authentication: {error}")
            return False
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def list_files(self, folder_id: str = 'root', max_results: int = 100, 
                   query: Optional[str] = None) -> Dict[str, Any]:
        """
        List files and folders in a specified folder.
        
        Args:
            folder_id: ID of the folder to list files from (default: root folder)
            max_results: Maximum number of files to return
            query: Search query to filter files
            
        Returns:
            Dict with list of files/folders and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "files": []
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Build the endpoint URL based on folder ID
            if folder_id == 'root':
                endpoint = f"{DRIVE_ENDPOINT}/root/children"
            else:
                endpoint = f"{DRIVE_ENDPOINT}/items/{folder_id}/children"
                
            # Add query parameters
            params = {
                "$top": max_results,  # Number of items to return
                "$select": "id,name,size,file,folder,parentReference,webUrl,createdDateTime,lastModifiedDateTime"
            }
            
            # Add search query if provided
            if query:
                # Note: Microsoft Graph API handles search differently than Google Drive
                # For simplicity, we'll implement a basic search here
                search_endpoint = f"{DRIVE_ENDPOINT}/root/search(q='{query}')"
                response = requests.get(search_endpoint, headers=headers, params=params)
            else:
                response = requests.get(endpoint, headers=headers, params=params)
                
            response.raise_for_status()
            results = response.json()
            
            # Extract files from response
            files = results.get('value', [])
            
            # Process files to a more usable format
            processed_files = []
            for file in files:
                processed_file = {
                    'id': file.get('id'),
                    'name': file.get('name', 'Unnamed'),
                    'mime_type': file.get('file', {}).get('mimeType', '') if 'file' in file else 'folder',
                    'size': file.get('size', '0'),
                    'created_time': file.get('createdDateTime', ''),
                    'modified_time': file.get('lastModifiedDateTime', ''),
                    'parent_id': file.get('parentReference', {}).get('id', ''),
                    'web_view_link': file.get('webUrl', ''),
                    'is_folder': 'folder' in file
                }
                processed_files.append(processed_file)
                
            # Check for next page token (Microsoft uses @odata.nextLink)
            next_page_token = results.get('@odata.nextLink', None)
                
            logger.info(f"Retrieved {len(processed_files)} files/folders from folder ID: {folder_id}")
            return {
                "success": True,
                "files": processed_files,
                "next_page_token": next_page_token
            }
            
        except RequestException as error:
            logger.error(f"Request error retrieving files: {error}")
            return {
                "success": False,
                "error": str(error),
                "files": []
            }
            
        except Exception as error:
            logger.error(f"Error retrieving files: {error}")
            return {
                "success": False,
                "error": str(error),
                "files": []
            }
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def create_folder(self, folder_name: str, parent_id: str = 'root') -> Dict[str, Any]:
        """
        Create a new folder in OneDrive.
        
        Args:
            folder_name: Name of the folder to create
            parent_id: ID of the parent folder (default: root folder)
            
        Returns:
            Dict with folder details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "folder": None
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Build the endpoint URL based on parent folder ID
            if parent_id == 'root':
                endpoint = f"{DRIVE_ENDPOINT}/root/children"
            else:
                endpoint = f"{DRIVE_ENDPOINT}/items/{parent_id}/children"
                
            # Check if folder with the same name already exists in the parent folder
            existing_folders = self.list_files(
                folder_id=parent_id,
                query=folder_name
            )
            
            if existing_folders["success"] and existing_folders["files"]:
                for file in existing_folders["files"]:
                    if file["name"] == folder_name and file["is_folder"]:
                        logger.info(f"Folder '{folder_name}' already exists in parent '{parent_id}'")
                        return {
                            "success": True,
                            "folder": file,
                            "message": "Folder already exists"
                        }
                
            # Create folder metadata - using correct format per Microsoft Graph API docs
            folder_metadata = {
                "name": folder_name,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "rename"
            }
            
            # Log the request for debugging
            logger.info(f"Creating folder with payload: {json.dumps(folder_metadata)}")
            
            # Create the folder
            response = requests.post(
                endpoint, 
                headers=headers, 
                json=folder_metadata
            )
            
            # If we get an error, log the response content for debugging
            if not response.ok:
                logger.error(f"Folder creation failed with status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            folder = response.json()
            
            # Process folder to a more usable format
            processed_folder = {
                'id': folder.get('id'),
                'name': folder.get('name', 'Unnamed'),
                'mime_type': 'folder',
                'created_time': folder.get('createdDateTime', ''),
                'modified_time': folder.get('lastModifiedDateTime', ''),
                'parent_id': folder.get('parentReference', {}).get('id', ''),
                'web_view_link': folder.get('webUrl', ''),
                'is_folder': True
            }
            
            logger.info(f"Created folder: {folder_name} with ID: {processed_folder['id']}")
            return {
                "success": True,
                "folder": processed_folder
            }
            
        except RequestException as error:
            logger.error(f"Request error creating folder: {error}")
            # Try to get more details from the response if available
            response_text = ""
            if hasattr(error, 'response') and error.response is not None:
                response_text = f" | Response: {error.response.text}"
            logger.error(f"Full error details: {error}{response_text}")
            return {
                "success": False,
                "error": str(error),
                "folder": None
            }
            
        except Exception as error:
            logger.error(f"Error creating folder: {error}")
            return {
                "success": False,
                "error": str(error),
                "folder": None
            }

    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def upload_file(self, file_path: str, parent_id: str = 'root', file_name: Optional[str] = None, mime_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file to OneDrive.
        Args:
            file_path: Path to the file to upload
            parent_id: ID of the parent folder (default: root folder)
            file_name: Name to give the file in OneDrive (default: original filename)
            mime_type: MIME type of the file (default: auto-detect)
        Returns:
            Dict with file details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file": None
            }
        try:
            if not os.path.exists(file_path):
                error_msg = f"File not found: {file_path}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "file": None
                }
            if not file_name:
                file_name = os.path.basename(file_path)
            if not mime_type:
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": mime_type
            }
            # Build the upload endpoint
            if parent_id == 'root':
                endpoint = f"{DRIVE_ENDPOINT}/root:/" + file_name + ":/content"
            else:
                endpoint = f"{DRIVE_ENDPOINT}/items/{parent_id}:/{file_name}:/content"
            with open(file_path, "rb") as f:
                response = requests.put(endpoint, headers=headers, data=f)
            response.raise_for_status()
            uploaded = response.json()
            processed_file = {
                'id': uploaded.get('id'),
                'name': uploaded.get('name', 'Unnamed'),
                'mime_type': uploaded.get('file', {}).get('mimeType', mime_type),
                'size': uploaded.get('size', '0'),
                'created_time': uploaded.get('createdDateTime', ''),
                'modified_time': uploaded.get('lastModifiedDateTime', ''),
                'parent_id': uploaded.get('parentReference', {}).get('id', ''),
                'web_view_link': uploaded.get('webUrl', ''),
                'is_folder': False
            }
            logger.info(f"Uploaded file: {file_name} with ID: {processed_file['id']}")
            
            # Track the file addition in the provider_changes table
            ProviderChangeTracker.log_document_add(
                provider='onedrive',
                user_id=self.user_id,
                doc_id=processed_file['id'],
                doc_name=processed_file['name'],
                path=file_path,
                extra_details={
                    'size': processed_file.get('size', 0),
                    'web_url': processed_file.get('web_view_link', ''),
                    'mime_type': processed_file.get('mime_type', ''),
                    'parent_id': parent_id
                }
            )
            
            return {
                "success": True,
                "file": processed_file
            }
        except RequestException as error:
            logger.error(f"Request error uploading file: {error}")
            return {
                "success": False,
                "error": str(error),
                "file": None
            }
        except Exception as error:
            logger.error(f"Error uploading file: {error}")
            return {
                "success": False,
                "error": str(error),
                "file": None
            }

    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def download_file(self, file_id: str, destination_path: str) -> Dict[str, Any]:
        """
        Download a file from OneDrive.
        Args:
            file_id: ID of the file to download
            destination_path: Path where to save the downloaded file
        Returns:
            Dict with download status and file path
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file_path": None
            }
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            # Get file metadata
            meta_endpoint = f"{DRIVE_ENDPOINT}/items/{file_id}"
            meta_resp = requests.get(meta_endpoint, headers=headers)
            meta_resp.raise_for_status()
            meta = meta_resp.json()
            if 'folder' in meta:
                error_msg = f"Cannot download a folder: {meta.get('name', file_id)}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "file_path": None
                }
            # Download URL
            download_url = meta.get('@microsoft.graph.downloadUrl')
            if not download_url:
                # Fallback to /content endpoint
                download_url = f"{DRIVE_ENDPOINT}/items/{file_id}/content"
                resp = requests.get(download_url, headers=headers, stream=True)
            else:
                resp = requests.get(download_url, stream=True)
            resp.raise_for_status()
            os.makedirs(os.path.dirname(os.path.abspath(destination_path)), exist_ok=True)
            with open(destination_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            logger.info(f"Downloaded file: {meta.get('name', file_id)} to {destination_path}")
            return {
                "success": True,
                "file_path": destination_path,
                "file_name": meta.get('name', file_id)
            }
        except RequestException as error:
            logger.error(f"Request error downloading file: {error}")
            return {
                "success": False,
                "error": str(error),
                "file_path": None
            }
        except Exception as error:
            logger.error(f"Error downloading file: {error}")
            return {
                "success": False,
                "error": str(error),
                "file_path": None
            }

    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def delete_file(self, file_id: str, permanently: bool = False) -> Dict[str, Any]:
        """
        Delete a file or folder from OneDrive.
        Args:
            file_id: ID of the file or folder to delete
            permanently: If True, attempt permanent deletion (default: move to recycle bin)
        Returns:
            Dict with deletion status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated"
            }
        try:
            # Get file metadata before deletion to include in the change log
            file_metadata = None
            try:
                metadata_result = self.get_file_metadata(file_id)
                if metadata_result["success"]:
                    file_metadata = metadata_result["file"]
            except Exception as e:
                logger.warning(f"Could not retrieve metadata for file {file_id} before deletion: {e}")
            
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            endpoint = f"{DRIVE_ENDPOINT}/items/{file_id}"
            resp = requests.delete(endpoint, headers=headers)
            if resp.status_code == 204:
                logger.info(f"Deleted file or folder: {file_id}")
                
                # Track the file deletion in the provider_changes table
                file_name = file_metadata.get("name", "Unknown") if file_metadata else "Unknown"
                extra_details = {}
                if file_metadata:
                    extra_details = {
                        "size": file_metadata.get("size", 0),
                        "mime_type": file_metadata.get("mime_type", ""),
                        "is_folder": file_metadata.get("is_folder", False),
                        "permanently_deleted": permanently
                    }
                
                ProviderChangeTracker.log_document_remove(
                    provider="onedrive",
                    user_id=self.user_id,
                    doc_id=file_id,
                    doc_name=file_name,
                    extra_details=extra_details
                )
                
                return {
                    "success": True,
                    "message": f"Deleted: {file_id}"
                }
            elif resp.status_code == 404:
                logger.warning(f"File not found: {file_id}")
                return {
                    "success": False,
                    "error": f"File not found: {file_id}"
                }
            else:
                logger.error(f"Unexpected status deleting file: {resp.status_code} {resp.text}")
                return {
                    "success": False,
                    "error": f"Status {resp.status_code}: {resp.text}"
                }
        except RequestException as error:
            logger.error(f"Request error deleting file: {error}")
            return {
                "success": False,
                "error": str(error)
            }
        except Exception as error:
            logger.error(f"Error deleting file: {error}")
            return {
                "success": False,
                "error": str(error)
            }

    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """
        Get detailed metadata for a file or folder from OneDrive.
        Args:
            file_id: ID of the file or folder
        Returns:
            Dict with file metadata and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file": None
            }
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            endpoint = f"{DRIVE_ENDPOINT}/items/{file_id}"
            resp = requests.get(endpoint, headers=headers)
            if resp.status_code == 404:
                logger.warning(f"File not found: {file_id}")
                return {
                    "success": False,
                    "error": f"File not found: {file_id}",
                    "file": None
                }
            resp.raise_for_status()
            file = resp.json()
            processed_file = {
                'id': file.get('id'),
                'name': file.get('name', 'Unnamed'),
                'mime_type': file.get('file', {}).get('mimeType', 'folder') if 'file' in file else 'folder',
                'size': file.get('size', '0'),
                'created_time': file.get('createdDateTime', ''),
                'modified_time': file.get('lastModifiedDateTime', ''),
                'parent_id': file.get('parentReference', {}).get('id', ''),
                'web_view_link': file.get('webUrl', ''),
                'is_folder': 'folder' in file,
                'description': file.get('description', ''),
                'download_url': file.get('@microsoft.graph.downloadUrl', None)
            }
            logger.info(f"Retrieved metadata for file: {processed_file['name']} (ID: {file_id})")
            return {
                "success": True,
                "file": processed_file
            }
        except RequestException as error:
            logger.error(f"Request error retrieving file metadata: {error}")
            return {
                "success": False,
                "error": str(error),
                "file": None
            }
        except Exception as error:
            logger.error(f"Error retrieving file metadata: {error}")
            return {
                "success": False,
                "error": str(error),
                "file": None
            }

    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def get_directory_structure(self, root_folder_id: str = 'root', max_depth: int = -1, current_depth: int = 0, use_cache: bool = True) -> Dict[str, Any]:
        """
        Recursively retrieve the entire directory structure starting from a root folder.
        Results are cached for 30 minutes to improve performance on repeated calls.
        
        Args:
            root_folder_id: ID of the root folder to start from (default: 'root')
            max_depth: Maximum depth to traverse (-1 for unlimited)
            current_depth: Current recursion depth (used internally)
            use_cache: Whether to use cached results if available (default: True)
            
        Returns:
            Dict with the directory structure and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "structure": None
            }
        
        # Generate cache key based on folder ID and max depth
        cache_key = f"{self.user_id}:{root_folder_id}:{max_depth}"
        
        # Check if we're at the top level of recursion (not a recursive call)
        if current_depth == 0 and use_cache:
            # Check if we have a valid cached result
            if cache_key in self._directory_cache:
                cache_entry = self._directory_cache[cache_key]
                cache_time = cache_entry.get('timestamp', 0)
                current_time = time.time()
                
                # If cache is still valid (less than 30 minutes old)
                if current_time - cache_time < self._cache_expiration:
                    logger.info(f"Using cached directory structure for folder {root_folder_id}")
                    return cache_entry['result']
                else:
                    # Cache expired, remove it
                    logger.info(f"Cache expired for directory structure of folder {root_folder_id}")
                    del self._directory_cache[cache_key]
            
        # Check if we've reached max depth
        if max_depth >= 0 and current_depth > max_depth:
            return {
                "success": True,
                "structure": {
                    "id": root_folder_id,
                    "name": "...",
                    "type": "folder",
                    "children": []
                }
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # First get the current folder's metadata
            if root_folder_id == 'root':
                endpoint = f"{DRIVE_ENDPOINT}/root"
            else:
                endpoint = f"{DRIVE_ENDPOINT}/items/{root_folder_id}"
                
            response = requests.get(endpoint, headers=headers)
            response.raise_for_status()
            folder_metadata = response.json()
            
            # Initialize the structure with this folder
            structure = {
                "id": folder_metadata.get('id'),
                "name": folder_metadata.get('name'),
                "type": "folder",
                "children": []
            }
            
            # List all files and folders in this folder
            if root_folder_id == 'root':
                children_endpoint = f"{DRIVE_ENDPOINT}/root/children"
            else:
                children_endpoint = f"{DRIVE_ENDPOINT}/items/{root_folder_id}/children"
                
            response = requests.get(children_endpoint, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            items = result.get('value', [])
            
            # Process each item
            for item in items:
                item_id = item.get('id')
                item_name = item.get('name')
                
                # Check if it's a folder
                if 'folder' in item:
                    # If it's a folder and we haven't reached max depth, recurse
                    if max_depth < 0 or current_depth < max_depth:
                        child_result = self.get_directory_structure(
                            root_folder_id=item_id,
                            max_depth=max_depth,
                            current_depth=current_depth + 1,
                            use_cache=use_cache
                        )
                        if child_result["success"]:
                            structure["children"].append(child_result["structure"])
                    else:
                        # Just add a placeholder for the folder
                        structure["children"].append({
                            "id": item_id,
                            "name": item_name,
                            "type": "folder",
                            "children": []
                        })
                else:
                    # It's a file, add it to children
                    structure["children"].append({
                        "id": item_id,
                        "name": item_name,
                        "type": "file",
                        "mime_type": item.get('file', {}).get('mimeType', 'unknown'),
                        "size": item.get('size', 0),
                        "web_url": item.get('webUrl', '')
                    })
            
            logger.info(f"Retrieved directory structure for folder {root_folder_id} with {len(items)} items")
            result = {
                "success": True,
                "structure": structure
            }
            
            # Store in cache if this is the top-level call
            if current_depth == 0 and use_cache:
                logger.info(f"Caching directory structure for folder {root_folder_id}")
                self._directory_cache[cache_key] = {
                    'result': result,
                    'timestamp': time.time()
                }
                
            return result
            
        except RequestException as error:
            logger.error(f"Request error retrieving directory structure: {error}")
            return {
                "success": False,
                "error": str(error),
                "structure": None
            }
            
        except Exception as error:
            logger.error(f"Error retrieving directory structure: {error}")
            return {
                "success": False,
                "error": str(error),
                "structure": None
            }
    
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def share_file(self, file_id: str, email: str, role: str = 'read', send_notification: bool = False, message: str = '') -> Dict[str, Any]:
        """
        Share a file or folder with another user using Microsoft Graph API /invite endpoint.
        Args:
            file_id: ID of the file or folder to share
            email: Email address of the user to share with
            role: Permission role to grant ('read', 'write', 'admin')
            send_notification: Whether to send notification email
            message: Custom message to include in notification
        Returns:
            Dict with sharing status and permission details
        """
        if not self.authenticated:
            logger.error("Not authenticated with Microsoft Graph API")
            return {
                "success": False,
                "error": "Not authenticated",
                "permission": None
            }
            
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            # Map roles to Microsoft Graph API roles
            role_mapping = {
                'read': 'read',
                'write': 'write',
                'admin': 'write'
            }
            
            ms_role = role_mapping.get(role.lower(), 'read')
            
            # Build the invitation
            invitation = {
                "requireSignIn": True,
                "sendInvitation": send_notification,
                "roles": [ms_role],
                "recipients": [
                    {"email": email}
                ]
            }
            
            if send_notification and message:
                invitation["message"] = message
                
            # Share the file using the /invite endpoint
            endpoint = f"{DRIVE_ENDPOINT}/items/{file_id}/invite"
            response = requests.post(endpoint, headers=headers, json=invitation)
            response.raise_for_status()
            
            result = response.json()
            
            # Process the result
            if 'value' in result and len(result['value']) > 0:
                permission_info = result['value'][0]
                processed_permission = {
                    'id': permission_info.get('id'),
                    'roles': permission_info.get('roles', []),
                    'granted_to': email,
                    'link': permission_info.get('link', {}).get('webUrl', '')
                }
            else:
                processed_permission = {
                    'id': None,
                    'roles': [],
                    'granted_to': email,
                    'link': ''
                }
            
            logger.info(f"Shared file/folder {file_id} with {email} as {role}")
            return {
                "success": True,
                "permission": processed_permission
            }
            
        except RequestException as error:
            logger.error(f"Request error sharing file: {error}")
            return {
                "success": False,
                "error": str(error),
                "permission": None
            }
        except Exception as error:
            logger.error(f"Error sharing file: {error}")
            return {
                "success": False,
                "error": str(error),
                "permission": None
            }


def main():
    """
    Test function to demonstrate the OneDrive adapter functionality.
    """
    import os
    import tempfile
    import datetime
    user_id = ""
    test_email = "edoardogenissel@gmail.com"
    print(f"\nTesting OneDrive adapter with user ID: {user_id}\n")
    drive = OneDrive(user_id)
    print("Step 1: Authenticating with Microsoft Graph API...")
    if not drive.authenticate():
        print("Authentication failed. Exiting.")
        return
    print("Authentication successful!\n")
    print("Step 2: Listing files in root folder...")
    files_result = drive.list_files(max_results=10)
    if not files_result["success"]:
        print(f"Error listing files: {files_result['error']}")
    else:
        print(f"Found {len(files_result['files'])} files/folders:")
        for file in files_result["files"][:5]:
            print(f"  - {file['name']} ({'Folder' if file['is_folder'] else 'File'})")
        print()
    # Use a simple folder name without special characters or spaces
    test_folder_name = f"TestFolder_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Step 3: Creating test folder '{test_folder_name}'...")
    folder_result = drive.create_folder(test_folder_name)
    if not folder_result["success"]:
        print(f"Error creating folder: {folder_result['error']}")
        return
    test_folder_id = folder_result["folder"]["id"]
    print(f"Created folder with ID: {test_folder_id}\n")
    print("Step 4: Creating and uploading a test file...")
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
        temp_file.write(b"This is a test file created by the OneDrive adapter.\n")
        temp_file.write(f"Created at: {datetime.datetime.now().isoformat()}\n".encode())
        temp_file_path = temp_file.name
    upload_result = drive.upload_file(
        file_path=temp_file_path,
        parent_id=test_folder_id,
        file_name="test_file.txt"
    )
    if not upload_result["success"]:
        print(f"Error uploading file: {upload_result['error']}")
        return
    test_file_id = upload_result["file"]["id"]
    print(f"Uploaded file with ID: {test_file_id}\n")
    print("Step 5: Getting file metadata...")
    metadata_result = drive.get_file_metadata(test_file_id)
    if not metadata_result["success"]:
        print(f"Error getting metadata: {metadata_result['error']}")
    else:
        file_meta = metadata_result["file"]
        print("File metadata:")
        print(f"  - Name: {file_meta['name']}")
        print(f"  - Size: {file_meta['size']} bytes")
        print(f"  - Created: {file_meta['created_time']}")
        print(f"  - Web Link: {file_meta['web_view_link']}")
        print()
    print("Step 6: Downloading the file...")
    download_path = os.path.join(tempfile.gettempdir(), "downloaded_onedrive_test_file.txt")
    download_result = drive.download_file(test_file_id, download_path)
    if not download_result["success"]:
        print(f"Error downloading file: {download_result['error']}")
    else:
        print(f"Downloaded file to: {download_result['file_path']}")
        with open(download_result['file_path'], 'r') as f:
            print("File contents:")
            print(f.read())
        print()
    print(f"Step 7: Sharing the file with {test_email}...")
    share_result = drive.share_file(test_file_id, test_email, role='read', send_notification=False, message="Test share from OneDrive adapter.")
    if not share_result["success"]:
        print(f"Error sharing file: {share_result['error']}")
    else:
        print(f"Shared file. Permission: {share_result['permission']}")
        print()
    print("Step 8: Getting directory structure...")
    print("\nA. Test folder structure:")
    structure_result = drive.get_directory_structure(test_folder_id)
    if not structure_result["success"]:
        print(f"Error getting test folder structure: {structure_result['error']}")
    else:
        print("Test folder structure:")
        print(structure_result["structure"])
        print()
        
    print("\nB. Root folder structure:")
    root_structure_result = drive.get_directory_structure('root', max_depth=10)  # Limit depth to 1 to avoid too much output
    if not root_structure_result["success"]:
        print(f"Error getting root folder structure: {root_structure_result['error']}")
    else:
        print("Root folder structure:")
        print(root_structure_result["structure"])
        print()
    print("Step 9: Cleaning up - deleting test file and folder...")
    delete_file_result = drive.delete_file(test_file_id)
    if not delete_file_result["success"]:
        print(f"Error deleting file: {delete_file_result['error']}")
    else:
        print(f"Deleted file: {delete_file_result['message']}")
    delete_folder_result = drive.delete_file(test_folder_id)
    if not delete_folder_result["success"]:
        print(f"Error deleting folder: {delete_folder_result['error']}")
    else:
        print(f"Deleted folder: {delete_folder_result['message']}")
    try:
        os.unlink(temp_file_path)
    except:
        pass
    print("\nTest completed!")

if __name__ == "__main__":
    main()

