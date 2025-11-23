"""
Configuration management for MCP RAG Retrieval Server
Centralized settings and environment handling
"""

import os
from pathlib import Path
from typing import Optional
from .types import ServerConfig
from dataclasses import dataclass


class MCPConfig:
    """Central configuration manager"""
    
    def __init__(self):
        self.server = ServerConfig(
            name=os.getenv("MCP_SERVER_NAME", "rag-retrieval"),
            log_level=os.getenv("MCP_LOG_LEVEL", "INFO"),
            max_retries=int(os.getenv("MCP_MAX_RETRIES", "3")),
            timeout=int(os.getenv("MCP_TIMEOUT", "30"))
        )
        
        # Backend path
        self.backend_path = self._get_backend_path()
        
        # Default collection
        self.default_collection = os.getenv("COLLECTION_NAME", "TEST_BAUX")
        
        # Retrieval defaults
        self.default_top_k = int(os.getenv("DEFAULT_TOP_K", "50"))
        self.min_score = float(os.getenv("MIN_SCORE", "0.2"))

        # Fixed flags (cannot be overridden by MCP clients)
        self.flags = self._load_flags()
    
    @staticmethod
    def _get_backend_path() -> Path:
        """Get backend directory path"""
        current = Path(__file__).resolve()
        # Navigate up: mcp -> src -> backend
        return current.parent.parent.parent
    
    def get_collection(self, override: Optional[str] = None) -> str:
        """Get collection name with override support"""
        return override or self.default_collection

    @dataclass
    class Flags:
        split_prompt: bool
        use_hyde: bool
        rerank: bool

    def _load_flags(self) -> "MCPConfig.Flags":
        """Load fixed retrieval flags from environment"""
        def _to_bool(val: str, default: bool) -> bool:
            if val is None:
                return default
            return val.strip().lower() in ("1", "true", "yes", "y", "on")

        split_prompt = _to_bool(os.getenv("MCP_SPLIT_PROMPT"), False)
        use_hyde = _to_bool(os.getenv("MCP_USE_HYDE"), False)
        rerank = _to_bool(os.getenv("MCP_RERANK"), False)
        return MCPConfig.Flags(
            split_prompt=split_prompt,
            use_hyde=use_hyde,
            rerank=rerank,
        )


# Singleton instance
config = MCPConfig()
