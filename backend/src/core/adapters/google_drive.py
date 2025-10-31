"""
Google Drive adapter for managing files using Google Drive API.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import datetime
import time
import functools
import io
from typing import Dict, List, Optional, Any, Union, Callable, BinaryIO

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from src.services.auth.google_auth import get_drive_service
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google.oauth2.credentials import Credentials

from src.services.auth.google_auth import get_google_service
from src.core.logger import log
from src.core.adapters.provider_change_tracker import ProviderChangeTracker

# Retry decorator for handling transient API errors
def retry_with_backoff(max_retries: int = 3, initial_backoff: float = 1, 
                      backoff_factor: float = 2, retryable_errors: tuple = (HttpError,)):
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
                    # Only retry on certain HTTP errors (e.g., 429, 500, 503)
                    if isinstance(error, HttpError):
                        status_code = error.resp.status
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

logger = log.bind(name="src.core.adapters.google_drive")

# Google Drive API scopes
DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive']


class GoogleDrive:
    """
    Adapter for managing Google Drive files using Google Drive API.
    
    This class provides methods for:
    - Authenticating with Google Drive API
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
    _cache_expiration = 24 *60 * 60
    
    def __init__(self, user_id: str):
        """
        Initialize the GoogleDrive adapter.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.service = None
        self.authenticated = False
    
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def authenticate(self) -> bool:
        """
        Authenticate and build the Google Drive service
        bool: True if authentication was successful
        """
        try:
            # Get authenticated service using google_auth module
            self.service = get_drive_service(self.user_id)
            
            self.authenticated = True
            return True
            
        except HttpError as error:
            logger.error(f"HTTP error during Google Drive authentication: {error}")
            self.authenticated = False
            return False
            
        except Exception as error:
            logger.error(f"Error authenticating with Google Drive API: {error}")
            self.authenticated = False
            return False
            
    @retry_with_backoff(max_retries=3, initial_backoff=1)
    def list_files(self, folder_id: str = 'root', max_results: int = 100, 
                   query: Optional[str] = None, file_fields: str = None) -> Dict[str, Any]:
        """
        List files and folders in a specified folder.
        
        Args:
            folder_id: ID of the folder to list files from (default: root folder)
            max_results: Maximum number of files to return
            query: Search query to filter files (using Google Drive query syntax)
            file_fields: Comma-separated list of fields to include in the response
            
        Returns:
            Dict with list of files/folders and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "files": []
            }
            
        try:
            # Set default fields if not provided
            if not file_fields:
                file_fields = "id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, shared"
                
            # Build the query
            if query:
                # If a custom query is provided, use it
                q = query
            else:
                # Otherwise, just look for files in the specified folder
                q = f"'{folder_id}' in parents and trashed = false"
                
            # Make the API request
            results = self.service.files().list(
                q=q,
                pageSize=max_results,
                fields=f"nextPageToken, files({file_fields})"
            ).execute()
            
            files = results.get('files', [])
            next_page_token = results.get('nextPageToken', None)
            
            # Process files to a more usable format
            processed_files = []
            for file in files:
                processed_file = {
                    'id': file.get('id'),
                    'name': file.get('name', 'Unnamed'),
                    'mime_type': file.get('mimeType', ''),
                    'size': file.get('size', '0'),
                    'created_time': file.get('createdTime', ''),
                    'modified_time': file.get('modifiedTime', ''),
                    'parents': file.get('parents', []),
                    'web_view_link': file.get('webViewLink', ''),
                    'shared': file.get('shared', False),
                    'is_folder': file.get('mimeType') == 'application/vnd.google-apps.folder'
                }
                processed_files.append(processed_file)
                
            logger.info(f"Retrieved {len(processed_files)} files/folders from folder ID: {folder_id}")
            return {
                "success": True,
                "files": processed_files,
                "next_page_token": next_page_token
            }
            
        except HttpError as error:
            logger.error(f"HTTP error retrieving files: {error}")
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
        Create a new folder in Google Drive.
        
        Args:
            folder_name: Name of the folder to create
            parent_id: ID of the parent folder (default: root folder)
            
        Returns:
            Dict with folder details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "folder": None
            }
            
        try:
            # Check if folder with the same name already exists in the parent folder
            existing_folders = self.list_files(
                folder_id=parent_id,
                query=f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and '{parent_id}' in parents and trashed = false"
            )
            
            if existing_folders["success"] and existing_folders["files"]:
                logger.info(f"Folder '{folder_name}' already exists in parent '{parent_id}'")
                return {
                    "success": True,
                    "folder": existing_folders["files"][0],
                    "message": "Folder already exists"
                }
                
            # Create folder metadata
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            
            # Create the folder
            folder = self.service.files().create(
                body=folder_metadata,
                fields='id, name, mimeType, createdTime, parents, webViewLink'
            ).execute()
            
            # Process folder to a more usable format
            processed_folder = {
                'id': folder.get('id'),
                'name': folder.get('name', 'Unnamed'),
                'mime_type': folder.get('mimeType', ''),
                'created_time': folder.get('createdTime', ''),
                'parents': folder.get('parents', []),
                'web_view_link': folder.get('webViewLink', ''),
                'is_folder': True
            }
            
            logger.info(f"Created folder: {folder_name} with ID: {processed_folder['id']}")
            return {
                "success": True,
                "folder": processed_folder
            }
            
        except HttpError as error:
            logger.error(f"HTTP error creating folder: {error}")
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
    def upload_file(self, file_path: str, parent_id: str = 'root', 
                    file_name: Optional[str] = None, mime_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file to Google Drive.
        
        Args:
            file_path: Path to the file to upload
            parent_id: ID of the parent folder (default: root folder)
            file_name: Name to give the file in Drive (default: original filename)
            mime_type: MIME type of the file (default: auto-detect)
            
        Returns:
            Dict with file details and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file": None
            }
            
        try:
            # Validate file path
            if not os.path.exists(file_path):
                error_msg = f"File not found: {file_path}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "file": None
                }
                
            # Use original filename if not specified
            if not file_name:
                file_name = os.path.basename(file_path)
                
            # Create file metadata
            file_metadata = {
                'name': file_name,
                'parents': [parent_id]
            }
            
            # Create media
            media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)
            
            # Upload the file
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink'
            ).execute()
            
            # Process file to a more usable format
            processed_file = {
                'id': file.get('id'),
                'name': file.get('name', 'Unnamed'),
                'mime_type': file.get('mimeType', ''),
                'size': file.get('size', '0'),
                'created_time': file.get('createdTime', ''),
                'modified_time': file.get('modifiedTime', ''),
                'parents': file.get('parents', []),
                'web_view_link': file.get('webViewLink', ''),
                'is_folder': False
            }
            
            logger.info(f"Uploaded file: {file_name} with ID: {processed_file['id']}")
            
            # Track the file addition in the provider_changes table
            ProviderChangeTracker.log_document_add(
                provider='gdrive',
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
            
        except HttpError as error:
            logger.error(f"HTTP error uploading file: {error}")
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
        Download a file from Google Drive.
        
        Args:
            file_id: ID of the file to download
            destination_path: Path where to save the downloaded file
            
        Returns:
            Dict with download status and file path
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file_path": None
            }
            
        try:
            # Get file metadata to check if it's a folder or Google Workspace document
            file_metadata = self.service.files().get(fileId=file_id, fields="name, mimeType").execute()
            file_name = file_metadata.get('name', 'untitled')
            mime_type = file_metadata.get('mimeType', '')
            
            # Check if it's a folder (can't download folders)
            if mime_type == 'application/vnd.google-apps.folder':
                error_msg = f"Cannot download a folder: {file_name}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "file_path": None
                }
                
            # Create destination directory if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(destination_path)), exist_ok=True)
            
            # Handle Google Workspace documents (export as appropriate format)
            if mime_type.startswith('application/vnd.google-apps'):
                if mime_type == 'application/vnd.google-apps.document':
                    # Export Google Docs as PDF
                    request = self.service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    destination_path = f"{os.path.splitext(destination_path)[0]}.pdf"
                elif mime_type == 'application/vnd.google-apps.spreadsheet':
                    # Export Google Sheets as Excel
                    request = self.service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                    destination_path = f"{os.path.splitext(destination_path)[0]}.xlsx"
                elif mime_type == 'application/vnd.google-apps.presentation':
                    # Export Google Slides as PowerPoint
                    request = self.service.files().export_media(fileId=file_id, mimeType='application/vnd.openxmlformats-officedocument.presentationml.presentation')
                    destination_path = f"{os.path.splitext(destination_path)[0]}.pptx"
                else:
                    # Default to PDF for other Google Workspace files
                    request = self.service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    destination_path = f"{os.path.splitext(destination_path)[0]}.pdf"
            else:
                # Regular file download
                request = self.service.files().get_media(fileId=file_id)
            
            # Download the file
            with open(destination_path, 'wb') as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                    logger.info(f"Download progress: {int(status.progress() * 100)}%")
            
            logger.info(f"Downloaded file: {file_name} to {destination_path}")
            return {
                "success": True,
                "file_path": destination_path,
                "file_name": file_name
            }
            
        except HttpError as error:
            logger.error(f"HTTP error downloading file: {error}")
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
        Delete a file or folder from Google Drive.
        
        Args:
            file_id: ID of the file or folder to delete
            permanently: If True, permanently delete the file instead of moving to trash
            
        Returns:
            Dict with deletion status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated"
            }
            
        try:
            # Get file metadata for logging
            try:
                file_metadata = self.service.files().get(fileId=file_id, fields="name").execute()
                file_name = file_metadata.get('name', 'Unknown file')
            except HttpError:
                file_name = "Unknown file"
                
            # Get more detailed metadata if possible for better tracking
            file_metadata_details = {}
            try:
                metadata_result = self.get_file_metadata(file_id)
                if metadata_result["success"]:
                    file_metadata_details = metadata_result["file"]
            except Exception as e:
                logger.warning(f"Could not retrieve detailed metadata for file {file_id} before deletion: {e}")
            
            if permanently:
                # Permanently delete the file
                self.service.files().delete(fileId=file_id).execute()
                logger.info(f"Permanently deleted file: {file_name} (ID: {file_id})")
            else:
                # Move file to trash
                self.service.files().update(fileId=file_id, body={'trashed': True}).execute()
                logger.info(f"Moved file to trash: {file_name} (ID: {file_id})")
            
            # Track the file deletion in the provider_changes table
            extra_details = {
                'permanently_deleted': permanently
            }
            
            # Add any additional metadata we have
            if file_metadata_details:
                extra_details.update({
                    'size': file_metadata_details.get('size', 0),
                    'mime_type': file_metadata_details.get('mime_type', ''),
                    'is_folder': file_metadata_details.get('is_folder', False),
                    'web_url': file_metadata_details.get('web_view_link', '')
                })
            
            ProviderChangeTracker.log_document_remove(
                provider='gdrive',
                user_id=self.user_id,
                doc_id=file_id,
                doc_name=file_name,
                extra_details=extra_details
            )
                
            return {
                "success": True,
                "message": f"{'Permanently deleted' if permanently else 'Moved to trash'}: {file_name}"
            }
            
        except HttpError as error:
            # Check if the error is because the file doesn't exist
            if error.resp.status == 404:
                logger.warning(f"File not found: {file_id}")
                return {
                    "success": False,
                    "error": f"File not found: {file_id}"
                }
            else:
                logger.error(f"HTTP error deleting file: {error}")
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
        Get detailed metadata for a file or folder.
        
        Args:
            file_id: ID of the file or folder
            
        Returns:
            Dict with file metadata and success status
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "file": None
            }
            
        try:
            # Get comprehensive file metadata
            fields = "id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, "
            fields += "shared, sharingUser, owners, lastModifyingUser, capabilities, permissions, "
            fields += "description, fullFileExtension, md5Checksum, contentHints, imageMediaMetadata, videoMediaMetadata"
            
            file = self.service.files().get(fileId=file_id, fields=fields).execute()
            
            # Process file to a more usable format
            processed_file = {
                'id': file.get('id'),
                'name': file.get('name', 'Unnamed'),
                'mime_type': file.get('mimeType', ''),
                'size': file.get('size', '0'),
                'created_time': file.get('createdTime', ''),
                'modified_time': file.get('modifiedTime', ''),
                'parents': file.get('parents', []),
                'web_view_link': file.get('webViewLink', ''),
                'shared': file.get('shared', False),
                'is_folder': file.get('mimeType') == 'application/vnd.google-apps.folder',
                'description': file.get('description', ''),
                'extension': file.get('fullFileExtension', ''),
                'md5_checksum': file.get('md5Checksum', ''),
                'owners': [{
                    'display_name': owner.get('displayName', ''),
                    'email_address': owner.get('emailAddress', ''),
                    'photo_link': owner.get('photoLink', '')
                } for owner in file.get('owners', [])],
                'permissions': [{
                    'id': perm.get('id'),
                    'type': perm.get('type'),
                    'role': perm.get('role'),
                    'email_address': perm.get('emailAddress', ''),
                    'display_name': perm.get('displayName', '')
                } for perm in file.get('permissions', [])],
                'capabilities': file.get('capabilities', {})
            }
            
            # Add media metadata if available
            if 'imageMediaMetadata' in file:
                processed_file['image_metadata'] = file.get('imageMediaMetadata', {})
                
            if 'videoMediaMetadata' in file:
                processed_file['video_metadata'] = file.get('videoMediaMetadata', {})
                
            logger.info(f"Retrieved metadata for file: {processed_file['name']} (ID: {file_id})")
            return {
                "success": True,
                "file": processed_file
            }
            
        except HttpError as error:
            # Check if the error is because the file doesn't exist
            if error.resp.status == 404:
                logger.warning(f"File not found: {file_id}")
                return {
                    "success": False,
                    "error": f"File not found: {file_id}",
                    "file": None
                }
            else:
                logger.error(f"HTTP error retrieving file metadata: {error}")
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
            logger.error("Not authenticated with Google Drive API")
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
            # First get the current folder's metadata
            if root_folder_id == 'root':
                folder_metadata = self.service.files().get(fileId='root', fields='id, name').execute()
            else:
                folder_metadata = self.service.files().get(fileId=root_folder_id, fields='id, name').execute()
                
            # Initialize the structure with this folder
            structure = {
                "id": folder_metadata.get('id'),
                "name": folder_metadata.get('name'),
                "type": "folder",
                "children": []
            }
            
            # List all files and folders in this folder
            query = f"'{root_folder_id}' in parents and trashed = false"
            results = self.service.files().list(
                q=query,
                fields="files(id, name, mimeType)",
                pageSize=1000
            ).execute()
            
            items = results.get('files', [])
            
            # Process each item
            for item in items:
                item_id = item.get('id')
                item_name = item.get('name')
                mime_type = item.get('mimeType')
                
                # Check if it's a folder
                if mime_type == 'application/vnd.google-apps.folder':
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
                        "mime_type": mime_type
                    })
            
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
            
        except HttpError as error:
            logger.error(f"HTTP error retrieving directory structure: {error}")
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
    def share_file(self, file_id: str, email: str, role: str = 'reader', send_notification: bool = False, message: str = '') -> Dict[str, Any]:
        """
        Share a file or folder with another user.
        
        Args:
            file_id: ID of the file or folder to share
            email: Email address of the user to share with
            role: Permission role to grant (reader, commenter, writer, fileOrganizer, organizer)
            send_notification: Whether to send notification email
            message: Custom message to include in notification
            
        Returns:
            Dict with sharing status and permission details
        """
        if not self.authenticated:
            logger.error("Not authenticated with Google Drive API")
            return {
                "success": False,
                "error": "Not authenticated",
                "permission": None
            }
            
        try:
            # Create permission body
            permission = {
                'type': 'user',
                'role': role,
                'emailAddress': email
            }
            
            # Set up email notification parameters
            fields = 'id, emailAddress, role'
            email_params = {}
            
            if send_notification:
                email_params['sendNotificationEmail'] = True
                if message:
                    email_params['emailMessage'] = message
            else:
                email_params['sendNotificationEmail'] = False
            
            # Create the permission
            result = self.service.permissions().create(
                fileId=file_id,
                body=permission,
                fields=fields,
                **email_params
            ).execute()
            
            # Process permission to a more usable format
            processed_permission = {
                'id': result.get('id'),
                'roles': [result.get('role')],
                'granted_to': result.get('emailAddress'),
                'link': ''
            }
            
            logger.info(f"Shared file/folder {file_id} with {email} as {role}")
            return {
                "success": True,
                "permission": processed_permission
            }
            
        except HttpError as error:
            logger.error(f"HTTP error sharing file: {error}")
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
    Test function to demonstrate the GoogleDrive adapter functionality.
    """
    import os
    import tempfile
    
    user_id = ""
    
    print(f"\nTesting GoogleDrive adapter with user ID: {user_id}\n")
    
    # Initialize the adapter
    drive = GoogleDrive(user_id)
    
    # Step 1: Authenticate
    print("Step 1: Authenticating with Google Drive API...")
    auth_result = drive.authenticate()
    if not auth_result:
        print("Authentication failed. Exiting.")
        return
    print("Authentication successful!\n")
    
    # Step 2: List files in root folder
    print("Step 2: Listing files in root folder...")
    files_result = drive.list_files(max_results=10)
    if not files_result["success"]:
        print(f"Error listing files: {files_result['error']}")
    else:
        print(f"Found {len(files_result['files'])} files/folders:")
        for file in files_result["files"][:5]:  # Show first 5 files
            print(f"  - {file['name']} ({'Folder' if file['is_folder'] else 'File'})")
        print("\n")
    
    # Step 3: Create a test folder
    test_folder_name = f"Test Folder {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    print(f"Step 3: Creating test folder '{test_folder_name}'...")
    folder_result = drive.create_folder(test_folder_name)
    if not folder_result["success"]:
        print(f"Error creating folder: {folder_result['error']}")
        return
    test_folder_id = folder_result["folder"]["id"]
    print(f"Created folder with ID: {test_folder_id}\n")
    
    # Step 4: Create a test file for upload
    print("Step 4: Creating and uploading a test file...")
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as temp_file:
        temp_file.write(b"This is a test file created by the GoogleDrive adapter.\n")
        temp_file.write(f"Created at: {datetime.datetime.now().isoformat()}\n".encode())
        temp_file_path = temp_file.name
    
    # Upload the test file
    upload_result = drive.upload_file(
        file_path=temp_file_path,
        parent_id=test_folder_id,
        file_name="test_file.txt"
    )
    if not upload_result["success"]:
        print(f"Error uploading file: {upload_result['error']}")
    else:
        test_file_id = upload_result["file"]["id"]
        print(f"Uploaded file with ID: {test_file_id}\n")
        
        # Step 5: Get file metadata
        print("Step 5: Getting file metadata...")
        metadata_result = drive.get_file_metadata(test_file_id)
        if not metadata_result["success"]:
            print(f"Error getting metadata: {metadata_result['error']}")
        else:
            print("File metadata:")
            # Print selected metadata fields
            file_meta = metadata_result["file"]
            print(f"  - Name: {file_meta['name']}")
            print(f"  - Size: {file_meta['size']} bytes")
            print(f"  - Created: {file_meta['created_time']}")
            print(f"  - Web Link: {file_meta['web_view_link']}")
            print("\n")
        
        # Step 6: Download the file
        print("Step 6: Downloading the file...")
        download_path = os.path.join(tempfile.gettempdir(), "downloaded_test_file.txt")
        download_result = drive.download_file(test_file_id, download_path)
        if not download_result["success"]:
            print(f"Error downloading file: {download_result['error']}")
        else:
            print(f"Downloaded file to: {download_result['file_path']}")
            with open(download_result['file_path'], 'r') as f:
                print("File contents:")
                print(f.read())
            print("\n")
        
        #Step 6 bis test get_directory_structure
        print("Step 6 bis: Getting directory structure...")
        structure_result = drive.get_directory_structure()
        if not structure_result["success"]:
            print(f"Error getting directory structure: {structure_result['error']}")
        else:
            print("Directory structure:")
            print(structure_result["structure"])
            print("\n")
        
        # Step 7: Delete the test file and folder
        print("Step 7: Cleaning up - deleting test file and folder...")
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
            
    # Clean up the temporary file
    try:
        os.unlink(temp_file_path)
    except:
        pass
    
    print("\nTest completed!")


if __name__ == "__main__":
    main()
