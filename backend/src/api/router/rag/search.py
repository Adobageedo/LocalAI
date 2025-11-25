from fastapi import APIRouter, Depends, Header, HTTPException, status
from io import StringIO
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import traceback
import sys
import os

# Add the project root so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from src.services.rag.retrieval.retrieval import retrieve_documents_advanced
from src.services.auth.middleware.auth_firebase import get_current_user
from src.core.logger import log
from src.core.constants import SECRET_KEY
logger = log.bind(name="src.api.rag.search_router")

# Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="The search query")
    top_k: Optional[int] = 5
    collection: Optional[str] = None
    split_prompt: Optional[bool] = True
    rerank: Optional[bool] = False
    use_hyde: Optional[bool] = False
    metadata_filter: Optional[Dict[str, Any]] = None

class DocumentResponse(BaseModel):
    page_content: str
    path: str

class SearchResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    documents: List[DocumentResponse] = []

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

# Router setup
router = APIRouter(tags=["RAG Search"])

@router.get("/rag/health")
async def rag_health_check():
    return {
        "status": "healthy",
        "service": "rag-search",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.post("/rag/search", response_model=SearchResponse)
async def rag_search(
    request: SearchRequest,
    x_api_key: str = Header(...)
    # current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Search relevant documents using RAG vectorstore.

    Returns:
    - Documents matching the query
    - Path of the document
    """
        # Check the secret token
    if x_api_key != SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: invalid API key"
        )

    try:
        # user_id = current_user.get("uid") if current_user else "anonymous"
        # logger.info("RAG search requested", query=request.query, user_id=user_id)

        # -------------------------------------------------
        # 1. RETRIEVE RAW CHUNKS
        # -------------------------------------------------
        docs = retrieve_documents_advanced(
            prompt=request.query,
            top_k=request.top_k,
            split_prompt=request.split_prompt,
            rerank=request.rerank,
            use_hyde=request.use_hyde,
            collection=request.collection,
            metadata_filter=request.metadata_filter
        )

        # -------------------------------------------------
        # 2. GROUP CHUNKS BY doc_id
        # -------------------------------------------------
        grouped: Dict[str, Dict] = {}

        for d in docs:
            doc_id = d.metadata.get("doc_id", "unknown")

            if doc_id not in grouped:
                grouped[doc_id] = {
                    "path": d.metadata.get("path"),
                    "chunks": []
                }

            grouped[doc_id]["chunks"].append(d)

        # -------------------------------------------------
        # 3. SORT CHUNKS INSIDE EACH DOCUMENT
        # -------------------------------------------------
        final_docs: List[DocumentResponse] = []

        for doc_id, doc_data in grouped.items():
            chunks = doc_data["chunks"]

            # Best sorting strategy (if provided by splitter)
            chunks_sorted = sorted(
                chunks,
                key=lambda x: (
                    x.metadata.get("start_index", 0),
                    x.metadata.get("chunk_id", 0)
                )
            )

            # -------------------------------------------------
            # 4. MERGE TEXT USING StringIO (ultra-fast)
            # -------------------------------------------------
            buffer = StringIO()
            for chunk in chunks_sorted:
                buffer.write(chunk.page_content)
                buffer.write("\n")

            merged_text = buffer.getvalue()

            # -------------------------------------------------
            # 5. BUILD FINAL OUTPUT ITEM
            # -------------------------------------------------
            final_docs.append(
                DocumentResponse(
                    page_content=merged_text,
                    path=doc_data["path"]
                )
            )

        # Sort by path (for stable deterministic API responses)
        final_docs = sorted(final_docs, key=lambda x: x.path or "")

        logger.info(
            f"Merged {len(final_docs)} documents from {len(docs)} chunks",
            extra={"paths": [d.path for d in final_docs]}
        )

        # -------------------------------------------------
        # 6. RETURN RESPONSE
        # -------------------------------------------------
        return SearchResponse(
            success=True,
            message=f"{len(final_docs)} documents merged",
            documents=final_docs
        )

    except Exception as e:
        tb = traceback.format_exc()
        logger.error("RAG search failed", error=str(e), traceback=tb)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during RAG search: {str(e)}"
        )
