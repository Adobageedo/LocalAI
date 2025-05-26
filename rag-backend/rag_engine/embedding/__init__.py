from .base import BaseEmbedder
from .openai_embedder import OpenAIEmbedder
from .huggingface_embedder import HuggingFaceEmbedder

__all__ = ["BaseEmbedder", "OpenAIEmbedder", "HuggingFaceEmbedder"]

EMBEDDER_REGISTRY = {
    "openai": OpenAIEmbedder,
    "huggingface": HuggingFaceEmbedder,
}
