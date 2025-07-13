"""
Supabase authentication utilities for verifying JWT tokens.
"""
import os
import sys
import json
import requests
import time
from jose import jwt
from jose.exceptions import JWTError
from typing import Dict, Any, Optional, Tuple

# Import logger
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from backend.core.logger import log
from backend.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET

logger = log.bind(name="backend.services.auth.middleware.supabase_utils")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logger.warning("Supabase URL or key not set. Authentication will not work properly.")

def get_jwks() -> Dict[str, Any]:
    """
    Fetch the JSON Web Key Set (JWKS) from Supabase for JWT verification.
    """
    try:
        if not SUPABASE_URL:
            logger.error("Supabase URL not configured")
            return {}
            
        jwks_url = f"{SUPABASE_URL}/auth/v1/jwks"
        response = requests.get(jwks_url)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch JWKS: {response.status_code} {response.text}")
            return {}
            
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching JWKS: {str(e)}")
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
            logger.debug(f"Token header: {header}")
        except Exception as e:
            return None, f"Invalid token format: {str(e)}"
        
        # For development/testing, you can use the JWT secret directly
        if SUPABASE_JWT_SECRET:
            try:
                # Decode the token using the JWT secret
                decoded_token = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_signature": True}
                )
                
                # Check if token is expired
                current_time = time.time()
                if "exp" in decoded_token and decoded_token["exp"] < current_time:
                    return None, f"Token expired at {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(decoded_token['exp']))}"
                
                # Extract user information with enhanced metadata
                user_info = {
                    "uid": decoded_token.get("sub"),
                    "email": decoded_token.get("email"),
                    "name": decoded_token.get("user_metadata", {}).get("name"),
                    "provider_id": decoded_token.get("aud") or "supabase",
                    "auth_time": decoded_token.get("iat"),
                    "user_metadata": decoded_token.get("user_metadata", {}),
                    "app_metadata": decoded_token.get("app_metadata", {}),
                    "role": decoded_token.get("role"),
                    "session_id": decoded_token.get("session_id")
                }
                
                logger.debug(f"Successfully verified token for user {user_info['email']}")
                return user_info, None
            except JWTError as e:
                error_msg = f"JWT decode error: {str(e)}"
                logger.error(error_msg)
                return None, error_msg
        else:
            # In production, use JWKS to verify the token
            jwks = get_jwks()
            if not jwks:
                error_msg = "Failed to get JWKS and no JWT secret provided"
                logger.error(error_msg)
                return None, error_msg
                
            # TODO: Implement JWKS-based token verification
            # This would require extracting the key ID from the token header
            # and finding the corresponding public key in the JWKS
            
            # For now, just decode without verification as a fallback
            # WARNING: This is not secure for production!
            try:
                decoded_token = jwt.decode(
                    token,
                    options={"verify_signature": False}
                )
                
                # Extract user information with enhanced metadata
                user_info = {
                    "uid": decoded_token.get("sub"),
                    "email": decoded_token.get("email"),
                    "name": decoded_token.get("user_metadata", {}).get("name"),
                    "provider_id": decoded_token.get("aud") or "supabase",
                    "auth_time": decoded_token.get("iat"),
                    "user_metadata": decoded_token.get("user_metadata", {}),
                    "app_metadata": decoded_token.get("app_metadata", {}),
                    "role": decoded_token.get("role"),
                    "session_id": decoded_token.get("session_id")
                }
                
                logger.warning("Token verified without signature verification - NOT SECURE FOR PRODUCTION")
                return user_info, None
            except Exception as e:
                error_msg = f"Error decoding token without verification: {str(e)}"
                logger.error(error_msg)
                return None, error_msg
    except Exception as e:
        error_msg = f"Unexpected error verifying token: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
            
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        return None

def get_user_by_id(user_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Get user information from Supabase by user ID.
    
    Args:
        user_id: The Supabase user ID
        
    Returns:
        Tuple containing (user_info, error_message)
        - user_info: Dict containing user information or None if retrieval fails
        - error_message: Error message if retrieval fails, None otherwise
    """
    try:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            error_msg = "Supabase URL or service key not configured"
            logger.error(error_msg)
            return None, error_msg
            
        # Use the service key for admin operations
        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
        }
        
        # Log the request details for debugging
        logger.debug(f"Fetching user data for ID: {user_id}")
        
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            error_msg = f"Failed to get user: {response.status_code} {response.text}"
            logger.error(error_msg)
            return None, error_msg
            
        user_data = response.json()
        
        # Format user data to match the structure expected by the application
        # Enhanced with more metadata for better integration
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
        
        logger.debug(f"Successfully retrieved user data for {user_info['email']}")
        return user_info, None
    except Exception as e:
        error_msg = f"Error getting user by ID: {str(e)}"
        logger.error(error_msg)
        return None, error_msg
