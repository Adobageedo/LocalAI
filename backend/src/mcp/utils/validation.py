"""
Input validation utilities
Ensure data integrity and provide clear error messages
"""

from typing import Dict, Any
from ..types import RetrievalConfig
from ..config import config


class ValidationError(Exception):
    """Raised when input validation fails"""
    pass


def validate_prompt(prompt: str) -> None:
    """
    Validate search prompt
    
    Args:
        prompt: User search query
        
    Raises:
        ValidationError: If prompt is invalid
    """
    if not prompt or not prompt.strip():
        raise ValidationError("Prompt cannot be empty")
    
    if len(prompt) > 10000:
        raise ValidationError("Prompt exceeds maximum length (10000 characters)")


def validate_retrieval_args(args: Dict[str, Any]) -> RetrievalConfig:
    """
    Validate and convert retrieval arguments to config object
    
    Args:
        args: Raw arguments from tool call
        
    Returns:
        Validated RetrievalConfig object
        
    Raises:
        ValidationError: If arguments are invalid
    """
    # Required field
    if "prompt" not in args:
        raise ValidationError("Missing required field: 'prompt'")
    
    prompt = args["prompt"]
    validate_prompt(prompt)
    
    # All other options are fixed by server configuration and cannot be set by the caller
    # Any extra keys besides 'prompt' are ignored to prevent LLM-controlled overrides
    return RetrievalConfig(
        prompt=prompt,
        top_k=config.default_top_k,
        collection=config.get_collection(None),
        split_prompt=config.flags.split_prompt,
        use_hyde=config.flags.use_hyde,
        rerank=config.flags.rerank,
        metadata_filter=None,
    )


def validate_collection_name(collection: str) -> None:
    """
    Validate collection name
    
    Args:
        collection: Collection name to validate
        
    Raises:
        ValidationError: If collection name is invalid
    """
    if not collection or not collection.strip():
        raise ValidationError("Collection name cannot be empty")
    
    if len(collection) > 255:
        raise ValidationError("Collection name too long (max 255 characters)")
    
    # Check for invalid characters
    invalid_chars = set('<>:"|?*')
    if any(char in collection for char in invalid_chars):
        raise ValidationError(f"Collection name contains invalid characters: {invalid_chars}")
