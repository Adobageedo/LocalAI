import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
import logging
import traceback
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
from typing import List, Dict, Any
from langchain_qdrant import QdrantVectorStore
from backend.services.embeddings.embedding_service import EmbeddingService
from backend.core.logger import log
from backend.core.config import (
    QDRANT_URL,
    QDRANT_API_KEY
)

# Configure logging
logger = log.bind(name="backend.services.vectorstore.qdrant_manager")

class VectorStoreManager:
    def __init__(self, collection_name: str):
        if QDRANT_API_KEY:
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            self.client = QdrantClient(url=QDRANT_URL)
        self.collection_name = collection_name
        self.ensure_collection_exists()

    def ensure_collection_exists(self, vector_size=1536, distance="Cosine"):
        """Create the collection if it does not exist."""
        try:
            self.client.get_collection(self.collection_name)
        except Exception as e:
            if "doesn't exist" in str(e) or "not found" in str(e).lower():
                self.client.recreate_collection(
                    collection_name=self.collection_name,
                    vectors_config={"size": vector_size, "distance": distance}
                )
            else:
                raise

    def add_documents(self, docs: List[Any], embedder = None):
        """Add a list of langchain Document objects to the collection."""
        self.ensure_collection_exists()
        if embedder is None:
            embedder_instance = EmbeddingService()
            embedder = embedder_instance._embedder
        vectorstore = QdrantVectorStore(client=self.client, collection_name=self.collection_name, embedding=embedder)
        vectorstore.add_documents(docs)

    def add_documents_in_batches(self, docs: List[Any], batch_size: int = 20) -> Dict[str, Any]:
        """Add a list of langchain Document objects to the collection in batches.
        
        This method breaks down large document lists into smaller batches for more
        efficient processing, better memory management, and improved error handling.
        
        Args:
            docs: List of langchain Document objects to add to the collection
            batch_size: Number of documents to process in each batch (default: 20)
            
        Returns:
            Dict containing stats about the process:
                - total: Total number of documents received
                - processed: Number of documents successfully processed
                - errors: Number of batches with errors
                - batches: Total number of batches processed
        """
        self.ensure_collection_exists()
        embedder_instance = EmbeddingService()
        vectorstore = QdrantVectorStore(client=self.client, collection_name=self.collection_name, embedding=embedder_instance._embedder)
        
        total_docs = len(docs)
        if total_docs == 0:
            return {"total": 0, "processed": 0, "errors": 0, "batches": 0}
            
        stats = {
            "total": total_docs,
            "processed": 0,
            "errors": 0,
            "batches": 0
        }
        
        # Calculate number of batches
        num_batches = (total_docs + batch_size - 1) // batch_size  # Ceiling division
        
        logger.info(f"Processing {total_docs} chunks in {num_batches} batches of size {batch_size}")
        
        # Process documents in batches
        for i in range(0, total_docs, batch_size):
            batch = docs[i:i+batch_size]
            batch_num = (i // batch_size) + 1
            stats["batches"] += 1
            
            try:
                logger.debug(f"Processing batch {batch_num}/{num_batches} with {len(batch)} documents")
                self.add_documents(batch,embedder_instance._embedder)
                stats["processed"] += len(batch)
                logger.debug(f"Completed batch {batch_num}/{num_batches}")
            except Exception as e:
                stats["errors"] += 1
                logger.error(f"Error processing batch {batch_num}/{num_batches}: {str(e)}")
                # Continue processing other batches despite errors
        
        success_rate = (stats["processed"] / stats["total"]) * 100 if stats["total"] > 0 else 0
        logger.info(f"Document batch processing complete: {stats['processed']}/{stats['total']} documents processed successfully ({success_rate:.1f}%)")
        
        return stats

    def delete_by_path(self, path: str):
        self.ensure_collection_exists()
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=rest.Filter(must=[{"key": "path", "match": {"value": path}}])
        )

    def delete_by_doc_id(self, doc_id: str) -> int:
        """Delete all points associated with a document ID.
        
        Args:
            doc_id: The document ID to delete
            
        Returns:
            int: Number of points deleted
        """
        logger.info(f"QDRANT DELETION: Starting deletion for doc_id={doc_id} in collection={self.collection_name}")
        print(f"QDRANT DELETION: Starting deletion for doc_id={doc_id} in collection={self.collection_name}", flush=True)
        self.ensure_collection_exists()
        
        # Find points with doc_id at root or in metadata
        points_to_delete = set()
        offset = None
        while True:
            try:
                points, next_offset = self.client.scroll(
                    collection_name=self.collection_name,
                    offset=offset,
                    limit=100,
                    with_payload=True
                )
                logger.info(f"QDRANT DELETION: Scrolled batch of {len(points)} points")
                print(f"QDRANT DELETION: Scrolled batch of {len(points)} points", flush=True)
                
                for point in points:
                    payload = point.payload or {}
                    root_id = payload.get("doc_id")
                    meta_id = payload.get("metadata", {}).get("doc_id") if isinstance(payload.get("metadata"), dict) else None
                    if root_id == doc_id or meta_id == doc_id:
                        points_to_delete.add(point.id)
                        logger.info(f"QDRANT DELETION: Found matching point: id={point.id}, root_id={root_id}, meta_id={meta_id}")
                        print(f"QDRANT DELETION: Found matching point: id={point.id}, root_id={root_id}, meta_id={meta_id}", flush=True)
                
                if next_offset is None:
                    break
                offset = next_offset
            except Exception as e:
                logger.error(f"QDRANT DELETION ERROR: Error while scrolling collection: {str(e)}")
                logger.error(traceback.format_exc())
                print(f"QDRANT DELETION ERROR: Error while scrolling collection: {str(e)}", flush=True)
                print(traceback.format_exc(), flush=True)
                raise
        
        deleted_count = len(points_to_delete)
        logger.info(f"QDRANT DELETION: Found {deleted_count} points to delete for doc_id={doc_id}")
        print(f"QDRANT DELETION: Found {deleted_count} points to delete for doc_id={doc_id}", flush=True)
        
        if points_to_delete:
            try:
                # Delete by root doc_id
                logger.info(f"QDRANT DELETION: Deleting by root doc_id filter")
                print(f"QDRANT DELETION: Deleting by root doc_id filter", flush=True)
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=rest.Filter(must=[{"key": "doc_id", "match": {"value": doc_id}}])
                )
                
                # Delete by metadata.doc_id if needed
                logger.info(f"QDRANT DELETION: Deleting by metadata.doc_id filter")
                print(f"QDRANT DELETION: Deleting by metadata.doc_id filter", flush=True)
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=rest.Filter(must=[{"key": "metadata.doc_id", "match": {"value": doc_id}}])
                )
                logger.info(f"QDRANT DELETION: Successfully deleted {deleted_count} points for doc_id={doc_id}")
                print(f"QDRANT DELETION: Successfully deleted {deleted_count} points for doc_id={doc_id}", flush=True)
            except Exception as e:
                logger.error(f"QDRANT DELETION ERROR: Failed to delete points: {str(e)}")
                logger.error(traceback.format_exc())
                print(f"QDRANT DELETION ERROR: Failed to delete points: {str(e)}", flush=True)
                print(traceback.format_exc(), flush=True)
                raise
        else:
            logger.warning(f"QDRANT DELETION: No points found to delete for doc_id={doc_id}")
            print(f"QDRANT DELETION: No points found to delete for doc_id={doc_id}", flush=True)
        
        return deleted_count

    def update_path(self, old_path: str, new_path: str) -> int:
        self.ensure_collection_exists()
        points = []
        offset = None
        while True:
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=rest.Filter(must=[{"key": "path", "match": {"value": old_path}}]),
                with_payload=True,
                offset=offset
            )
            points.extend(scroll_result[0])
            if scroll_result[1] is None:
                break
            offset = scroll_result[1]
        if not points:
            return 0
        for point in points:
            self.client.set_payload(
                collection_name=self.collection_name,
                payload={"path": new_path},
                points=[point.id]
            )
        return len(points)

    def fetch_existing_doc_ids(self) -> set:
        self.ensure_collection_exists()
        existing_ids = set()
        offset = None
        page_size = 100
        while True:
            points, next_offset = self.client.scroll(
                collection_name=self.collection_name,
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

    def count(self) -> int:
        self.ensure_collection_exists()
        info = self.client.get_collection(self.collection_name)
        return info.points_count

    def purge_all(self):
        self.ensure_collection_exists()
        self.client.delete(collection_name=self.collection_name, points_selector=rest.PointIdsSelector(points=[]))  # Use Qdrant's API for full purge if available

    def get_qdrant_client(self):
        """Return the underlying QdrantClient instance."""
        return self.client
