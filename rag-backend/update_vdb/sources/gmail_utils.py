import os
import pickle
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

import os
import yaml
from dotenv import load_dotenv

load_dotenv()

# Load Gmail credentials from env or config.yaml
client_id = os.getenv('GMAIL_CLIENT_ID')
client_secret = os.getenv('GMAIL_CLIENT_SECRET')
if not (client_id and client_secret):
    try:
        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
            gmail_cfg = config.get('gmail', {})
            client_id = client_id or gmail_cfg.get('client_id')
            client_secret = client_secret or gmail_cfg.get('client_secret')
    except Exception:
        pass
# Fallback to hardcoded if not found

CLIENT_CONFIG = {
    "installed": {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token"
    }
}

def get_gmail_service(token_path='token.pickle'):
    creds = None
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    return build('gmail', 'v1', credentials=creds)

def fetch_gmail_messages(service, user_id='me', max_results=10, query=None):
    try:
        results = service.users().messages().list(userId=user_id, maxResults=max_results, q=query).execute()
        messages = results.get('messages', [])
        return messages
    except HttpError as error:
        print(f'An error occurred: {error}')
        return []

def get_message_detail(service, msg_id, user_id='me'):
    try:
        message = service.users().messages().get(userId=user_id, id=msg_id, format='full').execute()
        return message
    except HttpError as error:
        print(f'An error occurred: {error}')
        return None
