"""
Router pour gérer le téléchargement des sources depuis Nextcloud.
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
from backend.core.config import load_config,GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REDIRECT_URI,GMAIL_TOKEN_PATH,OUTLOOK_CLIENT_ID,OUTLOOK_TOKEN_PATH,GMAIL_AUTH_URI,GMAIL_TOKEN_URI
from backend.services.auth.google_auth import check_google_auth_services
from backend.services.auth.microsoft_auth import check_microsoft_auth_services

# Initialisation du router et du logger
# Note: Le préfixe /api est maintenant défini dans main.py
router = APIRouter(tags=["sources"])
logger = log.bind(name="backend.api.adapters_auth")

from fastapi import Request, HTTPException, status, Depends
from backend.services.auth.middleware.auth import get_current_user

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

@router.delete("/outlook/revoke_access")
async def revoke_outlook_access(user=Depends(get_current_user)):
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

@router.get("/outlook/auth")
async def get_outlook_auth_url(callback_url: str = None, user=Depends(get_current_user)):
    """Generate Outlook OAuth URL for frontend redirect with token cache support"""
    try:
        user_id = user.get("uid") if user else "outlook"
        logger.info(f"[OUTLOOK AUTH] Generating auth URL for user {user_id}")
        
        # Retrieve application credentials
        client_id = OUTLOOK_CLIENT_ID
        
        if not client_id:
            return JSONResponse({"error": "Microsoft client configuration incomplete"}, status_code=500)
        
        # Define redirect URI (either use the provided one or default)
        redirect_uri = callback_url or "https://chardouin.fr/api/sources/outlook/callback"
        
        # Définir les scopes demandés
        SCOPES = ['Mail.Read', 'User.Read']
        
        # Charger le cache de token si existant
        from backend.services.auth.credentials_manager import load_microsoft_token
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
        
        state_data = json.dumps({"user_id": user_id, "redirect_uri": redirect_uri})
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
            state_data = base64.urlsafe_b64decode(state.encode()).decode()
            user_id = json.loads(state_data).get("user_id")
            redirect_uri = json.loads(state_data).get("redirect_uri")
        else:
            user_id = "outlook"
            redirect_uri = "https://chardouin.fr/api/sources/outlook/callback"
        logger.info(f"[OUTLOOK CALLBACK] Received auth code for user {user_id} with redirect_uri {redirect_uri}")

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
        client_id = OUTLOOK_CLIENT_ID
        
        if not client_id:
            logger.error("[OUTLOOK CALLBACK] Microsoft credentials incomplete")
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
                "auth_uri": GMAIL_AUTH_URI,
                "token_uri": GMAIL_TOKEN_URI,
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
                "auth_uri": GMAIL_AUTH_URI,
                "token_uri": GMAIL_TOKEN_URI,
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
        from backend.services.ingestion.services.ingest_google_emails import batch_ingest_gmail_emails_to_qdrant
                
        result = batch_ingest_gmail_emails_to_qdrant(
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
        if not (GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET):
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


from backend.services.ingestion.services.ingest_microsoft_emails import ingest_outlook_emails_to_qdrant

from backend.services.storage.file_registry import FileRegistry

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
        gmail_files = registry.get_files_by_prefix("/google_email/")
        
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
                    "doc_id": None,
                    "is_classified": "not classified"
                }
                emails.append(email_data)
                continue
            metadata = file_info.get("metadata", {})
            email_data = {
                "subject": metadata.get("subject", "(Sans objet)"),
                "sender": metadata.get("sender", "Unknown"),
                "date": metadata.get("date"),
                "content": metadata.get("body_text", "")[:500] + ("..." if len(metadata.get("content_preview", "")) > 500 else ""),
                "has_attachments": bool(metadata.get("has_attachments")),
                "email_id": metadata.get("email_id"),
                "doc_id": file_info.get("doc_id"),
                "is_classified": metadata.get("is_classified", "not classified")
            }
            emails.append(email_data)
        def parse_email_date(email):
            try:
                date_str = email.get("date")
                logger.debug(f"Email date: {date_str}")
                if date_str is None or date_str == "":
                    return datetime.min.replace(tzinfo=timezone.utc)
                dt = parsedate_to_datetime(date_str)
                logger.debug(f"Parsed email date: {dt}")
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except Exception as e:
                logger.warning(f"Error parsing email date: {e}, using default date")
                return datetime.min.replace(tzinfo=timezone.utc)

        emails.sort(key=parse_email_date, reverse=True)
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
        outlook_files = registry.get_files_by_prefix("/microsoft_email/")
        
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
                    "doc_id": None,
                    "is_classified": "not classified"
                }
                emails.append(email_data)
                continue
            metadata = file_info.get("metadata", {})
            email_data = {
                "subject": metadata.get("subject", "(Sans objet)"),
                "sender": metadata.get("sender", "Unknown"),
                "date": metadata.get("date"),
                "content": metadata.get("body_text", "")[:500] + ("..." if len(metadata.get("body_text", "")) > 500 else ""),
                "has_attachments": bool(metadata.get("has_attachments")),
                "email_id": metadata.get("email_id"),
                "doc_id": file_info.get("doc_id"),
                "is_classified": metadata.get("is_classified", "not classified")
            }
            emails.append(email_data)
        emails.sort(key=lambda x: x.get("date", ""), reverse=True)
        emails = emails[:limit]
        logger.warning(f"[OUTLOOK] Returning {len(emails)} emails after sorting and limiting.")
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
# Import SyncManager
from backend.services.sync_service.core.sync_manager import SyncManager

class SyncRequest(BaseModel):
    """Request model for starting a synchronization for a user"""
    provider: Optional[str] = Field(None, description="Optional provider name to sync (gmail, outlook, gdrive, onedrive, personal_storage). If not provided, all providers for the user will be synchronized.")
    force_reingest: bool = Field(False, description="Whether to force reingestion of all documents")

from fastapi.background import BackgroundTasks
import threading
import uuid

# Dictionary to store sync status information
sync_status = {}

def run_provider_sync(sync_id: str, user_id: str, provider: str, config: dict):
    """Run synchronization for a specific provider in the background"""
    try:
        sync_manager = SyncManager(config)
        if provider == "microsoft":
            provider = "outlook"
        elif provider == "google":
            provider = "gmail"

        logger.info(f"Background sync {sync_id}: Starting for user {user_id} and provider {provider}")
        sync_status[sync_id]["status"] = "in_progress"
        
        sync_manager.sync_provider(user_id, provider)
        
        sync_status[sync_id]["status"] = "completed"
        logger.info(f"Background sync {sync_id}: Completed for user {user_id} and provider {provider}")
    except Exception as e:
        error_msg = str(e)
        sync_status[sync_id]["status"] = "error"
        sync_status[sync_id]["error"] = error_msg
        logger.error(f"Background sync {sync_id}: Error syncing {provider} for user {user_id}: {error_msg}")

def run_all_providers_sync(sync_id: str, user_id: str, providers: list, config: dict):
    """Run synchronization for all providers in the background"""
    sync_status[sync_id]["details"] = {}
    
    for provider in providers:
        try:
            sync_status[sync_id]["details"][provider] = {"status": "in_progress"}
            
            sync_manager = SyncManager(config)
            effective_provider = "outlook" if provider == "microsoft" else provider
            
            logger.info(f"Background sync {sync_id}: Starting for user {user_id} and provider {provider}")
            
            sync_manager.sync_provider(user_id, effective_provider)
            
            sync_status[sync_id]["details"][provider] = {"status": "completed"}
            logger.info(f"Background sync {sync_id}: Completed for user {user_id} and provider {provider}")
            
        except Exception as e:
            error_msg = str(e)
            sync_status[sync_id]["details"][provider] = {"status": "error", "error": error_msg}
            logger.error(f"Background sync {sync_id}: Error syncing {provider} for user {user_id}: {error_msg}")
    
    # Set overall status based on provider results
    has_errors = any(details.get("status") == "error" for provider, details in sync_status[sync_id]["details"].items())
    sync_status[sync_id]["status"] = "error" if has_errors else "completed"

@router.post("/sync/start")
async def sync_for_user(request: SyncRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    # Debug log the request
    logger.info(f"Sync request received: {request}")
    """Start a one-time synchronization for the specified user and provider in the background.
    If no provider is specified, sync all configured providers for the user.
    
    This endpoint initiates an immediate background synchronization operation without waiting for completion.
    It returns a sync_id that can be used to check the status of the synchronization.
    """
    try:
        user_id = user.get("uid")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Generate a unique sync ID
        sync_id = str(uuid.uuid4())
        
        # Load configuration
        config = load_config()
         
        # Override force_reingest setting if specified in request
        if request.force_reingest:
            if "sync" not in config:
                config["sync"] = {}
            for provider in ["gmail", "outlook", "gdrive", "personal_storage","google"]:
                if provider not in config["sync"]:
                    config["sync"][provider] = {}
                config["sync"][provider]["force_reingest"] = False
        
        # Initialize sync manager just to check authenticated users
        sync_manager = SyncManager(config)
        
        # Initialize sync status record
        sync_status[sync_id] = {
            "user_id": user_id,
            "status": "pending",  # pending, in_progress, completed, error
            "started_at": datetime.now().isoformat()
        }
        
        # If provider specified, sync only that provider
        if request.provider:
            valid_providers = ["gmail", "outlook", "gdrive", "onedrive", "personal_storage", "microsoft", "google"]
            if request.provider not in valid_providers:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "error": f"Invalid provider. Must be one of {valid_providers}"}
                )

            logger.info(f"Initiating background sync {sync_id} for user {user_id} and provider {request.provider}")
            
            # Start background thread for syncing
            thread = threading.Thread(
                target=run_provider_sync, 
                args=(sync_id, user_id, request.provider, config)
            )
            thread.daemon = True
            thread.start()
            
            return JSONResponse(content={
                "success": True,
                "message": f"Synchronization started in the background for provider: {request.provider}",
                "sync_id": sync_id
            })
        else:
            # Sync all providers configured for this user
            logger.info(f"Initiating background sync {sync_id} for all providers of user {user_id}")
            user_providers = sync_manager.get_authenticated_users().get(user_id, [])
            
            if not user_providers:
                return JSONResponse(
                    content={"success": False, "error": "No authenticated providers found for this user"}
                )
            
            # Start background thread for syncing all providers
            thread = threading.Thread(
                target=run_all_providers_sync,
                args=(sync_id, user_id, user_providers, config)
            )
            thread.daemon = True
            thread.start()
            
            return JSONResponse(content={
                "success": True, 
                "message": "Synchronization started in the background for all providers", 
                "sync_id": sync_id,
                "providers": user_providers
            })
    except Exception as e:
        logger.error(f"Error starting background sync: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)}
        )

@router.get("/sync/status/{sync_id}")
async def check_sync_status(sync_id: str, user=Depends(get_current_user)):
    """Check the status of a background synchronization process"""
    try:
        user_id = user.get("uid")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if sync_id not in sync_status:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "error": "Sync ID not found"}
            )
            
        # Check if this sync belongs to the requesting user
        if sync_status[sync_id]["user_id"] != user_id:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "error": "You do not have permission to view this sync status"}
            )
            
        # Add current time to response
        status_response = dict(sync_status[sync_id])
        status_response["checked_at"] = datetime.now().isoformat()
        
        return JSONResponse(content={
            "success": True,
            "sync_id": sync_id,
            "status": status_response
        })
    except Exception as e:
        logger.error(f"Error checking sync status: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)}
        )

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
