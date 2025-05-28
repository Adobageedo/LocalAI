import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
import argparse

load_dotenv()
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

def delete_by_path(collection, path):
    if QDRANT_API_KEY:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        client = QdrantClient(url=QDRANT_URL)
    client.delete(
        collection_name=collection,
        points_selector=rest.Filter(must=[{"key": "path", "match": {"value": path}}])
    )
    print(f"Deleted all vectors with path={path} in collection '{collection}'.")

from setup.upload_documents import upload_documents

def add_documents_from_paths(filepaths, collection_name):
    print(f"Adding documents to collection '{collection_name}' from: {filepaths}")
    upload_documents(filepaths, collection_name=collection_name)

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

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Delete or add vectors in a Qdrant collection by path.")
    parser.add_argument("--collection", required=True, help="Qdrant collection name")
    parser.add_argument("--path", help="Path to delete all chunks for")
    parser.add_argument("--add_files", help="Comma-separated list of files to add as new documents.")
    parser.add_argument("--add_collection", help="Collection to add new documents to (default: --collection)")
    parser.add_argument("--update_path_from", help="Old path to update from.")
    parser.add_argument("--update_path_to", help="New path to update to.")
    args = parser.parse_args()

    if args.path:
        delete_by_path(args.collection, args.path)

    if args.add_files:
        files = [f.strip() for f in args.add_files.split(",") if f.strip()]
        add_coll = args.add_collection or args.collection
        add_documents_from_paths(files, add_coll)

    if args.update_path_from and args.update_path_to:
        update_path(args.collection, args.update_path_from, args.update_path_to)
