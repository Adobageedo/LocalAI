"""
Response formatting utilities
Clean, consistent output formatting for MCP responses
"""

import json
from typing import List, Dict, Any
from ..types import DocumentResult


def format_document_result(results: List[DocumentResult], query: str) -> str:
    """
    Format document retrieval results as readable text
    
    Args:
        results: List of document results
        query: Original search query
        
    Returns:
        Formatted string response
    """
    if not results:
        return f"No documents found for query: '{query}'"
    
    lines = [
        f"**Found {len(results)} relevant documents for:** \"{query}\"\n",
        "=" * 80,
        ""
    ]
    
    for result in results:
        lines.extend([
            f"**Document {result.rank}**",
            f"Score: {result.score:.4f}" if result.score else "Score: N/A",
            "",
            f"**Content Preview:**",
            _truncate_content(result.content, max_length=400),
            "",
            f"**Metadata:**",
            _format_metadata(result.metadata),
            "",
            "-" * 80,
            ""
        ])
    
    return "\n".join(lines)


def format_subquestions(subquestions: List[str], original: str) -> str:
    """
    Format subquestions list
    
    Args:
        subquestions: List of subquestions
        original: Original complex question
        
    Returns:
        Formatted string response
    """
    lines = [
        "**Original Question:**",
        f"\"{original}\"",
        "",
        f"**Split into {len(subquestions)} subquestions:**",
        ""
    ]
    
    for i, question in enumerate(subquestions, 1):
        lines.append(f"{i}. {question}")
    
    return "\n".join(lines)


def format_hyde_result(original: str, hyde: str) -> str:
    """
    Format HyDE generation result
    
    Args:
        original: Original query
        hyde: Generated hypothetical answer
        
    Returns:
        Formatted string response
    """
    return "\n".join([
        "**Original Query:**",
        f"\"{original}\"",
        "",
        "**Hypothetical Answer (HyDE):**",
        "",
        hyde,
        "",
        f"_(Generated {len(hyde)} characters for improved semantic search)_"
    ])


def format_collection_info(info: Dict[str, Any]) -> str:
    """
    Format collection information
    
    Args:
        info: Collection metadata dictionary
        
    Returns:
        Formatted string response
    """
    lines = [
        "**Collection Information**",
        "=" * 60,
        "",
        f"Name: {info.get('collection_name', 'N/A')}",
        f"Min Score Threshold: {info.get('min_score', 'N/A')}",
        f"Default Top-K: {info.get('top_k', 'N/A')}",
        f"Embedding Model: {info.get('embedding_model', 'N/A')}",
    ]
    
    if 'vector_size' in info:
        lines.append(f"Vector Dimension: {info['vector_size']}")
    
    return "\n".join(lines)


def _truncate_content(content: str, max_length: int = 400) -> str:
    """Truncate content with ellipsis"""
    if len(content) <= max_length:
        return content
    return content[:max_length] + "..."


def _format_metadata(metadata: Dict[str, Any]) -> str:
    """Format metadata as indented JSON"""
    try:
        return json.dumps(metadata, indent=2)
    except (TypeError, ValueError):
        return str(metadata)
