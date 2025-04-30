import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
import argparse

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "rag_documents768")

def get_full_document(doc_id, collection=COLLECTION_NAME):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    
    # Try to match doc_id at both top-level and in metadata
    filters = [
        {"must": [{"key": "doc_id", "match": {"value": doc_id}}]},
        {"must": [{"key": "metadata.doc_id", "match": {"value": doc_id}}]}
    ]
    points = []
    for f in filters:
        results = client.scroll(
            collection_name=collection,
            scroll_filter=f,
            limit=1000,
            with_payload=True
        )
        if results[0]:
            points = results[0]
            break
    if not points:
        print(f"No chunks found for doc_id={doc_id} in collection '{collection}'")
        # Debug: print a sample point if available
        all_points, _ = client.scroll(collection_name=collection, limit=5, with_payload=True)
        if all_points:
            print("Sample point payloads:")
            for i, p in enumerate(all_points, 1):
                print(f"Point {i}: {p.payload}")
        return None, None
    # Sort by chunk_idx if present, else by id
    def get_chunk_idx(point):
        payload = point.payload or {}
        meta = payload.get("metadata", payload)
        return meta.get("chunk_idx", 0)
    sorted_points = sorted(points, key=get_chunk_idx)
    # Unify all text chunks
    full_text = "".join([p.payload.get("page_content", "") for p in sorted_points])
    return full_text, sorted_points

def main():
    parser = argparse.ArgumentParser(description="Retrieve and unify all chunks of a document by doc_id from Qdrant.")
    parser.add_argument("--doc_id", required=True, help="The document id to retrieve.")
    parser.add_argument("--collection", default=COLLECTION_NAME, help="Qdrant collection name")
    args = parser.parse_args()
    text, chunks = get_full_document(args.doc_id, collection=args.collection)
    if text:
        print(text)
    # If nothing found, print nothing (exit code will still be 0)

if __name__ == "__main__":
    main()
