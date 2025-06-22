"""
Router pour gérer le téléchargement des sources depuis Nextcloud.
"""

import os
import logging
import requests
import subprocess
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request, status, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow
from pydantic import BaseModel, Field
import pathlib
from pydantic import BaseModel
import msal
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from auth.credentials_manager import (load_google_token, save_microsoft_token, save_google_token, load_microsoft_token,
                               check_google_credentials, check_microsoft_credentials)
# Configuration
from dotenv import load_dotenv
load_dotenv()

# Configuration Nextcloud
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")

# Configuration Gmail
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
GMAIL_REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:5173")
GMAIL_CREDENTIALS_PATH = os.getenv("GMAIL_CREDENTIALS_PATH", "credentials.json")
GMAIL_TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "token.pickle")

# Configuration Outlook
OUTLOOK_CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID", "")
OUTLOOK_TOKEN_PATH = os.getenv("OUTLOOK_TOKEN_PATH", "outlook_token.json")

# Initialisation du router et du logger
# Note: Le préfixe /api est maintenant défini dans main.py
router = APIRouter(tags=["sources"])
logger = logging.getLogger(__name__)

from fastapi import Request, HTTPException, status, Depends
from middleware.auth import get_current_user

@router.get("/gmail/ingest_status")
async def gmail_ingest_status(user=Depends(get_current_user)):
    import json, os
    status_path = "/tmp/gmail_ingest_status.json"
    if os.path.exists(status_path):
        try:
            with open(status_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            return {"subject": None, "error": str(e)}
    return {"subject": None}

@router.get("/gmail/auth_status")
async def get_gmail_auth_status(user=Depends(get_current_user)):
    """Vérifie si l'utilisateur est authentifié à Gmail"""
    try:
        user_id = user.get("uid") if user else "gmail"
        logger.debug("[GMAIL AUTH STATUS] Checking credentials for user %s", user_id)
        
        # Utiliser check_google_credentials pour vérifier l'état complet des credentials
        creds_status = check_google_credentials(user_id)
        
        response_data = {
            "authenticated": creds_status["authenticated"],
            "valid": creds_status["valid"],
            "expired": creds_status.get("expired", False),
            "refreshable": creds_status.get("refreshable", False),
            "user_id": user_id,
            "error": creds_status.get("error")
        }
        
        return JSONResponse(response_data)
    except Exception as e:
        logger.error("[GMAIL AUTH STATUS] Error checking auth status: %s", str(e))
        return JSONResponse({"authenticated": False, "valid": False, "error": str(e)})

@router.get("/outlook/auth_status")
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

@router.get("/outlook/auth")
async def get_outlook_auth_url(callback_url: str = None, user=Depends(get_current_user)):
    """Generate Outlook OAuth URL for frontend redirect with token cache support"""
    try:
        user_id = user.get("uid") if user else "outlook"
        logger.info(f"[OUTLOOK AUTH] Generating auth URL for user {user_id}")
        
        # Retrieve application credentials
        client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
        
        if not client_id:
            return JSONResponse({"error": "Microsoft client configuration incomplete"}, status_code=500)
        
        # Define redirect URI (either use the provided one or default)
        redirect_uri = callback_url or "http://localhost:5173/api/sources/outlook/callback"
        
        # Définir les scopes demandés
        SCOPES = ['Mail.Read', 'User.Read']
        
        # Charger le cache de token si existant
        from auth.credentials_manager import load_microsoft_token
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
        
        # Generate auth URL
        auth_url = app.get_authorization_request_url(
            scopes=SCOPES,
            redirect_uri=redirect_uri,
            state=user_id,
            prompt="select_account"
        )
        
        logger.info(f"[OUTLOOK AUTH] Generated auth URL: {auth_url[:50]}...")
        
        return JSONResponse({
            "auth_url": auth_url,
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"[OUTLOOK AUTH] Error generating auth URL: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/outlook/auth/test")
async def get_outlook_auth_url_test(callback_url: str = None, user_id: str = "outlook"):
    """Generate Outlook OAuth URL for frontend redirect (test endpoint without authentication)"""
    try:
        logger.info(f"[OUTLOOK AUTH TEST] Generating auth URL for user {user_id}")
        
        # Retrieve application credentials
        client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
        
        if not client_id:
            return JSONResponse({"error": "Microsoft client configuration incomplete"}, status_code=500)
        
        # Define redirect URI (either use the provided one or default)
        redirect_uri = callback_url or "http://localhost:5173/api/sources/outlook/callback"
        
        # Définir les scopes demandés
        SCOPES = ['Mail.Read', 'User.Read']
        
        # Charger le cache de token si existant
        from auth.credentials_manager import load_microsoft_token
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
        
        # Generate auth URL
        auth_url = app.get_authorization_request_url(
            scopes=SCOPES,
            redirect_uri=redirect_uri,
            state=user_id,
            prompt="select_account"
        )
        
        logger.info(f"[OUTLOOK AUTH TEST] Generated auth URL: {auth_url[:50]}...")
        
        return JSONResponse({
            "auth_url": auth_url,
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"[OUTLOOK AUTH] Error generating auth URL: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/outlook/callback")
async def outlook_auth_callback(code: str = None, error: str = None, state: str = None, session_state: str = None):
    """Callback pour l'authentification Outlook, traite le code d'autorisation renvoyé par Microsoft"""
    try:
        # Vérification des erreurs retournées par Microsoft
        if error:
            logger.error(f"[OUTLOOK CALLBACK] Microsoft returned error: {error}")
            return JSONResponse({
                "success": False,
                "error": error,
                "redirect": "/mail-import?outlook_auth=error&error_type=microsoft_error"
            }, status_code=400)
        
        if state:
            # Le state contient directement l'user_id
            user_id = state
        else:
            user_id = "outlook"
        logger.info(f"[OUTLOOK CALLBACK] Received auth code for user {user_id}")

        # Vérification de la présence du code
        if not code:
            logger.error("[OUTLOOK CALLBACK] No authorization code received")
            return JSONResponse({
                "success": False,
                "error": "No authorization code received",
                "redirect": "/mail-import?outlook_auth=error&error_type=no_code"
            }, status_code=400)
        
        # Récupérer l'ID utilisateur depuis l'objet d'authentification
        logger.info(f"[OUTLOOK CALLBACK] Received auth code for user {user_id}")
        
        # Récupérer les identifiants d'application
        client_id = os.getenv("OUTLOOK_CLIENT_ID", "")
        
        if not client_id:
            logger.error("[OUTLOOK CALLBACK] Microsoft credentials incomplete")
            return JSONResponse({"error": "Configuration Microsoft incomplète"}, status_code=500)
        
        # Charger le cache de token existant
        from auth.credentials_manager import load_microsoft_token, save_microsoft_token
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
        
        # URL de redirection utilisée lors de la demande d'autorisation
        # Utiliser l'URL frontend car c'est probablement ce qui est enregistré dans Azure
        redirect_uri = "http://localhost:5173/api/sources/outlook/callback"
        
        # Échanger le code d'autorisation contre un token d'accès
        result = app.acquire_token_by_authorization_code(
            code=code,
            scopes=['Mail.Read', 'User.Read'],
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
            logger.info(f"[OUTLOOK CALLBACK] Token cache updated for user {user_id}")
            save_microsoft_token(user_id, token_cache.serialize())
        
        # Extraire le nom d'utilisateur si disponible
        username = "outlook_user"
        if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
            username = result["id_token_claims"]["preferred_username"]
        
        logger.info(f"[OUTLOOK CALLBACK] Authentication successful for {username}")
        
        # Rediriger vers la page d'importation d'emails avec auto-ingestion
        frontend_redirect = "http://localhost:5173/mail-import?auth=success&provider=outlook&auto_ingest=true"
        return JSONResponse({
            "status": "success",
            "redirect_url": frontend_redirect,
            "user": username
        })
        
    except Exception as e:
        logger.error(f"[OUTLOOK CALLBACK] Error processing callback: {str(e)}", exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/gmail/auth_url")
async def get_gmail_auth_url(user=Depends(get_current_user)):
    # Check if token exists and is valid using check_google_credentials
    user_id = user.get("uid") if user else "gmail"
    creds_status = check_google_credentials(user_id)
    
    logger.debug("[GMAIL OAUTH] Checking credentials for user %s", user_id)
    if creds_status["authenticated"] and creds_status["valid"]:
        logger.debug("[GMAIL OAUTH] Valid token found. Already authenticated.")
        return JSONResponse({"authenticated": True})
    # Otherwise, generate the OAuth URL
    # Gmail OAuth Flow avec scopes complets pour accès aux emails
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": os.getenv("GMAIL_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
                "token_uri": os.getenv("GMAIL_TOKEN_URI", "https://oauth2.googleapis.com/token"),
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/drive"
        ],
        redirect_uri=GMAIL_REDIRECT_URI + "/api/sources/gmail/oauth2callback"
    )
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='false',  # ou ne pas le mettre du tout
        state=user_id
    )
    logger.debug(f"[GMAIL OAUTH] Generated OAuth URL: {auth_url} (state: {state})")
    # Optionally: save state for CSRF protection
    return JSONResponse({"authenticated": False, "auth_url": auth_url})

@router.get("/gmail/oauth2callback")
async def gmail_oauth2_callback(request: Request):
    logger.debug("[GMAIL OAUTH] OAuth2 callback hit.")
    code = request.query_params.get("code")
    user_id = request.query_params.get("state", "gmail")
    logger.debug(f"[GMAIL OAUTH] User ID: {user_id}")
    
    if not code:
        logger.error("[GMAIL OAUTH] Authorization code not found in callback.")
        return HTMLResponse("Error: Authorization code not found.")
    
    # Initialize the OAuth flow with tous les scopes nécessaires
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": os.getenv("GMAIL_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
                "token_uri": os.getenv("GMAIL_TOKEN_URI", "https://oauth2.googleapis.com/token"),
            }
        },
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/drive"
        ],
        redirect_uri=GMAIL_REDIRECT_URI + "/api/sources/gmail/oauth2callback"
    )
    
    # Exchange the authorization code for a token
    flow.fetch_token(code=code)
    
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
            window.opener && window.opener.postMessage('gmail_auth_success', '*');
            window.close();
        </script>
        <p>Authentication successful. You can close this window.</p>
        </body></html>
    """)

@router.get("/download")
async def download_source(path: str,user=Depends(get_current_user)):
    """
    Télécharge un fichier source directement depuis Nextcloud.
    Le chemin doit être un chemin complet tel que retourné par l'API de prompt.
    """
    logger.info(f"Téléchargement de la source: {path}")
    
    try:
        # Vérifier si le chemin est un chemin Nextcloud
        if "original_path" in path:
            # Extraire le chemin original depuis les métadonnées
            import json
            metadata = json.loads(path)
            if "original_path" in metadata:
                path = metadata["original_path"]
            else:
                logger.error(f"Métadonnées invalides: {metadata}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Format de métadonnées invalide"
                )
        
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Utiliser les identifiants admin par défaut
        username = NEXTCLOUD_USERNAME
        password = NEXTCLOUD_PASSWORD
        
        # Récupérer le fichier depuis Nextcloud
        response = requests.get(
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            auth=(username, password),
            stream=True
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur Nextcloud: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du téléchargement du fichier depuis Nextcloud: {response.status_code}"
            )
        
        # Déterminer le type de contenu
        content_type = response.headers.get("Content-Type", "application/octet-stream")
        
        # Créer une réponse en streaming
        return StreamingResponse(
            response.iter_content(chunk_size=8192),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(path)}"
            }
        )
    
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de la source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du téléchargement de la source: {str(e)}"
        )


class GmailIngestRequest(BaseModel):
    labels: List[str] = ["INBOX", "SENT"]
    limit: int = 50
    query: Optional[str] = None
    force_reingest: bool = False
    no_attachments: bool = False


def run_gmail_ingestion(labels: List[str], limit: int, query: Optional[str], force_reingest: bool, no_attachments: bool, user_id: str = None):
    logger.debug(f"[GMAIL INGEST] Starting Gmail ingestion with labels={labels}, limit={limit}, query={query}, force_reingest={force_reingest}, no_attachments={no_attachments}, user_id={user_id}")
    try:
        # Import direct de la fonction d'ingestion
        from update_vdb.sources.ingest_gmail_emails import ingest_gmail_emails_to_qdrant
                
        result = ingest_gmail_emails_to_qdrant(
            labels=labels,
            limit=limit,
            query=query,
            force_reingest=force_reingest,
            save_attachments=not no_attachments,
            verbose=True,
            user_id=user_id
        )
        return result
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution de l'ingestion Gmail: {str(e)}")
        return {"status": "error", "error": str(e)}


@router.post("/ingest/gmail")
async def ingest_gmail_emails(request: GmailIngestRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    """Ingère des emails depuis Gmail en utilisant l'authentification OAuth2"""
    try:
        # Vérifier si les identifiants OAuth2 sont configurés
        if not os.path.exists(GMAIL_CREDENTIALS_PATH) and not (GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Les identifiants OAuth2 pour Gmail ne sont pas configurés"
            )
        # Extraire l'ID utilisateur Firebase
        user_id = user.get("uid") if user else None
        # Exécuter l'ingestion en arrière-plan avec user_id
        background_tasks.add_task(
            run_gmail_ingestion,
            request.labels,
            request.limit,
            request.query,
            request.force_reingest,
            request.no_attachments,
            user_id  # nouveau paramètre
        )
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "status": "accepted",
                "message": "L'ingestion des emails Gmail a été démarrée en arrière-plan",
                "details": {
                    "labels": request.labels,
                    "limit": request.limit,
                    "query": request.query,
                    "force_reingest": request.force_reingest,
                    "no_attachments": request.no_attachments,
                    "user_id": user_id
                }
            }
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'ingestion des emails Gmail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'ingestion des emails Gmail: {str(e)}"
        )


class OutlookIngestRequest(BaseModel):
    folders: List[str] = ["inbox", "sentitems"]
    limit: int = 50
    query: Optional[str] = None
    force_reingest: bool = False
    no_attachments: bool = False


def run_outlook_ingestion(folders: List[str], limit: int, query: Optional[str], force_reingest: bool, no_attachments: bool, user_id: str = None):
    """Exécute le script d'ingestion Outlook en arrière-plan"""
    try:
        script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                "update_vdb/sources/ingest_outlook_emails.py")
        
        user_id = user_id or "outlook"
        # Construire la commande
        cmd = [
            "python", script_path,
            "--limit", str(limit),
            "--user-id", user_id
        ]
        
        # Ajouter les dossiers
        for folder in folders:
            cmd.extend(["--folders", folder])
            
        # Ajouter les options facultatives
        if query:
            cmd.extend(["--query", query])
        if force_reingest:
            cmd.append("--force-reingest")
        if no_attachments:
            cmd.append("--no-attachments")
        
        # Exécuter le script en arrière-plan
        logger.info(f"Exécution de la commande: {' '.join(cmd)}")
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ne pas attendre la fin du processus
        return {"status": "started", "process_id": process.pid}
        
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution du script d'ingestion Outlook: {str(e)}")
        return {"status": "error", "error": str(e)}


from update_vdb.sources.ingest_outlook_emails import ingest_outlook_emails_to_qdrant

from update_vdb.sources.file_registry import FileRegistry

# Import SyncManager
from sync_service.core.sync_manager import SyncManager
from rag_engine.config import load_config

class SyncRequest(BaseModel):
    """Request model for starting a synchronization for a user"""
    provider: Optional[str] = Field(None, description="Optional provider name to sync (gmail, outlook, gdrive, personal-storage). If not provided, all providers for the user will be synchronized.")
    force_reingest: bool = Field(False, description="Whether to force reingestion of all documents")

@router.post("/sync/start")
async def sync_for_user(request: SyncRequest, user=Depends(get_current_user)):
    """Start a one-time synchronization for the specified user and provider.
    If no provider is specified, sync all configured providers for the user.
    
    This endpoint initiates an immediate synchronization operation without waiting for the scheduled sync.
    """
    try:
        user_id = user.get("uid") if user else None
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Load configuration
        config = load_config()
        
        # Override force_reingest setting if specified in request
        if request.force_reingest:
            if "sync" not in config:
                config["sync"] = {}
            for provider in ["gmail", "outlook", "gdrive", "personal-storage"]:
                if provider not in config["sync"]:
                    config["sync"][provider] = {}
                config["sync"][provider]["force_reingest"] = True
        
        # Initialize sync manager
        sync_manager = SyncManager(config)
        
        result = {"user_id": user_id, "success": True, "details": {}}
        
        # If provider specified, sync only that provider
        if request.provider:
            valid_providers = ["gmail", "outlook", "gdrive", "personal-storage"]
            if request.provider not in valid_providers:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "error": f"Invalid provider. Must be one of {valid_providers}"}
                )
                
            logger.info(f"Starting one-time sync for user {user_id} and provider {request.provider}")
            try:
                sync_manager.sync_provider(user_id, request.provider)
                result["details"][request.provider] = {"status": "completed"}
            except Exception as e:
                error_msg = str(e)
                result["details"][request.provider] = {"status": "error", "error": error_msg}
                result["success"] = False
        else:
            # Sync all providers configured for this user
            logger.info(f"Starting one-time sync for all providers of user {user_id}")
            user_providers = sync_manager.get_authenticated_users().get(user_id, [])
            
            if not user_providers:
                return JSONResponse(
                    content={"success": False, "error": "No authenticated providers found for this user"}
                )
            
            for provider in user_providers:
                try:
                    sync_manager.sync_provider(user_id, provider)
                    result["details"][provider] = {"status": "completed"}
                except Exception as e:
                    error_msg = str(e)
                    result["details"][provider] = {"status": "error", "error": error_msg}
                    result["success"] = False
        
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error starting sync: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)}
        )

@router.get("/gmail/recent_emails")
async def get_recent_gmail_emails(limit: int = 10, user=Depends(get_current_user)):
    """Récupère les emails Gmail récemment ajoutés à Qdrant en utilisant le registre de fichiers"""
    try:
        user_id = user.get("uid") if user else "gmail"
        creds_status = check_google_credentials(user_id)
        
        if not creds_status["authenticated"] or not creds_status["valid"]:
            error_msg = creds_status.get("error", "User not authenticated to Gmail or credentials invalid")
            return JSONResponse({"emails": [], "error": error_msg})
        
        registry = FileRegistry(user_id)
        gmail_files = registry.get_files_by_prefix("/Gmail/")
        
        emails = []
        for idx, file_path in enumerate(gmail_files[:limit]):
            file_info = registry.get_file_info(file_path)
            if not file_info or not file_info.get("metadata"):
                email_data = {
                    "subject": "(Sans objet)",
                    "sender": "Inconnu",
                    "date": None,
                    "content": "",
                    "has_attachments": False,
                    "email_id": file_path,
                    "doc_id": None
                }
                emails.append(email_data)
                continue
            metadata = file_info.get("metadata", {})
            email_data = {
                "subject": metadata.get("subject", "(Sans objet)"),
                "sender": metadata.get("sender", "Unknown"),
                "date": metadata.get("date"),
                "content": metadata.get("content_preview", "")[:500] + ("..." if len(metadata.get("content_preview", "")) > 500 else ""),
                "has_attachments": bool(metadata.get("has_attachments")),
                "email_id": metadata.get("email_id"),
                "doc_id": file_info.get("doc_id")
            }
            emails.append(email_data)
        
        emails.sort(key=lambda x: x.get("date", ""), reverse=True)
        emails = emails[:limit]
        logger.debug(f"[GMAIL] Returning {len(emails)} emails after sorting and limiting.")
        return JSONResponse({"emails": emails})
    except Exception as e:
        logger.error(f"Error retrieving recent Gmail emails: {str(e)}", exc_info=True)
        return JSONResponse({"emails": [], "error": str(e)})

@router.get("/outlook/recent_emails")
async def get_recent_outlook_emails(limit: int = 10, user=Depends(get_current_user)):
    """Récupère les emails Outlook récemment ajoutés à Qdrant en utilisant le registre de fichiers"""
    try:
        user_id = user.get("uid") if user else "outlook"
        creds_status = check_microsoft_credentials(user_id)        
        if not creds_status["authenticated"] or not creds_status["valid"]:
            error_msg = creds_status.get("error", "User not authenticated to Outlook or credentials invalid")
            return JSONResponse({"emails": [], "error": error_msg})
        
        registry = FileRegistry(user_id)
        outlook_files = registry.get_files_by_prefix("/Outlook/")
        
        emails = []
        for idx, file_path in enumerate(outlook_files[:limit]):
            file_info = registry.get_file_info(file_path)
            if not file_info or not file_info.get("metadata"):
                logger.debug(f"[OUTLOOK] No metadata for file {file_path}, returning default entry.")
                email_data = {
                    "subject": "(Sans objet)",
                    "sender": "Inconnu",
                    "date": None,
                    "content": "",
                    "has_attachments": False,
                    "email_id": file_path,
                    "doc_id": None
                }
                emails.append(email_data)
                continue
            metadata = file_info.get("metadata", {})
            email_data = {
                "subject": metadata.get("subject", "(Sans objet)"),
                "sender": metadata.get("sender", "Unknown"),
                "date": metadata.get("date"),
                "content": metadata.get("content_preview", "")[:500] + ("..." if len(metadata.get("content_preview", "")) > 500 else ""),
                "has_attachments": bool(metadata.get("has_attachments")),
                "email_id": metadata.get("email_id"),
                "doc_id": file_info.get("doc_id")
            }
            emails.append(email_data)
        emails.sort(key=lambda x: x.get("date", ""), reverse=True)
        emails = emails[:limit]
        logger.debug(f"[OUTLOOK] Returning {len(emails)} emails after sorting and limiting.")
        return JSONResponse({"emails": emails})
    except Exception as e:
        logger.error(f"Error retrieving recent Outlook emails: {str(e)}", exc_info=True)
        return JSONResponse({"emails": [], "error": str(e)})

@router.post("/ingest/outlook")
async def ingest_outlook_emails(request: OutlookIngestRequest, user=Depends(get_current_user)):
    """Ingère des emails depuis Outlook en utilisant l'authentification OAuth2"""
    try:
        # Extraire l'ID utilisateur Firebase
        user_id = user.get("uid") if user else "outlook"
        # Call the ingestion function directly, with user_id
        result = ingest_outlook_emails_to_qdrant(
            folders=request.folders,
            limit=request.limit,
            query=request.query,
            force_reingest=request.force_reingest,
            save_attachments=not request.no_attachments,
            verbose=True,
            user_id=user_id
        )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "done" if result.get("success") else "failed",
                "details": result
            }
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'ingestion des emails Outlook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'ingestion des emails Outlook: {str(e)}"
        )
