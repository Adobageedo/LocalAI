from fastapi import FastAPI, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from rag_engine.Retrieve_rag_information import get_rag_response
from rag_engine.config import load_config
from rag_engine.vectorstore import get_qdrant_client
import sys
import os
import hashlib
import logging
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

app = FastAPI()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# Autoriser le frontend React local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    sources: List[SourceUsed]
    filter_fallback: bool

# --- ENDPOINTS ---

from setup.imap_ingest import main_with_args
from pydantic import BaseModel

# --- IMAP INGESTION STATUS (in-memory, demo) ---
imap_ingest_status = {}

def set_imap_status(user, status):
    imap_ingest_status[user] = status

def get_imap_status(user):
    return imap_ingest_status.get(user, "not_started")

class ImapCredentials(BaseModel):
    host: str
    port: int
    user: str
    password: str
    ssl: bool = True  # Not currently used, only SSL supported
    mailbox: str = "INBOX"
    limit: int = 10
    collection_name: str = "rag_documents768"
    imap_user: str = "unknown"

@app.get("/ingest/imap/status")
def get_ingest_status(user: str):
    return {"status": get_imap_status(user)}

@app.post("/ingest/imap")
def ingest_imap_emails(creds: ImapCredentials):
    user = creds.imap_user or creds.user
    set_imap_status(user, "connection to the mail")
    try:
        set_imap_status(user, "connection to the mail")
        # You may want to add status updates in main_with_args as well for more granularity
        set_imap_status(user, "retrieving emails")
        set_imap_status(user, "indexing with qdrant")
        main_with_args(
            imap_server=creds.host,
            imap_port=creds.port,
            imap_user=creds.user,
            imap_password=creds.password,
            imap_folder=creds.mailbox,
            collection_name=creds.collection_name,
            user=creds.imap_user,
            limit=creds.limit
        )
        set_imap_status(user, "completed")
        return {"success": True, "message": "Emails ingested successfully."}
    except Exception as e:
        set_imap_status(user, f"error: {str(e)}")
        return {"success": False, "error": str(e)}


@app.get("/documents/count-by-type")
def count_documents_by_type():
    client = get_qdrant_client()
    collection = os.getenv("COLLECTION_NAME", "rag_documents")
    points, _ = client.scroll(
        collection_name=collection,
        offset=None,
        limit=10000,  # Increase if you have more documents
        with_payload=True
    )
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

@app.get("/documents")
def list_documents(q: Optional[str] = Query(None), page: int = 1, page_size: int = 20):
    # Listing direct depuis Qdrant
    client = get_qdrant_client()
    collection = os.getenv("COLLECTION_NAME", "rag_documents")
    offset = (page - 1) * page_size
    # Recherche simple (filtre sur source_path ou subject si q)
    filter_ = None
    if q:
        filter_ = {"should": [
            {"key": "source_path", "match": {"value": q}},
            {"key": "subject", "match": {"value": q}}
        ]}
    points, _ = client.scroll(
        collection_name=collection,
        offset=None,
        limit=1000, # pagination simple côté API
        with_payload=True
    )
    docs = []
    for p in points:
        payload = p.payload or {}
        doc = {
            "doc_id": payload.get("doc_id") or payload.get("metadata", {}).get("doc_id"),
            "document_type": payload.get("document_type") or payload.get("metadata", {}).get("document_type"),
            "source_path": payload.get("source_path") or payload.get("metadata", {}).get("source_path"),
            "attachment_name": payload.get("attachment_name") or payload.get("metadata", {}).get("attachment_name"),
            "subject": payload.get("subject") or payload.get("metadata", {}).get("subject"),
            "user": payload.get("user") or payload.get("metadata", {}).get("user"),
            "date": payload.get("date") or payload.get("metadata", {}).get("date"),
        }
        if q:
            # Filtrage simple
            if (q.lower() not in str(doc["source_path"]).lower()) and (q.lower() not in str(doc["subject"]).lower()):
                continue
        docs.append(doc)
    # Regrouper par unique_id (ou doc_id si unique_id absent), and use same display logic as dashboard
    unique_docs = {}
    for doc in docs:
        # Try both top-level and nested metadata for unique_id/doc_id
        unique_id = doc.get("unique_id") or doc.get("doc_id")
        doc_type = doc.get("document_type")
        # Use same display name logic as dashboard
        if doc_type == 'email':
            name = doc.get("subject") or '[Sans objet]'
        else:
            name = doc.get("attachment_name")
            if not name:
                sp = doc.get("source_path")
                name = sp.split("/")[-1] if sp else '[Document sans nom]'
        key = unique_id or doc.get("doc_id")
        if key and key not in unique_docs:
            display_doc = doc.copy()
            display_doc['display_name'] = name
            unique_docs[key] = display_doc
    docs = list(unique_docs.values())
    # Pagination côté API
    total = len(docs)
    docs = docs[offset:offset+page_size]
    return {"documents": docs, "total": total}

from fastapi import UploadFile, File, Request,BackgroundTasks
from typing import List
import shutil
import tempfile
from setup import ingest_documents

@app.post("/documents")
def upload_documents(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = None):
    print(f"[DEBUG] Received {len(files)} files for import.", flush=True)

    # Save all uploaded files to the backend data directory
    data_dir = DATA_DIR
    os.makedirs(data_dir, exist_ok=True)
    saved_files = []
    for file in files:
        dest_path = os.path.join(data_dir, file.filename)
        # Avoid overwriting existing files by adding a suffix if needed
        base, ext = os.path.splitext(dest_path)
        counter = 1
        while os.path.exists(dest_path):
            dest_path = f"{base}_{counter}{ext}"
            counter += 1
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        saved_files.append(dest_path)
    def run_ingest():
        try:
            ingest_documents.main()
            print(f"[DEBUG] (Background) Ingestion completed successfully.")
        except Exception as e:
            print(f"[DEBUG] (Background) Ingestion failed: {e}")
    if background_tasks is not None:
        background_tasks.add_task(run_ingest)
    return {"success": True, "files": [os.path.basename(f) for f in saved_files], "message": "Ingestion started in background."}

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    return {"success": True}

@app.post("/prompt", response_model=PromptResponse)
def prompt_ia(data: dict):
    question = data.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Champ 'question' requis.")
    rag_result = get_rag_response(question)
    return rag_result
