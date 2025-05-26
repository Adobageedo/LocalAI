# Gestion conditionnelle des embeddings
import os
from rag_engine.config import load_config
from dotenv import load_dotenv
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import OpenAIEmbeddings

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEYTEST")


def get_embedder():
    if OPENAI_API_KEY:
        return OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)
    else:
        # Utilise le modèle e5-base-v2 de HuggingFace, force CPU si possible
        return HuggingFaceEmbeddings(model_name="intfloat/e5-base-v2", model_kwargs={"device": "cpu"})
