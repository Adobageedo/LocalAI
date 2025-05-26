import os
from .base import BaseEmbedder
from typing import List
from dotenv import load_dotenv

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_huggingface import HuggingFaceEmbeddings

load_dotenv()

class HuggingFaceEmbedder(BaseEmbedder):
    def __init__(self, model_name: str = "intfloat/e5-base-v2", device: str = "cpu"):
        self._embedder = HuggingFaceEmbeddings(model_name=model_name, model_kwargs={"device": device})

    def embed(self, text: str) -> List[float]:
        """
        Return the embedding for the given text using HuggingFaceEmbeddings.
        """
        return self._embedder.embed_query(text)
