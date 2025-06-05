import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import logging

logger = logging.getLogger("google_auth")

def get_google_service(service_name, version, scopes, token_path, env_prefix="GMAIL"):
    """
    Authentifie l'utilisateur et renvoie un service Google API (Gmail, Drive, etc.).
    Args:
        service_name: Nom du service Google ("gmail", "drive", ...)
        version: Version de l'API ("v1", "v3", ...)
        scopes: Liste des scopes d'accès
        token_path: Chemin vers le fichier de token
        env_prefix: Préfixe des variables d'environnement ("GMAIL" ou "GOOGLE_DRIVE")
    Returns:
        Service Google authentifié
    """
    creds = None
    # Charger les credentials depuis les variables d'environnement
    client_id = os.getenv(f"{env_prefix}_CLIENT_ID") or os.getenv("GMAIL_CLIENT_ID")
    client_secret = os.getenv(f"{env_prefix}_CLIENT_SECRET") or os.getenv("GMAIL_CLIENT_SECRET")
    redirect_uri = os.getenv(f"{env_prefix}_REDIRECT_URI") or os.getenv("GMAIL_REDIRECT_URI")
    auth_uri = os.getenv(f"{env_prefix}_AUTH_URI", "https://accounts.google.com/o/oauth2/auth")
    token_uri = os.getenv(f"{env_prefix}_TOKEN_URI", "https://oauth2.googleapis.com/token")
    cert_url = os.getenv(f"{env_prefix}_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs")

    if not all([client_id, client_secret]):
        raise EnvironmentError(f"Variables {env_prefix}_CLIENT_ID et {env_prefix}_CLIENT_SECRET manquantes dans .env")
    logger.info(f"Utilisation des credentials depuis les variables d'environnement pour {service_name}")
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(
                {
                    "installed": {
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uris": [redirect_uri],
                        "auth_uri": auth_uri,
                        "token_uri": token_uri,
                        "auth_provider_x509_cert_url": cert_url
                    }
                },
                scopes
            )
            creds = flow.run_local_server(port=0)
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    return build(service_name, version, credentials=creds)

# Scopes spécifiques
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
]
DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
]

def get_gmail_service(token_path):
    return get_google_service("gmail", "v1", GMAIL_SCOPES, token_path, env_prefix="GMAIL")

def get_drive_service(token_path):
    return get_google_service("drive", "v3", DRIVE_SCOPES, token_path, env_prefix="GOOGLE_DRIVE")
