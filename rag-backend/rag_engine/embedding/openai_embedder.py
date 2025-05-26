# Example OpenAI embedder implementation
import os
from .base import BaseEmbedder
from typing import List
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

class OpenAIEmbedder(BaseEmbedder):
    def __init__(self, model: str = "text-embedding-3-small"):
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEYTEST environment variable not set.")
        self._embedder = OpenAIEmbeddings(model=model, openai_api_key=OPENAI_API_KEY)

    def embed(self, text: str) -> List[float]:
        """
        Call the OpenAI API to get the embedding for the given text.
        """
        # The embed_query method returns a list of floats
        return self._embedder.embed_query(text)
