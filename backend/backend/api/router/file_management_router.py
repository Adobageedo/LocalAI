from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from fastapi.responses import JSONResponse, StreamingResponse
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import io
import shutil
import tempfile
import logging
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import Request, HTTPException, status, Depends, BackgroundTasks
from backend.services.auth.middleware.auth import get_current_user
from backend.services.vectorstore.qdrant_manager import VectorStoreManager
from backend.core.logger import log
from backend.core.config import STORAGE_PATH
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
STORAGE_PATH = os.path.join(BASE_DIR, STORAGE_PATH)
router = APIRouter()
logger = log.bind(name="backend.api.file_management_router")
#  Models
class FileItem(BaseModel):
    path: str
    name: str
    is_directory: bool
    size: Optional[int] = None
    last_modified: Optional[datetime] = None
    content_type: Optional[str] = None

class FileList(BaseModel):
    path: str
    items: List[FileItem]
    
class DirectoryCreate(BaseModel):
    path: str
    
class FileCopy(BaseModel):
    source_path: str
    destination_path: str
    
class FileMove(BaseModel):
    source_path: str
    destination_path: str

class FileDelete(BaseModel):
    path: str
    recursive: bool = False

class IngestDirectoryRequest(BaseModel):
    path: str
    collection: Optional[str] = None
    extensions: Optional[List[str]] = None
    max_files: Optional[int] = None
    force_reingest: Optional[bool] = False
    skip_duplicate_check: Optional[bool] = False
    clean_deleted: Optional[bool] = True  # Par défaut, on nettoie les fichiers supprimés

# Helper functions
def normalize_path(path: str) -> str:
    """Ensure path format is consistent (no leading slashes)"""
    path = path.strip()
    # Remove leading slash if present
    if path.startswith('/'):
        path = path[1:]
    return path

def get_user_dir(user_id: str) -> str:
    """Get the user's root directory path"""
    user_dir = STORAGE_PATH.replace("user_id", user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir

def full_path(user_id: str, path: str) -> str:
    """Get the full filesystem path for a user's file"""
    # Construire le chemin comme dans list_files
    user_base = STORAGE_PATH.replace("user_id", user_id)
    # Si le chemin commence par un slash, l'ignorer pour os.path.join
    relative_path = path[1:] if path.startswith('/') else path
    result = os.path.join(user_base, relative_path)
    return result

def is_directory(path: str) -> bool:
    """Check if path is a directory"""
    return os.path.isdir(path)

def is_within_user_dir(user_id: str, full_path: str) -> bool:
    """Ensure path is within user's permitted area"""
    user_dir = get_user_dir(user_id)
    return os.path.commonpath([user_dir]) == os.path.commonpath([user_dir, full_path])

def path_to_relative(user_id: str, absolute_path: str) -> str:
    """Convert absolute path to relative path for API responses"""
    user_dir = get_user_dir(user_id)
    if absolute_path.startswith(user_dir):
        rel_path = absolute_path[len(user_dir):].lstrip(os.sep)
        return rel_path
    return absolute_path

def get_content_type(file_path: str) -> str:
    """Determine content type from file extension"""
    extension = os.path.splitext(file_path)[1].lower()
    mime_types = {
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.zip': 'application/zip',
        '.json': 'application/json',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
    }
    return mime_types.get(extension, 'application/octet-stream')

# Helper function to build the directory tree
def build_directory_tree(path, rel_path="/"):
    node = {
        "name": os.path.basename(path) if rel_path != "/" else "/",
        "path": rel_path,
        "is_directory": True,
        "children": []
    }
    try:
        for entry in sorted(os.listdir(path)):
            entry_path = os.path.join(path, entry)
            entry_rel_path = os.path.join(rel_path, entry)
            if os.path.isdir(entry_path):
                # Ensure trailing slash for directories
                child_rel_path = entry_rel_path if entry_rel_path.endswith('/') else entry_rel_path + '/'
                node["children"].append(build_directory_tree(entry_path, child_rel_path))
            else:
                file_stat = os.stat(entry_path)
                node["children"].append({
                    "name": entry,
                    "path": entry_rel_path,
                    "is_directory": False,
                    "size": file_stat.st_size,
                    "last_modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    "content_type": get_content_type(entry_path)
                })
    except Exception as e:
        logger.error(f"Error building directory tree at {path}: {e}")
    return node

# Route to return the full directory tree for the current user
@router.get("/files/tree")
async def get_full_directory_tree(user = Depends(get_current_user)):
    """Return the full directory tree for the user as a nested structure"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        root_dir = get_user_dir(user_id)
        tree = build_directory_tree(root_dir, "/")
        return tree
    except Exception as e:
        logger.error(f"Error returning directory tree: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error returning directory tree: {e}"
        )

# Route pour lister les fichiers
@router.get("/files", response_model=FileList)
async def list_files(
    path: str = Query("/", description="Path to list contents of"),
    user = Depends(get_current_user)
):
    """List files and directories in the specified path"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        # Get full filesystem path for the user directory
        print(path)
        dir_path = os.path.join(STORAGE_PATH.replace("user_id", user_id), path[1:])
        logger.info(f"Listing files for user {user_id} at path {path} (dir_path: {dir_path})")
        
        # Create directory if it doesn't exist
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
        elif not os.path.isdir(dir_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified path is not a directory"
            )
        
        # Get list of files and directories
        items = []
        for entry in os.listdir(dir_path):
            entry_path = os.path.join(dir_path, entry)
            is_dir = os.path.isdir(entry_path)
            
            # Get file stats
            file_stat = os.stat(entry_path)
            
            # Create file item
            file_item = FileItem(
                path=path,
                name=entry,
                is_directory=is_dir,
                size=None if is_dir else file_stat.st_size,
                last_modified=datetime.fromtimestamp(file_stat.st_mtime),
                content_type=None if is_dir else get_content_type(entry_path)
            )
            items.append(file_item)
        
        # Sort items: directories first, then files alphabetically
        items.sort(key=lambda x: (not x.is_directory, x.name.lower()))
        
        return FileList(path=path, items=items)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing files: {str(e)}"
        )

# Route pour télécharger un fichier
@router.get("/download")
async def download_file(
    path: str = Query(..., description="Path to the file to download"),
    user = Depends(get_current_user)
):
    """Download a file from local storage"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        print(path)
        # Get full file path
        file_path = full_path(user_id, path)
        logger.info(f"Downloading file for user {user_id}: {file_path}")
        
        # Check if path exists and is a file
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
            
        if os.path.isdir(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot download a directory"
            )
        
        # Get content type
        content_type = get_content_type(file_path)
        
        # Return file as streaming response
        filename = os.path.basename(file_path)
        
        def file_iterator():
            with open(file_path, 'rb') as file:
                while chunk := file.read(8192):
                    yield chunk
        
        return StreamingResponse(
            file_iterator(),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading file: {str(e)}"
        )

# Route pour uploader un fichier
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(...),
    user = Depends(get_current_user)
):
    """Upload a file to local storage"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        
        # Normalize path
        norm_path = normalize_path(path)
        
        # Create target directory if it doesn't exist
        target_dir = full_path(user_id, norm_path)
        os.makedirs(target_dir, exist_ok=True)
        
        # Full path to save the file
        file_path = os.path.join(target_dir, file.filename)
        logger.info(f"Uploading file for user {user_id} to: {file_path}")
        
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Save the file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Get relative path for the response
        rel_path = path_to_relative(user_id, file_path)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "File uploaded successfully",
                "filename": file.filename,
                "path": path,
                "file_path": rel_path
            }
        )
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

# Route pour créer un dossier
@router.post("/directory")
async def create_directory(
    directory: DirectoryCreate,
    user = Depends(get_current_user)
):
    """Create a directory in the local filesystem"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        
        # Get full directory path
        dir_path = full_path(user_id, directory.path)
        logger.info(f"Creating directory for user {user_id}: {dir_path}")
        
        # Create directory if it doesn't exist
        os.makedirs(dir_path, exist_ok=True)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Directory created successfully",
                "path": directory.path
            }
        )
        
    except Exception as e:
        logger.error(f"Error creating directory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating directory: {str(e)}"
        )

# Route pour supprimer un fichier ou dossier
@router.delete("/delete")
async def delete_file(
    file_delete: FileDelete,
    user = Depends(get_current_user)
):
    """Delete a file or directory in the local filesystem"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        
        # Get full path
        file_path = full_path(user_id, file_delete.path)
        logger.info(f"Deleting for user {user_id}: {file_path}")
        
        # Check if path exists
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File or directory not found"
            )
        
        # Handle directory
        if os.path.isdir(file_path):
            if file_delete.recursive:
                # Remove directory and all contents
                shutil.rmtree(file_path)
            else:
                # Check if directory is empty
                if os.listdir(file_path):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Directory is not empty. Use recursive=true to delete all contents."
                    )
                os.rmdir(file_path)
        else:
            # Delete a single file
            os.remove(file_path)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "File or directory deleted successfully",
                "path": file_delete.path
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file or directory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file or directory: {str(e)}"
        )

# Route pour déplacer ou renommer un fichier/dossier
@router.put("/move")
async def move_file(
    file_move: FileMove,
    user = Depends(get_current_user)
):
    """Move or rename a file or directory"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        
        # Get full paths
        source_path = full_path(user_id, file_move.source_path)
        dest_path = full_path(user_id, file_move.destination_path)
        logger.info(f"Moving for user {user_id}: {source_path} to {dest_path}")
        
        # Check if source exists
        if not os.path.exists(source_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source file or directory not found"
            )
            
        # Check if source is a directory
        source_is_dir = os.path.isdir(source_path)
        
        # Check if destination parent directory exists
        dest_parent = os.path.dirname(dest_path)
        if not os.path.exists(dest_parent):
            os.makedirs(dest_parent, exist_ok=True)
            
        # Check if destination already exists
        if os.path.exists(dest_path):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Destination already exists"
            )
            
        # Move the file or directory
        shutil.move(source_path, dest_path)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "File or directory moved successfully",
                "source_path": file_move.source_path,
                "destination_path": file_move.destination_path
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving file or directory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error moving file or directory: {str(e)}"
        )

# Route pour copier un fichier/dossier
@router.put("/copy")
async def copy_file(
    file_copy: FileCopy,
    user = Depends(get_current_user)
):
    """Copy a file or directory"""
    try:
        user_id = user.get("uid") if user else "anonymous"
        
        # Get full paths
        source_path = full_path(user_id, file_copy.source_path)
        dest_path = full_path(user_id, file_copy.destination_path)
        logger.info(f"Copying for user {user_id}: {source_path} to {dest_path}")
        
        # Check if source exists
        if not os.path.exists(source_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source file or directory not found"
            )
            
        # Check if source is a directory
        source_is_dir = os.path.isdir(source_path)
        
        # Check if destination parent directory exists
        dest_parent = os.path.dirname(dest_path)
        if not os.path.exists(dest_parent):
            os.makedirs(dest_parent, exist_ok=True)
            
        # Check if destination already exists
        if os.path.exists(dest_path):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Destination already exists"
            )
            
        # Copy the file or directory
        if source_is_dir:
            shutil.copytree(source_path, dest_path)
        else:
            shutil.copy2(source_path, dest_path)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": "File or directory copied successfully",
                "source_path": file_copy.source_path,
                "destination_path": file_copy.destination_path
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error copying file or directory: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error copying file or directory: {str(e)}"
        )

# Route pour ingérer un répertoire dans Qdrant
@router.post("/ingest-directory")
async def ingest_directory(
    ingest_request: IngestDirectoryRequest,
    background_tasks: BackgroundTasks,
    request: Request = None,
    user = Depends(get_current_user)
):
    """
    Ingère récursivement les documents d'un répertoire MinIO dans Qdrant.
    Utilise directement le script d'origine pour une meilleure performance et une intégration plus simple.
    """
    logger.info(f"Demande d'ingestion du répertoire MinIO: {ingest_request.path}")
    
    try:
        # Extraire l'ID utilisateur du token Firebase
        user_id = user.get("uid") if user else None
        logger.info(f"Ingestion du répertoire MinIO: {ingest_request.path} (max files: {ingest_request.max_files}, force: {ingest_request.force_reingest}, user: {user_id})")
        
        # Vérifier si le chemin existe dans MinIO
        client = get_minio_client()
        
        # Obtenir le chemin complet avec le préfixe utilisateur
        path = ingest_request.path
        if path.startswith('/'):
            path = path[1:]
        
        full_path_prefix = full_path(user_id, path)
        
        # Vérifier si le répertoire existe en listant les objets
        objects = list(client.list_objects(MINIO_BUCKET, prefix=full_path_prefix, recursive=False))
        if not objects and not full_path_prefix.endswith('/'):
            # Essayer avec un slash à la fin pour les dossiers
            full_path_prefix = full_path_prefix + '/'
            objects = list(client.list_objects(MINIO_BUCKET, prefix=full_path_prefix, recursive=False))
        
        if not objects:
            logger.error(f"Répertoire non trouvé: {full_path_prefix}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Le répertoire {ingest_request.path} n'existe pas ou n'est pas accessible"
            )
        
        # Configurer les paramètres d'ingestion
        # Charger la configuration
        from update_vdb.core.config import load_config
        config = load_config()
        retrieval_cfg = config.get('retrieval', {})
        
        # Déterminer la collection à utiliser
        collection = ingest_request.collection or retrieval_cfg.get('vectorstore', {}).get('collection', 'rag_documents1536')
        
        # Déterminer les extensions supportées
        from update_vdb.sources.ingest_nextcloud_documents import DEFAULT_SUPPORTED_EXTENSIONS
        supported_extensions = ingest_request.extensions or DEFAULT_SUPPORTED_EXTENSIONS
        
        # Définir la fonction d'ingestion à exécuter en arrière-plan
        async def run_ingestion():
            try:
                logger.info(f"Démarrage de l'ingestion MinIO à partir du chemin: {full_path_prefix}")
                
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
                
                # Si on doit nettoyer les fichiers supprimés, on collecte d'abord tous les fichiers existants dans MinIO
                minio_files = set()
                deleted_count = 0
                
                if ingest_request.clean_deleted and vector_store:
                    logger.info(f"Collecte des fichiers existants dans MinIO à partir de: {full_path_prefix}")
                    
                    # Collecter tous les fichiers MinIO dans le répertoire
                    objects = client.list_objects(MINIO_BUCKET, prefix=full_path_prefix, recursive=True)
                    for obj in objects:
                        if not obj.object_name.endswith('/'):
                            minio_files.add(obj.object_name)
                    
                    logger.info(f"Nombre de fichiers existants dans MinIO: {len(minio_files)}")
                    
                    # Débogue: Liste des fichiers trouvés dans MinIO
                    logger.debug("Fichiers trouvés dans MinIO:")
                    for file_path in sorted(list(minio_files)):
                        logger.debug(f"  - {file_path}")
                
                # Appeler la fonction process_directory du script MinIO
                from update_vdb.sources.ingest_minio_documents import process_directory
                result = await process_directory(
                    prefix=full_path_prefix,
                    collection=collection,
                    force_reingest=ingest_request.force_reingest,
                    vector_store=vector_store,
                    user_id=user_id  # Passer l'ID utilisateur pour le stockage dans les métadonnées
                )
                
                stats = result.get("stats", {})
                file_count = stats.get("processed", 0)
                
                # Nettoyage des fichiers supprimés dans MinIO
                if ingest_request.clean_deleted and vector_store and minio_files:
                    logger.info("Récupération des fichiers dans Qdrant pour détecter les suppressions...")
                    
                    # Récupérer tous les documents dans Qdrant avec le préfixe du chemin
                    qdrant_files = set()
                    try:
                        # Récupérer les documents avec le préfixe de chemin
                        filter_condition = {
                            "must": [
                                {"key": "source", "match": {"value": "minio"}},
                                {"key": "source_path", "match": {"value": full_path_prefix, "operator": "$startsWith"}}
                            ]
                        }
                        
                        # Récupérer tous les documents correspondants
                        docs = vector_store.get_documents(filter_condition=filter_condition, limit=10000)
                        
                        for doc in docs:
                            metadata = doc.metadata
                            if metadata and "source_path" in metadata:
                                qdrant_files.add(metadata["source_path"])
                        
                        logger.info(f"Nombre de fichiers dans Qdrant: {len(qdrant_files)}")
                        
                        # Débogue: Liste des fichiers trouvés dans Qdrant
                        logger.debug("Fichiers trouvés dans Qdrant:")
                        for file_path in sorted(list(qdrant_files)):
                            logger.debug(f"  - {file_path}")
                        
                        # Calcul et affichage des fichiers à supprimer
                        files_to_delete = qdrant_files - minio_files
                        logger.info(f"Nombre de fichiers à supprimer de Qdrant: {len(files_to_delete)}")
                        logger.debug("Fichiers à supprimer de Qdrant:")
                        for file_path in sorted(list(files_to_delete)):
                            logger.debug(f"  - {file_path}")
                        
                        # Supprimer les documents qui n'existent plus dans MinIO
                        for file_path in files_to_delete:
                            filter_condition = {
                                "must": [
                                    {"key": "source", "match": {"value": "minio"}},
                                    {"key": "source_path", "match": {"value": file_path}}
                                ]
                            }
                            deleted = vector_store.delete_documents(filter_condition=filter_condition)
                            if deleted:
                                deleted_count += 1
                        
                        logger.info(f"Nombre de fichiers supprimés de Qdrant: {deleted_count}")
                    except Exception as e:
                        logger.error(f"Erreur lors du nettoyage des fichiers supprimés: {str(e)}")
                
                end_time = time.time()
                duration = end_time - start_time
                
                logger.info(f"Synchronisation terminée: {file_count} fichiers traités, {deleted_count} fichiers supprimés, en {duration:.2f} secondes")
                
                return {
                    "status": "success",
                    "path": ingest_request.path,
                    "fileCount": file_count,
                    "deletedCount": deleted_count,
                    "duration": f"{duration:.2f} secondes"
                }
                
            except Exception as e:
                logger.error(f"Erreur lors de l'ingestion MinIO: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erreur lors de l'ingestion MinIO: {str(e)}"
                )
        
        # Exécuter l'ingestion en arrière-plan
        if background_tasks:
            background_tasks.add_task(run_ingestion)
            return {
                "status": "started",
                "message": f"Ingestion MinIO démarrée à partir du chemin {ingest_request.path}",
                "path": ingest_request.path,
                "collection": collection
            }
        else:
            # Si aucune tâche d'arrière-plan n'est fournie, exécuter de manière synchrone
            result = await run_ingestion()
            return {
                "status": "completed",
                "message": "Ingestion MinIO terminée",
                "path": ingest_request.path,
                "collection": collection,
                "fileCount": result.get("fileCount", 0),
                "deletedCount": result.get("deletedCount", 0),
                "duration": result.get("duration", "")
            }
    
    except Exception as e:
        logger.error(f"Erreur lors de l'ingestion MinIO: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'ingestion: {str(e)}"
        )