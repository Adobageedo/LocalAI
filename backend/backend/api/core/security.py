"""
Security utilities for API authentication and authorization.
"""
import os
import sys
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Import auth-related functions from middleware
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from middleware.auth import verify_token, get_current_user

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

async def get_optional_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[Dict[str, Any]]:
    """
    Dependency for optionally getting the current user.
    Unlike get_current_user, this doesn't raise an exception if no valid token is provided.
    
    Args:
        token: The OAuth2 token.
        
    Returns:
        The user data if a valid token is provided, otherwise None.
    """
    if not token:
        return None
    
    try:
        user = await get_current_user(token)
        return user
    except HTTPException:
        return None

# Re-export the get_current_user function for use in routes
get_authenticated_user = get_current_user
