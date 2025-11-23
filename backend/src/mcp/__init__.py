"""
MCP (Model Context Protocol) SDK
Exposes backend services as MCP tools for AI assistants

Clean, modular architecture:
- types: Type definitions and data structures
- config: Configuration management
- tools: Tool definitions (one per file)
- handlers: Business logic for tool execution
- utils: Formatting and validation utilities
- server: Main MCP server
"""

from .server import RAGRetrievalServer
from .types import ToolName, RetrievalConfig, DocumentResult
from .config import config

__all__ = [
    "RAGRetrievalServer",
    "ToolName",
    "RetrievalConfig",
    "DocumentResult",
    "config"
]

__version__ = "1.0.0"
