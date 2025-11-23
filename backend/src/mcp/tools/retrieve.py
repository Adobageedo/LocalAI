"""
Document Retrieval Tool Definition
Main search and retrieval tool with advanced features
"""

from mcp.types import Tool


def get_retrieve_documents_tool() -> Tool:
    """
    Define the retrieve_documents tool
    
    Returns:
        Tool definition for document retrieval
    """
    return Tool(
        name="retrieve_documents",
        description=(
            "Search and retrieve relevant documents from the vector database using semantic search. "
            "Only the 'prompt' is accepted from the client; all retrieval options are fixed by server configuration."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Search query or question to find relevant documents",
                    "minLength": 1,
                    "maxLength": 10000
                }
            },
            "required": ["prompt"],
            "additionalProperties": False
        }
    )
