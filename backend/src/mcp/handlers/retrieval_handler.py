"""
Retrieval Handler
Business logic for document retrieval operations
Separated from server for testability and clarity
"""

import sys
import os
from typing import Dict, Any, List
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(backend_path))

from src.services.rag.retrieval.retrieval import retrieve_documents_advanced, Retriever
from src.core.logger import log
import logging

from ..types import RetrievalConfig, DocumentResult
from ..utils.formatting import format_document_result
from ..utils.validation import validate_retrieval_args, ValidationError
from ..config import config

try:
    # Preferred: centralized logger factory
    logger = log.get_logger(__name__)  # type: ignore[attr-defined]
except Exception:
    # Fallbacks: if 'log' is already a Logger, or use stdlib logging
    if isinstance(log, logging.Logger):
        logger = log
    else:
        logger = logging.getLogger(__name__)


class RetrievalHandler:
    """Handles all retrieval-related operations"""
    
    def __init__(self):
        """Initialize the handler"""
        logger.info("[RetrievalHandler] Initialized")
    
    async def handle_retrieve_documents(self, arguments: Dict[str, Any]) -> str:
        """
        Handle document retrieval requests
        
        Args:
            arguments: Tool call arguments
            
        Returns:
            Formatted response string
            
        Raises:
            ValidationError: If arguments are invalid
            Exception: If retrieval fails
        """
        # Validate and parse arguments
        retrieval_config = validate_retrieval_args(arguments)
        
        logger.info(
            "[RetrievalHandler] Retrieving documents",
            extra={
                "prompt_preview": retrieval_config.prompt[:100],
                "top_k": retrieval_config.top_k,
                "collection": retrieval_config.collection,
                "features": {
                    "split": retrieval_config.split_prompt,
                    "hyde": retrieval_config.use_hyde,
                    "rerank": retrieval_config.rerank
                }
            }
        )
        
        # Execute retrieval
        docs = retrieve_documents_advanced(
            prompt=retrieval_config.prompt,
            top_k=retrieval_config.top_k,
            collection=retrieval_config.collection,
            split_prompt=retrieval_config.split_prompt,
            use_hyde=retrieval_config.use_hyde,
            rerank=retrieval_config.rerank,
            metadata_filter=retrieval_config.metadata_filter
        )
        
        # Convert to structured results
        results = [
            DocumentResult(
                rank=i,
                content=doc.page_content,
                metadata=doc.metadata,
                score=getattr(doc, 'score', None)
            )
            for i, doc in enumerate(docs, 1)
        ]
        
        logger.info(
            "[RetrievalHandler] Retrieved documents",
            extra={"count": len(results)}
        )
        
        # Format response
        return format_document_result(results, retrieval_config.prompt)
    
    # Single-tool setup: only retrieval is supported
