import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest
from typing import List, Dict, Any, Optional

load_dotenv()
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

class VectorStoreManager:
    def __init__(self, collection_name: str):
        if QDRANT_API_KEY:
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            self.client = QdrantClient(url=QDRANT_URL)
        self.collection_name = collection_name

    def add_documents(self, docs: List[Any]):
        """Add a list of langchain Document objects to the collection."""
        # Assumes docs are already chunked and have metadata
        from langchain_qdrant import QdrantVectorStore
        from rag_engine.embedder import get_embedder
        embedder = get_embedder()
        vectorstore = QdrantVectorStore(client=self.client, collection_name=self.collection_name, embedding=embedder)
        vectorstore.add_documents(docs)

    def delete_by_path(self, path: str):
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=rest.Filter(must=[{"key": "path", "match": {"value": path}}])
        )

    def delete_by_doc_id(self, doc_id: str):
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=rest.Filter(must=[{"key": "doc_id", "match": {"value": doc_id}}])
        )

    def update_path(self, old_path: str, new_path: str) -> int:
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
        info = self.client.get_collection(self.collection_name)
        return info.points_count

    def purge_all(self):
        self.client.delete(collection_name=self.collection_name, points_selector=rest.PointIdsSelector(points=[]))  # Use Qdrant's API for full purge if available

