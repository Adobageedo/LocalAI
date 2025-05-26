import os
import sys
import requests
import time
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Union
from pydantic import BaseModel
import logging
import xml.etree.ElementTree as ET
import tempfile
import shutil

# Import direct des fonctions d'ingestion Nextcloud
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from update_vdb.sources.ingest_nextcloud_documents import process_directory, DEFAULT_SUPPORTED_EXTENSIONS
from rag_engine.config import load_config
# Authentification supprimée

# Initialisation du logger
logger = logging.getLogger(__name__)

# Création du routeur FastAPI pour Nextcloud
router = APIRouter(prefix="/api/nextcloud", tags=["nextcloud"])

# Configuration Nextcloud à partir des variables d'environnement
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")

# Modèles de données
class FileInfo(BaseModel):
    id: str
    name: str
    path: str
    type: str
    size: int
    lastModified: str
    isDirectory: bool

class FileList(BaseModel):
    files: List[FileInfo]
    
class ShareRequest(BaseModel):
    path: str
    shareType: int = 3  # 3 = public link by default
    permissions: int = 1  # 1 = read-only by default
    shareWith: Optional[str] = None
    
class ShareInfo(BaseModel):
    id: str
    shareType: int
    path: str
    permissions: int
    shareWith: Optional[str] = None
    url: Optional[str] = None
    
class ShareList(BaseModel):
    shares: List[ShareInfo]

class DirectoryRequest(BaseModel):
    path: str

class MoveItemRequest(BaseModel):
    sourcePath: str
    targetPath: str

# Fonction pour obtenir les identifiants Nextcloud d'un utilisateur
async def get_nextcloud_credentials(request: Request = None):
    """Obtient les identifiants Nextcloud - retourne toujours les identifiants admin (mode sans auth)"""
    # Mode sans authentification - utiliser les identifiants admin par défaut
    return {
        "username": NEXTCLOUD_USERNAME,
        "password": NEXTCLOUD_PASSWORD
    }

# Fonction pour vérifier si Nextcloud est accessible
def is_nextcloud_accessible():
    try:
        # Utiliser PROPFIND comme dans list_files() au lieu de GET
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{NEXTCLOUD_USERNAME}/"
        headers = {
            "Depth": "1",
            "Content-Type": "application/xml"
        }
        
        body = """
        <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
            <d:prop>
                <d:getlastmodified />
            </d:prop>
        </d:propfind>
        """
        
        response = requests.request(
            "PROPFIND",
            url,
            headers=headers,
            data=body,
            auth=(NEXTCLOUD_USERNAME, NEXTCLOUD_PASSWORD)
        )
        
        return response.status_code == 207  # WebDAV success status
    except Exception as e:
        logger.error(f"Erreur de connexion à Nextcloud: {str(e)}")
        return False

# Route pour vérifier si Nextcloud est accessible
@router.get("/status")
async def check_nextcloud_status():
    logger.info("Vérification de l'accessibilité de Nextcloud")
    
    is_accessible = is_nextcloud_accessible()
    
    if not is_accessible:
        logger.warning("Nextcloud n'est pas accessible")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nextcloud n'est pas accessible"
        )
    
    logger.info("Nextcloud est accessible")
    return {"status": "ok", "message": "Nextcloud est accessible"}

# Route pour lister les fichiers
@router.get("/files", response_model=FileList)
async def list_files(path: str = "/", request: Request = None):
    logger.info(f"Liste des fichiers dans le répertoire: {path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Préparer la requête PROPFIND pour WebDAV
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}"
        logger.debug(f"URL de la requête WebDAV: {url}")
        
        headers = {
            "Depth": "1",
            "Content-Type": "application/xml"
        }
        
        body = """
        <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
            <d:prop>
                <d:getlastmodified />
                <d:getetag />
                <d:getcontenttype />
                <d:resourcetype />
                <d:getcontentlength />
                <oc:fileid />
            </d:prop>
        </d:propfind>
        """
        
        response = requests.request(
            "PROPFIND",
            url,
            headers=headers,
            data=body,
            auth=(username, password)
        )
        
        if response.status_code != 207:
            logger.error(f"Erreur lors de la récupération des fichiers: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la récupération des fichiers: {response.status_code}"
            )
        
        # Traiter la réponse XML WebDAV
        try:
            root = ET.fromstring(response.content)
            
            # Définir les namespaces
            namespaces = {
                'd': 'DAV:',
                'oc': 'http://owncloud.org/ns',
            }
            
            files = []
            
            # Le premier élément est généralement le répertoire lui-même, donc on commence à i=1
            for i, response_elem in enumerate(root.findall('.//d:response', namespaces)):
                # Ignorer le premier élément (qui est le répertoire courant) si on n'est pas à la racine
                if i == 0 and path != "/":
                    continue
                    
                href = response_elem.find('./d:href', namespaces).text
                
                # Ignorer les éléments qui ne sont pas dans le répertoire courant
                if not href.startswith(f"/remote.php/dav/files/{username}{path}"):
                    continue
                    
                # Extraire le nom du fichier à partir de href
                file_path = href.replace(f"/remote.php/dav/files/{username}", "")
                file_name = os.path.basename(file_path.rstrip('/'))
                
                # Ignorer les fichiers vides ou cachés
                if not file_name or file_name.startswith('.'):
                    continue
                    
                # Déterminer si c'est un répertoire
                resourcetype = response_elem.find('./d:propstat/d:prop/d:resourcetype', namespaces)
                is_directory = resourcetype is not None and resourcetype.find('./d:collection', namespaces) is not None
                
                # Taille du fichier
                size_elem = response_elem.find('./d:propstat/d:prop/d:getcontentlength', namespaces)
                size = int(size_elem.text) if size_elem is not None and size_elem.text else 0
                
                # Date de dernière modification
                lastmod_elem = response_elem.find('./d:propstat/d:prop/d:getlastmodified', namespaces)
                lastmod = lastmod_elem.text if lastmod_elem is not None else ""
                
                # ID du fichier
                fileid_elem = response_elem.find('./d:propstat/d:prop/oc:fileid', namespaces)
                file_id = fileid_elem.text if fileid_elem is not None else ""
                
                file_info = FileInfo(
                    id=file_id or file_name,
                    name=file_name,
                    path=file_path,
                    type="directory" if is_directory else "file",
                    size=size,
                    lastModified=lastmod,
                    isDirectory=is_directory
                )
                
                files.append(file_info)
        except Exception as xml_error:
            logger.error(f"Erreur lors du parsing XML: {str(xml_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Erreur lors du parsing de la réponse: {str(xml_error)}"
            )
        
        logger.info(f"Récupéré {len(files)} fichiers/dossiers")
        return FileList(files=files)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des fichiers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour télécharger un fichier
@router.get("/download")
async def download_file(path: str, request: Request = None):
    logger.info(f"Téléchargement du fichier: {path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Construire l'URL du fichier
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}"
        logger.debug(f"URL de téléchargement: {url}")
        
        # Récupérer le fichier depuis Nextcloud
        response = requests.get(
            url,
            auth=(username, password),
            stream=True  # Important pour les gros fichiers
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur lors du téléchargement du fichier: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fichier non trouvé ou inaccessible: {path}"
            )
        
        # Déterminer le type MIME à partir des headers de la réponse
        content_type = response.headers.get('Content-Type', 'application/octet-stream')
        
        # Créer une réponse en streaming
        return StreamingResponse(
            response.iter_content(chunk_size=8192),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(path)}"
            }
        )
    
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement du fichier: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour uploader un fichier
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
    request: Request = None
):
    logger.info(f"Upload du fichier {file.filename} dans le répertoire: {path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        if not path.endswith("/"):
            path = path + "/"
        
        # Construire l'URL de destination
        destination_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}{file.filename}"
        logger.debug(f"URL d'upload: {destination_url}")
        
        # Créer un fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            # Copier le contenu du fichier uploadé dans le fichier temporaire
            shutil.copyfileobj(file.file, temp_file)
        
        # Uploader le fichier vers Nextcloud
        with open(temp_file.name, "rb") as f:
            response = requests.put(
                destination_url,
                data=f,
                auth=(username, password)
            )
        
        # Supprimer le fichier temporaire
        os.unlink(temp_file.name)
        
        if response.status_code not in (201, 204):
            logger.error(f"Erreur lors de l'upload du fichier: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de l'upload du fichier: {response.status_code}"
            )
        
        logger.info(f"Fichier {file.filename} uploadé avec succès")
        return {"success": True, "message": f"Fichier {file.filename} uploadé avec succès"}
    
    except Exception as e:
        logger.error(f"Erreur lors de l'upload du fichier: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour créer un dossier
@router.post("/directory")
async def create_directory(
    dir_request: DirectoryRequest,
    request: Request = None
):
    logger.info(f"Création du dossier: {dir_request.path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser le chemin
        path = dir_request.path
        if not path.startswith("/"):
            path = "/" + path
        
        # Construire l'URL de destination
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}"
        logger.debug(f"URL de création de dossier: {url}")
        
        # Créer le dossier avec une requête MKCOL WebDAV
        response = requests.request(
            "MKCOL",
            url,
            auth=(username, password)
        )
        
        if response.status_code not in (201, 204):
            logger.error(f"Erreur lors de la création du dossier: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la création du dossier: {response.status_code}"
            )
        
        logger.info(f"Dossier {path} créé avec succès")
        return {"success": True, "message": f"Dossier {path} créé avec succès"}
    
    except Exception as e:
        logger.error(f"Erreur lors de la création du dossier: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour supprimer un fichier ou dossier
@router.delete("/files")
async def delete_item(
    path: str,
    request: Request = None
):
    logger.info(f"Suppression de l'élément: {path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Construire l'URL de l'élément à supprimer
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}"
        logger.debug(f"URL de suppression: {url}")
        
        # Supprimer l'élément avec une requête DELETE WebDAV
        response = requests.delete(
            url,
            auth=(username, password)
        )
        
        if response.status_code not in (204, 200):
            logger.error(f"Erreur lors de la suppression: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la suppression: {response.status_code}"
            )
        
        logger.info(f"Élément {path} supprimé avec succès")
        return {"success": True, "message": f"Élément {path} supprimé avec succès"}
    
    except Exception as e:
        logger.error(f"Erreur lors de la suppression: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour déplacer ou renommer un fichier/dossier
@router.put("/move")
async def move_item(
    move_request: MoveItemRequest,
    request: Request = None
):
    logger.info(f"Déplacement de {move_request.sourcePath} vers {move_request.targetPath}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser les chemins
        source_path = move_request.sourcePath
        target_path = move_request.targetPath
        if not source_path.startswith("/"):
            source_path = "/" + source_path
        if not target_path.startswith("/"):
            target_path = "/" + target_path
        
        # Construire les URLs source et destination
        source_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{source_path}"
        target_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{target_path}"
        
        logger.debug(f"URL source: {source_url}")
        logger.debug(f"URL destination: {target_url}")
        
        # Déplacer l'élément avec une requête MOVE WebDAV
        headers = {
            "Destination": target_url
        }
        
        response = requests.request(
            "MOVE",
            source_url,
            headers=headers,
            auth=(username, password)
        )
        
        if response.status_code not in (201, 204):
            logger.error(f"Erreur lors du déplacement: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors du déplacement: {response.status_code}"
            )
        
        logger.info(f"Élément déplacé avec succès de {source_path} vers {target_path}")
        return {"success": True, "message": f"Élément déplacé avec succès"}
    
    except Exception as e:
        logger.error(f"Erreur lors du déplacement: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Route pour copier un fichier/dossier
@router.post("/copy")
async def copy_item(
    copy_request: MoveItemRequest,  # Réutilisation du même modèle que pour move
    request: Request = None
):
    logger.info(f"Copie de {copy_request.sourcePath} vers {copy_request.targetPath}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Normaliser les chemins
        source_path = copy_request.sourcePath
        target_path = copy_request.targetPath
        if not source_path.startswith("/"):
            source_path = "/" + source_path
        if not target_path.startswith("/"):
            target_path = "/" + target_path
        
        # Construire les URLs source et destination
        source_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{source_path}"
        target_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{target_path}"
        
        logger.debug(f"URL source: {source_url}")
        logger.debug(f"URL destination: {target_url}")
        
        # Copier l'élément avec une requête COPY WebDAV
        headers = {
            "Destination": target_url
        }
        
        response = requests.request(
            "COPY",
            source_url,
            headers=headers,
            auth=(username, password)
        )
        
        if response.status_code not in (201, 204):
            logger.error(f"Erreur lors de la copie: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la copie: {response.status_code}"
            )
        
        logger.info(f"Élément copié avec succès de {source_path} vers {target_path}")
        return {"success": True, "message": f"Élément copié avec succès"}
    
    except Exception as e:
        logger.error(f"Erreur lors de la copie: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Créer un partage
@router.post("/shares", response_model=ShareInfo)
async def create_share(
    share_request: ShareRequest,
    request: Request = None
):
    logger.info(f"Création d'un partage pour: {share_request.path}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Construire l'URL de l'API OCS pour les partages
        url = f"{NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares"
        
        # Préparer les données pour la requête
        data = {
            "path": share_request.path,
            "shareType": share_request.shareType,
            "permissions": share_request.permissions
        }
        
        # Ajouter shareWith si nécessaire
        if share_request.shareWith and share_request.shareType in [0, 1]:  # 0=user, 1=group
            data["shareWith"] = share_request.shareWith
        
        headers = {
            "OCS-APIRequest": "true",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Envoyer la requête pour créer le partage
        response = requests.post(
            url,
            data=data,
            headers=headers,
            auth=(username, password)
        )
        
        # Traiter la réponse XML
        if response.status_code != 200:
            logger.error(f"Erreur lors de la création du partage: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la création du partage: {response.status_code}"
            )
        
        # Parser la réponse XML
        try:
            root = ET.fromstring(response.content)
            status_code = int(root.find('.//statuscode').text)
            
            if status_code != 100:
                message = root.find('.//message').text
                logger.error(f"Erreur OCS: {message}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erreur OCS: {message}"
                )
            
            # Extraire les informations du partage créé
            share_elem = root.find('.//data/element')
            
            share_id = share_elem.find('./id').text
            share_url = share_elem.find('./url')
            url_value = share_url.text if share_url is not None else None
            
            logger.info(f"Partage créé avec succès, ID: {share_id}")
            
            return ShareInfo(
                id=share_id,
                shareType=share_request.shareType,
                path=share_request.path,
                permissions=share_request.permissions,
                shareWith=share_request.shareWith,
                url=url_value
            )
        except Exception as xml_error:
            logger.error(f"Erreur lors du parsing XML: {str(xml_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du parsing de la réponse: {str(xml_error)}"
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la création du partage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Récupérer la liste des partages
@router.get("/shares")
async def get_shares(path: Optional[str] = None, request: Request = None):
    logger.info("Récupération des partages")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Construire l'URL de base
        url = f"{NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares"
        
        # Ajouter le paramètre path si spécifié
        params = {}
        if path:
            params["path"] = path
        
        headers = {
            "OCS-APIRequest": "true"
        }
        
        # Envoyer la requête pour récupérer les partages
        response = requests.get(
            url,
            params=params,
            headers=headers,
            auth=(username, password)
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur lors de la récupération des partages: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la récupération des partages: {response.status_code}"
            )
        
        # Parser la réponse XML
        try:
            root = ET.fromstring(response.content)
            status_code = int(root.find('.//statuscode').text)
            
            if status_code != 100:
                message = root.find('.//message').text
                logger.error(f"Erreur OCS: {message}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erreur OCS: {message}"
                )
            
            # Extraire les informations des partages
            shares = []
            share_elements = root.findall('.//element')
            
            for share_elem in share_elements:
                share_id = share_elem.find('./id').text
                share_type = int(share_elem.find('./share_type').text)
                share_path = share_elem.find('./path').text
                permissions = int(share_elem.find('./permissions').text)
                
                share_with_elem = share_elem.find('./share_with')
                share_with = share_with_elem.text if share_with_elem is not None else None
                
                url_elem = share_elem.find('./url')
                url = url_elem.text if url_elem is not None else None
                
                shares.append(ShareInfo(
                    id=share_id,
                    shareType=share_type,
                    path=share_path,
                    permissions=permissions,
                    shareWith=share_with,
                    url=url
                ))
            
            logger.info(f"Récupéré {len(shares)} partages")
            return ShareList(shares=shares)
        except Exception as xml_error:
            logger.error(f"Erreur lors du parsing XML: {str(xml_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du parsing de la réponse: {str(xml_error)}"
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des partages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )

# Créer un utilisateur Nextcloud
@router.post("/users")
async def create_user(username: str, password: str, email: str, display_name: Optional[str] = None, admin_request: bool = False, request: Request = None):
    logger.info(f"Création d'un utilisateur Nextcloud: {username}")
    # Si c'est une requête pour créer un utilisateur, utiliser toujours les identifiants admin
    if admin_request:
        admin_username = NEXTCLOUD_USERNAME
        admin_password = NEXTCLOUD_PASSWORD
    else:
        # Sinon, récupérer les identifiants admin (mode sans auth)
        creds = await get_nextcloud_credentials(request)
        admin_username = creds["username"]
        admin_password = creds["password"]
    
    try:
        # Construire l'URL pour créer un utilisateur
        url = f"{NEXTCLOUD_URL}/ocs/v1.php/cloud/users"
        
        headers = {
            "OCS-APIRequest": "true",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Préparer les données de l'utilisateur
        user_data = {
            "userid": username,
            "password": password,
            "email": email
        }
        
        # Ajouter le nom d'affichage s'il est fourni
        if display_name:
            user_data["displayName"] = display_name
        
        # Envoyer la requête pour créer l'utilisateur
        response = requests.post(
            url,
            headers=headers,
            data=user_data,
            auth=(admin_username, admin_password)
        )
        
        # Vérifier la réponse
        if response.status_code != 200:
            logger.error(f"Erreur lors de la création de l'utilisateur Nextcloud: {response.text}")
            return {
                "success": False,
                "message": f"Erreur lors de la création de l'utilisateur: {response.status_code}",
                "details": response.text
            }
        
        # Parser la réponse XML
        try:
            root = ET.fromstring(response.content)
            status_code = int(root.find('.//statuscode').text)
            
            if status_code != 100:
                message = root.find('.//message').text
                logger.error(f"Erreur OCS: {message}")
                return {
                    "success": False,
                    "message": f"Erreur OCS: {message}"
                }
            
            logger.info(f"Utilisateur Nextcloud {username} créé avec succès")
            return {
                "success": True,
                "message": f"Utilisateur Nextcloud {username} créé avec succès"
            }
        except Exception as xml_error:
            logger.error(f"Erreur lors du parsing XML: {str(xml_error)}")
            return {
                "success": False,
                "message": f"Erreur lors du parsing de la réponse: {str(xml_error)}"
            }
    
    except Exception as e:
        logger.error(f"Erreur lors de la création de l'utilisateur Nextcloud: {str(e)}")
        return {
            "success": False,
            "message": f"Erreur serveur: {str(e)}"
        }

# Télécharger une source directement depuis Nextcloud
@router.get("/download-source")
async def download_source(path: str, request: Request = None):
    """
    Télécharge un fichier source directement depuis Nextcloud.
    Le chemin doit être un chemin complet tel que retourné par l'API de prompt.
    """
    logger.info(f"Téléchargement de la source: {path}")
    
    # Récupérer les identifiants Nextcloud (admin par défaut en mode sans auth)
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Vérifier si le chemin est un chemin Nextcloud valide
        if not path.startswith("/"):
            path = "/" + path
        
        # Construire l'URL du fichier
        url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}"
        
        # Effectuer la requête pour télécharger le fichier
        response = requests.get(
            url,
            auth=(username, password),
            stream=True
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur lors du téléchargement de la source: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du téléchargement de la source: {response.status_code}"
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

# Ingérer un répertoire Nextcloud dans Qdrant
class IngestDirectoryRequest(BaseModel):
    path: str
    collection: Optional[str] = None
    extensions: Optional[List[str]] = None
    max_files: Optional[int] = None
    force_reingest: Optional[bool] = False
    skip_duplicate_check: Optional[bool] = False
    clean_deleted: Optional[bool] = True  # Par défaut, on nettoie les fichiers supprimés

@router.post("/ingest-directory")
async def ingest_directory(
    ingest_request: IngestDirectoryRequest,
    background_tasks: BackgroundTasks,
    request: Request = None
):
    """
    Ingère récursivement les documents d'un répertoire Nextcloud dans Qdrant.
    Utilise directement le script d'origine pour une meilleure performance et une intégration plus simple.
    """
    logger.info(f"Demande d'ingestion du répertoire Nextcloud: {ingest_request.path}")
    
    try:
        # Vérifier si le chemin existe dans Nextcloud
        creds = await get_nextcloud_credentials(request)
        username = creds["username"]
        password = creds["password"]
        
        # Vérifier si le répertoire existe
        path = ingest_request.path
        if not path.startswith("/"):
            path = "/" + path
            
        # Tenter de lister le répertoire pour vérifier qu'il existe
        propfind_body = """<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
  </d:prop>
</d:propfind>"""
        
        response = requests.request(
            method="PROPFIND",
            url=f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            data=propfind_body,
            headers={"Depth": "0", "Content-Type": "application/xml"},
            auth=(username, password)
        )
        
        if response.status_code not in [200, 207]:
            logger.error(f"Erreur lors de la vérification du répertoire: {response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Le répertoire {path} n'existe pas ou n'est pas accessible"
            )
        
        # Configurer les paramètres d'ingestion en se basant sur le script original
        # Charger la configuration
        config = load_config()
        retrieval_cfg = config.get('retrieval', {})
        
        # Déterminer la collection à utiliser
        collection = ingest_request.collection or retrieval_cfg.get('vectorstore', {}).get('collection', 'rag_documents1536')
        
        # Déterminer les extensions supportées
        supported_extensions = ingest_request.extensions or DEFAULT_SUPPORTED_EXTENSIONS
        
        # Informations d'authentification
        auth = (username, password)
        
        # Définir la fonction d'ingestion à exécuter en arrière-plan
        async def run_ingestion():
            try:
                logger.info(f"Démarrage de l'ingestion Nextcloud à partir du chemin: {path}")
                processed_files = set()
                
                # Mesurer le temps d'exécution
                start_time = time.time()
                
                # Initialiser le vectorstore pour la vérification des duplicatas si nécessaire
                vector_store = None
                if not ingest_request.skip_duplicate_check:
                    try:
                        from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
                        vector_store = VectorStoreManager(collection_name=collection)
                        logger.info(f"Connexion à Qdrant établie pour vérifier les documents existants, collection: {collection}")
                    except Exception as e:
                        logger.error(f"Erreur lors de l'initialisation de Qdrant: {str(e)}")
                        logger.warning("Vérification des documents existants désactivée")
                
                # Si on doit nettoyer les fichiers supprimés, on collecte d'abord tous les fichiers existants dans Nextcloud
                nextcloud_files = set()
                deleted_count = 0
                
                if ingest_request.clean_deleted and vector_store:
                    logger.info(f"Collecte des fichiers existants dans Nextcloud à partir de: {path}")
                    from update_vdb.sources.ingest_nextcloud_documents import collect_nextcloud_files, get_qdrant_files_by_prefix, delete_missing_files
                    nextcloud_files = collect_nextcloud_files(path, auth, supported_extensions)
                    logger.info(f"Nombre de fichiers existants dans Nextcloud: {len(nextcloud_files)}")
                    
                    # Débogue: Liste des fichiers trouvés dans Nextcloud
                    logger.debug("Fichiers trouvés dans Nextcloud:")
                    for file_path in sorted(list(nextcloud_files)):
                        logger.debug(f"  - {file_path}")
                
                # Appeler directement la fonction process_directory du script original avec les nouveaux paramètres
                file_count = process_directory(
                    path, 
                    auth, 
                    supported_extensions, 
                    processed_files,
                    collection,
                    max_files=ingest_request.max_files,
                    force_reingest=ingest_request.force_reingest,
                    vector_store=vector_store
                )
                
                # Nettoyage des fichiers supprimés dans Nextcloud
                if ingest_request.clean_deleted and vector_store and nextcloud_files:
                    logger.info("Récupération des fichiers dans Qdrant pour détecter les suppressions...")
                    qdrant_files = get_qdrant_files_by_prefix(vector_store, path, collection)
                    logger.info(f"Nombre de fichiers dans Qdrant: {len(qdrant_files)}")
                    
                    # Débogue: Liste des fichiers trouvés dans Qdrant
                    logger.debug("Fichiers trouvés dans Qdrant:")
                    for file_path in sorted(list(qdrant_files)):
                        logger.debug(f"  - {file_path}")
                    
                    # Calcul et affichage des fichiers à supprimer
                    files_to_delete = qdrant_files - nextcloud_files
                    logger.info(f"Nombre de fichiers à supprimer de Qdrant: {len(files_to_delete)}")
                    logger.debug("Fichiers à supprimer de Qdrant:")
                    for file_path in sorted(list(files_to_delete)):
                        logger.debug(f"  - {file_path}")
                    
                    logger.info("Suppression des fichiers qui n'existent plus dans Nextcloud...")
                    deleted_count = delete_missing_files(nextcloud_files, qdrant_files, vector_store)
                    logger.info(f"Nombre de fichiers supprimés de Qdrant: {deleted_count}")
                
                end_time = time.time()
                duration = end_time - start_time
                
                logger.info(f"Synchronisation terminée: {file_count} fichiers traités, {deleted_count} fichiers supprimés, en {duration:.2f} secondes")
                
                return {
                    "status": "success",
                    "path": path,
                    "fileCount": file_count,
                    "deletedCount": deleted_count,
                    "duration": f"{duration:.2f} secondes"
                }
                
            except Exception as e:
                logger.error(f"Erreur lors de l'ingestion Nextcloud: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erreur lors de l'ingestion Nextcloud: {str(e)}"
                )
        
        # Exécuter l'ingestion en arrière-plan
        if background_tasks:
            background_tasks.add_task(run_ingestion)
            return {
                "status": "started",
                "message": f"Ingestion Nextcloud démarrée à partir du chemin {path}",
                "path": path,
                "collection": collection
            }
        else:
            # Si aucune tâche d'arrière-plan n'est fournie, exécuter de manière synchrone
            file_count = await run_ingestion()
            return {
                "status": "completed",
                "message": "Ingestion Nextcloud terminée",
                "path": path,
                "collection": collection,
                "fileCount": file_count
            }
    
    except Exception as e:
        logger.error(f"Erreur lors de l'ingestion Nextcloud: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'ingestion: {str(e)}"
        )

# Supprimer un partage
@router.delete("/shares/{share_id}")
async def delete_share(share_id: str, request: Request = None):
    logger.info(f"Suppression du partage: {share_id}")
    # Récupérer les identifiants Nextcloud de l'utilisateur
    creds = await get_nextcloud_credentials(request)
    username = creds["username"]
    password = creds["password"]
    
    try:
        # Construire l'URL pour supprimer le partage
        url = f"{NEXTCLOUD_URL}/ocs/v2.php/apps/files_sharing/api/v1/shares/{share_id}"
        
        headers = {
            "OCS-APIRequest": "true"
        }
        
        # Envoyer la requête pour supprimer le partage
        response = requests.delete(
            url,
            headers=headers,
            auth=(username, password)
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur lors de la suppression du partage: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de la suppression du partage: {response.status_code}"
            )
        
        # Parser la réponse XML
        try:
            root = ET.fromstring(response.content)
            status_code = int(root.find('.//statuscode').text)
            
            if status_code != 100:
                message = root.find('.//message').text
                logger.error(f"Erreur OCS: {message}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erreur OCS: {message}"
                )
            
            logger.info(f"Partage {share_id} supprimé avec succès")
            return {"success": True, "message": f"Partage supprimé avec succès"}
        except Exception as xml_error:
            logger.error(f"Erreur lors du parsing XML: {str(xml_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du parsing de la réponse: {str(xml_error)}"
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du partage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur serveur: {str(e)}"
        )
