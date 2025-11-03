"""
Class for managing documents in Personal Drive (local storage).
This service encapsulates all operations related to the personal drive storage,
providing a clean interface for file management operations.
"""

import os
import io
import shutil
import logging
import tempfile
from datetime import datetime
from typing import List, Dict, Optional, Tuple, BinaryIO, Generator, Any

logger = logging.getLogger(__name__)

class PersonalDriveService:
    """Service for managing documents in the Personal Drive (local storage)"""
    
    def __init__(self, storage_path: str = None):
        """
        Initialize the personal drive service.
        
        Args:
            storage_path: Base path for storing files. If None, uses the default from environment.
        """
        self.storage_path = storage_path or os.path.abspath(os.environ.get("STORAGE_PATH", "data/storage/user_id"))
        logger.info(f"PersonalDriveService initialized with storage_path: {self.storage_path}")
    
    def get_user_dir(self, user_id: str) -> str:
        """
        Get the user's root directory path.
        
        Args:
            user_id: The user ID to get directory for
            
        Returns:
            The absolute path to the user's directory
        """
        user_dir = self.storage_path.replace("user_id", user_id)
        os.makedirs(user_dir, exist_ok=True)
        return user_dir
    
    def normalize_path(self, path: str) -> str:
        """
        Ensure path format is consistent (no leading slashes).
        
        Args:
            path: The path to normalize
            
        Returns:
            Normalized path
        """
        path = path.strip()
        # Remove leading slash if present
        if path.startswith('/'):
            path = path[1:]
        return path
    
    def full_path(self, user_id: str, path: str) -> str:
        """
        Get the full filesystem path for a user's file.
        
        Args:
            user_id: The user ID
            path: Relative path within the user directory
            
        Returns:
            The full absolute path
        """
        user_base = self.get_user_dir(user_id)
        # If the path begins with a slash, ignore it for os.path.join
        relative_path = path[1:] if path.startswith('/') else path
        result = os.path.join(user_base, relative_path)
        return result
    
    def path_to_relative(self, user_id: str, absolute_path: str) -> str:
        """
        Convert an absolute path to a relative path for API responses.
        
        Args:
            user_id: The user ID
            absolute_path: The absolute file path
            
        Returns:
            The relative path from the user's directory
        """
        user_dir = self.get_user_dir(user_id)
        if absolute_path.startswith(user_dir):
            rel_path = absolute_path[len(user_dir):].lstrip(os.sep)
            return rel_path
        return absolute_path
    
    def is_within_user_dir(self, user_id: str, full_path: str) -> bool:
        """
        Ensure path is within user's permitted area.
        
        Args:
            user_id: The user ID
            full_path: The full path to check
            
        Returns:
            True if the path is within the user's directory, False otherwise
        """
        user_dir = self.get_user_dir(user_id)
        return os.path.commonpath([user_dir]) == os.path.commonpath([user_dir, full_path])
    
    def get_content_type(self, file_path: str) -> str:
        """
        Determine content type from file extension.
        
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
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.zip': 'application/zip',
            '.json': 'application/json',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.md': 'text/markdown',
            '.csv': 'text/csv',
        }
        return mime_types.get(extension, 'application/octet-stream')
    
    def list_files(self, user_id: str, path: str) -> Dict[str, Any]:
        """
        List files and directories in the specified path.
        
        Args:
            user_id: The user ID
            path: Path to list contents of
            
        Returns:
            Dictionary with path and items list
        
        Raises:
            FileNotFoundError: If the path doesn't exist
            ValueError: If the path is not within the user's directory
        """
        path = self.normalize_path(path)
        target_path = self.full_path(user_id, path)
        
        if not self.is_within_user_dir(user_id, target_path):
            raise ValueError(f"Path {path} is outside the user directory")
        
        # Add a leading slash for API consistency
        api_path = '/' + path if path else '/'
        
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Path {path} does not exist")
        
        if not os.path.isdir(target_path):
            raise ValueError(f"Path {path} is not a directory")
        
        items = []
        for item_name in os.listdir(target_path):
            item_path = os.path.join(target_path, item_name)
            is_dir = os.path.isdir(item_path)
            
            # Skip hidden files
            if item_name.startswith('.'):
                continue
            
            file_item = {
                "path": os.path.join(api_path, item_name),
                "name": item_name,
                "is_directory": is_dir
            }
            
            if not is_dir:
                try:
                    file_stat = os.stat(item_path)
                    file_item["size"] = file_stat.st_size
                    file_item["last_modified"] = datetime.fromtimestamp(file_stat.st_mtime)
                    file_item["content_type"] = self.get_content_type(item_name)
                except Exception as e:
                    logger.error(f"Error getting file stats for {item_path}: {str(e)}")
            
            items.append(file_item)
        
        # Sort items: directories first, then files, all alphabetically
        items.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
        
        return {
            "path": api_path,
            "items": items
        }
    
    def get_file_contents(self, user_id: str, path: str) -> Tuple[BinaryIO, str, int]:
        """
        Get the contents of a file.
        
        Args:
            user_id: The user ID
            path: Path to the file
            
        Returns:
            Tuple of (file_handle, content_type, file_size)
            
        Raises:
            FileNotFoundError: If the file doesn't exist
            ValueError: If the path is not within the user's directory or is a directory
        """
        path = self.normalize_path(path)
        target_path = self.full_path(user_id, path)
        
        if not self.is_within_user_dir(user_id, target_path):
            raise ValueError(f"Path {path} is outside the user directory")
        
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"File {path} does not exist")
        
        if os.path.isdir(target_path):
            raise ValueError(f"Path {path} is a directory, not a file")
        
        file_name = os.path.basename(target_path)
        file_size = os.path.getsize(target_path)
        content_type = self.get_content_type(file_name)
        
        file_handle = open(target_path, "rb")
        return file_handle, content_type, file_size
    
    def file_iterator(self, file_handle: BinaryIO, chunk_size: int = 8192) -> Generator[bytes, None, None]:
        """
        Create an iterator for streaming file contents.
        
        Args:
            file_handle: Open file handle
            chunk_size: Size of chunks to yield
            
        Yields:
            File content chunks
        """
        try:
            while True:
                data = file_handle.read(chunk_size)
                if not data:
                    break
                yield data
        finally:
            file_handle.close()
    
    def create_directory(self, user_id: str, path: str) -> Dict[str, Any]:
        """
        Create a directory in the filesystem.
        
        Args:
            user_id: The user ID
            path: Path to create directory at
            
        Returns:
            Dictionary with success message and path
            
        Raises:
            ValueError: If the path is not within the user's directory
            FileExistsError: If the directory already exists
        """
        path = self.normalize_path(path)
        target_path = self.full_path(user_id, path)
        
        if not self.is_within_user_dir(user_id, target_path):
            raise ValueError(f"Path {path} is outside the user directory")
        
        # Check if the directory already exists
        if os.path.exists(target_path):
            if os.path.isdir(target_path):
                raise FileExistsError(f"Directory {path} already exists")
            else:
                raise FileExistsError(f"A file with name {path} already exists")
        
        # Create the directory
        os.makedirs(target_path, exist_ok=True)
        
        # Add a leading slash for API consistency
        api_path = '/' + path if path else '/'
        
        return {
            "message": f"Directory {path} created successfully",
            "path": api_path
        }
    
    def upload_file(self, user_id: str, file_path: str, file_content: BinaryIO, file_name: str) -> Dict[str, Any]:
        """
        Upload a file to the filesystem.
        
        Args:
            user_id: The user ID
            file_path: Path to upload file to (directory)
            file_content: File content as bytes or file-like object
            file_name: Name of the file
            
        Returns:
            Dictionary with success message and file details
            
        Raises:
            ValueError: If the path is not within the user's directory
            FileNotFoundError: If the directory doesn't exist
        """
        path = self.normalize_path(file_path)
        target_dir = self.full_path(user_id, path)
        
        if not self.is_within_user_dir(user_id, target_dir):
            raise ValueError(f"Path {path} is outside the user directory")
        
        # Check if the directory exists
        if not os.path.exists(target_dir):
            raise FileNotFoundError(f"Directory {path} does not exist")
        
        if not os.path.isdir(target_dir):
            raise ValueError(f"Path {path} is not a directory")
        
        # Create the full file path
        full_file_path = os.path.join(target_dir, file_name)
        
        # Write the file
        with open(full_file_path, "wb") as f:
            shutil.copyfileobj(file_content, f)
        
        file_size = os.path.getsize(full_file_path)
        
        # Add a leading slash for API consistency
        api_path = '/' + path if path else '/'
        api_file_path = os.path.join(api_path, file_name).replace('\\', '/')
        
        return {
            "message": f"File {file_name} uploaded successfully",
            "path": api_file_path,
            "name": file_name,
            "size": file_size,
            "content_type": self.get_content_type(file_name)
        }
    
    def delete_item(self, user_id: str, path: str, recursive: bool = False) -> Dict[str, Any]:
        """
        Delete a file or directory.
        
        Args:
            user_id: The user ID
            path: Path to the item to delete
            recursive: Whether to recursively delete directories
            
        Returns:
            Dictionary with success message and path
            
        Raises:
            ValueError: If the path is not within the user's directory
            FileNotFoundError: If the item doesn't exist
            IsADirectoryError: If the item is a non-empty directory and recursive is False
        """
        path = self.normalize_path(path)
        target_path = self.full_path(user_id, path)
        
        if not self.is_within_user_dir(user_id, target_path):
            raise ValueError(f"Path {path} is outside the user directory")
        
        if not os.path.exists(target_path):
            raise FileNotFoundError(f"Path {path} does not exist")
        
        is_dir = os.path.isdir(target_path)
        
        # Handle directory deletion
        if is_dir:
            if not recursive and os.listdir(target_path):
                raise IsADirectoryError(f"Directory {path} is not empty. Use recursive=True to delete")
            
            shutil.rmtree(target_path)
            item_type = "Directory"
        else:
            # Handle file deletion
            os.remove(target_path)
            item_type = "File"
        
        # Add a leading slash for API consistency
        api_path = '/' + path if path else '/'
        
        return {
            "message": f"{item_type} {path} deleted successfully",
            "path": api_path,
            "is_directory": is_dir
        }
    
    def move_item(self, user_id: str, source_path: str, destination_path: str) -> Dict[str, Any]:
        """
        Move or rename a file or directory.
        
        Args:
            user_id: The user ID
            source_path: Path to the item to move
            destination_path: Destination path
            
        Returns:
            Dictionary with success message and paths
            
        Raises:
            ValueError: If paths are not within the user's directory
            FileNotFoundError: If the source doesn't exist
            FileExistsError: If the destination already exists
        """
        source = self.normalize_path(source_path)
        destination = self.normalize_path(destination_path)
        
        source_full = self.full_path(user_id, source)
        destination_full = self.full_path(user_id, destination)
        
        if not self.is_within_user_dir(user_id, source_full):
            raise ValueError(f"Source path {source} is outside the user directory")
        
        if not self.is_within_user_dir(user_id, destination_full):
            raise ValueError(f"Destination path {destination} is outside the user directory")
        
        if not os.path.exists(source_full):
            raise FileNotFoundError(f"Source path {source} does not exist")
        
        if os.path.exists(destination_full):
            raise FileExistsError(f"Destination path {destination} already exists")
        
        # Create parent directories if they don't exist
        os.makedirs(os.path.dirname(destination_full), exist_ok=True)
        
        # Move the item
        shutil.move(source_full, destination_full)
        
        is_dir = os.path.isdir(destination_full)
        item_type = "Directory" if is_dir else "File"
        
        # Add leading slashes for API consistency
        api_source = '/' + source if source else '/'
        api_destination = '/' + destination if destination else '/'
        
        return {
            "message": f"{item_type} moved successfully from {source} to {destination}",
            "source_path": api_source,
            "destination_path": api_destination,
            "is_directory": is_dir
        }
    
    def copy_item(self, user_id: str, source_path: str, destination_path: str) -> Dict[str, Any]:
        """
        Copy a file or directory.
        
        Args:
            user_id: The user ID
            source_path: Path to the item to copy
            destination_path: Destination path
            
        Returns:
            Dictionary with success message and paths
            
        Raises:
            ValueError: If paths are not within the user's directory
            FileNotFoundError: If the source doesn't exist
            FileExistsError: If the destination already exists
        """
        source = self.normalize_path(source_path)
        destination = self.normalize_path(destination_path)
        
        source_full = self.full_path(user_id, source)
        destination_full = self.full_path(user_id, destination)
        
        if not self.is_within_user_dir(user_id, source_full):
            raise ValueError(f"Source path {source} is outside the user directory")
        
        if not self.is_within_user_dir(user_id, destination_full):
            raise ValueError(f"Destination path {destination} is outside the user directory")
        
        if not os.path.exists(source_full):
            raise FileNotFoundError(f"Source path {source} does not exist")
        
        if os.path.exists(destination_full):
            raise FileExistsError(f"Destination path {destination} already exists")
        
        # Create parent directories if they don't exist
        os.makedirs(os.path.dirname(destination_full), exist_ok=True)
        
        # Copy the item
        if os.path.isdir(source_full):
            shutil.copytree(source_full, destination_full)
            item_type = "Directory"
        else:
            shutil.copy2(source_full, destination_full)
            item_type = "File"
        
        # Add leading slashes for API consistency
        api_source = '/' + source if source else '/'
        api_destination = '/' + destination if destination else '/'
        
        return {
            "message": f"{item_type} copied successfully from {source} to {destination}",
            "source_path": api_source,
            "destination_path": api_destination,
            "is_directory": item_type == "Directory"
        }
    
    def build_directory_tree(self, user_id: str, rel_path: str = "/") -> Dict[str, Any]:
        """
        Build a hierarchical directory tree structure.
        
        Args:
            user_id: The user ID
            rel_path: Starting relative path
            
        Returns:
            Dictionary with directory tree structure
        """
        path = self.normalize_path(rel_path)
        abs_path = self.full_path(user_id, path)
        
        if not os.path.exists(abs_path) or not os.path.isdir(abs_path):
            return None
        
        root = {
            "name": os.path.basename(abs_path) or "root",
            "path": '/' + path if path else '/',
            "children": []
        }
        
        try:
            for item in os.listdir(abs_path):
                # Skip hidden files
                if item.startswith('.'):
                    continue
                    
                item_path = os.path.join(abs_path, item)
                rel_item_path = os.path.join(path, item).replace('\\', '/')
                
                if os.path.isdir(item_path):
                    subtree = self.build_directory_tree(user_id, rel_item_path)
                    if subtree:
                        root["children"].append(subtree)
                else:
                    root["children"].append({
                        "name": item,
                        "path": '/' + rel_item_path,
                        "is_file": True
                    })
        except Exception as e:
            logger.error(f"Error building directory tree for {abs_path}: {str(e)}")
        
        return root
