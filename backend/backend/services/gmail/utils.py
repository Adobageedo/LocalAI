"""
Utility functions for Gmail email processing.
"""

import hashlib
from typing import Dict, Any
from .models import Email

def compute_email_hash(email: Email) -> str:
    """
    Calcule un hash unique pour un email basé sur ses métadonnées et son contenu.
    
    Args:
        email: L'objet Email à hasher
        
    Returns:
        Le hash SHA-256 de l'email
    """
    hasher = hashlib.sha256()
    # Utiliser message_id comme base principale si disponible
    if email.metadata.message_id:
        hasher.update(email.metadata.message_id.encode('utf-8'))
    
    # Ajouter d'autres métadonnées pour garantir l'unicité
    if email.metadata.subject:
        hasher.update(email.metadata.subject.encode('utf-8'))
    if email.metadata.date:
        hasher.update(email.metadata.date.encode('utf-8'))
    if email.metadata.sender:
        hasher.update(email.metadata.sender.encode('utf-8'))
    
    # Ajouter un échantillon du corps du texte s'il est disponible
    if email.content.body_text:
        body_sample = email.content.body_text[:1000]  # Limiter pour les performances
        hasher.update(body_sample.encode('utf-8'))
    
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

def format_registry_metadata(email: Email, source_type: str = "gmail") -> Dict[str, Any]:
    """
    Formate les métadonnées d'un email pour l'enregistrement dans le registre de fichiers.
    
    Args:
        email: L'objet Email
        source_type: Type de source (default: gmail)
        
    Returns:
        Dictionnaire de métadonnées formaté
    """
    return {
        "source_type": source_type,
        "email_id": email.metadata.message_id,
        "gmail_id": email.metadata.gmail_id,
        "thread_id": email.metadata.thread_id,
        "subject": email.metadata.subject,
        "sender": email.metadata.sender,
        "recipients": email.metadata.recipients,
        "date": email.metadata.date,
        "has_attachments": len(email.content.attachments) > 0,
        "attachment_count": len(email.content.attachments),
        "labels": email.metadata.gmail_labels
    }
