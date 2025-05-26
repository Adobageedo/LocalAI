import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
import argparse

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "rag_documents768")

def list_doc_ids_and_sources(collection=COLLECTION_NAME, limit=10000):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    
    # Retrieve all points (may want to increase limit for large collections)
    points, _ = client.scroll(
        collection_name=collection,
        offset=None,
        limit=limit,
        with_payload=True
    )
    doc_id_to_source = {}
    for point in points:
        payload = point.payload or {}
        meta = payload.get("metadata", payload)
        doc_id = meta.get("doc_id")
        source_path = meta.get("source_path")
        if doc_id and source_path and doc_id not in doc_id_to_source:
            doc_id_to_source[doc_id] = source_path
    return doc_id_to_source

def main():
    parser = argparse.ArgumentParser(description="List all unique doc_ids and their source paths from a Qdrant collection.")
    parser.add_argument("--collection", default=COLLECTION_NAME, help="Qdrant collection name")
    parser.add_argument("--limit", type=int, default=10000, help="Max number of points to scan")
    args = parser.parse_args()
    doc_id_to_source = list_doc_ids_and_sources(collection=args.collection, limit=args.limit)
    print(f"Found {len(doc_id_to_source)} unique doc_ids in collection '{args.collection}':\n")
    for doc_id, source_path in doc_id_to_source.items():
        print(f"doc_id: {doc_id}\n  source_path: {source_path}\n")

if __name__ == "__main__":
    main()
