import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest

load_dotenv()
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

def delete_by_doc_id(collection, doc_id):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    # Suppression par doc_id
    client.delete(
        collection_name=collection,
        points_selector=rest.Filter(must=[{"key": "doc_id", "match": {"value": doc_id}}])
    )
    print(f"Deleted all vectors with doc_id={doc_id} in collection '{collection}'.")

def delete_by_path(collection, path):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    # Suppression par path
    client.delete(
        collection_name=collection,
        points_selector=rest.Filter(must=[{"key": "path", "match": {"value": path}}])
    )
    print(f"Deleted all vectors with path={path} in collection '{collection}'.")

def update_path(collection, old_path, new_path):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    # Find all points with old_path
    points = []
    offset = None
    while True:
        scroll_result = client.scroll(
            collection_name=collection,
            scroll_filter=rest.Filter(must=[{"key": "path", "match": {"value": old_path}}]),
            with_payload=True,
            offset=offset
        )
        points.extend(scroll_result[0])
        if scroll_result[1] is None:
            break
        offset = scroll_result[1]
    if not points:
        print(f"No vectors found with path={old_path} in collection '{collection}'.")
        return
    for point in points:
        client.set_payload(
            collection_name=collection,
            payload={"path": new_path},
            points=[point.id]
        )
    print(f"Updated {len(points)} vectors from path={old_path} to path={new_path} in collection '{collection}'.")

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Delete or update vectors by collection, doc_id, or path.")
    parser.add_argument("--collection", required=True, help="Qdrant collection name")
    parser.add_argument("--doc_id", help="If set, delete only vectors with this doc_id.")
    parser.add_argument("--path", help="If set, delete only vectors with this path.")
    parser.add_argument("--purge_all", action="store_true", help="Delete ALL vectors in the collection.")
    parser.add_argument("--update_path_from", help="Old path to update from.")
    parser.add_argument("--update_path_to", help="New path to update to.")
    args = parser.parse_args()
    if args.update_path_from and args.update_path_to:
        update_path(args.collection, args.update_path_from, args.update_path_to)
        return

    if args.doc_id:
        delete_by_doc_id(args.collection, args.doc_id)
    elif args.path:
        delete_by_path(args.collection, args.path)
    elif args.purge_all:
        if QDRANT_API_KEY:
            client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            client = QdrantClient(url=QDRANT_URL)
        info = client.get_collection(args.collection)
        count = info.points_count
        if count == 0:
            print(f"Collection '{args.collection}' is already empty.")
        else:
            confirm = input(f"Are you sure you want to delete ALL {count} vectors in '{args.collection}'? (yes/no): ").strip().lower()
            if confirm == "yes":
                client.delete(collection_name=args.collection, points_selector=rest.Filter(must=[]))
                print(f"Deleted all vectors in collection '{args.collection}'.")
            else:
                print("Aborted.")
    else:
        print("Specify either --doc_id or --purge_all.")

if __name__ == "__main__":
    main()
