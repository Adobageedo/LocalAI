"""
Authentication module for the MCP server.
Handles Firebase ID token verification.
"""

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sys
import os
from typing import Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.auth.middleware.firebase_utils import verify_token

# Initialize security for Bearer token
security = HTTPBearer()


async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Middleware to verify Firebase ID token and extract user information.
    
    Args:
        request: FastAPI request object
        credentials: HTTP Authorization credentials containing the Bearer token
        
    Returns:
        Dict containing user information from the decoded token
        
    Raises:
        HTTPException: If token is invalid or authentication fails
    """
    token = credentials.credentials
    decoded_token = verify_token(token)
    
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Add user info to request state for potential use in other middleware
    request.state.user = decoded_token
    return decoded_token
