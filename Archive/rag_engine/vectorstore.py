# Connexion à Qdrant
import os
from rag_engine.config import load_config
from dotenv import load_dotenv
from qdrant_client import QdrantClient

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")


def get_qdrant_client(host=None, port=None, **kwargs):
    """
    Create a Qdrant client using either host/port or QDRANT_URL. Supports API key if set.
    """
    if host is not None and port is not None:
        if QDRANT_API_KEY:
            client = QdrantClient(host=host, port=port, api_key=QDRANT_API_KEY, **kwargs)
        else:
            client = QdrantClient(host=host, port=port, **kwargs)
    elif QDRANT_URL:
        if QDRANT_API_KEY:
            client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, **kwargs)
        else:
            client = QdrantClient(url=QDRANT_URL, **kwargs)
    else:
        # Fallback to default localhost
        client = QdrantClient(host="localhost", port=6333, **kwargs)
    return client

