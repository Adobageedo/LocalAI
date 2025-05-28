import sys
import os
import logging
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from dotenv import load_dotenv
from rag_engine.config import load_config

load_dotenv()

config = load_config()
ingest_cfg = config.get("ingestion", {})
retrieval_cfg = config.get("retrieval", {})
logging_cfg = config.get("logging", {})

DATA_DIR = os.path.abspath(ingest_cfg.get("watch_path", os.path.join(os.path.dirname(__file__), "..", "data", "documents")))
COLLECTION_NAME = retrieval_cfg.get("vectorstore", {}).get("collection", os.getenv("COLLECTION_NAME", "rag_documents"))
USER = os.getenv("USER", "unknown")
BATCH_SIZE = ingest_cfg.get("batch_size", 16)
SUPPORTED_TYPES = set(ingest_cfg.get("supported_types", ["pdf", "email", "txt"]))
LOG_LEVEL = logging_cfg.get("level", "ERROR").upper()
LOG_FILE = logging_cfg.get("file", None)

print(f"Using collection: {COLLECTION_NAME}")
if LOG_FILE:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    logging.basicConfig(filename=LOG_FILE, level=LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)

def get_all_files(data_dir):
    ext_map = {"pdf": ".pdf", "docx": ".docx", "txt": ".txt", "email": ".eml"}
    supported_exts = set(ext_map[t] for t in SUPPORTED_TYPES if t in ext_map)
    for root, _, files in os.walk(data_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in supported_exts:
                yield os.path.join(root, file)


from setup.upload_documents import upload_documents

def main():
    files = list(get_all_files(DATA_DIR))
    print(f"Found {len(files)} files in {DATA_DIR}")
    if not files:
        print("No supported files found for ingestion.")
        return
    # Use upload_documents for batching, chunking, deduplication, and upload
    upload_documents(
        filepaths=files,
        collection_name=COLLECTION_NAME,
        user=USER,
        batch_size=BATCH_SIZE
    )

if __name__ == "__main__":
    main()
