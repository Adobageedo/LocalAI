"""
MCP RAG Retrieval Server
Clean, production-ready Model Context Protocol server
"""

import asyncio
import os
import sys
from typing import Any, Dict
from mcp.server import Server
from mcp.types import TextContent, Tool
from mcp.server.stdio import stdio_server

try:
    # Prefer package-relative imports when running as module (python -m src.mcp)
    from .types import ToolName
    from .config import config
    from .handlers import RetrievalHandler
    from .tools import (
        get_retrieve_documents_tool,
    )
    from .utils.validation import ValidationError
except Exception:
    # Fallback to absolute imports when executed in environments without a known package parent
    from src.mcp.types import ToolName  # type: ignore
    from src.mcp.config import config  # type: ignore
    from src.mcp.handlers import RetrievalHandler  # type: ignore
    from src.mcp.tools import (  # type: ignore
        get_retrieve_documents_tool,
    )
    from src.mcp.utils.validation import ValidationError  # type: ignore

# Setup logging
from src.core.logger import log
import logging
try:
    logger = log.get_logger(__name__)  # type: ignore[attr-defined]
except Exception:
    if isinstance(log, logging.Logger):
        logger = log
    else:
        logger = logging.getLogger(__name__)

# IMPORTANT: ensure all logs go to stderr (not stdout) and disable colors
# so the MCP stdio JSON protocol over stdout is not polluted.
try:
    # Remove existing handlers to prevent stdout logging
    for h in list(logging.root.handlers):
        logging.root.removeHandler(h)
    # Basic stderr handler without colors
    handler = logging.StreamHandler(sys.stderr)
    formatter = logging.Formatter("%(asctime)s | %(levelname)-7s | %(message)s")
    handler.setFormatter(formatter)
    logging.basicConfig(level=os.environ.get("MCP_LOG_LEVEL", "INFO"), handlers=[handler])
    # If using loguru/coloredlogs upstream, discourage color by env
    os.environ.setdefault("NO_COLOR", "1")
except Exception:
    # Fallback: at least point our module logger to stderr
    stderr_handler = logging.StreamHandler(sys.stderr)
    logger.addHandler(stderr_handler)


class RAGRetrievalServer:
    """
    MCP Server for RAG Retrieval Operations
    Exposes document retrieval capabilities via Model Context Protocol
    """
    
    def __init__(self, server_name: str = None):
        """
        Initialize the MCP server
        
        Args:
            server_name: Optional custom server name
        """
        name = server_name or config.server.name
        self.server = Server(name)
        self.handler = RetrievalHandler()
        
        self._register_handlers()
        
        logger.info(
            "[RAGRetrievalServer] Initialized",
            extra={"server_name": name}
        )
    
    def _register_handlers(self) -> None:
        """Register MCP protocol handlers"""
        
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            """Return available tools"""
            tools = [
                get_retrieve_documents_tool(),
            ]
            
            logger.debug(
                "[RAGRetrievalServer] Listed tools",
                extra={"count": len(tools)}
            )
            
            return tools
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> list[TextContent]:
            """
            Handle tool execution
            
            Args:
                name: Tool name
                arguments: Tool arguments
                
            Returns:
                List of text content responses
            """
            logger.info(
                "[RAGRetrievalServer] Tool called",
                extra={"tool": name, "args_keys": list(arguments.keys())}
            )
            
            try:
                # Route to appropriate handler
                if name == ToolName.RETRIEVE_DOCUMENTS:
                    response = await self.handler.handle_retrieve_documents(arguments)
                else:
                    raise ValueError("Only 'retrieve_documents' tool is available")
                
                logger.info(
                    "[RAGRetrievalServer] Tool executed successfully",
                    extra={"tool": name}
                )
                
                return [TextContent(type="text", text=response)]
                
            except ValidationError as e:
                error_msg = f"Validation error: {str(e)}"
                logger.warning(
                    "[RAGRetrievalServer] Validation failed",
                    extra={"tool": name, "error": str(e)}
                )
                return [TextContent(
                    type="text",
                    text=f"❌ {error_msg}\n\nPlease check your input and try again."
                )]
            
            except Exception as e:
                error_msg = f"Tool execution failed: {str(e)}"
                logger.error(
                    "[RAGRetrievalServer] Tool execution error",
                    extra={"tool": name, "error": str(e)},
                    exc_info=True
                )
                return [TextContent(
                    type="text",
                    text=f"❌ {error_msg}\n\nPlease try again or contact support."
                )]
    
    async def run(self) -> None:
        """Run the MCP server using stdio transport"""
        logger.info("[RAGRetrievalServer] Starting server")
        
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )


def main() -> None:
    """Main entry point"""
    try:
        server = RAGRetrievalServer()
        asyncio.run(server.run())
    except KeyboardInterrupt:
        logger.info("[RAGRetrievalServer] Shutdown requested")
    except Exception as e:
        logger.error(
            "[RAGRetrievalServer] Fatal error",
            extra={"error": str(e)},
            exc_info=True
        )
        raise


if __name__ == "__main__":
    main()
