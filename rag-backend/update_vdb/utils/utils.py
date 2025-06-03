"""
General utility functions for file ops, temp files, hashing, etc.
"""
import os
import hashlib
import tempfile
from typing import Optional

def compute_sha256(filepath: str) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def save_temp_file(content: bytes, suffix: str = "") -> str:
    """Save bytes to a temp file and return its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, 'wb') as f:
        f.write(content)
    return path

def ensure_dir_exists(path: str):
    """Create directory if it does not exist."""
    os.makedirs(path, exist_ok=True)
