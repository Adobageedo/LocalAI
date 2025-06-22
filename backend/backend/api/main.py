import sys
import os
import hashlib
import logging
import traceback
import datetime
import re
import json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from typing import List, Optional
#from backend.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.config import load_config
from backend.services.vectorstore.qdrant_manager import VectorStoreManager
# Authentification supprimée

# Configure logging for Docker
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("rag-backend")

# Configuration des logs pour supprimer les messages de débogage des bibliothèques HTTP
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
logging.getLogger("openai._base_client").setLevel(logging.WARNING)
logging.getLogger("unstructured.trace").setLevel(logging.WARNING)
logging.getLogger("chardet.universaldetector").setLevel(logging.WARNING)
logging.getLogger("chardet.charsetprober").setLevel(logging.WARNING)
logging.getLogger("chardet").setLevel(logging.WARNING)
logging.getLogger("cachecontrol.controller").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("python_multipart.multipart").setLevel(logging.WARNING)
logging.getLogger("msal").setLevel(logging.WARNING)
logging.getLogger("google.auth").setLevel(logging.WARNING)
logging.getLogger("googleapiclient").setLevel(logging.WARNING)

app = FastAPI()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# Import des routeurs
from .router.openai_compat import router as openai_router
from .router.ingest_router import router as ingest_router
from .router.file_management_router import router as file_management_router
from .router.llm_chat_router import router as conversation_router
from .router.test_router import router as test_router
from .router.file_management_google import router as file_management_google_router

# Configuration des préfixes API centralisée
app.include_router(openai_router, prefix="/api")
app.include_router(ingest_router, prefix="/api/sources")
app.include_router(file_management_router, prefix="/api/db")
app.include_router(conversation_router, prefix="/api")  # conversation_router already has prefix='/api' in its definition
app.include_router(test_router, prefix="/api")
app.include_router(file_management_google_router, prefix="/api/db")
# Ajouter le middleware de compression GZIP
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Autoriser le frontend React local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELES ---
class DocumentMeta(BaseModel):
    doc_id: str
    document_type: str
    source_path: Optional[str] = None
    attachment_name: Optional[str] = None
    subject: Optional[str] = None
    user: Optional[str] = None
    date: Optional[str] = None

class SourceUsed(BaseModel):
    content: str
    metadata: dict

class PromptResponse(BaseModel):
    answer: str
    sources: List[str]


from fastapi import Request, HTTPException, status, Depends
from middleware.auth import get_current_user
# --- ENDPOINTS ---

from update_vdb.sources.document_ingest import fetch_and_sync_documents
from update_vdb.sources.ingest_imap_emails import ingest_emails_to_qdrant
from pydantic import BaseModel

@app.get("/api/documents/count-by-type")
def count_documents_by_type(user=Depends(get_current_user)):
    collection = os.getenv("COLLECTION_NAME", "rag_documents")
    manager = VectorStoreManager(collection)
    client = manager.get_qdrant_client()
    try:
        points, _ = client.scroll(
            collection_name=collection,
            offset=None,
            limit=10000000,  # Increase if you have more documents
            with_payload=True
        )
    except Exception as e:
        if hasattr(e, 'response') and getattr(e.response, 'status_code', None) == 404:
            return JSONResponse(
                status_code=404,
                content={
                    "message": f"Collection '{collection}' does not exist. Please import your first document or email to create it."
                }
            )
        if 'doesn\'t exist' in str(e) or 'Not found' in str(e):
            return JSONResponse(
                status_code=404,
                content={
                    "message": f"Collection '{collection}' does not exist. Please import your first document or email to create it."
                }
            )
        raise
    # Map unique_id (or doc_id) to document_type (unique documents)
    # Only count one per unique_id/doc_id (not per chunk)
    id_to_type = {}
    for p in points:
        payload = p.payload or {}
        meta = payload.get("metadata", {})
        unique_id = payload.get("unique_id") or meta.get("unique_id") or payload.get("doc_id") or meta.get("doc_id")
        doc_type = payload.get("document_type") or meta.get("document_type")
        # Only count the first occurrence of each unique_id
        if unique_id and unique_id not in id_to_type:
            id_to_type[unique_id] = doc_type or "unknown"
    # For each unique_id, store the first valid display name encountered
    id_to_type = {}
    id_to_name = {}
    for p in points:
        payload = p.payload or {}
        meta = payload.get("metadata", {})
        unique_id = payload.get("unique_id") or meta.get("unique_id") or payload.get("doc_id") or meta.get("doc_id")
        doc_type = payload.get("document_type") or meta.get("document_type")
        if not unique_id:
            continue
        if unique_id not in id_to_type:
            id_to_type[unique_id] = doc_type or "unknown"
            # Only store the first valid display name for this unique_id
            if doc_type == 'email':
                name = payload.get("subject") or meta.get("subject") or '[Sans objet]'
            else:
                name = payload.get("attachment_name") or meta.get("attachment_name")
                if not name:
                    sp = payload.get("source_path") or meta.get("source_path")
                    name = sp.split("/")[-1] if sp else '[Document sans nom]'
            id_to_name[unique_id] = name
    # Build type -> list of names
    type_to_names = {}
    for uid, doc_type in id_to_type.items():
        name = id_to_name.get(uid)
        if not name:
            continue
        if doc_type not in type_to_names:
            type_to_names[doc_type] = []
        type_to_names[doc_type].append(name)
    # Count unique names per type
    type_counts = {k: len(v) for k, v in type_to_names.items()}
    return {"counts": type_counts, "details": type_to_names}

@app.get("/api/documents")
def list_documents(user=Depends(get_current_user),q: Optional[str] = Query(None), page: int = 1, page_size: int = 2000, use_registry: bool = Query(True)):
    collection = os.getenv("COLLECTION_NAME", "rag_documents1536")
    docs = []
    
    # Chemin vers le fichier de registre JSON
    registry_path = os.path.join(os.path.dirname(__file__), "..", "update_vdb", "data", "file_registry.json")
    
    if use_registry and os.path.exists(registry_path):
        # Utiliser le registre JSON comme source d'information
        logger.info(f"Listing documents from registry file: {registry_path}")
        try:
            with open(registry_path, 'r', encoding='utf-8') as f:
                registry_data = json.load(f)
                
            # Convertir les données du registre en format compatible avec l'API
            for file_path, file_info in registry_data.items():
                # Filtrer par requête si spécifiée
                if q and q.lower() not in file_path.lower():
                    continue
                    
                # Extraire les métadonnées
                doc = {
                    "doc_id": file_info.get("doc_id", ""),
                    "document_type": file_info.get("metadata", {}).get("extension", "").lstrip("."),
                    "source_path": file_info.get("source_path", ""),
                    "attachment_name": file_info.get("metadata", {}).get("file_name", ""),
                    "last_modified": file_info.get("last_modified", ""),
                    "last_synced": file_info.get("last_synced", ""),
                    "hash": file_info.get("hash", "")
                }
                docs.append(doc)
                
            # Trier par chemin source
            docs.sort(key=lambda x: x.get("source_path", ""))
            
            # Pagination manuelle
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            docs_page = docs[start_idx:end_idx]
            
            return {
                "documents": docs_page,
                "total": len(docs),
                "page": page,
                "page_size": page_size,
                "pages": (len(docs) + page_size - 1) // page_size,
                "source": "registry"
            }
                
        except Exception as e:
            logger.error(f"Error reading registry file: {str(e)}")
            logger.error(traceback.format_exc())
            # Fallback to Qdrant if registry fails
            logger.info("Falling back to Qdrant for document listing")
    
    # Fallback: Listing direct depuis Qdrant
    logger.info(f"Listing documents from Qdrant collection: {collection}")
    manager = VectorStoreManager(collection)
    client = manager.get_qdrant_client()
    offset = (page - 1) * page_size
    # Recherche simple (filtre sur source_path ou subject si q)
    filter_ = None
    if q:
        filter_ = {"should": [
            {"key": "source_path", "match": {"value": q}},
            {"key": "subject", "match": {"value": q}}
        ]}
    try:
        points, _ = client.scroll(
            collection_name=collection,
            offset=None,
            limit=1000000, # pagination simple côté API
            with_payload=True
        )
    except Exception as e:
        if hasattr(e, 'response') and getattr(e.response, 'status_code', None) == 404:
            return JSONResponse(
                status_code=404,
                content={
                    "message": f"Collection '{collection}' does not exist. Please import your first document or email to create it."
                }
            )
        if 'doesn\'t exist' in str(e) or 'Not found' in str(e):
            return JSONResponse(
                status_code=404,
                content={
                    "message": f"Collection '{collection}' does not exist. Please import your first document or email to create it."
                }
            )
        raise
    seen_docs = {}
    docs = []
    for point in points:
        payload = point.payload or {}
        doc_id = None
        if "doc_id" in payload:
            doc_id = payload["doc_id"]
        elif "metadata" in payload and isinstance(payload["metadata"], dict):
            doc_id = payload["metadata"].get("doc_id")
        
        if not doc_id:
            continue

        # Skip if we've already seen this doc_id (only take the first point)
        if doc_id in seen_docs:
            continue
        
        # Extract metadata
        document_type = ""
        source_path = ""
        attachment_name = ""
        subject = ""
        user = ""
        date = ""
        
        # Extract from root level
        if "document_type" in payload:
            document_type = payload["document_type"]
        if "source_path" in payload:
            source_path = payload["source_path"]
        if "attachment_name" in payload:
            attachment_name = payload["attachment_name"]
        if "subject" in payload:
            subject = payload["subject"]
        if "user" in payload:
            user = payload["user"]
        if "date" in payload:
            date = payload["date"]
            
        # Extract from metadata if available and not already set
        metadata = payload.get("metadata", {})
        if isinstance(metadata, dict):
            if not document_type and "document_type" in metadata:
                document_type = metadata["document_type"]
            if not source_path and "source_path" in metadata:
                source_path = metadata["source_path"]
            if not attachment_name and "attachment_name" in metadata:
                attachment_name = metadata["attachment_name"]
            if not subject and "subject" in metadata:
                subject = metadata["subject"]
            if not user and "user" in metadata:
                user = metadata["user"]
            if not date and "date" in metadata:
                date = metadata["date"]
        
        # Filter by query if specified
        if q:
            if source_path and q.lower() in source_path.lower():
                pass # Match
            elif subject and q.lower() in subject.lower():
                pass # Match
            else:
                continue # No match
        
        # Add to docs list
        docs.append({
            "doc_id": doc_id,
            "document_type": document_type,
            "source_path": source_path,
            "attachment_name": attachment_name,
            "subject": subject,
            "user": user,
            "date": date
        })
        seen_docs[doc_id] = True

    # Sort by source_path
    docs.sort(key=lambda x: x.get("source_path") or "")
    
    # Apply pagination
    start = (page - 1) * page_size
    end = start + page_size
    total = len(docs)
    pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    docs_page = docs[start:end]
    
    return {
        "documents": docs_page,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
        "source": "qdrant"
    }

from fastapi import UploadFile, File, Request, BackgroundTasks
from typing import List
import shutil
import tempfile
from update_vdb.sources.document_ingest import fetch_and_sync_documents

@app.post("/api/documents")
def upload_documents(user=Depends(get_current_user),files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = None):
    print(f"[DEBUG] Received {len(files)} files for import.", flush=True)
    logger.info(f"RECEIVED: Received {len(files)} files for import.")
    
    # Créer un répertoire temporaire pour les fichiers
    data_dir = DATA_DIR
    os.makedirs(data_dir, exist_ok=True)
    
    # Stocker les noms de fichiers originaux
    original_filenames = []
    saved_files = []
    
    for file in files:
        # Sauvegarder le nom original
        original_filenames.append(file.filename)
        
        # Créer un chemin temporaire unique
        dest_path = os.path.join(data_dir, file.filename)
        base, ext = os.path.splitext(dest_path)
        counter = 1
        while os.path.exists(dest_path):
            dest_path = f"{base}_{counter}{ext}"
            counter += 1
        
        # Sauvegarder le fichier temporairement
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        saved_files.append(dest_path)
    
    def run_ingest():
        try:
            # Utiliser la bonne collection
            collection = os.getenv("COLLECTION_NAME", "rag_documents1536")
            logger.info(f"INGESTION: Starting ingestion for {len(saved_files)} files into collection {collection}")
            
            # Ingérer les documents
            fetch_and_sync_documents(
                method="local",
                directory=data_dir,
                collection_name=collection,
                user="api_upload"
            )
            
            # Nettoyer les fichiers temporaires
            for temp_file in saved_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                        logger.info(f"CLEANUP: Removed temporary file {temp_file}")
                except Exception as cleanup_err:
                    logger.error(f"CLEANUP ERROR: Failed to remove {temp_file}: {cleanup_err}")
            
            logger.info(f"INGESTION: Completed successfully for collection {collection}")
            print(f"[DEBUG] Ingestion completed and temporary files cleaned up", flush=True)
            
        except Exception as e:
            logger.error(f"INGESTION ERROR: Ingestion failed: {e}")
            print(f"[DEBUG] Ingestion failed: {e}", flush=True)
    
    # Exécuter l'ingestion en arrière-plan ou immédiatement
    if background_tasks is not None:
        background_tasks.add_task(run_ingest)
    else:
        run_ingest()
    
    # Retourner les noms de fichiers originaux, pas les chemins temporaires
    return {
        "success": True, 
        "files": original_filenames, 
        "message": "Ingestion started in background. Files will be removed after processing."
    }

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str,user=Depends(get_current_user)):
    logger.info(f"DELETION: Starting deletion of document {doc_id}")
    collection = os.getenv("COLLECTION_NAME", "rag_documents1536")
    logger.info(f"DELETION: Using collection: {collection}")
    
    # Also print to stdout for redundancy
    print(f"DELETION: Starting deletion of document {doc_id}", flush=True)
    print(f"DELETION: Using collection: {collection}", flush=True)
    
    try:
        manager = VectorStoreManager(collection)
        logger.info(f"DELETION: VectorStoreManager initialized for collection {collection}")
        print(f"DELETION: VectorStoreManager initialized for collection {collection}", flush=True)
        
        deleted_count = manager.delete_by_doc_id(doc_id)
        
        logger.info(f"DELETION: Deleted {deleted_count} points for document {doc_id} from collection {collection}")
        print(f"DELETION: Deleted {deleted_count} points for document {doc_id} from collection {collection}", flush=True)
        
        return {"success": True, "message": f"Document {doc_id} deleted ({deleted_count} points)"}
    except Exception as e:
        logger.error(f"DELETION ERROR: Failed to delete document {doc_id}: {str(e)}")
        logger.error(traceback.format_exc())
        print(f"DELETION ERROR: Failed to delete document {doc_id}: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.get("/api/health")
def health_check():
    """Endpoint simple pour vérifier que l'API est en cours d'exécution."""
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}


@app.get("/api/documents/stats")
def get_document_stats(user=Depends(get_current_user)):
    """Récupère le nombre d'emails ingérés par utilisateur dans Qdrant."""
    try:
        # Déterminer la collection à utiliser
        config = load_config()
        collection_name = os.getenv("COLLECTION_NAME", config.get('retrieval', {}).get('vectorstore', {}).get('collection', 'rag_documents1536'))
        
        logger.info(f"EMAIL COUNT: Querying collection {collection_name} for email counts by user")
        
        # Initialiser le gestionnaire de stockage vectoriel
        vector_store = VectorStoreManager(collection_name)
        
        # Récupérer tous les documents (sans filtre)
        filter_condition = {}
        
        # Pour débogage, inclure un paramètre pour voir tous les types de documents
        include_all_types = True
        
        # Utiliser la méthode de l'API qui permet de filtrer sans vecteur de requête
        search_result = vector_store.client.scroll(
            collection_name=collection_name,
            scroll_filter=filter_condition,
            limit=10000,  # Limite raisonnable pour les emails
            with_payload=True,
            with_vectors=False
        )
        
        # Traiter les résultats pour compter par utilisateur et par type
        user_counts = {}
        type_counts = {}
        total_documents = 0
        metadata_fields = set()  # Pour lister tous les champs de métadonnées disponibles
        
        # Parcourir tous les lots de résultats retournés par scroll()
        for batch in search_result:
            # Chaque lot contient une liste de points
            points = batch.points if hasattr(batch, 'points') else []
            
            for point in points:
                # Récupérer les métadonnées du document
                payload = point.payload if hasattr(point, 'payload') else {}
                
                # Collecter tous les champs de métadonnées disponibles
                if payload:
                    metadata_fields.update(payload.keys())
                
                # Extraire l'utilisateur IMAP
                user = payload.get("imap_user", None)
                
                # Extraire le type de document
                doc_type = payload.get("document_type", "unknown")
                source = payload.get("source", "unknown")
                
                # Utiliser une combinaison de type et source pour la classification
                type_key = f"{doc_type} ({source})" if doc_type != "unknown" else source
                
                # Compter par type de document
                if type_key in type_counts:
                    type_counts[type_key] += 1
                else:
                    type_counts[type_key] = 1
                
                # Si un utilisateur IMAP est présent, compter par utilisateur
                if user:
                    if user in user_counts:
                        user_counts[user] += 1
                    else:
                        user_counts[user] = 1
                    
                total_documents += 1
        
        # Convertir les statistiques utilisateurs en liste pour le tri
        user_stats = [
            {"user": user, "document_count": count}
            for user, count in user_counts.items()
        ]
        
        # Trier par nombre de documents (ordre décroissant)
        user_stats.sort(key=lambda x: x["document_count"], reverse=True)
        
        # Convertir les statistiques de type en liste pour le tri
        type_stats = [
            {"type": doc_type, "count": count}
            for doc_type, count in type_counts.items()
        ]
        
        # Trier par nombre de documents (ordre décroissant)
        type_stats.sort(key=lambda x: x["count"], reverse=True)
        
        logger.info(f"DOCUMENT COUNT: Found {total_documents} documents, {len(user_stats)} users, {len(type_stats)} types")
        
        return {
            "success": True,
            "total_documents": total_documents,
            "user_count": len(user_stats),
            "type_count": len(type_stats),
            "users": user_stats,
            "document_types": type_stats,
            "available_metadata_fields": list(metadata_fields)
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"EMAIL COUNT ERROR: {error_msg}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": error_msg}