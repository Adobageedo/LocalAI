import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv
import os
load_dotenv()
# Initialize Firebase Admin
SERVICE_ACCOUNT_PATH = os.getenv("SERVICE_ACCOUNT_PATH")
def initialize_firebase():
    if os.path.exists(SERVICE_ACCOUNT_PATH):
        with open(SERVICE_ACCOUNT_PATH, "r") as f:
            try:
                content = json.load(f)
                if content:  # File is valid and not empty
                    cred = credentials.Certificate(content)
                    return firebase_admin.initialize_app(cred)
            except json.JSONDecodeError:
                print("Service account file is not a valid JSON. Falling back to .env")

    print("Using .env Firebase configuration")
    firebase_config = {
        "type": os.getenv("FIREBASE_TYPE"),
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.getenv("FIREBASE_CLIENT_ID"),
        "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
        "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
        "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL"),
    }

    cred = credentials.Certificate(firebase_config)
    return firebase_admin.initialize_app(cred)

firebase_app = initialize_firebase()

def verify_token(token):
    """Verify Firebase ID token and return user info"""
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        return None