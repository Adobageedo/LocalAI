"""
Type definitions for MCP RAG Retrieval Server
Centralized type safety and data structures
"""

from typing import TypedDict, Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum


class ToolName(str, Enum):
    """Available MCP tools"""
    RETRIEVE_DOCUMENTS = "retrieve_documents"
    SPLIT_SUBQUESTIONS = "split_into_subquestions"
    GENERATE_HYDE = "generate_hyde"
    GET_COLLECTION_INFO = "get_collection_info"


@dataclass
class RetrievalConfig:
    """Configuration for document retrieval"""
    prompt: str
    top_k: int = 50
    collection: Optional[str] = None
    split_prompt: bool = False
    use_hyde: bool = False
    rerank: bool = False
    metadata_filter: Optional[Dict[str, Any]] = None


@dataclass
class DocumentResult:
    """Structured document result"""
    rank: int
    content: str
    metadata: Dict[str, Any]
    score: Optional[float] = None


class ToolArguments(TypedDict, total=False):
    """Tool call arguments schema"""
    prompt: str
    top_k: int
    collection: str
    split_prompt: bool
    use_hyde: bool
    rerank: bool
    metadata_filter: Dict[str, Any]


@dataclass
class ServerConfig:
    """MCP Server configuration"""
    name: str = "rag-retrieval"
    log_level: str = "INFO"
    max_retries: int = 3
    timeout: int = 30
