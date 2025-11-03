import os
import sys
import logging
import argparse
from qdrant_client import QdrantClient

# Allow imports of your project modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.core.config import QDRANT_URL, QDRANT_API_KEY
from src.services.embeddings.embedding_service import EmbeddingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("qdrant_search")


def search_collection(collection_name: str, query_vector: list[float], top_k: int = 5):
    """Search in Qdrant collection using a vector."""
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY) if QDRANT_API_KEY else QdrantClient(url=QDRANT_URL)

    # Perform search
    results = client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        limit=top_k
    )

    if not results:
        logger.info(f"No results found in collection '{collection_name}'.")
        return

    logger.info(f"Top {top_k} results in collection '{collection_name}':")
    for i, r in enumerate(results, 1):
        vector_len = len(r.vector) if r.vector is not None else None
        logger.info(f"{i}. ID: {r.id}, Score: {r.score:.4f}, Vector length: {vector_len}, Payload: {r.payload}")


def main():
    parser = argparse.ArgumentParser(description="Search a Qdrant collection using a text query")
    parser.add_argument("--collection", required=True, help="Name of the collection to search")
    parser.add_argument("--query", required=True, help="Text query to embed and search")
    parser.add_argument("--top_k", type=int, default=5, help="Number of top results to return")
    args = parser.parse_args()

    # Initialize the embedding service
    embedder_instance = EmbeddingService()

    # Embed query text into vector
    query_vector = embedder_instance.embed(args.query)
    logger.info(f"Query vector generated (length {len(query_vector)})")

    # Perform search
    search_collection(args.collection, query_vector, top_k=args.top_k)


if __name__ == "__main__":
    main()