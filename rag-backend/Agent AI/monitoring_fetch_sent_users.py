import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from rag_engine.vectorstore import get_qdrant_client

def fetch_sent_users(collection="rag_documents768", limit=2000):
    qdrant_client = get_qdrant_client()
    points, _ = qdrant_client.scroll(
        collection_name=collection,
        offset=None,
        limit=limit,  # adjust as needed for your dataset size
        with_payload=True
    )
    sent_users = set()
    for p in points:
        payload = p.payload or {}
        meta = payload.get("metadata", {})
        # Look for emails with direction == 'sent'
        direction = payload.get("direction") or meta.get("direction")
        user_val = payload.get("user") or meta.get("user")
        fromuser = payload.get("from") or meta.get("from")
        doc_type = payload.get("document_type") or meta.get("document_type")
        if doc_type == "email" and fromuser:
            sent_users.add(fromuser)
    return sorted(sent_users)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fetch all unique users who have sent emails in Qdrant DB.")
    parser.add_argument("--collection", default="rag_documents768", help="Qdrant collection name")
    parser.add_argument("--limit", type=int, default=2000, help="Maximum number of points to scan")
    args = parser.parse_args()

    users = fetch_sent_users(collection=args.collection, limit=args.limit)
    print("Found {} unique sent users:".format(len(users)))
    for u in users:
        print(u)
