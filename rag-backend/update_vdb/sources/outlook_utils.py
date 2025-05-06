import requests
import os

import os
import yaml
from dotenv import load_dotenv

load_dotenv()

# Load Outlook credentials from env or config.yaml
outlook_client_id = os.getenv('OUTLOOK_CLIENT_ID')
outlook_client_secret = os.getenv('OUTLOOK_CLIENT_SECRET')
outlook_tenant_id = os.getenv('OUTLOOK_TENANT_ID')
if not (outlook_client_id and outlook_client_secret and outlook_tenant_id):
    try:
        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
            outlook_cfg = config.get('outlook', {})
            outlook_client_id = outlook_client_id or outlook_cfg.get('client_id')
            outlook_client_secret = outlook_client_secret or outlook_cfg.get('client_secret')
            outlook_tenant_id = outlook_tenant_id or outlook_cfg.get('tenant_id')
    except Exception:
        pass

def get_graph_access_token(client_id=None, client_secret=None, tenant_id=None, refresh_token=None):
    # Use loaded credentials if not explicitly provided
    cid = client_id or outlook_client_id
    csecret = client_secret or outlook_client_secret
    tid = tenant_id or outlook_tenant_id
    if not (cid and csecret and tid):
        raise ValueError("Outlook credentials not provided via env/config/args.")
    url = f"https://login.microsoftonline.com/{tid}/oauth2/v2.0/token"
    data = {
        'client_id': cid,
        'scope': 'https://graph.microsoft.com/.default',
        'client_secret': csecret,
        'grant_type': 'client_credentials',
    }
    response = requests.post(url, data=data)
    response.raise_for_status()
    return response.json()['access_token']


def fetch_outlook_messages(access_token, user_id='me', top=10):
    url = f"https://graph.microsoft.com/v1.0/users/{user_id}/mailFolders/Inbox/messages?$top={top}"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json().get('value', [])


def fetch_outlook_attachments(access_token, user_id, message_id):
    url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{message_id}/attachments"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json().get('value', [])
