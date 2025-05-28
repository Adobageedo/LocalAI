import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from dotenv import load_dotenv
from rag_engine.vectorstore import get_qdrant_client
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "rag_documents")

# Adapter la taille du vecteur à ton modèle d'embedding (OpenAI=1536, e5-base-v2=768, etc.)
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))


def main():
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in collections:
        print(f"Collection '{COLLECTION_NAME}' already exists.")
        return
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
    )
    print(f"Collection '{COLLECTION_NAME}' created with vector size {EMBEDDING_DIM}.")

if __name__ == "__main__":
    main()
