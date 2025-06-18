import os
import hashlib

def compute_doc_id(filepath, stat):
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

# For file content hashing (for stable doc_id)
def compute_file_content_hash(filepath):
    with open(filepath, "rb") as fobj:
        file_hash = hashlib.sha256(fobj.read()).hexdigest()
    return file_hash
