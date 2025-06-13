"""
Router pour l'ingestion et la gestion des sources de documents.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Body, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from backend.core.logger import log
from backend.services.rag.rag_service import rag_service
from backend.workers.nextcloud_ingestion_worker import nextcloud_worker
from backend.workers.email_ingestion_worker import email_worker
from backend.adapters.imap_adapter import IMAPAdapter
from backend.services.storage.file_registry import FileRegistry


# Schémas
class SourceItem(BaseModel):
    id: str
    name: str
    type: str
    status: str
    last_sync: Optional[str] = None
    doc_count: Optional[int] = None


class DocumentItem(BaseModel):
    doc_id: str
    title: str
    source_type: str
    ingestion_timestamp: str
    chunks: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IngestionResult(BaseModel):
    success: bool
    task_id: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class TaskStatus(BaseModel):
    task_id: str
    status: str
    progress: int
    total: int
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Création du router
router = APIRouter(tags=["sources"])


@router.get("/sources", response_model=List[SourceItem])
async def list_sources(user_id: str = Query(...)):
    """
    Liste les sources de documents disponibles pour un utilisateur.
    """
    try:
        sources = []
        
        # Source Gmail
        from backend.services.auth.credentials_manager import is_gmail_authenticated
        gmail_status = "connected" if is_gmail_authenticated(user_id) else "disconnected"
        
        # Source Outlook
        from backend.services.auth.credentials_manager import is_outlook_authenticated
        outlook_status = "connected" if is_outlook_authenticated(user_id) else "disconnected"
        
        # Source Nextcloud
        from backend.adapters.nextcloud_adapter import NextcloudAdapter
        nextcloud = NextcloudAdapter(user_id=user_id)
        nextcloud_status = "connected" if nextcloud.test_connection() else "disconnected"
        
        # Source IMAP
        imap_status = "disconnected"  # Nécessite des informations de connexion à chaque fois
        
        # Récupérer le nombre de documents par type
        try:
            gmail_count = len(rag_service.vectorstore.get_points_by_filter(
                "documents", {"user_id": user_id, "source_type": "email", "email_source": "gmail"}))
        except:
            gmail_count = 0
            
        try:
            outlook_count = len(rag_service.vectorstore.get_points_by_filter(
                "documents", {"user_id": user_id, "source_type": "email", "email_source": "outlook"}))
        except:
            outlook_count = 0
            
        try:
            nextcloud_count = len(rag_service.vectorstore.get_points_by_filter(
                "documents", {"user_id": user_id, "source_type": "file", "source": "nextcloud"}))
        except:
            nextcloud_count = 0
            
        try:
            imap_count = len(rag_service.vectorstore.get_points_by_filter(
                "documents", {"user_id": user_id, "source_type": "email", "email_source": "imap"}))
        except:
            imap_count = 0
            
        # Construire la liste des sources
        sources = [
            {
                "id": "gmail",
                "name": "Gmail",
                "type": "email",
                "status": gmail_status,
                "doc_count": gmail_count
            },
            {
                "id": "outlook",
                "name": "Outlook",
                "type": "email",
                "status": outlook_status,
                "doc_count": outlook_count
            },
            {
                "id": "nextcloud",
                "name": "Nextcloud",
                "type": "files",
                "status": nextcloud_status,
                "doc_count": nextcloud_count
            },
            {
                "id": "imap",
                "name": "IMAP",
                "type": "email",
                "status": imap_status,
                "doc_count": imap_count
            },
            {
                "id": "upload",
                "name": "Téléchargement",
                "type": "files",
                "status": "available",
                "doc_count": 0  # Impossible à compter facilement
            }
        ]
        
        return sources
    except Exception as e:
        log.exception(f"Erreur lors de la liste des sources: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la liste des sources: {str(e)}")


@router.post("/sources/upload", response_model=IngestionResult)
async def upload_file(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None)
):
    """
    Téléverse et ingère un fichier.
    """
    try:
        # Créer un fichier temporaire
        temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        # Écrire le contenu du fichier
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            
        # Préparer les métadonnées
        file_metadata = {
            "file_name": file.filename,
            "content_type": file.content_type,
            "source": "upload"
        }
        
        # Ajouter les métadonnées personnalisées si fournies
        if metadata:
            import json
            try:
                custom_metadata = json.loads(metadata)
                file_metadata.update(custom_metadata)
            except:
                pass
                
        # Ingérer le fichier
        result = rag_service.ingest_file(temp_file_path, user_id, file_metadata)
        
        # Nettoyer le fichier temporaire
        try:
            os.remove(temp_file_path)
        except:
            pass
            
        if result.get("success"):
            return {
                "success": True,
                "message": f"Fichier {file.filename} ingéré avec succès",
                "task_id": result.get("doc_id")  # Utiliser doc_id comme task_id
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Erreur inconnue lors de l'ingestion du fichier")
            }
            
    except Exception as e:
        log.exception(f"Erreur lors du téléversement du fichier: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/sources/nextcloud/ingest", response_model=IngestionResult)
async def ingest_nextcloud(
    user_id: str = Body(...),
    path: str = Body("/"),
    recursive: bool = Body(True),
    extensions: Optional[List[str]] = Body(None),
    force_reingest: bool = Body(False),
    skip_duplicate_check: bool = Body(False)
):
    """
    Lance l'ingestion de documents depuis Nextcloud.
    """
    try:
        # Créer une tâche d'ingestion
        params = {
            "path": path,
            "recursive": recursive,
            "extensions": extensions,
            "force_reingest": force_reingest,
            "skip_duplicate_check": skip_duplicate_check
        }
        
        task_id = nextcloud_worker.create_task(user_id, params)
        
        return {
            "success": True,
            "task_id": task_id,
            "message": "Tâche d'ingestion Nextcloud lancée"
        }
    except Exception as e:
        log.exception(f"Erreur lors de la création de la tâche d'ingestion Nextcloud: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/sources/gmail/ingest", response_model=IngestionResult)
async def ingest_gmail(
    user_id: str = Body(...),
    max_emails: int = Body(50)
):
    """
    Lance l'ingestion d'emails depuis Gmail.
    """
    try:
        # Vérifier l'authentification
        from backend.services.auth.credentials_manager import is_gmail_authenticated
        if not is_gmail_authenticated(user_id):
            return {
                "success": False,
                "error": "Non authentifié à Gmail"
            }
            
        # Créer une tâche d'ingestion
        params = {
            "max_emails": max_emails
        }
        
        task_id = email_worker.create_task(user_id, "gmail", params)
        
        return {
            "success": True,
            "task_id": task_id,
            "message": "Tâche d'ingestion Gmail lancée"
        }
    except Exception as e:
        log.exception(f"Erreur lors de la création de la tâche d'ingestion Gmail: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/sources/outlook/ingest", response_model=IngestionResult)
async def ingest_outlook(
    user_id: str = Body(...),
    max_emails: int = Body(50)
):
    """
    Lance l'ingestion d'emails depuis Outlook.
    """
    try:
        # Vérifier l'authentification
        from backend.services.auth.credentials_manager import is_outlook_authenticated
        if not is_outlook_authenticated(user_id):
            return {
                "success": False,
                "error": "Non authentifié à Outlook"
            }
            
        # Créer une tâche d'ingestion
        params = {
            "max_emails": max_emails
        }
        
        task_id = email_worker.create_task(user_id, "outlook", params)
        
        return {
            "success": True,
            "task_id": task_id,
            "message": "Tâche d'ingestion Outlook lancée"
        }
    except Exception as e:
        log.exception(f"Erreur lors de la création de la tâche d'ingestion Outlook: {str(e)}")
        return {"success": False, "error": str(e)}


@router.post("/sources/imap/ingest", response_model=IngestionResult)
async def ingest_imap(
    user_id: str = Body(...),
    server: str = Body(...),
    port: int = Body(993),
    username: str = Body(...),
    password: str = Body(...),
    use_ssl: bool = Body(True),
    max_emails: int = Body(50),
    days: int = Body(7)
):
    """
    Lance l'ingestion d'emails depuis un serveur IMAP.
    """
    try:
        # Tester la connexion
        imap = IMAPAdapter(
            server=server,
            port=port,
            username=username,
            password=password,
            use_ssl=use_ssl
        )
        
        if not imap.connect():
            return {
                "success": False,
                "error": "Impossible de se connecter au serveur IMAP"
            }
            
        imap.disconnect()
        
        # Créer une tâche d'ingestion
        params = {
            "server": server,
            "port": port,
            "username": username,
            "password": password,
            "use_ssl": use_ssl,
            "max_emails": max_emails,
            "days": days
        }
        
        task_id = email_worker.create_task(user_id, "imap", params)
        
        return {
            "success": True,
            "task_id": task_id,
            "message": "Tâche d'ingestion IMAP lancée"
        }
    except Exception as e:
        log.exception(f"Erreur lors de la création de la tâche d'ingestion IMAP: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/sources/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str, user_id: str = Query(...)):
    """
    Récupère le statut d'une tâche d'ingestion.
    """
    try:
        # Chercher dans les travailleurs
        status = None
        
        # Chercher dans le travailleur d'emails
        email_status = email_worker.get_task_status(task_id)
        if not email_status.get("error"):
            status = email_status
            if status.get("user_id") != user_id:
                raise HTTPException(status_code=403, detail="Accès non autorisé à cette tâche")
                
        # Chercher dans le travailleur Nextcloud
        if not status:
            nextcloud_status = nextcloud_worker.get_task_status(task_id)
            if not nextcloud_status.get("error"):
                status = nextcloud_status
                if status.get("user_id") != user_id:
                    raise HTTPException(status_code=403, detail="Accès non autorisé à cette tâche")
        
        if not status:
            raise HTTPException(status_code=404, detail="Tâche non trouvée")
            
        return status
    except HTTPException as e:
        raise e
    except Exception as e:
        log.exception(f"Erreur lors de la récupération du statut de la tâche: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/tasks", response_model=List[TaskStatus])
async def get_user_tasks(user_id: str = Query(...)):
    """
    Récupère toutes les tâches d'un utilisateur.
    """
    try:
        # Récupérer les tâches des deux travailleurs
        email_tasks = email_worker.get_user_tasks(user_id)
        nextcloud_tasks = nextcloud_worker.get_user_tasks(user_id)
        
        # Fusionner les listes
        all_tasks = email_tasks + nextcloud_tasks
        
        # Trier par date de début (les plus récentes d'abord)
        all_tasks.sort(key=lambda x: x.get("start_time", ""), reverse=True)
        
        return all_tasks
    except Exception as e:
        log.exception(f"Erreur lors de la récupération des tâches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources/documents", response_model=List[DocumentItem])
async def list_documents(
    user_id: str = Query(...),
    source_type: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0)
):
    """
    Liste les documents d'un utilisateur.
    """
    try:
        # Filtrer par type de source si spécifié
        filters = {"user_id": user_id}
        if source_type:
            filters["source_type"] = source_type
            
        # Récupérer les documents
        documents = rag_service.list_user_documents(user_id, limit, offset)
        
        return documents
    except Exception as e:
        log.exception(f"Erreur lors de la liste des documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sources/documents/{doc_id}", response_model=Dict[str, Any])
async def delete_document(doc_id: str, user_id: str = Query(...)):
    """
    Supprime un document.
    """
    try:
        # Supprimer le document
        success = rag_service.delete_document(doc_id, user_id)
        
        if success:
            # Supprimer du registre de fichiers si présent
            try:
                # Chercher dans le registre Nextcloud
                registry = FileRegistry(user_id, "nextcloud")
                file_info = registry.get_file_by_id(doc_id)
                if file_info:
                    source_path = file_info.get("source_path")
                    if source_path:
                        registry.remove_file(source_path)
            except:
                pass  # Ignorer les erreurs de registre
                
            return {"success": True, "message": f"Document {doc_id} supprimé"}
        else:
            return {"success": False, "error": f"Document {doc_id} non trouvé ou non accessible"}
    except Exception as e:
        log.exception(f"Erreur lors de la suppression du document: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/sources/documents/{doc_id}", response_model=Dict[str, Any])
async def get_document(doc_id: str, user_id: str = Query(...)):
    """
    Récupère un document et ses chunks.
    """
    try:
        # Récupérer le document
        document = rag_service.get_document_by_id(doc_id, user_id)
        
        if not document:
            raise HTTPException(status_code=404, detail=f"Document {doc_id} non trouvé")
            
        return document
    except HTTPException as e:
        raise e
    except Exception as e:
        log.exception(f"Erreur lors de la récupération du document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
