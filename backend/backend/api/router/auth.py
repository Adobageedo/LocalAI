"""
Router pour gérer les authentifications.
"""

import os
from backend.core.logger import log
import requests
import subprocess
import json
import base64
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, status, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow
import pathlib
from pydantic import BaseModel, Field
import msal
from backend.services.auth.credentials_manager import (load_google_token, save_microsoft_token, save_google_token, load_microsoft_token,
                               check_google_credentials, check_microsoft_credentials, delete_microsoft_token, delete_google_token)
# Configuration
from backend.core.config import load_config,GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REDIRECT_URI,GMAIL_TOKEN_PATH,OUTLOOK_CLIENT_ID,OUTLOOK_TOKEN_PATH, OUTLOOK_REDIRECT_URI,GMAIL_AUTH_URI,GMAIL_TOKEN_URI, OUTLOOK_SCOPES, ONEDRIVE_SCOPES, OUTLOOK_CALENDAR_SCOPES, GMAIL_SCOPES, GDRIVE_SCOPES, GCALENDAR_SCOPES
from backend.services.auth.google_auth import check_google_auth_services, get_google_auth_url_for_scope
from backend.services.auth.microsoft_auth import check_microsoft_auth_services, get_microsoft_auth_url_for_scope

# Initialisation du router et du logger
# Note: Le préfixe /api est maintenant défini dans main.py
router = APIRouter(tags=["auth"])
logger = log.bind(name="backend.api.auth")

from fastapi import Request, HTTPException, status, Depends
from backend.services.auth.middleware.auth import get_current_user

@router.get("/provider/")
async def get_user_connected_capabilities(user=Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get the list of capabilities that the user has access to, along with provider information.
    
    Args:
        user_id: The user ID to check capabilities for
        
    Returns:
        Dictionary with capabilities list, provider mapping, and provider capabilities
    """
    user_id = user.get("uid")
    result = {
        "capabilities": [],
        "providers": {},
        "provider_capabilities": {}
    }
    
    # Check Google authentication and services
    google = check_google_auth_services(user_id)
    if google["authenticated"]:
        result["provider_capabilities"]["google"] = []
        
        if "gmail" in google["services"]:
            result["capabilities"].append("email")
            result["providers"]["email"] = "gmail"
            result["provider_capabilities"]["google"].append("email")
        
        if "gdrive" in google["services"]:
            result["capabilities"].append("cloud_storage")
            result["providers"]["cloud_storage"] = "gdrive"
            result["provider_capabilities"]["google"].append("cloud_storage")
        
        if "gcalendar" in google["services"]:
            result["capabilities"].append("calendar")
            result["providers"]["calendar"] = "gcalendar"
            result["provider_capabilities"]["google"].append("calendar")
    else:
        # Check Microsoft authentication and services
        microsoft = check_microsoft_auth_services(user_id)
        if microsoft["authenticated"]:
            result["provider_capabilities"]["microsoft"] = []
            
            if "outlook" in microsoft["services"]:
                result["capabilities"].append("email")
                result["providers"]["email"] = "outlook"
                result["provider_capabilities"]["microsoft"].append("email")
            
            if "onedrive" in microsoft["services"]:
                result["capabilities"].append("cloud_storage")
                result["providers"]["cloud_storage"] = "onedrive"
                result["provider_capabilities"]["microsoft"].append("cloud_storage")
            
            if "outlook_calendar" in microsoft["services"]:
                result["capabilities"].append("calendar")
                result["providers"]["calendar"] = "outlook_calendar"
                result["provider_capabilities"]["microsoft"].append("calendar")
        
    logger.info(f"User {user_id} has connected capabilities: {result['capabilities']} with providers: {result['providers']}")
    return result

@router.get("/microsoft/login")
async def get_microsoft_auth_url(scope: str = None, user=Depends(get_current_user)):
    """Génère une URL d'authentification pour Microsoft Graph API"""
    try:
        # Get user ID from the authenticated user or use default
        user_id = user.get("uid") if user else "outlook"
        logger.info(f"[MICROSOFT AUTH] Generating auth URL for user {user_id} with scope {scope}")
        
        # Use the new helper function to generate the auth URL based on scope
        result = get_microsoft_auth_url_for_scope(user_id, scope)
        
        if result["authenticated"]:
            logger.info(f"[MICROSOFT AUTH] User {user_id} already authenticated for {scope}")
            return JSONResponse({"authenticated": True})
        
        logger.info(f"[MICROSOFT AUTH] Generated auth URL for {scope}: {result['auth_url']}")
        return JSONResponse({
            "authenticated": False, 
            "auth_url": result["auth_url"],
            "current_scopes": result["current_scopes"],
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"[MICROSOFT AUTH] Error generating auth URL: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/microsoft/callback")
async def microsoft_auth_callback(code: str = None, error: str = None, state: str = None, session_state: str = None):
    """Callback pour l'authentification Microsoft, traite le code d'autorisation renvoyé par Microsoft"""
    try:
        # Vérification des erreurs retournées par Microsoft
        if error:
            logger.error(f"[MICROSOFT CALLBACK] Microsoft returned error: {error}")
            return JSONResponse({
                "success": False,
                "error": error,
                "redirect": "/mail-import?outlook_auth=error&error_type=microsoft_error"
            }, status_code=400)
        
        # Extract state data
        user_id = "outlook"
        redirect_uri = OUTLOOK_REDIRECT_URI+"api/auth/microsoft/callback"
        requested_scope = None
        
        if state:
            # Le state contient les données encodées en base64
            try:
                state_data = base64.urlsafe_b64decode(state.encode()).decode()
                state_json = json.loads(state_data)
                user_id = state_json.get("user_id", user_id)
                redirect_uri = state_json.get("redirect_uri", redirect_uri)
                requested_scope = state_json.get("scope")
                logger.info(f"[MICROSOFT CALLBACK] Extracted from state: user_id={user_id}, scope={requested_scope}")
            except Exception as e:
                logger.error(f"[MICROSOFT CALLBACK] Error decoding state: {str(e)}")
                
        logger.info(f"[MICROSOFT CALLBACK] Received auth code for user {user_id} with redirect_uri {redirect_uri}")
        if requested_scope:
            logger.info(f"[MICROSOFT CALLBACK] Requested scope: {requested_scope}")
        

        # Vérification de la présence du code
        if not code:
            logger.error("[MICROSOFT CALLBACK] No authorization code received")
            return JSONResponse({
                "success": False,
                "error": "No authorization code received",
                "redirect": "/mail-import?outlook_auth=error&error_type=no_code"
            }, status_code=400)
        
        # Récupérer l'ID utilisateur depuis l'objet d'authentification
        logger.info(f"[MICROSOFT CALLBACK] Received auth code for user {user_id}")
        
        # Récupérer les identifiants d'application
        client_id = OUTLOOK_CLIENT_ID
        
        if not client_id:
            logger.error("[MICROSOFT CALLBACK] Microsoft credentials incomplete")
            return JSONResponse({"error": "Configuration Microsoft incomplète"}, status_code=500)
        
        # Charger le cache de token existant
        from backend.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
        cache_data = load_microsoft_token(user_id)
        token_cache = msal.SerializableTokenCache()
        
        if cache_data:
            token_cache.deserialize(cache_data)
        
        # Créer une instance de l'application cliente publique pour l'échange de tokens
        # Puisque notre app est configurée comme client public dans Azure AD
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority="https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        
        # Échanger le code d'autorisation contre un token d'accès
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=requested_scope,
            redirect_uri=redirect_uri
        )
        
        if "error" in result:
            error_desc = result.get("error_description", "Unknown error during token acquisition")
            logger.error(f"[OUTLOOK CALLBACK] Error acquiring token: {error_desc}")
            return JSONResponse({
                "success": False,
                "error": error_desc,
                "redirect": f"/mail-import?outlook_auth=error&error_type=token_acquisition&message={error_desc}"
            }, status_code=500)
        
        # Sauvegarder les tokens dans le gestionnaire de credentials si le cache a été modifié
        if token_cache.has_state_changed:
            logger.info(f"[MICROSOFT CALLBACK] Token cache updated for user {user_id}")
            save_microsoft_token(user_id, token_cache.serialize())
        
        # Extraire le nom d'utilisateur si disponible
        username = "outlook_user"
        if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
            username = result["id_token_claims"]["preferred_username"]
        
        logger.info(f"[OUTLOOK CALLBACK] Authentication successful for {username}")
        
        # Rediriger vers la page d'importation d'emails avec auto-ingestion
        #frontend_redirect = "http://localhost:5173/mail-import?auth=success&provider=outlook&auto_ingest=true"
        #return JSONResponse({
        #    "status": "success",
        #    "redirect_url": frontend_redirect,
        #    "user": username
        #})
        

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentification réussie</title></head>
        <body>
            <script>
            // Envoyer un message à la fenêtre parente
            if (window.opener) {{
                window.opener.postMessage("auth_success", "*");
            }}
            // Fermer la popup
            window.close();
            </script>
            <p>Authentification réussie. Vous pouvez fermer cette fenêtre.</p>
        </body>
        </html>
        """

        return HTMLResponse(content=html_content)
        
    except Exception as e:
        logger.error(f"[OUTLOOK CALLBACK] Error processing callback: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/microsoft/revoke_access")
async def revoke_microsoft_access(user=Depends(get_current_user)):
    """Révoque l'accès à Microsoft Outlook en supprimant les credentials stockés"""
    try:
        user_id = user.get("uid") if user else "outlook"
        logger.info(f"[OUTLOOK REVOKE] Revoking access for user {user_id}")
        
        # Supprimer le token Microsoft
        result = delete_microsoft_token(user_id)
        
        if result:
            return {"success": True, "message": "Accès à Microsoft Outlook révoqué avec succès"}
        else:
            return {"success": False, "message": "Aucun token trouvé ou erreur lors de la suppression"}
            
    except Exception as e:
        logger.error(f"[OUTLOOK REVOKE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error revoking Microsoft Outlook access: {str(e)}"
        )

@router.get("/google/login")
async def get_google_auth_url(scope: str = None, user=Depends(get_current_user)):
    # Get user ID from the authenticated user or use default
    user_id = user.get("uid") if user else "gmail"
    
    # Use the new helper function to generate the auth URL based on scope
    result = get_google_auth_url_for_scope(user_id, scope)
    
    if result["authenticated"]:
        logger.debug(f"[GOOGLE OAUTH] User {user_id} already authenticated for {scope}")
        return JSONResponse({"authenticated": True})
    
    logger.debug(f"[GOOGLE OAUTH] Generated auth URL for {scope}: {result['auth_url']}")
    return JSONResponse({
        "authenticated": False, 
        "auth_url": result["auth_url"],
        "current_scopes": result["current_scopes"]
    })

@router.get("/google/callback")
async def google_oauth2_callback(request: Request):
    logger.debug("[GOOGLE OAUTH] OAuth2 callback hit.")
    code = request.query_params.get("code")
    state_encoded = request.query_params.get("state")
    
    # Default values
    user_id = "gmail"
    selected_scopes = None
    
    # Try to decode the state parameter if it exists
    if state_encoded:
        try:
            state_data = base64.urlsafe_b64decode(state_encoded.encode()).decode()
            state_json = json.loads(state_data)
            user_id = state_json.get("user_id", user_id)
            selected_scopes = state_json.get("scope")
            logger.debug(f"[GOOGLE OAUTH] Decoded state: user_id={user_id}, scope={selected_scopes}")
        except Exception as e:
            logger.error(f"[GOOGLE OAUTH] Error decoding state: {str(e)}")
            # Fall back to using the encoded state as the user_id (for backward compatibility)
            user_id = state_encoded
    
    logger.debug(f"[GOOGLE OAUTH] User ID: {user_id}, Requested scope: {selected_scopes}")
    
    if not code:
        logger.error("[GMAIL OAUTH] Authorization code not found in callback.")
        return HTMLResponse("Error: Authorization code not found.")
    
    # Initialize the OAuth flow with the appropriate scopes
    logger.debug(f"[GOOGLE OAUTH] Initializing flow with scopes: {selected_scopes}")
    
    if not selected_scopes:
        logger.warning("[GOOGLE OAUTH] No valid scopes found in state, using default Gmail scopes")
        selected_scopes = GMAIL_SCOPES
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": GMAIL_AUTH_URI,
                "token_uri": GMAIL_TOKEN_URI,
            }
        },
        scopes=selected_scopes,
        redirect_uri=GMAIL_REDIRECT_URI + "api/auth/google/callback"
    )
    
    # Exchange the authorization code for a token
    flow.fetch_token(code=code)
    
    # Log the actual scopes granted in the token
    if hasattr(flow, 'credentials') and hasattr(flow.credentials, 'scopes'):
        logger.debug(f"[GOOGLE OAUTH] Actual scopes granted in token: {flow.credentials.scopes}")
    
    # Utiliser la fonction de credentials_manager pour sauvegarder le token
    if save_google_token(user_id, flow.credentials):
        logger.debug("[GMAIL OAUTH] Token successfully saved using credentials_manager.")
    else:
        logger.error("[GMAIL OAUTH] Error saving token using credentials_manager.")
        return HTMLResponse("Error: Failed to save authentication token.")

    # Return HTML that closes the popup and notifies the main window
    return HTMLResponse("""
        <html><body>
        <script>
            window.opener && window.opener.postMessage('auth_success', '*');
            window.close();
        </script>
        <p>Authentication successful. You can close this window.</p>
        </body></html>
    """)

@router.post("/google/revoke_access")
async def revoke_google_access(user=Depends(get_current_user)):
    """Révoque l'accès à Google en supprimant les credentials stockés"""
    try:
        user_id = user.get("uid") if user else "gmail"
        logger.info(f"[GOOGLE REVOKE] Revoking access for user {user_id}")
        
        # Supprimer le token Google
        result = delete_google_token(user_id)
        
        if result:
            return {"success": True, "message": "Accès à Google révoqué avec succès"}
        else:
            return {"success": False, "message": "Aucun token trouvé ou erreur lors de la suppression"}
            
    except Exception as e:
        logger.error(f"[GOOGLE REVOKE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error revoking Microsoft Outlook access: {str(e)}"
        )
