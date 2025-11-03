import sys
import os

# Ajouter le chemin racine du projet aux chemins d'import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
import traceback
from src.services.vectorstore.qdrant_manager import VectorStoreManager
from src.services.ingestion.core.chunking import batch_load_and_split_document
from src.services.storage.file_registry import FileRegistry
from datetime import datetime
from src.services.ingestion.core.utils import compute_doc_id, compute_file_content_hash
from src.core.logger import log
from src.services.db.models import SyncStatus

# Utiliser le logger centralisé avec un nom spécifique pour ce module
logger = log.bind(name="src.services.ingestion.core.ingest_core")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')

# Cache for VectorStoreManager instances to avoid recreating them
_manager_cache = {}

def get_vector_store_manager(collection):
    """Get or create a cached VectorStoreManager instance"""
    if collection not in _manager_cache:
        _manager_cache[collection] = VectorStoreManager(collection)
    return _manager_cache[collection]

def flush_batch(batch_documents, user_id, result, file_registry, syncstatus: SyncStatus = None):
    """
    Ingest a batch of documents and update result statistics.
    """
    if not batch_documents:
        return
    logger.info(f"Batch de {len(batch_documents)} documents a ingérer and items already ingested: {result['items_ingested']}")
    try:
        # Ingest the batch of documents
        batch_ingest_documents(
            batch_documents=batch_documents,
            user=user_id,
            collection=user_id,
            file_registry=file_registry
        )
        
        # Update successful ingestion count
        result["items_ingested"] += len(batch_documents)
        if syncstatus:
            status = "in_progress"
            progress = result["items_ingested"]
            syncstatus.update_status(status, progress)
            logger.info(f"Batch de {len(batch_documents)} documents ingérés et items already ingested: {result['items_ingested']}")
    except Exception as batch_err:
        logger.error(f"Error in batch ingestion: {batch_err}")
        logger.error(traceback.format_exc())
        result["errors"].append(f"Batch error: {str(batch_err)}")
    finally:
        # Clear the batch list for the next batch
        batch_documents.clear()

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

    record_step_time("document_verification")
    for document in batch_documents:
        tmp_path = document["tmp_path"]
        metadata = document["metadata"]
        original_path = metadata.get("path")
        stat = os.stat(tmp_path)
        doc_id = metadata.get("doc_id") or compute_doc_id(original_path, stat)
        metadata["doc_id"] = doc_id

        if file_registry.file_exists(original_path) and not file_registry.has_changed(original_path, doc_id):
            logger.info(f"[SKIP] Document inchangé: {original_path}")
            continue

        if file_registry.file_exists(original_path):
            old_doc_id = file_registry.get_doc_id(original_path)
            if old_doc_id:
                logger.info(f"Suppression ancienne version de {original_path}")
                manager.delete_by_doc_id(old_doc_id)

        filepaths_to_process.append({
            "tmp_path": tmp_path,
            "metadata": metadata
        })

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
        filepath = doc.metadata.get("path")
        doc_id = doc.metadata.get("doc_id")

        if doc.metadata.get("document_type") == "email":
            email_fields = [
                "sender", "receiver", "cc", "bcc", "subject", "date", 
                "message_id", "document_type", "source", "content_type",
                "parent_email_id", "ingestion_date"
            ]
            for key in email_fields:
                doc.metadata.setdefault(key, None)
            doc.metadata["ingest_date"] = datetime.now().isoformat()

    if split_docs:
        try:
            logger.info(f"Upload de {len(split_docs)} chunks pour {len(filepaths_to_process)} fichiers")
            record_step_time("document_upload")
            manager.add_documents_in_batches(split_docs)
            logger.info("Upload terminé.")
        except Exception as e:
            logger.error(f"Erreur lors de l'upload: {e}")

        record_step_time("document_registry")
        for file_info in filepaths_to_process:
            doc_id = file_info["metadata"]["doc_id"]
            # Find a representative doc for this file
            doc = next((d for d in split_docs if d.metadata["doc_id"] == file_info["metadata"]["doc_id"]), None)
            if doc:
                file_registry.add_file(
                    doc_id=doc_id,
                    file_hash=doc_id,
                    source_path=file_info["metadata"]["path"],
                    last_modified=datetime.now().isoformat(),
                    metadata=doc.metadata
                )
            else:
                logger.warning(f"Aucun chunk à uploader. Mais document non embedded a ne pas traiter pour {file_info['tmp_path']}")
                file_info["metadata"]["embedded"] = False
                file_info["metadata"]["unique_id"] = doc_id
                file_registry.add_file(
                    doc_id=doc_id,
                    file_hash=doc_id,
                    source_path=file_info["metadata"]["path"],
                    last_modified=datetime.now().isoformat(),
                    metadata=file_info["metadata"]
                )
    elif filepaths_to_process:
        logger.info("Aucun chunk à uploader. Mais document non embedded a ne pas traiter")
        for file_info in filepaths_to_process:
            doc_id = file_info["metadata"]["doc_id"]
            file_info["metadata"]["embedded"] = False
            file_info["metadata"]["unique_id"] = doc_id
            file_registry.add_file(
                doc_id=doc_id,
                file_hash=doc_id,
                source_path=file_info["metadata"]["path"],
                last_modified=datetime.now().isoformat(),
                metadata=file_info["metadata"]
            )
    else:
        logger.warning("Aucun chunk à uploader.")

    record_step_time(None)
    timing["total_duration"] = round(time.time() - timing["total_start"], 3)
    logger.info(f"Temps total d'ingestion: {timing['total_duration']}s")