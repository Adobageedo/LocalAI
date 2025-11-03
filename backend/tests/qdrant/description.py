import os
import sys
import logging
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

# allow imports of your project modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from src.core.config import QDRANT_URL, QDRANT_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("qdrant_inspect")

def main():
    # Initialize client
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY) if QDRANT_API_KEY else QdrantClient(url=QDRANT_URL)

    # List all collections (brief descriptions)
    coll_descs = client.get_collections().collections
    if not coll_descs:
        logger.info("No collections found at all.")
        return

    for desc in coll_descs:
        name = desc.name
        logger.info(f"--- Collection: {name} ---")

        # Fetch full info
        coll_info = client.get_collection(name)
        # coll_info is of type CollectionInfo, with attributes like:
        # coll_info.config, coll_info.vectors_count, coll_info.points_count, coll_info.payload_schema, etc.

        # Print key metadata
        cfg = coll_info.config
        vec_cfg = cfg.params.vectors if cfg.params else None
        rep = cfg.params.replication_factor if cfg.params else None
        write_consistency = cfg.params.write_consistency_factor if cfg.params else None

        logger.info(f"Vector Params: {vec_cfg}")
        logger.info(f"Replication factor: {rep}")
        logger.info(f"Write consistency factor: {write_consistency}")

        # The info object should have points_count, vectors_count, indexed_vectors_count
        pc = getattr(coll_info, "points_count", None)
        vc = getattr(coll_info, "vectors_count", None)
        ivc = getattr(coll_info, "indexed_vectors_count", None)

        logger.info(f"Points count: {pc}")
        logger.info(f"Vectors count: {vc}")
        logger.info(f"Indexed vectors count: {ivc}")

        # Optional: sample first few points
        # try:
        #     points, _ = client.scroll(collection_name=name, limit=5, with_payload=True, with_vectors=True)
        #     for p in points:
        #         vlen = len(p.vector) if p.vector is not None else None
        #         logger.info(f" Point ID: {p.id}, vector len: {vlen}, payload: {p.payload}")
        # except Exception as e:
        #     logger.warning(f"Could not scroll sample points for {name}: {e}")

        logger.info("\n")

if __name__ == "__main__":
    main()
