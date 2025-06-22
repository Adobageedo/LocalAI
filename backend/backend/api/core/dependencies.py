"""
Core dependencies for FastAPI routes.
This module contains dependency functions that can be reused across API endpoints.
"""
import os
import sys
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Import auth-related functions from middleware
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from middleware.auth import get_current_user, verify_token

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Re-export the get_current_user function for use in routes
get_current_user_dependency = get_current_user

# Common dependencies for accessing services
def get_vector_store_manager(collection_name: Optional[str] = None):
    """
    Dependency for accessing the vector store manager.
    
    Args:
        collection_name: Optional name of collection to use. Default is "documents".
    
    Returns:
        An instance of VectorStoreManager configured for the specified collection.
    """
    from backend.services.vectorstore.qdrant_manager import VectorStoreManager
    
    # Use default collection if none specified
    if collection_name is None:
        collection_name = "documents"
    
    return VectorStoreManager(collection_name)

def get_file_registry():
    """
    Dependency for accessing the file registry service.
    
    Returns:
        An instance of FileRegistry.
    """
    from backend.services.storage.file_registry import FileRegistry
    return FileRegistry()
