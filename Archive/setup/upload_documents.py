import sys
import os
import uuid
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from rag_engine.vectorstore import get_qdrant_client
from rag_engine.embedder import get_embedder
from langchain_qdrant import QdrantVectorStore
from langchain.schema import Document
import mimetypes
import hashlib
from tqdm import tqdm

def compute_doc_id(filepath):
    # Use file path and size as unique id (could add hash of content for robustness)
    stat = os.stat(filepath)
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

def fetch_existing_doc_ids_from_qdrant(qdrant_client, collection_name):
    existing_ids = set()
    offset = None
    page_size = 100
    while True:
        points, next_offset = qdrant_client.scroll(
            collection_name=collection_name,
            offset=offset,
            limit=page_size,
            with_payload=True
        )
        for point in points:
            payload = point.payload or {}
            doc_id = None
            if "doc_id" in payload:
                doc_id = payload["doc_id"]
            elif "metadata" in payload and isinstance(payload["metadata"], dict):
                doc_id = payload["metadata"].get("doc_id")
            if doc_id:
                existing_ids.add(doc_id)
        if next_offset is None:
            break
        offset = next_offset
    return existing_ids

from setup.document_loader import load_and_split_document

def upload_documents(filepaths, collection_name="rag_documents768", user="unknown", batch_size=16):
    embedder = get_embedder()
    qdrant_client = get_qdrant_client()
    vectorstore = QdrantVectorStore(client=qdrant_client, collection_name=collection_name, embedding=embedder)
    existing_ids = fetch_existing_doc_ids_from_qdrant(qdrant_client, collection_name)
    docs_to_upload = []
    for filepath in tqdm(filepaths, desc="Uploading documents"):
        if not os.path.isfile(filepath):
            print(f"Skipping non-file: {filepath}")
            continue
        ext = os.path.splitext(filepath)[1].lower()
        doc_id = compute_doc_id(filepath)
        if doc_id in existing_ids:
            print(f"Skipping already indexed file: {filepath}")
            continue
        try:
            split_docs = load_and_split_document(filepath)
            for chunk_idx, doc in enumerate(split_docs):
                # Add/override metadata for consistency
                
                doc.metadata["doc_id"] = doc_id
                doc.metadata["unique_id"] = str(uuid.uuid4())
                doc.metadata["source_path"] = filepath
                doc.metadata["user"] = user
                doc.metadata["attachment_name"] = os.path.basename(filepath)
                doc.metadata["chunk_idx"] = chunk_idx
                docs_to_upload.append(doc)
        except Exception as e:
            print(f"Failed to load {filepath}: {e}")
            continue
        if len(docs_to_upload) >= batch_size:
            vectorstore.add_documents(docs_to_upload)
            print(f"Uploaded batch of {len(docs_to_upload)} chunks")
            docs_to_upload = []
    if docs_to_upload:
        vectorstore.add_documents(docs_to_upload)
        print(f"Uploaded final batch of {len(docs_to_upload)} chunks")

from langchain.text_splitter import RecursiveCharacterTextSplitter

def upload_documents_inmemory(docs, collection_name="rag_documents768", user="unknown", batch_size=16, chunk_size=1000, chunk_overlap=200):
    """
    Upload a list of dicts with 'content' and 'metadata' keys as Documents to Qdrant, applying chunking for long text (emails, pdfs, txt, etc), and skipping already indexed doc_ids.
    """
    from langchain.schema import Document
    from rag_engine.vectorstore import get_qdrant_client
    from rag_engine.embedder import get_embedder
    from langchain_qdrant import QdrantVectorStore
    embedder = get_embedder()
    qdrant_client = get_qdrant_client()
    vectorstore = QdrantVectorStore(client=qdrant_client, collection_name=collection_name, embedding=embedder)
    existing_ids = fetch_existing_doc_ids_from_qdrant(qdrant_client, collection_name)
    docs_to_upload = []
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap, add_start_index=True)
    for doc in docs:
        doc_id = doc["metadata"].get("doc_id")
        if doc_id in existing_ids:
            print(f"USkipping already indexed doc_id: {doc_id}")
            continue
        # chunk if type is suitable (email, pdf, txt, etc)
        doc_type = doc["metadata"].get("document_type", "")
        should_chunk = doc_type in ["email", "txt", "pdf", "docx"]
        content = doc["content"]
        base_meta = doc["metadata"].copy()
        if should_chunk and isinstance(content, str) and len(content) > chunk_size:
            split_docs = splitter.create_documents([content])
            for chunk_idx, chunk in enumerate(split_docs):
                meta = base_meta.copy()
                meta["chunk_idx"] = chunk_idx
                docs_to_upload.append(Document(page_content=chunk.page_content, metadata=meta))
        else:
            base_meta["chunk_idx"] = 0
            docs_to_upload.append(Document(page_content=content, metadata=base_meta))
        if len(docs_to_upload) >= batch_size:
            vectorstore.add_documents(docs_to_upload)
            print(f"Uploaded batch of {len(docs_to_upload)} documents (in-memory)")
            docs_to_upload = []
    if docs_to_upload:
        vectorstore.add_documents(docs_to_upload)
        print(f"Uploaded final batch of {len(docs_to_upload)} documents (in-memory)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Upload one or more documents to Qdrant vector database.")
    parser.add_argument('files', nargs='+', help='File(s) to upload')
    parser.add_argument('--collection', default='rag_documents768', help='Qdrant collection name')
    parser.add_argument('--user', default='unknown', help='User uploading the documents')
    args = parser.parse_args()
    upload_documents(args.files, collection_name=args.collection, user=args.user)
