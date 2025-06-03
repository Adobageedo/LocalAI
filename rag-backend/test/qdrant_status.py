import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from collections import Counter, defaultdict
import json

load_dotenv()
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY = ""

client = QdrantClient(url=QDRANT_URL)

collections = client.get_collections().collections
print(f"Found {len(collections)} collections in Qdrant:")

for col in collections:
    name = col.name
    info = client.get_collection(name)
    vectors_count = info.points_count
    print(f"\nCollection: {name}")
    print(f"  Number of vectors: {vectors_count}")
    # Fetch a sample of points to infer metadata types
    points = client.scroll(collection_name=name, limit=100)[0]
    metadata_types = defaultdict(set)
    metadata_examples = defaultdict(list)
    for pt in points:
        payload = pt.payload or {}
        for k, v in payload.items():
            metadata_types[k].add(type(v).__name__)
            if len(metadata_examples[k]) < 3:
                metadata_examples[k].append(v)
    if metadata_types:
        print("  Metadata fields:")
        for k in metadata_types:
            types = ", ".join(sorted(metadata_types[k]))
            examples = metadata_examples[k]
            print(f"    - {k}: type(s)={types}, sample(s)=examples")
    else:
        print("  No metadata found in sample.")
