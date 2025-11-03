"""
Router pour gérer le téléchargement des sources depuis Nextcloud.
"""

from src.core.logger import log
import json
import base64
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse, HTMLResponse
import msal
from src.services.auth.credentials_manager import (save_microsoft_token, load_microsoft_token,
                               check_microsoft_credentials, delete_microsoft_token)
# Configuration
from src.core.config import OUTLOOK_CLIENT_ID,OUTLOOK_TOKEN_PATH, OUTLOOK_SCOPES, ONEDRIVE_SCOPES, OUTLOOK_CALENDAR_SCOPES
from src.services.auth.microsoft_auth import check_microsoft_auth_services

# Initialisation du router et du logger
# Note: Le préfixe /api est maintenant défini dans main.py
router = APIRouter(prefix="/outlook", tags=["Outlook auth msal"])
logger = log.bind(name="src.api.outlook.auth")

from src.services.auth.middleware.auth_firebase import get_current_user

@router.get("/auth/status")
async def get_outlook_auth_status(user=Depends(get_current_user)):
    """Vérifie si l'utilisateur est authentifié à Outlook"""
    try:
        user_id = user.get("uid") if user else "outlook"
        logger.debug("[OUTLOOK AUTH STATUS] Checking credentials for user %s", user_id)
        
        # Utiliser check_microsoft_credentials pour vérifier l'état complet des credentials
        creds_status = check_microsoft_credentials(user_id)
        
        response_data = {
            "authenticated": creds_status["authenticated"],
            "valid": creds_status["valid"],
            "user_id": user_id,
            "error": creds_status.get("error"),
            "account_info": creds_status.get("account_info")
        }
        
        return JSONResponse(response_data)
    except Exception as e:
        logger.error("[OUTLOOK AUTH STATUS] Error checking auth status: %s", str(e))
        return JSONResponse({"authenticated": False, "valid": False, "error": str(e)})

@router.get("/auth/login")
async def get_microsoft_auth_url(callback_url: str = None, scope: str = None, user=Depends(get_current_user)):
    """Generate Microsoft OAuth URL for frontend redirect with token cache support"""
    try:
        user_id = user.get("uid") if user else "outlook"
        logger.info(f"[MICROSOFT AUTH] Generating auth URL for user {user_id} with scope {scope}")
        
        # Retrieve application credentials
        client_id = OUTLOOK_CLIENT_ID
        
        if not client_id:
            return JSONResponse({"error": "Microsoft client configuration incomplete"}, status_code=500)
        
        # Define redirect URI (either use the provided one or default)
        redirect_uri = callback_url or "http://localhost:8000/api/outlook/auth/callback"
        
        # Define scopes based on the requested scope parameter
        
        # Check if user is already authenticated
        auth_status = check_microsoft_auth_services(user_id)
        
        if auth_status["authenticated"]:
            # If the user is already authenticated and the requested service is available
            if scope == "mail" and "outlook" in auth_status["services"]:
                logger.info(f"[MICROSOFT AUTH] User {user_id} already authenticated for mail service")
                return JSONResponse({"authenticated": True})
            elif scope == "files" and "onedrive" in auth_status["services"]:
                logger.info(f"[MICROSOFT AUTH] User {user_id} already authenticated for files service")
                return JSONResponse({"authenticated": True})
            elif scope == "calendar" and "outlook_calendar" in auth_status["services"]:
                logger.info(f"[MICROSOFT AUTH] User {user_id} already authenticated for calendar service")
                return JSONResponse({"authenticated": True})
        
        # Select appropriate scopes based on the requested scope
        if scope == "mail":
            SCOPES = OUTLOOK_SCOPES
        elif scope == "files":
            SCOPES = ONEDRIVE_SCOPES
        elif scope == "calendar":
            SCOPES = OUTLOOK_CALENDAR_SCOPES
        else:
            # Default to mail scopes if no specific scope is requested
            SCOPES = ['Mail.Read', 'User.Read']
        
        logger.info(f"[MICROSOFT AUTH] Using scopes: {SCOPES} for user {user_id}")
        
        # Charger le cache de token si existant
        cache_data = load_microsoft_token(user_id)
        token_cache = msal.SerializableTokenCache()
        
        if cache_data:
            token_cache.deserialize(cache_data)
            
        # Créer l'application avec le cache de token
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority="https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        
        state_data = json.dumps({"user_id": user_id, "redirect_uri": redirect_uri, "scope": scope})
        state_encoded = base64.urlsafe_b64encode(state_data.encode()).decode()
        # Generate auth URL
        auth_url = app.get_authorization_request_url(
            scopes=SCOPES,
            redirect_uri=redirect_uri,
            state=state_encoded,
            prompt="select_account"
        )
        
        logger.info(f"[OUTLOOK AUTH] Generated auth URL: {auth_url[:50]}...")
        
        return JSONResponse({
            "auth_url": auth_url,
            "user_id": user_id,
            "authenticated": False
        })
    except Exception as e:
        logger.error(f"[OUTLOOK AUTH] Error generating auth URL: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/auth/callback")
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
        redirect_uri = "http://localhost:8000/api/outlook/auth/callback"
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
        # Utiliser les scopes par défaut si aucun scope spécifique n'est demandé
        scopes_to_use = requested_scope if requested_scope else OUTLOOK_SCOPES
        
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=scopes_to_use,
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

@router.delete("/auth/revoke_access")
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