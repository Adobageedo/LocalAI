from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
# 1) Load .env located alongside this file (backend/backend/core/.env)
# 2) Then also load any env from default search path (current working dir / process env)
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)
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

DEFAULT_TOTAL_CREDITS = os.getenv("DEFAULT_TOTAL_CREDITS", 10000)
DEFAULT_USED_CREDITS = os.getenv("DEFAULT_USED_CREDITS", 0)
DEFAULT_MAX_DOCUMENT_AGE_DAYS = os.getenv("DEFAULT_MAX_DOCUMENT_AGE_DAYS", 90)

# Qdrant Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

# Configuration OpenAI
OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", "")
OLLAMA_BASE_URL=os.getenv("OLLAMA_BASE_URL", "")
OLLAMA_MODEL=os.getenv("OLLAMA_MODEL", "")
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
OUTLOOK_REDIRECT_URI=os.getenv("OUTLOOK_REDIRECT_URI", "")

# Postgres defaults for local development (overridden by env/.env if provided)
POSTGRES_USER=os.getenv("POSTGRES_USER", "localai")
POSTGRES_PASSWORD=os.getenv("POSTGRES_PASSWORD", "localai_password")
POSTGRES_DB=os.getenv("POSTGRES_DB", "localai_db")
POSTGRES_HOST=os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT=os.getenv("POSTGRES_PORT", "5432")
STORAGE_PATH=os.getenv("STORAGE_PATH", "")

# Supabase configuration
SUPABASE_URL=os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY=os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY=os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_JWT_SECRET=os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_ENABLE_AUTH=os.getenv("SUPABASE_ENABLE_AUTH", "true").lower() == "true"

OUTLOOK_SCOPES = ['Mail.Read', 'User.Read', 'Mail.ReadWrite', 'Mail.Send']
ONEDRIVE_SCOPES = ['Files.ReadWrite.All']
OUTLOOK_CALENDAR_SCOPES = ['Calendars.Read', 'Calendars.ReadWrite']

GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
]
GDRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive'
]
GCALENDAR_SCOPES = [
    'https://www.googleapis.com/auth/calendar'
]
