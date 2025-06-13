"""
Configuration centrale du backend.
"""

import os
from dotenv import load_dotenv
from pathlib import Path
import yaml

# Charger les variables d'environnement depuis .env
load_dotenv()

# Chemins de base
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
STORAGE_DIR = DATA_DIR / "storage"

# Assurer que les répertoires existent
DATA_DIR.mkdir(exist_ok=True)
STORAGE_DIR.mkdir(exist_ok=True)

# API Configuration
API_V1_STR = "/api"
PROJECT_NAME = "LocalAI RAG Backend"

# Qdrant Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# Configuration OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
OPENAI_GENERATION_MODEL = os.getenv("OPENAI_GENERATION_MODEL", "gpt-3.5-turbo")

# Configuration Hugging Face
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

# Configuration MinIO/S3
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "localai")
MINIO_SECURE = os.getenv("MINIO_SECURE", "False").lower() == "true"

# Configuration Nextcloud
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")

# Configuration Gmail
GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
GMAIL_REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:5173")
GMAIL_TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "data/google_user_token/user_id.pickle")
GMAIL_CREDENTIALS_PATH = os.getenv("GMAIL_CREDENTIALS_PATH", "credentials.json")
GMAIL_AUTH_URI = os.getenv("GMAIL_AUTH_URI", "https://accounts.google.com/o/oauth2/auth")
GMAIL_TOKEN_URI = os.getenv("GMAIL_TOKEN_URI", "https://oauth2.googleapis.com/token")

# Configuration Outlook
OUTLOOK_CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID", "")
OUTLOOK_CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET", "")
OUTLOOK_TENANT_ID = os.getenv("OUTLOOK_TENANT_ID", "")
OUTLOOK_TOKEN_PATH = os.getenv("OUTLOOK_TOKEN_PATH", "data/microsoft_user_token/user_id.json")

# Configuration IMAP
IMAP_SERVER = os.getenv("IMAP_SERVER", "")
IMAP_USERNAME = os.getenv("IMAP_USERNAME", "")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD", "")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_SSL = os.getenv("IMAP_SSL", "True").lower() == "true"

# Configuration Firebase
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
USE_FIREBASE_AUTH = os.getenv("USE_FIREBASE_AUTH", "False").lower() == "true"

def load_config(config_path=None):
    """
    Charge la configuration YAML
    """
    if config_path is None:
        config_path = BASE_DIR / "config.yaml"
    
    if not os.path.exists(config_path):
        return {}
        
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

# Charger la configuration YAML
CONFIG = load_config()

# Types de fichiers supportés pour l'ingestion
SUPPORTED_FILE_TYPES = CONFIG.get("ingestion", {}).get("supported_types", [
    "pdf", "docx", "txt", "md", "pptx", "csv", "html", "xml", "json"
])
