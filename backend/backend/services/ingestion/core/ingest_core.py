import sys
import os

# Ajouter le chemin racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

import uuid
from backend.services.vectorstore.qdrant_manager import VectorStoreManager
from backend.services.ingestion.core.chunking import batch_load_and_split_document
from langchain.schema import Document
import hashlib
from backend.core.config import load_config
from backend.services.storage.file_registry import FileRegistry
from datetime import datetime
from backend.services.ingestion.core.utils import compute_doc_id, compute_file_content_hash
from backend.core.logger import log

# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="backend.services.ingestion.core.ingest_core")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')

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

    if file_registry is None:
        file_registry = FileRegistry(user)
        logger.info(f"Nouveau registre de fichiers chargé: {len(file_registry.registry)} entrées")

    if collection is None:
        collection = user
    manager = VectorStoreManager(collection)

    filepaths_to_process = []
    source_paths_to_process = []
    file_doc_ids = {}

    record_step_time("document_verification")
    for document in batch_documents:
        filepath = document["filepath"]
        metadata = document["metadata"]
        original_path = metadata.get("source_path")
        stat = os.stat(filepath)
        doc_id = document.get("doc_id") or compute_doc_id(original_path, stat)
        file_doc_ids[original_path] = doc_id

        if file_registry.file_exists(original_path) and not file_registry.has_changed(original_path, doc_id):
            logger.info(f"[SKIP] Document inchangé: {original_path}")
            continue

        if file_registry.file_exists(original_path):
            old_doc_id = file_registry.get_doc_id(original_path)
            if old_doc_id:
                logger.info(f"Suppression ancienne version de {original_path}")
                manager.delete_by_doc_id(old_doc_id)

        filepaths_to_process.append(filepath)
        source_paths_to_process.append(original_path)

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
        logger.info(f"Ajout du document {filepath} au registre et doc_id {doc_id}")

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
        for filepath in source_paths_to_process:
            doc_id = file_doc_ids[filepath]
            logger.info(f"Ajout du fichier {filepath} au registre et doc_id {doc_id}")
            # Find a representative doc for this file
            doc = next((d for d in split_docs if d.metadata["source_path"] == filepath), None)
            if doc:
                logger.info(f"Ajout du fichier {filepath} au registre")
                file_registry.add_file(
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