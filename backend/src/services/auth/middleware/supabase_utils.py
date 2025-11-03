"""
Supabase authentication utilities for verifying JWT tokens.
"""
import os
import sys
import json
import time
from typing import Dict, Any, Optional, Tuple
import jwt  # Using PyJWT instead of jose.jwt for compatibility with Supabase
from supabase import create_client, Client

# Import logger
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from src.core.logger import log
from src.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET

logger = log.bind(name="src.services.auth.middleware.supabase_utils")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logger.warning("Supabase URL or key not set. Authentication will not work properly.")
    
# Initialize Supabase client
_supabase_client = None

def get_supabase_client() -> Client:
    """
    Get or create a Supabase client instance
    """
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            logger.error("Supabase URL or key not set. Cannot create client.")
            raise ValueError("Supabase URL or key not set")
        
        try:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            logger.info(f"Supabase client initialized with URL: {SUPABASE_URL}")
        except Exception as e:
            logger.error(f"Failed to create Supabase client: {str(e)}")
            raise
    
    return _supabase_client

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode a JWT token without verification to extract its claims.
    Used for debugging purposes.
    """
    try:
        # Decode without verification just to see what's in the token
        return jwt.decode(token, options={"verify_signature": False})
    except Exception as e:
        logger.error(f"Error decoding token: {str(e)}")
        return {}

def verify_token(token: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Verify a Supabase JWT token and return the decoded user information.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        Tuple containing (user_info, error_message)
        - user_info: Dict containing user information or None if verification fails
        - error_message: Error message if verification fails, None otherwise
    """
    if not token:
        return None, "No token provided"
    
    try:
        # First try to decode the token header to get information about it
        try:
            header = jwt.get_unverified_header(token)
        except Exception as e:
            return None, f"Invalid token format: {str(e)}"
        
        # For debugging, decode the token without verification to see what's in it
        decoded_claims = decode_token(token)
        
        # Try to verify the token using Supabase client
        try:
            # Get Supabase client
            supabase = get_supabase_client()
            
            # Use the admin API to get user by JWT token
            # This implicitly verifies the token
            user_response = supabase.auth.get_user(token)
            user_data = user_response.model_dump()
            
            # Extract user information with enhanced metadata
            user_info = {
                "uid": user_data['user']['id'],
                "email": user_data['user']['email'],
                "name": user_data['user'].get('user_metadata', {}).get('name'),
                "provider_id": user_data['user'].get('app_metadata', {}).get('provider', 'supabase'),
                "auth_time": None,  # Not directly available from the API
                "user_metadata": user_data['user'].get('user_metadata', {}),
                "app_metadata": user_data['user'].get('app_metadata', {}),
                "role": user_data['user'].get('role'),
                "session_id": None  # Not directly available from the API
            }
            
            return user_info, None
            
        except Exception as e:
            logger.error(f"Error verifying token with Supabase client: {str(e)}")
            
            # Fallback to manual token decoding without verification
            # WARNING: This is not secure for production!
            if os.environ.get("ENABLE_AUTH", "true").lower() != "true":
                logger.warning("Auth disabled, using unverified token data")
                
                # Extract user information from the unverified token
                user_info = {
                    "uid": decoded_claims.get("sub"),
                    "email": decoded_claims.get("email"),
                    "name": decoded_claims.get("user_metadata", {}).get("name"),
                    "provider_id": decoded_claims.get("aud") or "supabase",
                    "auth_time": decoded_claims.get("iat"),
                    "user_metadata": decoded_claims.get("user_metadata", {}),
                    "app_metadata": decoded_claims.get("app_metadata", {}),
                    "role": decoded_claims.get("role"),
                    "session_id": decoded_claims.get("session_id")
                }
                
                logger.warning("Token accepted without verification - DEVELOPMENT MODE ONLY")
                return user_info, None
            else:
                return None, f"Token verification failed: {str(e)}"
            
    except Exception as e:
        error_msg = f"Unexpected error verifying token: {str(e)}"
        logger.error(error_msg)
        return None, error_msg

def get_user_by_id(user_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Get user information by user ID from Supabase.
    
    Args:
        user_id: The user ID to look up
        
    Returns:
        Tuple containing (user_info, error_message)
        - user_info: Dict containing user information or None if lookup fails
        - error_message: Error message if lookup fails, None otherwise
    """
    if not user_id:
        return None, "No user ID provided"
    
    try:
        # Use the admin API to get user by ID
        # Note: This requires the service role key to be set
        if SUPABASE_SERVICE_KEY:
            try:
                # Create a new client with the service role key for admin operations
                admin_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
                
                # Get user by ID using the admin API
                user_response = admin_supabase.auth.admin.get_user_by_id(user_id)
                user_data = user_response.model_dump()
                
                # Format user data to match the structure expected by the application
                user_info = {
                    "uid": user_data.get("id"),
                    "email": user_data.get("email"),
                    "name": user_data.get("user_metadata", {}).get("name"),
                    "provider_id": user_data.get("app_metadata", {}).get("provider", "supabase"),
                    "auth_time": user_data.get("created_at"),
                    "last_sign_in": user_data.get("last_sign_in_at"),
                    "user_metadata": user_data.get("user_metadata", {}),
                    "app_metadata": user_data.get("app_metadata", {}),
                    "role": user_data.get("role"),
                    "email_confirmed": user_data.get("email_confirmed_at") is not None
                }
                
                return user_info, None
            except Exception as e:
                error_msg = f"Error retrieving user with admin API: {str(e)}"
                logger.error(error_msg)
                return None, error_msg
        else:
            # Fallback for development mode
            if os.environ.get("ENABLE_AUTH", "true").lower() != "true":
                logger.warning("Auth disabled, using placeholder user data")
                
                # Return a minimal user info object
                user_info = {
                    "uid": user_id,
                    "email": f"user_{user_id}@example.com",  # Placeholder
                    "name": f"User {user_id}",  # Placeholder
                    "provider_id": "supabase",
                    "auth_time": None,
                    "user_metadata": {},
                    "app_metadata": {},
                    "role": "authenticated",
                    "email_confirmed": True
                }
                
                logger.warning(f"Using placeholder user info for user ID {user_id} - DEVELOPMENT MODE ONLY")
                return user_info, None
            else:
                return None, "SUPABASE_SERVICE_KEY not set, cannot retrieve user information"
    except Exception as e:
        error_msg = f"Error getting user by ID: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
