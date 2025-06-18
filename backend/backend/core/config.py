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
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", "")

# Configuration Hugging Face
HF_API_KEY=os.getenv("HF_API_KEY", "")
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")

# Configuration Outlook
OUTLOOK_CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID", "")
OUTLOOK_CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET", "")
OUTLOOK_TENANT_ID = os.getenv("OUTLOOK_TENANT_ID", "")
OUTLOOK_TOKEN_PATH = os.getenv("OUTLOOK_TOKEN_PATH", "data/microsoft_user_token/user_id.json")

FILE_REGISTRY_PATH = os.getenv("FILE_REGISTRY_PATH", "data/file_registry.json")

# Configuration Firebase
FIREBASE_TYPE = os.getenv("FIREBASE_TYPE", "service_account")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
FIREBASE_PRIVATE_KEY_ID = os.getenv("FIREBASE_PRIVATE_KEY_ID", "")
FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY", "")
FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL", "")
FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID", "")
FIREBASE_AUTH_URI = os.getenv("FIREBASE_AUTH_URI", "")
FIREBASE_TOKEN_URI = os.getenv("FIREBASE_TOKEN_URI", "")
FIREBASE_AUTH_PROVIDER_CERT_URL = os.getenv("FIREBASE_AUTH_PROVIDER_CERT_URL", "")
FIREBASE_CLIENT_CERT_URL = os.getenv("FIREBASE_CLIENT_CERT_URL", "")
FIREBASE_UNIVERSE_DOMAIN = os.getenv("FIREBASE_UNIVERSE_DOMAIN", "")
SERVICE_ACCOUNT_PATH = os.getenv("SERVICE_ACCOUNT_PATH", "")

# Gmail API credentials
GMAIL_CLIENT_ID_WEB=os.getenv("GMAIL_CLIENT_ID_WEB", "")
GMAIL_CLIENT_SECRET_WEB=os.getenv("GMAIL_CLIENT_SECRET_WEB", "")
GMAIL_CLIENT_ID=os.getenv("GMAIL_CLIENT_ID", "")
GMAIL_CLIENT_SECRET=os.getenv("GMAIL_CLIENT_SECRET", "")
GMAIL_REDIRECT_URI=os.getenv("GMAIL_REDIRECT_URI", "")
GMAIL_PROJECT_ID=os.getenv("GMAIL_PROJECT_ID", "")
GMAIL_AUTH_URI=os.getenv("GMAIL_AUTH_URI", "")
GMAIL_TOKEN_URI=os.getenv("GMAIL_TOKEN_URI", "")
GMAIL_AUTH_PROVIDER_X509_CERT_URL=os.getenv("GMAIL_AUTH_PROVIDER_X509_CERT_URL", "")
GMAIL_TOKEN_PATH=os.getenv("GMAIL_TOKEN_PATH", "")

# Outlook API credentials
OUTLOOK_CLIENT_ID=os.getenv("OUTLOOK_CLIENT_ID", "")
OUTLOOK_CLIENT_SECRET=os.getenv("OUTLOOK_CLIENT_SECRET", "")
OUTLOOK_TENANT_ID=os.getenv("OUTLOOK_TENANT_ID", "")
OUTLOOK_TOKEN_PATH=os.getenv("OUTLOOK_TOKEN_PATH", "")

POSTGRES_USER=os.getenv("POSTGRES_USER", "")
POSTGRES_PASSWORD=os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_DB=os.getenv("POSTGRES_DB", "")
POSTGRES_HOST=os.getenv("POSTGRES_HOST", "")
POSTGRES_PORT=os.getenv("POSTGRES_PORT", "")
STORAGE_PATH=os.getenv("STORAGE_PATH", "")

def load_config(config_path="./config.yaml"):
    """
    Charge la configuration YAML
    """
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
