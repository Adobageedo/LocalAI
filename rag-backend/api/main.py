from fastapi import FastAPI, UploadFile, File, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from rag_engine.retrieve_rag_information_modular import get_rag_response_modular
from rag_engine.config import load_config
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
import sys
import os
import hashlib
import logging
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

app = FastAPI()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

from .openai_compat import router as openai_router
app.include_router(openai_router)

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
    sources: List[str]

# --- ENDPOINTS ---

from update_vdb.sources.document_ingest import fetch_and_sync_documents
from update_vdb.sources.email_ingest import fetch_and_sync_emails
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
    set_imap_status(user, "starting")
    try:
        fetch_and_sync_emails(
            method="imap",
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
    collection = os.getenv("COLLECTION_NAME", "rag_documents")
    manager = VectorStoreManager(collection)
    client = manager.get_qdrant_client()
    try:
        points, _ = client.scroll(
            collection_name=collection,
            offset=None,
            limit=10000,  # Increase if you have more documents
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

@app.get("/documents")
def list_documents(q: Optional[str] = Query(None), page: int = 1, page_size: int = 20):
    # Listing direct depuis Qdrant
    collection = os.getenv("COLLECTION_NAME", "rag_documents")
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
            limit=1000, # pagination simple côté API
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
from update_vdb.sources.document_ingest import fetch_and_sync_documents

@app.post("/documents")
def upload_documents(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = None):
    print(f"[DEBUG] Received {len(files)} files for import.", flush=True)
    data_dir = DATA_DIR
    os.makedirs(data_dir, exist_ok=True)
    saved_files = []
    for file in files:
        dest_path = os.path.join(data_dir, file.filename)
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
            fetch_and_sync_documents(
                method="local",
                directory=data_dir,
                collection_name=os.getenv("COLLECTION_NAME", "rag_documents768"),
                user="api_upload"
            )
            print(f"[DEBUG] (Background) Ingestion completed successfully.")
        except Exception as e:
            print(f"[DEBUG] (Background) Ingestion failed: {e}")
    if background_tasks is not None:
        background_tasks.add_task(run_ingest)
    else:
        run_ingest()
    return {"success": True, "files": [os.path.basename(f) for f in saved_files], "message": "Ingestion started in background."}

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    return {"success": True}

from rag_engine.retrieve_rag_information_modular import get_rag_response_modular

@app.post("/prompt", response_model=PromptResponse)
def prompt_ia(data: dict):
    question = data.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Champ 'question' requis.")
    # Add instruction to the prompt for the LLM to cite sources as [filename.ext]
    llm_instruction = (
        ""
    )
    user_question = data.get("question")
    question = f"{llm_instruction}\n\n{user_question}"
    rag_result = get_rag_response_modular(question)

    # Extract filenames cited in the answer (e.g., [contract.pdf])
    import re, os
    answer = rag_result.get("answer", "")
    cited_filenames = set(re.findall(r'\[([^\[\]]+)\]', answer))

    # Only include sources whose filename is actually cited in the answer
    sources = []
    seen = set()
    for doc in rag_result.get("documents", []):
        metadata = getattr(doc, "metadata", {}) or {}
        path = metadata.get("source_path")
        if path:
            filename = os.path.basename(path)
            if filename in cited_filenames and path not in seen:
                sources.append(path)
                seen.add(path)
        if len(sources) == 5:
            break

    return {
        "answer": answer,
        "sources": sources
    }
