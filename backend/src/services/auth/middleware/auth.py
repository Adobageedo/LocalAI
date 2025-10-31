from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import Supabase utilities instead of Firebase
from .supabase_utils import verify_token

security = HTTPBearer(auto_error=False)  # Make it optional for development

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Middleware to check if user is authenticated with Supabase"""
    # For development/testing, allow requests without authentication
    # Remove or modify this condition in production
    if os.environ.get("ENABLE_AUTH", "true").lower() == "false":
        # Return a default user for development
        default_user = {
            "uid": "dev-user",
            "email": "dev@example.com",
            "name": "Development User",
            "provider_id": "supabase"
        }
        request.state.user = default_user
        return default_user
    
    # No credentials provided
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    user_info, error = verify_token(token)
    
    if not user_info:
        # Provide detailed error information for better debugging
        error_detail = error or "Invalid authentication credentials"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Add user info to request state
    request.state.user = user_info
    return user_info