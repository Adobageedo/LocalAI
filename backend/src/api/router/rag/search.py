from fastapi import APIRouter, Depends, Header, HTTPException, status
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

        docs = retrieve_documents_advanced(
            prompt=request.query,
            top_k=request.top_k,
            split_prompt=request.split_prompt,
            rerank=request.rerank,
            use_hyde=request.use_hyde,
            collection=request.collection,
            metadata_filter=request.metadata_filter
        )

        doc_responses = [
            DocumentResponse(
                page_content=d.page_content,  # preview first 500 chars
                # metadata=d.metadata
                path=d.metadata.get("path")
            ) for d in docs
        ]

        return SearchResponse(
            success=True,
            message=f"{len(doc_responses)} documents retrieved",
            documents=doc_responses
        )

    except Exception as e:
        tb = traceback.format_exc()
        logger.error("RAG search failed", error=str(e), traceback=tb)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during RAG search: {str(e)}"
        )
