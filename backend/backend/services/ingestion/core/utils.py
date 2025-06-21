import os
import hashlib
from backend.services.ingestion.core.model import Email

def compute_doc_id(filepath, stat):
    base = f"{filepath}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(base.encode()).hexdigest()

# For file content hashing (for stable doc_id)
def compute_file_content_hash(filepath):
    with open(filepath, "rb") as fobj:
        file_hash = hashlib.sha256(fobj.read()).hexdigest()
    return file_hash

def compute_email_hash(email: Email) -> str:
    """
    Calcule un hash SHA-256 pour un email.
    
    Args:
        email: L'objet Email
        
    Returns:
        Le hash SHA-256 de l'email
    """
    # Créer une chaîne représentant le contenu complet de l'email
    content_parts = [
        email.metadata.message_id or "",
        email.metadata.subject or "",
        email.metadata.sender or "",
        email.metadata.receiver or "",
        email.metadata.date or "",
        email.content.body_text or "",
        email.content.body_html or ""
    ]
    
    email_content = "||".join(content_parts)
    
    # Calculer le hash SHA-256
    hasher = hashlib.sha256()
    hasher.update(email_content.encode('utf-8', errors='replace'))
    
    return hasher.hexdigest()

def generate_email_id(email: Email) -> str:
    """
    Génère un ID unique pour un email basé sur son hash.
    
    Args:
        email: L'objet Email
        
    Returns:
        Un ID unique pour l'email
    """
    hash_value = compute_email_hash(email)
    return hashlib.md5(hash_value.encode('utf-8')).hexdigest()
