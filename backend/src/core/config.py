"""
Configuration centrale du src.
"""

import os
from pathlib import Path
import yaml
from src.core.logger import log
from src.core.constants import (
    BASE_DIR,
    DATA_DIR,
    STORAGE_DIR,
    API_V1_STR,
    PROJECT_NAME,
    QDRANT_URL,
    QDRANT_API_KEY,
    OPENAI_API_KEY,
    HF_API_KEY,
    HF_EMBEDDING_MODEL,
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID,
    OUTLOOK_TOKEN_PATH,
    FILE_REGISTRY_PATH,
    FIREBASE_TYPE,
    FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID,
    FIREBASE_AUTH_URI,
    FIREBASE_TOKEN_URI,
    FIREBASE_AUTH_PROVIDER_CERT_URL,
    FIREBASE_CLIENT_CERT_URL,
    FIREBASE_UNIVERSE_DOMAIN,
    SERVICE_ACCOUNT_PATH,
    GMAIL_CLIENT_ID_WEB,
    GMAIL_CLIENT_SECRET_WEB,
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI,
    GMAIL_PROJECT_ID,
    GMAIL_AUTH_URI,
    GMAIL_TOKEN_URI,
    GMAIL_AUTH_PROVIDER_X509_CERT_URL,
    GMAIL_TOKEN_PATH,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    POSTGRES_DB,
    POSTGRES_HOST,
    POSTGRES_PORT,
    STORAGE_PATH,
    DEFAULT_TOTAL_CREDITS,
    DEFAULT_USED_CREDITS,
    DEFAULT_MAX_DOCUMENT_AGE_DAYS,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY,
    SUPABASE_JWT_SECRET,
    GMAIL_SCOPES,
    GDRIVE_SCOPES,
    GCALENDAR_SCOPES,
    OUTLOOK_SCOPES,
    ONEDRIVE_SCOPES,
    OUTLOOK_CALENDAR_SCOPES,
    OUTLOOK_REDIRECT_URI,
    SECRET_KEY
)

logger = log.bind(name="src.core.config")
# Charger les variables d'environnement depuis .env

def load_config(config_path=None):
    """
    Charge la configuration YAML
    """
    if config_path is None:
        config_path = Path(__file__).parent / "config.yaml"

    if not os.path.exists(config_path):
        logger.warning(f"Configuration file not found at {config_path}")
        return {}
        
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

# Charger la configuration YAML
CONFIG = load_config()