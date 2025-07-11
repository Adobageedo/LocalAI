import sys
import logging
import os
# Ajouter le chemin de la racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import yaml
import uuid
from dotenv import load_dotenv
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from update_vdb.core.chunking import batch_load_and_split_document, load_and_split_document
from langchain.schema import Document
import hashlib
from rag_engine.config import load_config
from sources.file_registry import FileRegistry
from datetime import datetime
load_dotenv()
# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ingest-core")
logging.getLogger("httpx").setLevel(logging.WARNING)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')

def compute_doc_id(filepath):
    stat = os.stat(filepath)
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

def ingest_document(filepath, user, collection=None, doc_id=None, metadata=None, original_filepath=None, original_filename=None, file_registry=None):
    """
    Loads, chunks, and uploads a document or email to Qdrant with enriched metadata.
    
    Args:
        filepath: Path to the document file to process
        user: User identifier for metadata
        collection: Name of the Qdrant collection (defaults to user if not provided)
        doc_id: Optional document ID for deduplication
        metadata: Optional dictionary of additional metadata to include
        original_filepath: Optional original file path to store in metadata (useful for temporary files)
        original_filename: Optional original file name to store in metadata
    Note:
        For email ingestion, set collection to user+"eml" in the calling function.
    """

    import time
    timing = {
        "total_start": time.time(),
        "steps": {},
        "total_duration": 0
    }

    def record_step_time(step_name):
        end_time = time.time()
        if 'current_step' in timing and timing['current_step'] is not None:
            current_step = timing['current_step']
            duration = end_time - timing['step_start']
            timing['steps'][current_step] = round(duration, 3)
            logger.debug(f"Step '{current_step}' took {duration:.3f} seconds")
        
        timing['current_step'] = step_name
        timing['step_start'] = time.time()
        return timing['step_start']

    record_step_time("initialization")
    config = load_config()

    # Utiliser le registre fourni ou en initialiser un nouveau
    if file_registry is None:
        file_registry = FileRegistry(user)
        logger.info(f"Nouveau registre de fichiers chargé: {len(file_registry.registry)} entrées")
    else:
        logger.debug(f"Utilisation du registre de fichiers existant: {len(file_registry.registry)} entrées")

    # Default collection to user if not provided
    if collection is None:
        collection = user
    manager = VectorStoreManager(collection)

    ext = os.path.splitext(filepath)[1].lower()
    if doc_id is None:
        doc_id = compute_doc_id(filepath)
    record_step_time("document_verification")
    # Vérifier si le document existe déjà dans le registre
    if file_registry:
        if file_registry.file_exists(filepath):
            if not file_registry.has_changed(filepath, doc_id):
                logger.info(f"Document déjà présent dans le registre (inchangé): {filepath}")
                return 
            else:
                logger.info(f"Document modifié, réingestion: {filepath}")
                # Supprimer l'ancien document de Qdrant
                old_doc_id = file_registry.get_doc_id(filepath)
                if old_doc_id:
                    logger.info(f"Suppression de l'ancien document: {old_doc_id}")
                    manager.delete_by_doc_id(old_doc_id)
    
    logger.info(f"Ingesting document: {collection}")
    record_step_time("document_chunking")
    try:
        split_docs = load_and_split_document(filepath)
    except Exception as e:
        logger.error(f"Failed to process after chunking {filepath}: {e}")
        return
    docs_to_upload = []
    record_step_time("document_metadata")
    for i, doc in enumerate(split_docs):
        # Attach metadata
        if not hasattr(doc, 'metadata') or doc.metadata is None:
            doc.metadata = {}
        
        # Définir les métadonnées de base
        doc.metadata["user"] = user
        doc.metadata["doc_id"] = doc_id  # Always use provided doc_id if given
        doc.metadata["source_path"] = original_filepath
        if original_filepath:
            doc.metadata["original_path"] = original_filepath
        else:
            doc.metadata["original_path"] = filepath
        current_filename = os.path.basename(filepath)
        if original_filename:
            doc.metadata["original_filename"] = original_filename
            doc.metadata["attachment_name"] = original_filename
        else:
            doc.metadata["original_filename"] = current_filename
            doc.metadata["attachment_name"] = current_filename
        doc.metadata["title"] = os.path.splitext(doc.metadata["original_filename"])[0]
        doc.metadata["chunk_id"] = i
        doc.metadata["unique_id"] = str(uuid.uuid4())
        if metadata:
            doc.metadata.update(metadata)
        if ext == ".eml" or (metadata and metadata.get('document_type') in ['email', 'email_body', 'attachment']):
            email_fields = [
                "sender", "receiver", "cc", "bcc", "subject", "date", 
                "message_id", "document_type", "source", "content_type",
                "parent_email_id", "ingest_date"
            ]
            for key in email_fields:
                doc.metadata.setdefault(key, None)                    
            doc.metadata["document_type"] = "email"
            doc.metadata["ingest_date"] = datetime.now().isoformat()
        docs_to_upload.append(doc)
    if docs_to_upload:
        try:
            logger.info(f"Uploading {len(docs_to_upload)} chunks for {original_filepath}")
            record_step_time("document_upload")
            manager.add_documents(docs_to_upload)
            logger.info("Upload complete.")
            # Récupérer les métadonnées du premier document pour les stocker dans le registre
            # Cela permettra à l'API de récupérer les métadonnées sans interroger Qdrant
            record_step_time("document_registry")
            doc_metadata = docs_to_upload[0].metadata if docs_to_upload else {}
            file_registry.add_file(
                        file_path=original_filepath,
                        doc_id=doc_id,
                        file_hash=doc_id,
                        source_path=original_filepath,
                        last_modified=datetime.now().isoformat(),
                        metadata=doc_metadata
                    )
            record_step_time(None)
            timing["total_duration"] = round(time.time() - timing["total_start"], 3)
        
            # Log timing information
            logger.info(f"Document ingestion timing - Total: {timing['total_duration']:.3f}s - " +
                   f"Load: {timing['steps'].get('initialization', 0):.3f}s, " +
                   f"Verification: {timing['steps'].get('document_verification', 0):.3f}s, " +
                   f"Chunk: {timing['steps'].get('document_chunking', 0):.3f}s, " +
                   f"Metadata: {timing['steps'].get('document_metadata', 0):.3f}s, " +
                   f"Upload: {timing['steps'].get('document_upload', 0):.3f}s, " +
                   f"Registry: {timing['steps'].get('document_registry', 0):.3f}s")

        except Exception as e:
            logger.error(f"Failed to upload documents: {e}")
        
    else:
        logger.info(f"No chunks to upload for {filepath}")

# Cache for VectorStoreManager instances to avoid recreating them
_manager_cache = {}

def get_vector_store_manager(collection):
    """Get or create a cached VectorStoreManager instance"""
    if collection not in _manager_cache:
        _manager_cache[collection] = VectorStoreManager(collection)
    return _manager_cache[collection]

def batch_ingest_documents(batch_documents, user, collection=None, file_registry=None):
    import time
    timing = {"total_start": time.time(), "steps": {}, "total_duration": 0}

    def record_step_time(step_name):
        end_time = time.time()
        if 'current_step' in timing and timing['current_step'] is not None:
            current_step = timing['current_step']
            duration = end_time - timing['step_start']
            timing['steps'][current_step] = round(duration, 3)
            logger.debug(f"Step '{current_step}' took {duration:.3f} seconds")
        timing['current_step'] = step_name
        timing['step_start'] = time.time()

    record_step_time("initialization")
    config = load_config()

    if file_registry is None:
        file_registry = FileRegistry(user)
        logger.info(f"Nouveau registre de fichiers chargé: {len(file_registry.registry)} entrées")

    if collection is None:
        collection = user
    manager = VectorStoreManager(collection)

    filepaths_to_process = []
    file_doc_ids = {}

    record_step_time("document_verification")
    for document in batch_documents:
        filepath = document["filepath"]
        metadata = document["metadata"]
        
        doc_id = document.get("doc_id") or compute_doc_id(filepath)
        file_doc_ids[filepath] = doc_id

        if file_registry.file_exists(filepath) and not file_registry.has_changed(filepath, doc_id):
            logger.info(f"[SKIP] Document inchangé: {filepath}")
            continue

        if file_registry.file_exists(filepath):
            old_doc_id = file_registry.get_doc_id(filepath)
            if old_doc_id:
                logger.info(f"Suppression ancienne version de {filepath}")
                manager.delete_by_doc_id(old_doc_id)

        filepaths_to_process.append(filepath)

    if not filepaths_to_process:
        logger.info("Aucun fichier à traiter.")
        return

    record_step_time("document_chunking")
    try:
        split_docs = batch_load_and_split_document(filepaths_to_process)
    except Exception as e:
        logger.error(f"Erreur lors du split des documents: {e}")
        return

    record_step_time("document_metadata")
    for doc in split_docs:
        filepath = doc.metadata.get("source_path")
        doc_id = file_doc_ids.get(filepath)

        if not hasattr(doc, 'metadata') or doc.metadata is None:
            doc.metadata = {}

        filename = os.path.basename(filepath)
        doc.metadata.update({
            "user": user,
            "doc_id": doc_id,
            "original_path": filepath,
            "original_filename": filename,
            "attachment_name": filename,
            "title": os.path.splitext(filename)[0],
            "chunk_id": doc.metadata.get("chunk_id", 0),
            "unique_id": str(uuid.uuid4())
        })

        if metadata:
            doc.metadata.update(metadata)

        if doc.metadata.get("document_type") == "email":
            email_fields = [
                "sender", "receiver", "cc", "bcc", "subject", "date", 
                "message_id", "document_type", "source", "content_type",
                "parent_email_id", "ingest_date"
            ]
            for key in email_fields:
                doc.metadata.setdefault(key, None)
            doc.metadata["ingest_date"] = datetime.now().isoformat()

    if split_docs:
        try:
            logger.info(f"Upload de {len(split_docs)} chunks pour {len(filepaths_to_process)} fichiers")
            record_step_time("document_upload")
            manager.add_documents(split_docs)
            logger.info("Upload terminé.")
        except Exception as e:
            logger.error(f"Erreur lors de l'upload: {e}")

        record_step_time("document_registry")
        for filepath in filepaths_to_process:
            doc_id = file_doc_ids[filepath]
            # Find a representative doc for this file
            doc = next((d for d in split_docs if d.metadata["original_path"] == filepath), None)
            if doc:
                file_registry.add_file(
                    file_path=filepath,
                    doc_id=doc_id,
                    file_hash=doc_id,
                    source_path=filepath,
                    last_modified=datetime.now().isoformat(),
                    metadata=doc.metadata
                )
    else:
        logger.warning("Aucun chunk à uploader.")

    record_step_time(None)
    timing["total_duration"] = round(time.time() - timing["total_start"], 3)
    logger.info(f"Temps total d'ingestion: {timing['total_duration']}s")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest documents into Qdrant vector database")
    parser.add_argument("--file", help="Path to a specific file to ingest")
    parser.add_argument("--dir", help="Directory containing files to ingest")
    parser.add_argument("--collection", help="Qdrant collection name")
    parser.add_argument("--user", default="system", help="User identifier for metadata")
    parser.add_argument("--doc-type", choices=["email", "pdf", "docx", "txt", "contract"], 
                        help="Document type for metadata")
    args = parser.parse_args()
    
    config = load_config()
    retrieval_cfg = config.get('retrieval', {})
    collection = args.collection or retrieval_cfg.get('vectorstore', {}).get('collection', 'rag_documents1536')
    supported_types = retrieval_cfg.get('supported_types', ["email", "pdf", "contract", "docx", "txt"])
    ext_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt", "email": ".eml"}
    supported_exts = set(ext_map[t] for t in supported_types if t in ext_map)
    
    # Determine files to ingest
    files_to_ingest = []
    
    if args.file:
        if os.path.isfile(args.file):
            files_to_ingest.append(args.file)
        else:
            print(f"File not found: {args.file}")
            return
    elif args.dir:
        if os.path.isdir(args.dir):
            from glob import glob
            for ext in supported_exts:
                files_to_ingest.extend(glob(os.path.join(args.dir, f"**/*{ext}"), recursive=True))
        else:
            print(f"Directory not found: {args.dir}")
            return
    else:
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'documents'))
        print(f"No file or directory specified, using default: {data_dir}")
        
        # Define get_files_from_dir function if it doesn't exist
        def get_files_from_dir(directory, extensions):
            from glob import glob
            files = []
            for ext in extensions:
                files.extend(glob(os.path.join(directory, f"**/*{ext}"), recursive=True))
            return files
            
        files_to_ingest = get_files_from_dir(data_dir, supported_exts)
    
    if not files_to_ingest:
        print("No files found to ingest.")
        return
    
    print(f"Ingesting {len(files_to_ingest)} files into collection '{collection}'")
    
    # Create base metadata
    base_metadata = {
        "user": args.user,
    }
    
    if args.doc_type:
        base_metadata["document_type"] = args.doc_type
    
    # Ingest each file individually
    for filepath in files_to_ingest:
        try:
            print(f"Processing: {filepath}")
            ingest_document(filepath, args.user, collection, metadata=base_metadata)
        except Exception as e:
            print(f"Failed to process {filepath}: {e}")
    
    print("Ingestion complete.")

if __name__ == "__main__":
    main()
