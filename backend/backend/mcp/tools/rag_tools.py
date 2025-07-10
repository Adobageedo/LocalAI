"""
RAG tools for the MCP server.
Provides functions that interface with the RAG system.
"""

from typing import Dict, Any
import sys
import os
from backend.core.logger import log

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular

# Setup logger
logger = log.bind(name="backend.mcp.tools.rag_tools")


class RAGTools:
    """
    Tools for interacting with the RAG system.
    """
    
    @staticmethod
    def rag_query(user_id: str, question: str) -> Dict[str, Any]:
        """
        Query the RAG system with a question.
        
        Args:
            user_id: User ID for whom to query
            question: Question to query the RAG system with
            
        Returns:
            Dict with RAG response
        """
        try:
            response = get_rag_response_modular(user_id, question)
            
            return {
                "success": True,
                "data": {
                    "response": response
                }
            }
        except Exception as e:
            logger.error(f"Error querying RAG system: {str(e)}")
            return {
                "success": False,
                "error": f"Error querying RAG system: {str(e)}"
            }
