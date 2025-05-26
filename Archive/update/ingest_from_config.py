import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import yaml
import uuid
from dotenv import load_dotenv
from rag_engine.vectorstore_manager import VectorStoreManager
from update_vdb.split import load_and_split_document
from langchain.schema import Document
import hashlib
from rag_engine.config import load_config

load_dotenv()

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')

def compute_doc_id(filepath):
    stat = os.stat(filepath)
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

def ingest_document(filepath, user, collection=None, doc_id=None):
    """
    Loads, chunks, and uploads a document or email to Qdrant with enriched metadata.
    For emails (.eml), also adds sender, receiver, subject if available.
    Optionally, use provided doc_id for deduplication (e.g., from email Message-ID).
    """
    config = load_config()
    if collection is None:
        collection = config.get('retrieval', {}).get('vectorstore', {}).get('collection', 'rag_documents768')
    manager = VectorStoreManager(collection)
    ext = os.path.splitext(filepath)[1].lower()
    if doc_id is None:
        doc_id = compute_doc_id(filepath)
    try:
        split_docs = load_and_split_document(filepath)
    except Exception as e:
        print(f"Failed to process {filepath}: {e}")
        return
    docs_to_upload = []
    for i, doc in enumerate(split_docs):
        # Attach metadata
        if not hasattr(doc, 'metadata') or doc.metadata is None:
            doc.metadata = {}
        doc.metadata["user"] = user
        doc.metadata["doc_id"] = doc_id  # Always use provided doc_id if given
        doc.metadata["source_path"] = filepath
        doc.metadata["chunk_id"] = i
        doc.metadata["attachment_name"] = os.path.basename(filepath)
        doc.metadata["unique_id"] = str(uuid.uuid4())
        # If email, try to add sender, receiver, subject
        if ext == ".eml":
            # Try to extract from doc.metadata if present
            for key in ["sender", "receiver", "subject"]:
                if key not in doc.metadata:
                    doc.metadata[key] = None  # Default to None if not present
        docs_to_upload.append(doc)
    if docs_to_upload:
        print(f"Uploading {len(docs_to_upload)} chunks for {filepath}")
        manager.add_documents(docs_to_upload)
        print("Upload complete.")
    else:
        print(f"No chunks to upload for {filepath}")

def main():
    config = load_config()
    retrieval_cfg = config.get('retrieval', {})
    collection = retrieval_cfg.get('vectorstore', {}).get('collection', 'rag_documents768')
    supported_types = retrieval_cfg.get('supported_types', ["email", "pdf", "contract"])
    ext_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt", "email": ".eml"}
    supported_exts = set(ext_map[t] for t in supported_types if t in ext_map)
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'documents'))

    print(f"Ingesting from {data_dir} into collection '{collection}' (supported: {supported_exts})")
    files = get_files_from_dir(data_dir, supported_exts)
    if not files:
        print("No files found to ingest.")
        return
    manager = VectorStoreManager(collection)
    docs_to_upload = []
    for filepath in files:
        try:
            split_docs = load_and_split_document(filepath)
            docs_to_upload.extend(split_docs)
        except Exception as e:
            print(f"Failed to process {filepath}: {e}")
    if docs_to_upload:
        print(f"Uploading {len(docs_to_upload)} chunks...")
        manager.add_documents(docs_to_upload)
        print("Upload complete.")
    else:
        print("No chunks to upload.")

if __name__ == "__main__":
    main()
