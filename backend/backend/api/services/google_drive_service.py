"""
Class for managing documents in Google Drive.
This service encapsulates all operations related to Google Drive storage,
providing a clean interface for file management operations.
"""

import os
import io
import logging
from typing import List, Dict, Optional, Tuple, Any, BinaryIO
from datetime import datetime

# Custom exceptions
class AuthenticationError(Exception):
    """Exception raised when authentication fails"""

# Google Drive API
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow

# Auth services
from auth.credentials_manager import (
    load_google_token, save_google_token, check_google_credentials
)

logger = logging.getLogger(__name__)

# Google API Configuration
GOOGLE_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:5173")
GOOGLE_TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "token.pickle")
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive"
]

class GoogleDriveService:
    """Service for managing documents in Google Drive."""
    
    def __init__(self):
        """Initialize the Google Drive service."""
        logger.info("GoogleDriveService initialized")
    
    def normalize_path(self, path: str) -> str:
        """
        Normalize a Google Drive path, ensuring it starts with '/' and
        doesn't end with '/' (except for root).
        
        Args:
            path: The path to normalize
            
        Returns:
            Normalized path
        """
        # Remove leading/trailing whitespace
        path = path.strip()
        
        # Ensure path starts with '/'
        if not path.startswith('/'):
            path = '/' + path
        
        # Remove trailing '/' unless it's the root
        if path != '/' and path.endswith('/'):
            path = path.rstrip('/')
            
        return path
    
    def get_folder_id_by_path(self, drive_service, path: str, root_folder_id: str = "root") -> Tuple[Optional[str], Optional[str]]:
        """
        Get the Google Drive folder ID for a given path.
        
        Args:
            drive_service: The Google Drive service
            path: The path to get ID for
            root_folder_id: ID of the root folder to start from
            
        Returns:
            Tuple of (folder_id, error) where folder_id is None if there was an error
        """
        # Normalize path
        path = self.normalize_path(path)
        
        # Root path
        if path == '/':
            return root_folder_id, None
        
        # Remove leading slash for path components
        path = path[1:] if path.startswith('/') else path
        
        # Split path into components
        path_components = path.split('/')
        current_folder_id = root_folder_id
        
        # Traverse path components
        for i, component in enumerate(path_components):
            # Skip empty components
            if not component:
                continue
                
            try:
                # Search for the folder in the current parent
                query = f"name = '{component}' and '{current_folder_id}' in parents and trashed = false"
                
                if i < len(path_components) - 1:
                    # If not the last component, it must be a folder
                    query += " and mimeType = 'application/vnd.google-apps.folder'"
                
                results = drive_service.files().list(
                    q=query,
                    spaces="drive",
                    fields="files(id, name, mimeType)"
                ).execute()
                
                items = results.get('files', [])
                
                if not items:
                    return None, f"Path component '{component}' not found"
                
                # Use the first match
                current_folder_id = items[0]['id']
                
            except Exception as e:
                logger.error(f"[GDRIVE] Error finding path component '{component}': {str(e)}")
                return None, f"Error finding path component: {str(e)}"
        
        return current_folder_id, None
    
    def get_drive_service(self, user_id: str) -> Tuple[Any, Optional[str]]:
        """
        Create a Google Drive API service for the specified user.
        
        Args:
            user_id: The user ID to create the service for
            
        Returns:
            Tuple of (service, error) where service is None if there was an error
        """
        try:
            # Load credentials from the token
            creds = load_google_token(user_id)
            
            if not creds or not creds.valid:
                logger.warn(f"[GOOGLE DRIVE] Invalid credentials for user {user_id}")
                return None, "Credentials not valid or missing"
                
            # Create the Drive service
            service = build('drive', 'v3', credentials=creds)
            return service, None
        
        except Exception as e:
            logger.error(f"[GOOGLE DRIVE] Error creating Drive service: {str(e)}")
            return None, str(e)
    
    def check_auth_status(self, user_id: str) -> Dict[str, Any]:
        """
        Check if the user is authenticated to Google Drive.
        
        Args:
            user_id: The user ID to check authentication for
            
        Returns:
            Dictionary with authentication status information
        """
        logger.debug(f"[GDRIVE AUTH STATUS] Checking credentials for user {user_id}")
        
        # Check Google credentials specifying we want the Drive credentials
        creds_status = check_google_credentials(user_id)
        
        # Get account information if authenticated
        account_info = {}
        if creds_status.get("authenticated", False) and creds_status.get("valid", False):
            try:
                drive_service, error = self.get_drive_service(user_id)
                if drive_service:
                    # Get user info from Drive API
                    about = drive_service.about().get(fields="user").execute()
                    account_info = {
                        "email": about.get("user", {}).get("emailAddress", "Unknown"),
                        "name": about.get("user", {}).get("displayName", "Unknown"),
                        "quota": about.get("storageQuota", {})
                    }
            except Exception as e:
                logger.error(f"[GDRIVE AUTH STATUS] Error getting account info: {str(e)}")
                creds_status["error"] = f"Error getting account info: {str(e)}"
        
        # Create the response with account_info
        return {
            "authenticated": creds_status.get("authenticated", False),
            "valid": creds_status.get("valid", False),
            "expired": creds_status.get("expired", None),
            "refreshable": creds_status.get("refreshable", None),
            "user_id": user_id,
            "error": creds_status.get("error", None),
            "account_info": account_info
        }
    
    def get_auth_url(self, user_id: str, callback_url: str = None) -> Dict[str, Any]:
        """
        Generate an authentication URL for Google Drive.
        
        Args:
            user_id: The user ID to generate the URL for
            callback_url: Optional callback URL override
            
        Returns:
            Dictionary with authentication URL and state
        """
        try:
            # Use the provided callback URL or fall back to the configured redirect URI
            redirect_uri = callback_url or GOOGLE_REDIRECT_URI
            logger.debug(f"[GDRIVE AUTH URL] Generating auth URL with redirect_uri: {redirect_uri}")
            
            if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
                logger.error("[GDRIVE AUTH URL] Missing Google client ID or client secret")
                return {
                    "error": "Google Drive API credentials not configured",
                    "auth_url": None
                }
            
            # Create the OAuth2 flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [redirect_uri]
                    }
                },
                scopes=GOOGLE_SCOPES,
                redirect_uri=redirect_uri,
            )
            
            # Generate the authorization URL
            auth_url, state = flow.authorization_url(
                access_type='offline',
                prompt='consent',
                include_granted_scopes='true',
                state=user_id
            )
            
            logger.debug(f"[GDRIVE AUTH URL] Generated auth URL with state: {state}")
            
            return {
                "auth_url": auth_url,
                "state": state
            }
            
        except Exception as e:
            logger.error(f"[GDRIVE AUTH URL] Error generating auth URL: {str(e)}")
            return {
                "error": f"Error generating authentication URL: {str(e)}",
                "auth_url": None
            }
    
    def oauth2_callback(self, code: str, state: str, error: str = None) -> Dict[str, Any]:
        """
        Process OAuth2 callback from Google.
        
        Args:
            code: Authorization code from Google
            state: State parameter that contains the user_id
            error: Error message if authorization failed
            
        Returns:
            Dictionary with authentication result
        """
        user_id = state
        
        if error:
            logger.error(f"[GDRIVE OAUTH CALLBACK] Authentication error: {error}")
            return {
                "success": False,
                "error": error,
                "user_id": user_id
            }
        
        if not code:
            logger.error("[GDRIVE OAUTH CALLBACK] No authorization code provided")
            return {
                "success": False,
                "error": "No authorization code provided",
                "user_id": user_id
            }
        
        try:
            # Create the OAuth2 flow
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [GOOGLE_REDIRECT_URI]
                    }
                },
                scopes=GOOGLE_SCOPES,
                redirect_uri=GOOGLE_REDIRECT_URI,
            )
            
            # Exchange the authorization code for credentials
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Save the credentials
            save_google_token(user_id, credentials)
            
            # Get account information
            drive_service = build('drive', 'v3', credentials=credentials)
            about = drive_service.about().get(fields="user").execute()
            
            return {
                "success": True,
                "message": "Authentication successful",
                "user_id": user_id,
                "email": about.get("user", {}).get("emailAddress", "Unknown"),
                "name": about.get("user", {}).get("displayName", "Unknown")
            }
            
        except Exception as e:
            logger.error(f"[GDRIVE OAUTH CALLBACK] Error processing callback: {str(e)}")
            return {
                "success": False,
                "error": f"Authentication error: {str(e)}",
                "user_id": user_id
            }
            
    def list_files(self, user_id: str, path: str = "/") -> Dict[str, Any]:
        """
        List files and folders in a Google Drive directory.
        
        Args:
            user_id: The user ID
            path: Path to list files from (default is root)
            
        Returns:
            Dictionary with path and items list
            
        Raises:
            ValueError: If authentication fails or path is invalid
        """
        try:
            # Normalize the path
            path = self.normalize_path(path)
            logger.debug(f"[GDRIVE LIST] Listing files at path '{path}' for user {user_id}")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Get folder ID for the path
            folder_id, error = self.get_folder_id_by_path(drive_service, path)
            if not folder_id:
                raise ValueError(f"Folder not found: {error}")
            
            # List files in the folder
            query = f"'{folder_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType, size, modifiedTime)"
            ).execute()
            
            items = results.get('files', [])
            file_list = []
            
            for item in items:
                is_dir = item['mimeType'] == 'application/vnd.google-apps.folder'
                
                # Create file item
                file_item = {
                    "id": item['id'],
                    "path": path + "/" + item['name'] if path != "/" else "/" + item['name'],
                    "name": item['name'],
                    "is_directory": is_dir,
                    "mime_type": item['mimeType']
                }
                
                # Add size and last modified for files
                if not is_dir and 'size' in item:
                    file_item["size"] = int(item['size'])
                    
                if 'modifiedTime' in item:
                    file_item["last_modified"] = item['modifiedTime']
                    
                # Determine content type for display
                if not is_dir:
                    mime_type = item['mimeType']
                    if mime_type.startswith('application/vnd.google-apps.'):
                        # Google Docs format
                        file_item["content_type"] = mime_type
                    else:
                        file_item["content_type"] = mime_type
                
                file_list.append(file_item)
            
            # Sort items: directories first, then files, all alphabetically
            file_list.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
            
            return {
                "path": path,
                "items": file_list
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE LIST] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE LIST] Error listing files: {str(e)}")
            raise ValueError(f"Error listing Google Drive files: {str(e)}")
    
    def download_file(self, user_id: str, path: str = None, file_id: str = None) -> Tuple[BinaryIO, str, int, str]:
        """
        Download a file from Google Drive.
        Either path or file_id must be specified.
        
        Args:
            user_id: The user ID
            path: Path to the file (optional if file_id is provided)
            file_id: Google Drive file ID (optional if path is provided)
            
        Returns:
            Tuple of (file_stream, filename, file_size, content_type)
            
        Raises:
            ValueError: If neither path nor file_id is provided, or if authentication fails
        """
        try:
            # Validate input parameters
            if not path and not file_id:
                raise ValueError("Either path or file_id must be provided")
                
            logger.debug(f"[GDRIVE DOWNLOAD] Downloading file path='{path}', file_id='{file_id}' for user {user_id}")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # If path is provided but not file_id, get the file ID from the path
            if path and not file_id:
                # Get parent folder ID and file name
                path = self.normalize_path(path)
                parent_path = '/'.join(path.split('/')[:-1]) or '/'
                file_name = path.split('/')[-1]
                
                # Get the parent folder ID
                parent_id, error = self.get_folder_id_by_path(drive_service, parent_path)
                if not parent_id:
                    raise ValueError(f"Parent folder not found: {error}")
                
                # Find the file by name in the parent folder
                query = f"name = '{file_name}' and '{parent_id}' in parents and trashed = false"
                results = drive_service.files().list(
                    q=query,
                    spaces="drive",
                    fields="files(id, name, mimeType, size)"
                ).execute()
                
                items = results.get('files', [])
                if not items:
                    raise ValueError(f"File '{file_name}' not found in '{parent_path}'")
                    
                file_id = items[0]['id']
                file_name = items[0]['name']
                mime_type = items[0]['mimeType']
                file_size = int(items[0].get('size', 0)) if 'size' in items[0] else 0
            else:
                # Get file metadata by ID
                try:
                    file_metadata = drive_service.files().get(
                        fileId=file_id,
                        fields="name,mimeType,size"
                    ).execute()
                    file_name = file_metadata.get('name', 'unknown')
                    mime_type = file_metadata.get('mimeType', 'application/octet-stream')
                    file_size = int(file_metadata.get('size', 0)) if 'size' in file_metadata else 0
                except HttpError as e:
                    raise ValueError(f"Error getting file metadata: {str(e)}")
            
            # Handle Google Workspace documents (need export)
            if mime_type.startswith('application/vnd.google-apps.'):
                # Map Google Docs types to export formats
                export_formats = {
                    'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # docx
                    'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # xlsx
                    'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',  # pptx
                    'application/vnd.google-apps.drawing': 'image/png',
                    'application/vnd.google-apps.script': 'application/vnd.google-apps.script+json'
                }
                
                # Use PDF as fallback format if specific mapping not found
                export_mime_type = export_formats.get(mime_type, 'application/pdf')
                
                # Update filename with appropriate extension
                extension_map = {
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                    'image/png': '.png',
                    'application/vnd.google-apps.script+json': '.json',
                    'application/pdf': '.pdf'
                }
                
                # Add extension if not already present
                extension = extension_map.get(export_mime_type, '')
                if extension and not file_name.lower().endswith(extension):
                    file_name = f"{file_name}{extension}"
                
                # Export the Google Workspace document
                request = drive_service.files().export_media(
                    fileId=file_id,
                    mimeType=export_mime_type
                )
                file_content = io.BytesIO()
                downloader = MediaIoBaseDownload(file_content, request)
                
                done = False
                while not done:
                    _, done = downloader.next_chunk()
                
                file_content.seek(0)
                # We don't know the exact size after export, get it from BytesIO
                file_size = file_content.getbuffer().nbytes
                content_type = export_mime_type
                
            else:
                # Regular file download
                request = drive_service.files().get_media(fileId=file_id)
                file_content = io.BytesIO()
                downloader = MediaIoBaseDownload(file_content, request)
                
                done = False
                while not done:
                    _, done = downloader.next_chunk()
                
                file_content.seek(0)
                content_type = mime_type
            
            return file_content, file_name, file_size, content_type
            
        except ValueError as ve:
            logger.error(f"[GDRIVE DOWNLOAD] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE DOWNLOAD] Error downloading file: {str(e)}")
            raise ValueError(f"Error downloading Google Drive file: {str(e)}")
    
    def create_folder(self, user_id: str, parent_path: str, folder_name: str) -> Dict[str, Any]:
        """
        Create a new folder in Google Drive.
        
        Args:
            user_id: The user ID
            parent_path: Path to the parent folder where the new folder will be created
            folder_name: Name of the new folder
            
        Returns:
            Dictionary with folder information
            
        Raises:
            ValueError: If authentication fails or path is invalid
        """
        try:
            # Normalize path
            parent_path = self.normalize_path(parent_path)
            logger.debug(f"[GDRIVE CREATE] Creating folder '{folder_name}' at '{parent_path}' for user {user_id}")
            
            # Validate folder name
            if not folder_name or folder_name.strip() == "":
                raise ValueError("Folder name cannot be empty")
                
            if '/' in folder_name:
                raise ValueError("Folder name cannot contain '/'")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Get parent folder ID
            parent_id, error = self.get_folder_id_by_path(drive_service, parent_path)
            if not parent_id:
                raise ValueError(f"Parent folder not found: {error}")
            
            # Check if a folder with this name already exists in the parent
            query = f"name = '{folder_name}' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)"
            ).execute()
            
            if results.get('files', []):
                raise ValueError(f"A folder named '{folder_name}' already exists at '{parent_path}'")
            
            # Create folder metadata
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            
            # Create the folder
            folder = drive_service.files().create(
                body=folder_metadata,
                fields='id, name'
            ).execute()
            
            # Build the complete path of the new folder
            new_folder_path = parent_path
            if new_folder_path != "/":
                new_folder_path += "/"
            new_folder_path += folder_name
            
            return {
                "success": True,
                "message": f"Folder '{folder_name}' created successfully",
                "folder_id": folder.get('id'),
                "folder_name": folder.get('name'),
                "path": new_folder_path
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE CREATE] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE CREATE] Error creating folder: {str(e)}")
            raise ValueError(f"Error creating Google Drive folder: {str(e)}")
    
    def upload_file(self, user_id: str, parent_path: str, file_content: BinaryIO, file_name: str, mime_type: str = None) -> Dict[str, Any]:
        """
        Upload a file to Google Drive.
        
        Args:
            user_id: The user ID
            parent_path: Path to the folder where the file will be uploaded
            file_content: File content as a binary stream
            file_name: Name of the file
            mime_type: MIME type of the file (optional)
            
        Returns:
            Dictionary with file information
            
        Raises:
            ValueError: If authentication fails or path is invalid
        """
        try:
            # Normalize path
            parent_path = self.normalize_path(parent_path)
            logger.debug(f"[GDRIVE UPLOAD] Uploading file '{file_name}' to '{parent_path}' for user {user_id}")
            
            # Validate filename
            if not file_name or file_name.strip() == "":
                raise ValueError("File name cannot be empty")
                
            if '/' in file_name:
                raise ValueError("File name cannot contain '/'")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Get parent folder ID
            parent_id, error = self.get_folder_id_by_path(drive_service, parent_path)
            if not parent_id:
                raise ValueError(f"Parent folder not found: {error}")
            
            # Check if a file with this name already exists in the parent
            query = f"name = '{file_name}' and '{parent_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)"
            ).execute()
            
            # If a file with the same name exists, append a suffix
            original_name = file_name
            if results.get('files', []):
                # Split name into base and extension
                if '.' in file_name:
                    base_name, extension = file_name.rsplit('.', 1)
                    file_name = f"{base_name}_copy.{extension}"
                else:
                    file_name = f"{file_name}_copy"
                
                logger.warning(f"[GDRIVE UPLOAD] File '{original_name}' already exists, using '{file_name}' instead")
            
            # Determine MIME type if not provided
            if not mime_type:
                mime_type = self._get_mime_type(file_name)
            
            # Create file metadata
            file_metadata = {
                'name': file_name,
                'parents': [parent_id]
            }
            
            # Upload the file
            media = MediaIoBaseUpload(
                file_content,
                mimetype=mime_type,
                resumable=True
            )
            
            uploaded_file = drive_service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, size, mimeType, modifiedTime'
            ).execute()
            
            # Build the complete path of the new file
            new_file_path = parent_path
            if new_file_path != "/":
                new_file_path += "/"
            new_file_path += file_name
            
            return {
                "success": True,
                "message": f"File '{original_name}' uploaded successfully" + (f" as '{file_name}'" if original_name != file_name else ""),
                "file_id": uploaded_file.get('id'),
                "file_name": uploaded_file.get('name'),
                "size": uploaded_file.get('size'),
                "mime_type": uploaded_file.get('mimeType'),
                "modified_time": uploaded_file.get('modifiedTime'),
                "path": new_file_path
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE UPLOAD] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE UPLOAD] Error uploading file: {str(e)}")
            raise ValueError(f"Error uploading file to Google Drive: {str(e)}")
    
    def _get_mime_type(self, file_name: str) -> str:
        """
        Determine MIME type based on file extension.
        
        Args:
            file_name: Name of the file
            
        Returns:
            MIME type string
        """
        extension = file_name.lower().split('.')[-1] if '.' in file_name else ''
        mime_types = {
            'txt': 'text/plain',
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'mp3': 'audio/mpeg',
            'mp4': 'video/mp4',
            'zip': 'application/zip',
            'json': 'application/json',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'md': 'text/markdown',
            'csv': 'text/csv'
        }
        return mime_types.get(extension, 'application/octet-stream')
    
    def delete_item(self, user_id: str, path: str) -> Dict[str, Any]:
        """
        Delete a file or folder in Google Drive.
        For folders, the deletion is recursive.
        
        Args:
            user_id: The user ID
            path: Path to the item to delete
            
        Returns:
            Dictionary with deletion result
            
        Raises:
            ValueError: If authentication fails or path is invalid
        """
        try:
            # Normalize path
            path = self.normalize_path(path)
            logger.debug(f"[GDRIVE DELETE] Deleting item at '{path}' for user {user_id}")
            
            # Prevent accidental deletion of root
            if path == "/":
                raise ValueError("Cannot delete the root folder")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Split path into parent path and item name
            parent_path = '/'.join(path.split('/')[:-1]) or '/'
            item_name = path.split('/')[-1]
            
            # Get parent folder ID
            parent_id, error = self.get_folder_id_by_path(drive_service, parent_path)
            if not parent_id:
                raise ValueError(f"Parent folder not found: {error}")
            
            # Find the item by name in the parent folder
            query = f"name = '{item_name}' and '{parent_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType)"
            ).execute()
            
            items = results.get('files', [])
            if not items:
                raise ValueError(f"Item '{item_name}' not found in '{parent_path}'")
                
            item_id = items[0]['id']
            is_directory = items[0]['mimeType'] == 'application/vnd.google-apps.folder'
            
            # Delete the item (for folders this automatically deletes all contents)
            drive_service.files().delete(fileId=item_id).execute()
            
            return {
                "success": True,
                "message": f"{'Folder' if is_directory else 'File'} '{item_name}' deleted successfully",
                "path": path,
                "is_directory": is_directory
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE DELETE] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE DELETE] Error deleting item: {str(e)}")
            raise ValueError(f"Error deleting Google Drive item: {str(e)}")
    
    def move_item(self, user_id: str, source_path: str, destination_path: str) -> Dict[str, Any]:
        """
        Move a file or folder to another location in Google Drive.
        
        Args:
            user_id: The user ID
            source_path: Path to the item to move
            destination_path: Path to the destination folder
            
        Returns:
            Dictionary with move result
            
        Raises:
            ValueError: If authentication fails or paths are invalid
        """
        try:
            # Normalize paths
            source_path = self.normalize_path(source_path)
            destination_path = self.normalize_path(destination_path)
            logger.debug(f"[GDRIVE MOVE] Moving item from '{source_path}' to '{destination_path}' for user {user_id}")
            
            # Prevent accidental moving of root
            if source_path == "/":
                raise ValueError("Cannot move the root folder")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Split source path into parent path and item name
            source_parent_path = '/'.join(source_path.split('/')[:-1]) or '/'
            source_item_name = source_path.split('/')[-1]
            
            # Get source parent folder ID
            source_parent_id, error = self.get_folder_id_by_path(drive_service, source_parent_path)
            if not source_parent_id:
                raise ValueError(f"Source parent folder not found: {error}")
            
            # Find the source item by name in the source parent folder
            query = f"name = '{source_item_name}' and '{source_parent_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType)"
            ).execute()
            
            items = results.get('files', [])
            if not items:
                raise ValueError(f"Item '{source_item_name}' not found in '{source_parent_path}'")
                
            source_item_id = items[0]['id']
            is_directory = items[0]['mimeType'] == 'application/vnd.google-apps.folder'
            
            # Get destination folder ID
            destination_folder_id, error = self.get_folder_id_by_path(drive_service, destination_path)
            if not destination_folder_id:
                raise ValueError(f"Destination folder not found: {error}")
            
            # Check if an item with the same name already exists in the destination
            query = f"name = '{source_item_name}' and '{destination_folder_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)"
            ).execute()
            
            if results.get('files', []):
                raise ValueError(f"An item named '{source_item_name}' already exists in the destination folder")
            
            # Move the item by updating its parent
            drive_service.files().update(
                fileId=source_item_id,
                addParents=destination_folder_id,
                removeParents=source_parent_id,
                fields='id, parents'
            ).execute()
            
            # Build the new path
            new_path = destination_path
            if new_path != "/":
                new_path += "/"
            new_path += source_item_name
            
            return {
                "success": True,
                "message": f"{'Folder' if is_directory else 'File'} '{source_item_name}' moved successfully",
                "source_path": source_path,
                "destination_path": new_path,
                "is_directory": is_directory
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE MOVE] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE MOVE] Error moving item: {str(e)}")
            raise ValueError(f"Error moving Google Drive item: {str(e)}")
    
    def copy_item(self, user_id: str, source_path: str, destination_path: str) -> Dict[str, Any]:
        """
        Copy a file or folder to another location in Google Drive.
        For folders, the copy is recursive.
        
        Args:
            user_id: The user ID
            source_path: Path to the item to copy
            destination_path: Path to the destination folder
            
        Returns:
            Dictionary with copy result
            
        Raises:
            ValueError: If authentication fails or paths are invalid
        """
        try:
            # Normalize paths
            source_path = self.normalize_path(source_path)
            destination_path = self.normalize_path(destination_path)
            logger.debug(f"[GDRIVE COPY] Copying item from '{source_path}' to '{destination_path}' for user {user_id}")
            
            # Prevent accidental copying of root
            if source_path == "/":
                raise ValueError("Cannot copy the root folder")
            
            # Get Drive service
            drive_service, error = self.get_drive_service(user_id)
            if not drive_service:
                raise ValueError(f"Google Drive authentication error: {error}")
            
            # Split source path into parent path and item name
            source_parent_path = '/'.join(source_path.split('/')[:-1]) or '/'
            source_item_name = source_path.split('/')[-1]
            
            # Get source parent folder ID
            source_parent_id, error = self.get_folder_id_by_path(drive_service, source_parent_path)
            if not source_parent_id:
                raise ValueError(f"Source parent folder not found: {error}")
            
            # Find the source item by name in the source parent folder
            query = f"name = '{source_item_name}' and '{source_parent_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType)"
            ).execute()
            
            items = results.get('files', [])
            if not items:
                raise ValueError(f"Item '{source_item_name}' not found in '{source_parent_path}'")
                
            source_item_id = items[0]['id']
            source_item_mime = items[0]['mimeType']
            is_directory = source_item_mime == 'application/vnd.google-apps.folder'
            
            # Get destination folder ID
            destination_folder_id, error = self.get_folder_id_by_path(drive_service, destination_path)
            if not destination_folder_id:
                raise ValueError(f"Destination folder not found: {error}")
            
            # Check if an item with the same name already exists in the destination and generate a new name if needed
            query = f"name = '{source_item_name}' and '{destination_folder_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)"
            ).execute()
            
            copy_item_name = source_item_name
            if results.get('files', []):
                # Item with the same name exists, append '_copy' to the name
                if '.' in source_item_name and not is_directory:
                    base_name, extension = source_item_name.rsplit('.', 1)
                    copy_item_name = f"{base_name}_copy.{extension}"
                else:
                    copy_item_name = f"{source_item_name}_copy"
            
            # Different handling for files and folders
            if is_directory:
                # Create a new folder in the destination
                new_folder_metadata = {
                    'name': copy_item_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [destination_folder_id]
                }
                new_folder = drive_service.files().create(
                    body=new_folder_metadata,
                    fields='id'
                ).execute()
                new_folder_id = new_folder.get('id')
                
                # Recursively copy contents
                self._copy_folder_contents(drive_service, source_item_id, new_folder_id)
                
                item_id = new_folder_id
            else:
                # Copy the file directly
                copied_file = drive_service.files().copy(
                    fileId=source_item_id,
                    body={
                        'name': copy_item_name,
                        'parents': [destination_folder_id]
                    }
                ).execute()
                item_id = copied_file.get('id')
            
            # Build the new path
            new_path = destination_path
            if new_path != "/":
                new_path += "/"
            new_path += copy_item_name
            
            return {
                "success": True,
                "message": f"{'Folder' if is_directory else 'File'} '{source_item_name}' copied successfully" + 
                           (f" as '{copy_item_name}'" if source_item_name != copy_item_name else ""),
                "source_path": source_path,
                "destination_path": new_path,
                "new_item_id": item_id,
                "is_directory": is_directory
            }
            
        except ValueError as ve:
            logger.error(f"[GDRIVE COPY] Value error: {str(ve)}")
            raise
        except Exception as e:
            logger.error(f"[GDRIVE COPY] Error copying item: {str(e)}")
            raise ValueError(f"Error copying Google Drive item: {str(e)}")
    
    def _copy_folder_contents(self, drive_service, source_folder_id: str, destination_folder_id: str) -> None:
        """
        Recursively copy contents of a folder to another folder.
        
        Args:
            drive_service: The Google Drive service
            source_folder_id: ID of the source folder
            destination_folder_id: ID of the destination folder
        """
        # List all items in the source folder
        query = f"'{source_folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name, mimeType)"
        ).execute()
        
        for item in results.get('files', []):
            item_id = item['id']
            item_name = item['name']
            item_mime = item['mimeType']
            
            if item_mime == 'application/vnd.google-apps.folder':
                # Create a subfolder in the destination
                new_folder_metadata = {
                    'name': item_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [destination_folder_id]
                }
                new_folder = drive_service.files().create(
                    body=new_folder_metadata,
                    fields='id'
                ).execute()
                
                # Recursively copy contents of the subfolder
                self._copy_folder_contents(drive_service, item_id, new_folder.get('id'))
            else:
                # Copy the file
                drive_service.files().copy(
                    fileId=item_id,
                    body={
                        'name': item_name,
                        'parents': [destination_folder_id]
                    }
                ).execute()
    
    def _get_mime_type(self, file_path):
        """
        Helper method to determine MIME type from file extension.
        
        Args:
            file_path: Path to the file
            
        Returns:
            MIME type for the file
        """
        extension = os.path.splitext(file_path)[1].lower()
        mime_types = {
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.csv': 'text/csv',
            '.xml': 'text/xml',
            '.json': 'application/json',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.zip': 'application/zip',
            '.md': 'text/markdown',
            '.py': 'text/x-python',
            '.js': 'text/javascript',
            '.css': 'text/css',
        }
        return mime_types.get(extension, 'application/octet-stream')
    
    def _upload_folder_contents(self, drive_service, user_id, local_folder_path, gdrive_parent_folder_id, stats):
        """
        Helper method to recursively upload folder contents to Google Drive.
        
        Args:
            drive_service: Authenticated Google Drive service instance
            user_id: The user ID
            local_folder_path: Path to the local folder to upload
            gdrive_parent_folder_id: ID of the parent folder in Google Drive
            stats: Dictionary to track upload statistics
            
        Returns:
            Updated stats dictionary
        """
        # List all items (files and folders) in the local folder
        try:
            items = os.listdir(local_folder_path)
        except Exception as e:
            error_msg = f"Error listing contents of folder '{local_folder_path}': {str(e)}"
            logger.error(error_msg)
            stats['errors'].append(error_msg)
            return stats
            
        # Handle empty folder case
        if len(items) == 0:
            logger.info(f"Folder '{local_folder_path}' is empty, but structure has been created")
            stats['empty_folders'] = stats.get('empty_folders', 0) + 1
            return stats
        
        # Initialize skip_hidden if not present
        if 'skip_hidden' not in stats:
            stats['skip_hidden'] = True  # Default to skipping hidden files
            
        # Process each item in the folder
        for item_name in items:
            local_item_path = os.path.join(local_folder_path, item_name)
            
            # Skip hidden files/folders if configured to
            if item_name.startswith('.') and stats.get('skip_hidden', True):
                logger.info(f"Skipping hidden item: {item_name}")
                stats['skipped_hidden'] = stats.get('skipped_hidden', 0) + 1
                continue
                
            if os.path.isdir(local_item_path):
                # For directories, create them in Google Drive
                try:
                    # Check if folder with same name exists
                    query = f"name = '{item_name}' and '{gdrive_parent_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
                    results = drive_service.files().list(
                        q=query,
                        spaces='drive',
                        fields='files(id, name, createdTime)'
                    ).execute()
                    
                    existing_folders = results.get('files', [])
                    
                    if existing_folders:
                        # Use existing folder
                        folder_id = existing_folders[0]['id']
                        created_time = existing_folders[0].get('createdTime', 'unknown')
                        logger.info(f"Using existing folder '{item_name}' with ID: {folder_id} (created: {created_time})")
                    else:
                        # Create new folder
                        folder_metadata = {
                            'name': item_name,
                            'mimeType': 'application/vnd.google-apps.folder',
                            'parents': [gdrive_parent_folder_id],
                            'description': f"Uploaded by LocalAI for user {user_id} on {datetime.now().isoformat()}"
                        }
                        folder = drive_service.files().create(
                            body=folder_metadata,
                            fields='id,createdTime'
                        ).execute()
                        folder_id = folder.get('id')
                        created_time = folder.get('createdTime', 'unknown')
                        logger.info(f"Created folder '{item_name}' with ID: {folder_id} (created: {created_time})")
                        stats['folders_created'] += 1
                    
                    # Recursively upload contents of the subfolder
                    self._upload_folder_contents(drive_service, user_id, local_item_path, folder_id, stats)
                    
                except Exception as e:
                    error_msg = f"Error creating folder '{item_name}': {str(e)}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
            else:
                # For files, upload them directly
                try:
                    # Check if file with same name exists
                    query = f"name = '{item_name}' and '{gdrive_parent_folder_id}' in parents and trashed = false"
                    results = drive_service.files().list(
                        q=query,
                        spaces='drive',
                        fields='files(id, name)'
                    ).execute()
                    
                    existing_files = results.get('files', [])
                    upload_filename = item_name
                    
                    if existing_files:
                        # Append a suffix to avoid name collision
                        name, ext = os.path.splitext(item_name)
                        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                        upload_filename = f"{name}_{timestamp}{ext}"
                        logger.info(f"File '{item_name}' already exists, uploading as '{upload_filename}'")
                    
                    # Upload file
                    mime_type = self._get_mime_type(local_item_path)
                    
                    with open(local_item_path, 'rb') as f:
                        file_metadata = {
                            'name': upload_filename,
                            'parents': [gdrive_parent_folder_id]
                        }
                        
                        # Get file size and update total size stats
                        file_size = os.path.getsize(local_item_path)
                        stats['total_size_bytes'] += file_size
                        
                        # Convert to MB for logging
                        size_mb = file_size / (1024 * 1024)
                        
                        # For large files, use resumable upload
                        if file_size > 5 * 1024 * 1024:  # 5MB threshold for resumable upload
                            logger.info(f"Starting resumable upload for '{item_name}' ({size_mb:.2f} MB)")
                            media = MediaIoBaseUpload(
                                io.BytesIO(f.read()),
                                mimetype=mime_type,
                                resumable=True,
                                chunksize=1024*1024  # 1MB chunks
                            )
                            
                            request = drive_service.files().create(
                                body=file_metadata,
                                media_body=media,
                                fields='id,name,size'
                            )
                            
                            response = None
                            last_progress = 0
                            while response is None:
                                status, response = request.next_chunk()
                                if status:
                                    progress = int(status.progress() * 100)
                                    if progress >= last_progress + 20 or progress == 100:  # Log every 20% or completion
                                        logger.info(f"Uploaded {progress}% of {item_name}")
                                        last_progress = progress
                                    
                            file_id = response.get('id')
                            file_size_uploaded = response.get('size', file_size)
                        else:
                            logger.info(f"Uploading '{item_name}' ({size_mb:.2f} MB)")
                            media = MediaIoBaseUpload(
                                io.BytesIO(f.read()),
                                mimetype=mime_type,
                                resumable=False
                            )
                            
                            file = drive_service.files().create(
                                body=file_metadata,
                                media_body=media,
                                fields='id,name,size'
                            ).execute()
                            
                            file_id = file.get('id')
                            file_size_uploaded = file.get('size', file_size)
                        
                        logger.info(f"Uploaded file '{upload_filename}' ({size_mb:.2f} MB) with ID: {file_id}")
                        stats['files_uploaded'] += 1
                        
                except Exception as e:
                    error_msg = f"Error uploading file '{item_name}': {str(e)}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
        
        return stats
    
    def upload_folder(self, user_id, drive_path, local_folder_path):
        """
        Upload a local folder and its contents to Google Drive.
        
        Args:
            user_id: The user ID
            drive_path: Path in Google Drive where to upload the folder
            local_folder_path: Path to the local folder to upload
            
        Returns:
            Dictionary with upload details and statistics
            
        Raises:
            ValueError: If the path is invalid or the folder doesn't exist
            FileNotFoundError: If the local folder doesn't exist
            AuthenticationError: If not authenticated with Google Drive
        """
        if not os.path.exists(local_folder_path):
            raise FileNotFoundError(f"Local folder '{local_folder_path}' does not exist")
            
        if not os.path.isdir(local_folder_path):
            raise ValueError(f"'{local_folder_path}' is not a directory")
            
        # Ensure authentication
        auth_status = self.check_auth_status(user_id)
        if not auth_status.get('authenticated', False):
            raise ValueError("User not authenticated with Google Drive")
            
        # Get Google Drive service
        drive_service, error = self.get_drive_service(user_id)
        if error is not None:
            raise ValueError(f"Error getting Google Drive service: {error}")
        
        # Normalize and validate path
        path = self.normalize_path(drive_path)
        
        try:
            # Get the destination folder ID where the folder will be uploaded
            folder_id, error = self.get_folder_id_by_path(drive_service, path)
            if error is not None or not folder_id:
                raise ValueError(f"Destination path '{path}' not found: {error if error else 'No folder ID returned'}")
                
            logger.info(f"Found destination folder ID: {folder_id} for path: {path}")
                
            # Get local folder name (basename) for creating in Google Drive
            folder_name = os.path.basename(os.path.normpath(local_folder_path))
            if not folder_name:
                folder_name = "Uploaded_Folder"
                
            # Check if a folder with the same name already exists
            query = f"name = '{folder_name}' and '{folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces='drive',
                fields='files(id, name)'
            ).execute()
            
            existing_folders = results.get('files', [])
            upload_folder_name = folder_name
            
            if existing_folders:
                # Append timestamp to folder name to avoid collision
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                upload_folder_name = f"{folder_name}_{timestamp}"
                logger.info(f"Folder '{folder_name}' already exists, creating as '{upload_folder_name}'")
                
            # Create the main folder in Google Drive
            folder_metadata = {
                'name': upload_folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [folder_id]
            }
            
            created_folder = drive_service.files().create(
                body=folder_metadata,
                fields='id,name'
            ).execute()
            
            main_folder_id = created_folder.get('id')
            logger.info(f"Created main folder '{upload_folder_name}' with ID: {main_folder_id}")
            
            # Initialize statistics for upload tracking
            stats = {
                'files_uploaded': 0,
                'folders_created': 1,  # Count the main folder we just created
                'empty_folders': 0,
                'skipped_hidden': 0,
                'total_size_bytes': 0,
                'errors': [],
                'skip_hidden': True  # Default setting
            }
            
            # Upload the contents of the folder
            stats = self._upload_folder_contents(drive_service, user_id, local_folder_path, main_folder_id, stats)
            
            # Build response with complete path
            complete_path = path
            if not complete_path.endswith('/'):
                complete_path += '/'
            complete_path += upload_folder_name
            
            return {
                "path": complete_path,
                "folder_id": main_folder_id,
                "folder_name": upload_folder_name,
                "uploaded_items": stats,
                "status": "success",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error uploading folder: {str(e)}")
            raise e
