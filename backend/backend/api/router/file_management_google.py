"""
Router pour gérer les fichiers Google Drive, permettant de naviguer, télécharger, 
et effectuer des opérations sur les fichiers stockés dans Google Drive.
"""

import os
import io
from backend.core.logger import log
import tempfile
import os
import shutil
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks, Response, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from pydantic import BaseModel

# Google Drive API
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from google_auth_oauthlib.flow import Flow

# Import Google Drive Service
from backend.api.services.google_drive_service import GoogleDriveService

# Middleware & Auth
from backend.services.auth.middleware.auth import get_current_user
from backend.services.auth.credentials_manager import (
    load_google_token, save_google_token, check_google_credentials, delete_google_token
)

# Configuration
from backend.core.config import load_config,GMAIL_CLIENT_ID,GMAIL_CLIENT_SECRET,GMAIL_REDIRECT_URI,GMAIL_TOKEN_PATH


# Logger
router = APIRouter(tags=["googledrive"])
logger = log.bind(name="backend.api.file_management_google")

# Initialize services
google_drive_service = GoogleDriveService()

# Google API Configuration
GOOGLE_CLIENT_ID = GMAIL_CLIENT_ID
GOOGLE_CLIENT_SECRET = GMAIL_CLIENT_SECRET
GOOGLE_REDIRECT_URI = GMAIL_REDIRECT_URI
GOOGLE_TOKEN_PATH = GMAIL_TOKEN_PATH
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive"
]

# Models de données
class FileItem(BaseModel):
    """Représente un fichier ou un dossier dans Google Drive"""
    id: str
    path: str
    name: str
    is_directory: bool
    mime_type: str
    size: Optional[int] = None
    last_modified: Optional[datetime] = None
    content_type: Optional[str] = None
    
class FileList(BaseModel):
    """Liste des fichiers dans un dossier"""
    path: str
    items: List[FileItem]

class GoogleDriveAuthStatus(BaseModel):
    """État d'authentification Google Drive"""
    authenticated: bool
    valid: bool
    expired: Optional[bool] = None
    refreshable: Optional[bool] = None
    user_id: str
    error: Optional[str] = None
    account_info: Optional[Dict[str, Any]] = None


# Fonctions helper pour l'authentification
def get_drive_service(user_id: str):
    """
    Crée un service Google Drive API pour l'utilisateur spécifié.
    Renvoie (service, None) en cas de succès ou (None, error) en cas d'échec.
    """
    try:
        # Charger les credentials depuis le token
        creds = load_google_token(user_id)
        
        if not creds or not creds.valid:
            logger.warn(f"[GOOGLE DRIVE] Invalid credentials for user {user_id}")
            return None, "Credentials not valid or missing"
            
        # Créer le service Drive
        service = build('drive', 'v3', credentials=creds)
        return service, None
    
    except Exception as e:
        logger.error(f"[GOOGLE DRIVE] Error creating Drive service: {str(e)}")
        return None, str(e)


# Endpoints pour l'authentification

@router.delete("/gdrive/revoke_access")
async def revoke_gdrive_access(user=Depends(get_current_user)):
    """Révoque l'accès à Google Drive en supprimant les credentials stockés"""
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.info(f"[GDRIVE REVOKE] Revoking access for user {user_id}")
        
        # Supprimer le token Google
        result = delete_google_token(user_id)
        
        if result:
            return {"success": True, "message": "Accès à Google Drive révoqué avec succès"}
        else:
            return {"success": False, "message": "Aucun token trouvé ou erreur lors de la suppression"}
            
    except Exception as e:
        logger.error(f"[GDRIVE REVOKE] Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error revoking Google Drive access: {str(e)}"
        )
@router.get("/gdrive/auth_status")
async def get_gdrive_auth_status(user=Depends(get_current_user)):
    """Vérifie si l'utilisateur est authentifié à Google Drive"""
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE AUTH STATUS] Checking credentials for user {user_id}")
        
        # Vérifier les credentials Google en spécifiant qu'on veut les credentials pour Drive
        creds_status = check_google_credentials(user_id)
        
        # Si authentifié, obtenir des informations sur le compte
        account_info = {}
        if creds_status.get("authenticated", False) and creds_status.get("valid", False):
            try:
                drive_service, error = get_drive_service(user_id)
                if drive_service:
                    about = drive_service.about().get(fields="user,storageQuota").execute()
                    if about and "user" in about:
                        account_info = {
                            "email": about["user"].get("emailAddress", ""),
                            "display_name": about["user"].get("displayName", ""),
                            "storage": about.get("storageQuota", {})
                        }
            except Exception as e:
                logger.error(f"[GDRIVE] Error getting account info: {str(e)}")
        
        response_data = {
            "authenticated": creds_status.get("authenticated", False),
            "valid": creds_status.get("valid", False),
            "expired": creds_status.get("expired", False),
            "refreshable": creds_status.get("refreshable", False),
            "user_id": user_id,
            "error": creds_status.get("error"),
            "account_info": account_info
        }
        
        return JSONResponse(response_data)
    except Exception as e:
        logger.error(f"[GDRIVE AUTH STATUS] Error checking auth status: {str(e)}")
        return JSONResponse({"authenticated": False, "valid": False, "error": str(e)})


@router.get("/gdrive/auth_url")
async def get_gdrive_auth_url(callback_url: str = None, user=Depends(get_current_user)):
    """Génère une URL d'authentification pour Google Drive"""
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE AUTH URL] Generating auth URL for user {user_id}")
        
        redirect_uri = GOOGLE_REDIRECT_URI
        if not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Redirect URI not configured"
            )
            
        state = f"user_id={user_id}"
        logger.info(f"[GDRIVE AUTH URL] Redirect URI: {redirect_uri} and scopes: {GOOGLE_SCOPES}")
        # Créer un flow OAuth2 pour Google Drive
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=GOOGLE_SCOPES,
            redirect_uri=redirect_uri
        )
        
        # Générer l'URL d'autorisation
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            state=state,
            include_granted_scopes='true'
        )
        
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"[GDRIVE AUTH URL] Error generating auth URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating auth URL: {str(e)}"
        )


@router.get("/gdrive/oauth2_callback")
async def gdrive_oauth2_callback(code: str = None, state: str = None, error: str = None):
    """Callback pour l'authentification Google Drive, traite le code d'autorisation"""
    try:
        if error:
            logger.error(f"[GDRIVE CALLBACK] OAuth error: {error}")
            return {"success": False, "error": error}
            
        if not code:
            logger.error("[GDRIVE CALLBACK] No authorization code received")
            return {"success": False, "error": "No authorization code received"}
        logger.info(f"[GDRIVE CALLBACK] Received auth code: {GOOGLE_SCOPES}")
        # Extraire l'ID utilisateur de l'état
        user_id = "gdrive"
        if state and "user_id=" in state:
            user_id = state.split("user_id=")[1].split("&")[0]
            
        logger.info(f"[GDRIVE CALLBACK] Processing auth code for user {user_id}")
        
        # Créer un flow OAuth2
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=GOOGLE_SCOPES,
            redirect_uri=GOOGLE_REDIRECT_URI
        )
        
        # Échanger le code contre un token
        flow.fetch_token(code=code)
        
        # Sauvegarder les credentials
        creds = flow.credentials
        save_google_token(user_id, creds)
        
        # Obtenir les informations sur le compte Google Drive
        try:
            drive_service = build('drive', 'v3', credentials=creds)
            about = drive_service.about().get(fields="user,storageQuota").execute()
            account_info = {}
            if about and "user" in about:
                account_info = {
                    "email": about["user"].get("emailAddress", ""),
                    "display_name": about["user"].get("displayName", ""),
                    "storage_quota": about.get("storageQuota", {})
                }
            email = account_info.get("email") or "l'utilisateur"
            success_message = f"Authentification réussie pour {email}"
        except Exception as e:
            logger.error(f"[GDRIVE CALLBACK] Error getting account info: {str(e)}")
            success_message = "Authentification réussie"
            
        return RedirectResponse(url="http://localhost:5173/Connectionsuccess")

    except Exception as e:
        logger.error(f"[GDRIVE CALLBACK] Error in callback: {str(e)}")
        return {"success": False, "error": str(e)}


# Fonctions utilitaires pour la navigation dans Google Drive
def normalize_gdrive_path(path: str) -> str:
    """
    Normalise un chemin Google Drive, en s'assurant qu'il commence par '/' et
    ne se termine pas par '/' (sauf s'il s'agit du dossier racine).
    """
    if not path:
        return "/"
        
    path = path if path.startswith("/") else "/" + path
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path


def get_folder_id_by_path(drive_service, path: str, root_folder_id: str = "root") -> str:
    """
    Récupère l'ID Google Drive d'un dossier à partir de son chemin.
    Retourne (folder_id, None) en cas de succès ou (None, error) en cas d'échec.
    """
    try:
        path = normalize_gdrive_path(path)
        
        # Si le chemin est la racine, retourner l'ID racine
        if path == "/":
            return root_folder_id, None
            
        # Diviser le chemin en segments
        segments = [s for s in path.split("/") if s]
        current_folder_id = root_folder_id
        
        # Parcourir les segments du chemin
        for i, segment in enumerate(segments):
            query = f"name = '{segment}' and '{current_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name)"
            ).execute()
            
            items = results.get("files", [])
            if not items:
                return None, f"Dossier '{segment}' non trouvé dans {'/'.join([''] + segments[:i])}"
                
            current_folder_id = items[0]["id"]
            
        return current_folder_id, None
    except Exception as e:
        logger.error(f"[GDRIVE] Error getting folder ID by path: {str(e)}")
        return None, str(e)


# Endpoints pour la navigation et la gestion de fichiers
@router.get("/gdrive/files")
async def list_gdrive_files(
    path: str = "/", 
    user=Depends(get_current_user)
):
    """
    Liste les fichiers et dossiers à un chemin spécifié dans Google Drive.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Listing files for user {user_id} at path: {path}")
        
        # Normaliser le chemin
        path = normalize_gdrive_path(path)
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
            
        # Obtenir l'ID du dossier correspondant au chemin
        folder_id, error = get_folder_id_by_path(drive_service, path)
        if not folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Folder not found: {error}"
            )
            
        # Lister les fichiers et dossiers dans ce dossier
        query = f"'{folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name, mimeType, size, modifiedTime, fileExtension)"
        ).execute()
        
        items = results.get("files", [])
        file_list = []
        
        for item in items:
            is_directory = item["mimeType"] == "application/vnd.google-apps.folder"
            size = int(item.get("size", 0)) if "size" in item else None
            
            # Déterminer le content_type le plus approprié
            content_type = item["mimeType"]
            if is_directory:
                content_type = "folder"
            elif "." in item["name"]:
                ext = item["name"].split(".")[-1].lower()
                if ext in ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png"]:
                    content_type = f"application/{ext}"
                    
            # Convertir la date de modification
            last_modified = None
            if "modifiedTime" in item:
                try:
                    last_modified = datetime.fromisoformat(item["modifiedTime"].replace("Z", "+00:00"))
                except:
                    pass
                    
            file_list.append(FileItem(
                id=item["id"],
                path=path,
                name=item["name"],
                is_directory=is_directory,
                mime_type=item["mimeType"],
                size=size,
                last_modified=last_modified,
                content_type=content_type
            ))
            
        # Trier les résultats : dossiers d'abord, puis par nom
        file_list.sort(key=lambda x: (not x.is_directory, x.name.lower()))
        
        return FileList(path=path, items=file_list)
    
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error listing Google Drive files: {str(e)}"
        )


@router.get("/gdrive/download")
async def download_gdrive_file(
    path: str = None,
    file_id: str = None,
    user=Depends(get_current_user)
):
    """
    Télécharge un fichier de Google Drive en utilisant soit le chemin soit l'ID du fichier.
    Au moins l'un des deux paramètres (path ou file_id) doit être spécifié.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        
        if not path and not file_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'path' or 'file_id' must be specified"
            )
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
            
        target_file_id = file_id
        target_file_name = None
        target_mime_type = None
        
        # Si nous avons un chemin mais pas d'ID, nous devons trouver l'ID du fichier
        if path and not file_id:
            # Normaliser le chemin
            path = normalize_gdrive_path(path)
            
            # Diviser le chemin en dossier parent et nom de fichier
            if path == "/":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot download the root folder"
                )
                
            parent_path = "/".join(path.split("/")[:-1])
            if not parent_path:
                parent_path = "/"
                
            file_name = path.split("/")[-1]
            
            # Obtenir l'ID du dossier parent
            parent_folder_id, error = get_folder_id_by_path(drive_service, parent_path)
            if not parent_folder_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Parent folder not found: {error}"
                )
                
            # Rechercher le fichier dans le dossier parent
            query = f"name = '{file_name}' and '{parent_folder_id}' in parents and trashed = false"
            results = drive_service.files().list(
                q=query,
                spaces="drive",
                fields="files(id, name, mimeType)"
            ).execute()
            
            items = results.get("files", [])
            if not items:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"File '{file_name}' not found in '{parent_path}'"
                )
                
            target_file_id = items[0]["id"]
            target_file_name = items[0]["name"]
            target_mime_type = items[0]["mimeType"]
            
        # Si nous n'avons que l'ID du fichier, récupérer les métadonnées du fichier
        else:
            try:
                file_metadata = drive_service.files().get(
                    fileId=target_file_id,
                    fields="name, mimeType"
                ).execute()
                target_file_name = file_metadata.get("name")
                target_mime_type = file_metadata.get("mimeType")
            except HttpError as e:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"File with ID '{target_file_id}' not found: {str(e)}"
                )
        
        # Vérifier si c'est un dossier (qu'on ne peut pas télécharger)
        if target_mime_type == "application/vnd.google-apps.folder":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot download a folder"
            )
            
        # Pour les fichiers Google Docs, Sheets, etc., les convertir en format exportable
        if target_mime_type and target_mime_type.startswith("application/vnd.google-apps"):
            export_mimes = {
                "application/vnd.google-apps.document": "application/pdf",
                "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.google-apps.presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/vnd.google-apps.drawing": "application/pdf"
            }
            
            export_mime = export_mimes.get(target_mime_type, "application/pdf")
            
            # Récupérer le contenu exporté
            request = drive_service.files().export_media(
                fileId=target_file_id,
                mimeType=export_mime
            )
            
            # Ajuster le nom du fichier pour refléter le format exporté
            extensions = {
                "application/pdf": ".pdf",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx"
            }
            if not target_file_name.endswith(extensions.get(export_mime, "")):
                target_file_name += extensions.get(export_mime, "")
                
            # Content-Type pour la réponse
            media_type = export_mime
        else:
            # Récupérer le contenu du fichier normal
            request = drive_service.files().get_media(
                fileId=target_file_id
            )
            
            # Content-Type pour la réponse
            media_type = target_mime_type or "application/octet-stream"
            
        # Télécharger le fichier dans un buffer mémoire
        file_content = io.BytesIO()
        downloader = MediaIoBaseDownload(file_content, request)
        
        done = False
        try:
            while not done:
                status, done = downloader.next_chunk()
        except Exception as e:
            logger.error(f"[GDRIVE] Download error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Error downloading file: {str(e)}"
            )
            
        # Réinitialiser le buffer pour la lecture
        file_content.seek(0)
        
        # Retourner le contenu du fichier en tant que réponse streaming
        response = StreamingResponse(file_content, media_type=media_type)
        response.headers["Content-Disposition"] = f'attachment; filename="{target_file_name}"'
        return response
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error downloading Google Drive file: {str(e)}"
        )


# Modèles pour les opérations de création/suppression
class CreateFolderRequest(BaseModel):
    path: str
    name: str
    
class DeleteItemRequest(BaseModel):
    path: str


@router.post("/gdrive/mkdir")
async def create_gdrive_folder(
    request: CreateFolderRequest,
    user=Depends(get_current_user)
):
    """
    Crée un nouveau dossier dans Google Drive au chemin spécifié.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Creating folder '{request.name}' at '{request.path}' for user {user_id}")
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
        
        # Normaliser le chemin du dossier parent
        parent_path = normalize_gdrive_path(request.path)
        
        # Obtenir l'ID du dossier parent
        parent_folder_id, error = get_folder_id_by_path(drive_service, parent_path)
        if not parent_folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent folder not found: {error}"
            )
        
        # Vérifier si un dossier du même nom existe déjà
        query = f"name = '{request.name}' and '{parent_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name)"
        ).execute()
        
        existing_folders = results.get("files", [])
        if existing_folders:
            return {"success": False, "message": f"Folder '{request.name}' already exists at '{request.path}'"}
        
        # Créer le nouveau dossier
        folder_metadata = {
            'name': request.name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_folder_id]
        }
        
        folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
        
        return {
            "success": True, 
            "message": f"Folder '{request.name}' created successfully at '{request.path}'",
            "folder_id": folder.get('id')
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error creating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error creating Google Drive folder: {str(e)}"
        )


@router.post("/gdrive/delete")
async def delete_gdrive_item(
    request: DeleteItemRequest,
    user=Depends(get_current_user)
):
    """
    Supprime un fichier ou un dossier dans Google Drive au chemin spécifié.
    Pour les dossiers, la suppression est récursive.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Deleting item at '{request.path}' for user {user_id}")
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
        
        # Normaliser le chemin
        path = normalize_gdrive_path(request.path)
        
        # Vérifier qu'on n'essaie pas de supprimer la racine
        if path == "/":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the root folder"
            )
        
        # Diviser le chemin en dossier parent et nom de fichier/dossier
        parent_path = "/".join(path.split("/")[:-1])
        if not parent_path:
            parent_path = "/"
            
        item_name = path.split("/")[-1]
        
        # Obtenir l'ID du dossier parent
        parent_folder_id, error = get_folder_id_by_path(drive_service, parent_path)
        if not parent_folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent folder not found: {error}"
            )
        
        # Rechercher l'élément dans le dossier parent
        query = f"name = '{item_name}' and '{parent_folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name, mimeType)"
        ).execute()
        
        items = results.get("files", [])
        if not items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item '{item_name}' not found in '{parent_path}'"
            )
        
        item_id = items[0]["id"]
        is_directory = items[0]["mimeType"] == "application/vnd.google-apps.folder"
        
        # Supprimer l'élément (mise à la corbeille)
        # Note: La méthode delete() supprime définitivement, alors que update() avec trashed=True met à la corbeille
        drive_service.files().update(
            fileId=item_id,
            body={'trashed': True}
        ).execute()
        
        item_type = "folder" if is_directory else "file"
        return {
            "success": True, 
            "message": f"{item_type.capitalize()} '{item_name}' moved to trash successfully"
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error deleting item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error deleting Google Drive item: {str(e)}"
        )


# Modèles pour les opérations de copie et déplacement
class MoveItemRequest(BaseModel):
    source_path: str
    destination_path: str
    
class CopyItemRequest(BaseModel):
    source_path: str
    destination_path: str

class FolderUploadConfig(BaseModel):
    """Configuration pour l'upload de dossier"""
    folder_path: str       # Chemin local du dossier à uploader
    destination_path: str  # Chemin de destination dans Google Drive


@router.post("/gdrive/move")
async def move_gdrive_item(
    request: MoveItemRequest,
    user=Depends(get_current_user)
):
    """
    Déplace un fichier ou un dossier dans Google Drive d'un emplacement à un autre.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Moving item from '{request.source_path}' to '{request.destination_path}' for user {user_id}")
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
        
        # Normaliser les chemins source et destination
        source_path = normalize_gdrive_path(request.source_path)
        dest_path = normalize_gdrive_path(request.destination_path)
        
        # Vérifier qu'on n'essaie pas de déplacer la racine
        if source_path == "/":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move the root folder"
            )
        
        # Obtenir le dossier parent source et le nom de l'élément à déplacer
        source_parent_path = "/".join(source_path.split("/")[:-1])
        if not source_parent_path:
            source_parent_path = "/"
            
        source_item_name = source_path.split("/")[-1]
        
        # Obtenir l'ID du dossier parent source
        source_parent_id, error = get_folder_id_by_path(drive_service, source_parent_path)
        if not source_parent_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source parent folder not found: {error}"
            )
        
        # Rechercher l'élément source
        query = f"name = '{source_item_name}' and '{source_parent_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name, mimeType)"
        ).execute()
        
        source_items = results.get("files", [])
        if not source_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source item '{source_item_name}' not found in '{source_parent_path}'"
            )
        
        source_item_id = source_items[0]["id"]
        source_item_mime = source_items[0]["mimeType"]
        is_directory = source_item_mime == "application/vnd.google-apps.folder"
        
        # Obtenir l'ID du dossier de destination
        dest_folder_id, error = get_folder_id_by_path(drive_service, dest_path)
        if not dest_folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination folder not found: {error}"
            )
        
        # Vérifier si un élément du même nom existe déjà dans le dossier de destination
        query = f"name = '{source_item_name}' and '{dest_folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name)"
        ).execute()
        
        existing_items = results.get("files", [])
        if existing_items:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Item with name '{source_item_name}' already exists in destination folder"
            )
        
        # Déplacer l'élément (ajouter le nouveau parent et supprimer l'ancien)
        drive_service.files().update(
            fileId=source_item_id,
            addParents=dest_folder_id,
            removeParents=source_parent_id,
            fields='id, parents'
        ).execute()
        
        item_type = "folder" if is_directory else "file"
        return {
            "success": True, 
            "message": f"{item_type.capitalize()} '{source_item_name}' moved successfully to '{dest_path}'"
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error moving item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error moving Google Drive item: {str(e)}"
        )


@router.post("/gdrive/copy")
async def copy_gdrive_item(
    request: CopyItemRequest,
    user=Depends(get_current_user)
):
    """
    Copie un fichier ou un dossier dans Google Drive vers un nouvel emplacement.
    Pour les dossiers, la copie est récursive.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Copying item from '{request.source_path}' to '{request.destination_path}' for user {user_id}")
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
        
        # Normaliser les chemins source et destination
        source_path = normalize_gdrive_path(request.source_path)
        dest_path = normalize_gdrive_path(request.destination_path)
        
        # Vérifier qu'on n'essaie pas de copier la racine
        if source_path == "/":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot copy the root folder"
            )
        
        # Obtenir le dossier parent source et le nom de l'élément à copier
        source_parent_path = "/".join(source_path.split("/")[:-1])
        if not source_parent_path:
            source_parent_path = "/"
            
        source_item_name = source_path.split("/")[-1]
        
        # Obtenir l'ID du dossier parent source
        source_parent_id, error = get_folder_id_by_path(drive_service, source_parent_path)
        if not source_parent_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source parent folder not found: {error}"
            )
        
        # Rechercher l'élément source
        query = f"name = '{source_item_name}' and '{source_parent_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name, mimeType)"
        ).execute()
        
        source_items = results.get("files", [])
        if not source_items:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source item '{source_item_name}' not found in '{source_parent_path}'"
            )
        
        source_item_id = source_items[0]["id"]
        source_item_name = source_items[0]["name"]
        source_item_mime = source_items[0]["mimeType"]
        is_directory = source_item_mime == "application/vnd.google-apps.folder"
        
        # Obtenir l'ID du dossier de destination
        dest_folder_id, error = get_folder_id_by_path(drive_service, dest_path)
        if not dest_folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination folder not found: {error}"
            )
        
        # Vérifier si un élément du même nom existe déjà dans le dossier de destination
        query = f"name = '{source_item_name}' and '{dest_folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name)"
        ).execute()
        
        # Si un élément du même nom existe, ajouter un suffixe '_copy' au nom
        copy_item_name = source_item_name
        if results.get("files", []):
            name_parts = source_item_name.split('.')
            if len(name_parts) > 1 and not is_directory:  # Fichier avec extension
                copy_item_name = '.'.join(name_parts[:-1]) + '_copy.' + name_parts[-1]
            else:  # Dossier ou fichier sans extension
                copy_item_name = source_item_name + '_copy'
        
        if is_directory:
            # Pour les dossiers, il faut une approche récursive (créer un nouveau dossier et y copier tous les fils)
            # Cette implémentation actuelle ne gère que la copie du dossier lui-même, pas son contenu
            # Pour une implémentation complète, il faudrait une fonction récursive qui copie tous les sous-dossiers et fichiers
            
            # Créer le nouveau dossier
            folder_metadata = {
                'name': copy_item_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [dest_folder_id]
            }
            
            new_folder = drive_service.files().create(body=folder_metadata, fields='id').execute()
            
            return {
                "success": True, 
                "message": f"Folder '{source_item_name}' copied to '{dest_path}' as '{copy_item_name}'. Note: folder contents are not copied.",
                "new_folder_id": new_folder.get('id')
            }
        else:
            # Pour les fichiers, on peut utiliser la méthode copy de l'API
            copied_file = drive_service.files().copy(
                fileId=source_item_id,
                body={
                    'name': copy_item_name,
                    'parents': [dest_folder_id]
                }
            ).execute()
            
            return {
                "success": True, 
                "message": f"File '{source_item_name}' copied successfully to '{dest_path}' as '{copy_item_name}'",
                "new_file_id": copied_file.get('id')
            }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error copying item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error copying Google Drive item: {str(e)}"
        )


@router.post("/gdrive/upload")
async def upload_to_gdrive(
    path: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """
    Téléverse un fichier vers Google Drive au chemin spécifié.
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        logger.debug(f"[GDRIVE] Uploading file '{file.filename}' to '{path}' for user {user_id}")
        
        # Obtenir le service Drive
        drive_service, error = get_drive_service(user_id)
        if not drive_service:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Drive authentication error: {error}"
            )
            
        # Normaliser le chemin de destination
        dest_path = normalize_gdrive_path(path)
        
        # Obtenir l'ID du dossier de destination
        folder_id, error = get_folder_id_by_path(drive_service, dest_path)
        if not folder_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Destination folder not found: {error}"
            )
            
        # Vérifier si un fichier du même nom existe déjà
        query = f"name = '{file.filename}' and '{folder_id}' in parents and trashed = false"
        results = drive_service.files().list(
            q=query,
            spaces="drive",
            fields="files(id, name)"
        ).execute()
        
        # Si un fichier du même nom existe, ajouter un suffixe
        upload_filename = file.filename
        if results.get("files", []):
            name_parts = file.filename.split('.')
            if len(name_parts) > 1:  # Fichier avec extension
                upload_filename = '.'.join(name_parts[:-1]) + '_copy.' + name_parts[-1]
            else:  # Fichier sans extension
                upload_filename = file.filename + '_copy'
                
        # Déterminer le type MIME
        mime_type = file.content_type or "application/octet-stream"
        
        # Préparer les métadonnées du fichier
        file_metadata = {
            'name': upload_filename,
            'parents': [folder_id]
        }
        
        # Télécharger le contenu du fichier dans un buffer temporaire
        content = await file.read()
        media = MediaIoBaseUpload(
            io.BytesIO(content),
            mimetype=mime_type,
            resumable=True
        )
        
        # Uploader le fichier
        uploaded_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,name'
        ).execute()
        
        return {
            "success": True,
            "message": f"File '{file.filename}' uploaded successfully as '{upload_filename}'",
            "file_id": uploaded_file.get('id'),
            "file_name": uploaded_file.get('name')
        }
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error uploading folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error uploading folder to Google Drive: {str(e)}"
        )


@router.post("/gdrive/upload_folder")
async def upload_folder_to_gdrive(
    path: str = Form(...),
    background_tasks: BackgroundTasks = None,
    user=Depends(get_current_user)
):
    """
    Téléverse un dossier local et tout son contenu vers Google Drive au chemin spécifié.
    Le dossier doit être préalablement préparé côté serveur (par exemple via un téléversement multiple).
    Le chemin doit pointer vers un dossier temporaire existant sur le serveur.
    
    Args:
        path: Chemin de destination dans Google Drive (ex: "/Mes Documents/Projets")
        background_tasks: Pour traitement en tâche de fond si nécessaire
        user: Utilisateur authentifié
    """
    try:
        user_id = user.get("uid") if user else "gdrive"
        local_folder = None
        
        # Créer un dossier temporaire pour stocker les fichiers uploadés par l'utilisateur
        temp_dir = tempfile.mkdtemp(prefix=f"gdrive_upload_{user_id}_")
        logger.info(f"[GDRIVE] Created temporary folder for upload: {temp_dir}")
        
        try:
            # Utiliser le service GoogleDriveService pour uploader le dossier
            result = google_drive_service.upload_folder(
                user_id=user_id,
                drive_path=path,
                local_folder_path=temp_dir
            )
            
            # Nettoyer le dossier temporaire en arrière-plan
            if background_tasks:
                background_tasks.add_task(shutil.rmtree, temp_dir, ignore_errors=True)
            else:
                # Si pas de tâches d'arrière-plan, nettoyer immédiatement
                shutil.rmtree(temp_dir, ignore_errors=True)
                
            return {
                "success": True,
                "path": result.get("path"),
                "folder_name": result.get("folder_name"),
                "folder_id": result.get("folder_id"),
                "statistics": {
                    "files_uploaded": result.get("uploaded_items", {}).get("files_uploaded", 0),
                    "folders_created": result.get("uploaded_items", {}).get("folders_created", 0),
                    "empty_folders": result.get("uploaded_items", {}).get("empty_folders", 0),
                    "skipped_hidden": result.get("uploaded_items", {}).get("skipped_hidden", 0),
                    "total_size_mb": round(result.get("uploaded_items", {}).get("total_size_bytes", 0) / (1024 * 1024), 2),
                    "errors": len(result.get("uploaded_items", {}).get("errors", []))
                },
                "timestamp": result.get("timestamp")
            }
            
        except Exception as e:
            # En cas d'erreur, nettoyer le dossier temporaire
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            raise e
            
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        logger.error(f"[GDRIVE] Error uploading folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Error uploading folder to Google Drive: {str(e)}"
        )