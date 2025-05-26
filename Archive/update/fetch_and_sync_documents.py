import argparse
import os
from typing import Optional
from ingest_from_config import ingest_document

from rag_engine.vectorstore_manager import VectorStoreManager
import hashlib

def compute_file_doc_id(filepath):
    # Use file content hash for stable doc_id
    with open(filepath, "rb") as fobj:
        file_hash = hashlib.sha256(fobj.read()).hexdigest()
    return file_hash

def fetch_local_documents(directory, collection, user):
    files = []
    for root, _, filenames in os.walk(directory):
        for fname in filenames:
            files.append(os.path.join(root, fname))
    if not files:
        print(f"No files found in {directory}")
        return
    manager = VectorStoreManager(collection)
    existing_doc_ids = manager.fetch_existing_doc_ids()
    print(f"Fetched {len(existing_doc_ids)} existing doc_ids from Qdrant.")
    for f in files:
        doc_id = compute_file_doc_id(f)
        if doc_id in existing_doc_ids:
            print(f"Skipping already ingested document: {f}")
            continue
        ingest_document(f, user=user, collection=collection, doc_id=doc_id)

def fetch_google_drive_documents(**kwargs):
    print("Fetching documents from Google Drive...")
    print("Google Drive fetch not implemented yet.")

def fetch_sharepoint_documents(**kwargs):
    print("Fetching documents from SharePoint...")
    print("SharePoint fetch not implemented yet.")

def fetch_and_sync_documents(method: str, **kwargs):
    """
    Fetch and synchronize documents from the specified method (local, google_drive, sharepoint).
    kwargs are passed to the specific fetch function.
    """
    method = method.lower()
    if method == "local":
        directory = kwargs.get('directory', './data/documents')
        collection = kwargs.get('collection_name', 'rag_documents')
        user = kwargs.get('user', 'unknown')
        fetch_local_documents(directory, collection, user)
    elif method == "google_drive":
        fetch_google_drive_documents(**kwargs)
    elif method == "sharepoint":
        fetch_sharepoint_documents(**kwargs)
    else:
        raise ValueError(f"Unknown document fetch method: {method}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch and sync documents from local, Google Drive, or SharePoint.")
    parser.add_argument('--method', required=True, choices=['local', 'google_drive', 'sharepoint'], help='Document fetch method')
    parser.add_argument('--directory', default='./data/documents', help='Local directory for documents (for local)')
    parser.add_argument('--collection_name', default='rag_documents', help='Qdrant collection name')
    parser.add_argument('--user', default='unknown', help='User for metadata')
    args = parser.parse_args()
    fetch_and_sync_documents(
        method=args.method,
        directory=args.directory,
        collection_name=args.collection_name,
        user=args.user
    )
