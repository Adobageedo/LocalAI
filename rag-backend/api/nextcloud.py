import os
import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any, Union
import os
import requests
from pydantic import BaseModel
import io
import logging
import xml.etree.ElementTree as ET
import base64
from datetime import datetime, timedelta
import jwt

from .auth import create_access_token, get_current_user

# Initialisation du logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/nextcloud", tags=["nextcloud"])

# Configuration Nextcloud à partir des variables d'environnement
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 heures

# Modèles de données
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str

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

# Fonction pour créer un token JWT
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Fonction pour vérifier les identifiants Nextcloud
def verify_nextcloud_credentials(username: str, password: str):
    try:
        # Tester la connexion à Nextcloud avec les identifiants fournis
        response = requests.get(
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}/",
            auth=(username, password)
        )
        return response.status_code == 207  # WebDAV success status
    except Exception as e:
        print(f"Erreur de connexion à Nextcloud: {str(e)}")
        return False

# Fonction pour obtenir les informations utilisateur à partir du token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        password = payload.get("pwd")
        if username is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        return {"username": username, "password": password}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Route de connexion
@router.post("/login", response_model=Token)
async def login(credentials: NextcloudCredentials):
    username = credentials.username
    password = credentials.password
    
    if not verify_nextcloud_credentials(username, password):
        raise HTTPException(
            status_code=401,
            detail="Identifiants Nextcloud incorrects"
        )
    
    # Créer un token JWT avec les identifiants
    # Note: Dans un environnement de production, stocker le mot de passe dans le token
    # n'est pas recommandé pour des raisons de sécurité. Utilisez plutôt un mécanisme
    # de session sécurisé ou un token d'accès OAuth.
    access_token = create_access_token(
        data={"sub": username, "pwd": password}
    )
    return {"token": access_token}

# Route pour lister les fichiers
@router.get("/files", response_model=FileList)
async def list_files(path: str = "/", current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    password = current_user["password"]
    
    try:
        # Construire la requête WebDAV PROPFIND
        headers = {
            "Depth": "1",
            "Content-Type": "application/xml"
        }
        
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Effectuer la requête WebDAV
        response = requests.request(
            "PROPFIND",
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            headers=headers,
            auth=(username, password)
        )
        
        if response.status_code != 207:
            raise HTTPException(status_code=400, detail=f"Erreur lors de la récupération des fichiers: {response.text}")
        
        # Analyser la réponse XML
        root = ET.fromstring(response.content)
        
        # Namespace WebDAV
        ns = {
            'd': 'DAV:',
            'oc': 'http://owncloud.org/ns',
            'nc': 'http://nextcloud.org/ns'
        }
        
        files = []
        
        # Parcourir les réponses (chaque fichier/dossier)
        for response_elem in root.findall('.//d:response', ns):
            href = response_elem.find('./d:href', ns).text
            
            # Ignorer l'élément parent (le dossier lui-même)
            if href.rstrip('/') == f"/remote.php/dav/files/{username}{path}".rstrip('/'):
                continue
            
            prop_stat = response_elem.find('./d:propstat/d:prop', ns)
            
            # Obtenir les propriétés du fichier/dossier
            resource_type = prop_stat.find('./d:resourcetype', ns)
            is_collection = resource_type.find('./d:collection', ns) is not None
            
            # Obtenir le nom du fichier/dossier à partir de l'URL
            name = os.path.basename(href.rstrip('/'))
            
            # Obtenir la taille et la date de modification
            size = 0
            if not is_collection:
                size_elem = prop_stat.find('./d:getcontentlength', ns)
                if size_elem is not None and size_elem.text:
                    size = int(size_elem.text)
            
            modified = prop_stat.find('./d:getlastmodified', ns)
            modified_str = modified.text if modified is not None else ""
            
            files.append(FileInfo(
                name=name,
                type="directory" if is_collection else "file",
                size=size,
                modified=modified_str
            ))
        
        return FileList(files=files)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# Route pour télécharger un fichier
@router.get("/download")
async def download_file(path: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    
    username = current_user["username"]
    password = current_user["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Effectuer la requête WebDAV pour télécharger le fichier
        response = requests.get(
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            auth=(username, password),
            stream=True
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erreur lors du téléchargement du fichier: {response.text}")
        
        # Créer une réponse en streaming
        return StreamingResponse(
            response.iter_content(chunk_size=8192),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={os.path.basename(path)}"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# Route pour uploader un fichier
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    username = current_user["username"]
    password = current_user["password"]
    
    try:
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        if not path.endswith("/"):
            path = path + "/"
        
        # Construire l'URL de destination
        destination_url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}{file.filename}"
        
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
            raise HTTPException(status_code=400, detail=f"Erreur lors de l'upload du fichier: {response.text}")
        
        return {"success": True, "message": f"Fichier {file.filename} uploadé avec succès"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# Route pour importer un fichier dans la base RAG
@router.post("/import-to-rag")
async def import_to_rag(
    request: ImportToRAGRequest,
    current_user: dict = Depends(get_current_user)
):
    username = current_user["username"]
    password = current_user["password"]
    
    try:
        # Normaliser le chemin
        path = request.path
        if not path.startswith("/"):
            path = "/" + path
        
        # Télécharger le fichier depuis Nextcloud
        response = requests.get(
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            auth=(username, password)
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Erreur lors du téléchargement du fichier: {response.text}")
        
        # Créer un fichier temporaire pour stocker le contenu
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(path)[1]) as temp_file:
            temp_file.write(response.content)
            temp_file_path = temp_file.name
        
        try:
            # Préparer les métadonnées
            filename = os.path.basename(path)
            metadata = {
                "source": "nextcloud",
                "original_path": path,
                "username": username
            }
            
            # Ingérer le document dans la base RAG
            collection = "rag_documents1536"  # Collection par défaut, peut être paramétré
            ingest_document(
                temp_file_path,
                user=username,
                collection=collection,
                metadata=metadata
            )
            
            return {
                "success": True,
                "message": f"Fichier {filename} importé avec succès dans la base RAG",
                "collection": collection
            }
        
        finally:
            # Supprimer le fichier temporaire
            os.unlink(temp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import dans la base RAG: {str(e)}")
