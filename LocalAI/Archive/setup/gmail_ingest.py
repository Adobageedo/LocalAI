"""
Instructions préalables :
- Crée un projet Google Cloud, active l'API Gmail, et télécharge le fichier credentials.json (OAuth2).
- Place credentials.json dans le dossier setup/.
- Installe les dépendances : pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib
"""
import os
import base64
import mimetypes
from tqdm import tqdm
from pathlib import Path
from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from rag_engine.embedder import get_embedder
from rag_engine.vectorstore import get_qdrant_client
from langchain_qdrant import QdrantVectorStore
from langchain.schema import Document
from qdrant_client import QdrantClient
import hashlib
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from rag_engine.config import load_config

load_dotenv()

config = load_config()
ingest_cfg = config.get("ingestion", {})
retrieval_cfg = config.get("retrieval", {})
logging_cfg = config.get("logging", {})

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
COLLECTION_NAME = retrieval_cfg.get("vectorstore", {}).get("collection", os.getenv("COLLECTION_NAME", "rag_documents"))
USER = os.getenv("USER", "unknown")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

print(f"Using collection: {COLLECTION_NAME}")

def compute_doc_id_from_email(msg_id, extra=None):
    base = msg_id if extra is None else f"{msg_id}:{extra}"
    return hashlib.sha256(base.encode()).hexdigest()

def fetch_existing_doc_ids_from_qdrant(qdrant_client, collection_name):
    existing_ids = set()
    offset = None
    page_size = 100
    while True:
        points, next_offset = qdrant_client.scroll(
            collection_name=collection_name,
            offset=offset,
            limit=page_size,
            with_payload=True
        )
        for point in points:
            payload = point.payload or {}
            doc_id = None
            if "doc_id" in payload:
                doc_id = payload["doc_id"]
            elif "metadata" in payload and isinstance(payload["metadata"], dict):
                doc_id = payload["metadata"].get("doc_id")
            if doc_id:
                existing_ids.add(doc_id)
        if next_offset is None:
            break
        offset = next_offset
    return existing_ids

def gmail_authenticate():
    creds = None
    token_path = os.path.join(os.path.dirname(__file__), 'token.json')
    creds_path = os.path.join(os.path.dirname(__file__), 'credentials.json')
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    return creds

def get_user_email(service):
    profile = service.users().getProfile(userId='me').execute()
    return profile['emailAddress']

def save_attachment(msg, part, save_dir):
    file_data = base64.urlsafe_b64decode(part['body']['attachmentId']) if 'attachmentId' in part['body'] else None
    filename = part.get('filename')
    if filename and file_data:
        filepath = os.path.join(save_dir, filename)
        with open(filepath, 'wb') as f:
            f.write(file_data)
        return filepath
    return None

def download_attachments_and_emails(service, user_email, save_dir, mime_types=None):
    Path(save_dir).mkdir(parents=True, exist_ok=True)
    results = service.users().messages().list(userId='me', q="", maxResults=500).execute()
    messages = results.get('messages', [])
    files = []
    email_texts = []
    for msg_meta in tqdm(messages, desc="Fetching emails"):
        msg = service.users().messages().get(userId='me', id=msg_meta['id'], format='full').execute()
        payload = msg.get('payload', {})
        headers = payload.get('headers', [])
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), None)
        date = next((h['value'] for h in headers if h['name'].lower() == 'date'), None)
        message_id = msg.get('id')
        sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), None)
        to = next((h['value'] for h in headers if h['name'].lower() == 'to'), None)
        cc = next((h['value'] for h in headers if h['name'].lower() == 'cc'), None)
        # Get plain text body
        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain' and 'data' in part['body']:
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    break
        elif 'body' in payload and 'data' in payload['body']:
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        # Index email text if present
        if body.strip():
            email_texts.append({
                'content': body,
                'metadata': {
                    'user_email': user_email,
                    'subject': subject,
                    'date': date,
                    'message_id': message_id,
                    'sender': sender,
                    'to': to,
                    'cc': cc
                }
            })
        # Attachments
        parts = payload.get('parts', [])
        for part in parts:
            filename = part.get('filename')
            mime_type = part.get('mimeType')
            if filename and (not mime_types or mime_type in mime_types):
                att_id = part['body'].get('attachmentId')
                if att_id:
                    att = service.users().messages().attachments().get(userId='me', messageId=msg['id'], id=att_id).execute()
                    file_data = base64.urlsafe_b64decode(att['data'])
                    filepath = os.path.join(save_dir, filename)
                    with open(filepath, 'wb') as f:
                        f.write(file_data)
                    files.append(filepath)
    return files, email_texts

def index_user_documents(user_email, files, email_texts):
    embedder = get_embedder()
    qdrant_client = get_qdrant_client()
    vectorstore = QdrantVectorStore(client=qdrant_client, collection_name=COLLECTION_NAME, embedding=embedder)
    existing_ids = fetch_existing_doc_ids_from_qdrant(qdrant_client, COLLECTION_NAME)
    all_documents = []
    # Pièces jointes
    for filepath in tqdm(files, desc="Indexing attachments"):
        try:
            docs = load_and_split_document(filepath)
            for d in docs:
                if not hasattr(d, 'metadata') or not isinstance(d.metadata, dict):
                    d.metadata = {}
                d.metadata['doc_id'] = compute_doc_id_from_email(filepath)
                d.metadata['unique_id'] = d.metadata['doc_id']
                d.metadata['source_path'] = filepath
                d.metadata['document_type'] = mimetypes.guess_type(filepath)[0]
                d.metadata['user'] = USER
                if d.metadata['doc_id'] not in existing_ids:
                    all_documents.append(d)
                    print(f"Indexed doc_id: {d.metadata['doc_id']}")
                else:
                    print(f"Skipping already indexed doc_id: {d.metadata['doc_id']}")
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
    # Emails textes
    for email in tqdm(email_texts, desc="Indexing email contents"):
        try:
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, add_start_index=True)
            docs = splitter.split_documents([
                Document(page_content=email['content'], metadata=email['metadata'])
            ])
            for d in docs:
                if not hasattr(d, 'metadata') or not isinstance(d.metadata, dict):
                    d.metadata = {}
                d.metadata['doc_id'] = compute_doc_id_from_email(d.metadata['message_id'])
                d.metadata['unique_id'] = d.metadata['doc_id']
                d.metadata['source_path'] = d.metadata['message_id']
                d.metadata['document_type'] = 'email'
                d.metadata['user'] = USER
                if d.metadata['doc_id'] not in existing_ids:
                    all_documents.append(d)
                    print(f"Indexed doc_id: {d.metadata['doc_id']}")
                else:
                    print(f"Skipping already indexed doc_id: {d.metadata['doc_id']}")
        except Exception as e:
            print(f"Error processing email: {e}")
    if all_documents:
        print(f"Adding {len(all_documents)} chunks to Qdrant (collection: {COLLECTION_NAME})...")
        vectorstore.add_documents(all_documents)
        print("Indexing complete!")
    else:
        print("No documents to index.")

def main():
    creds = gmail_authenticate()
    service = build('gmail', 'v1', credentials=creds)
    user_email = get_user_email(service)
    user_dir = os.path.join(DATA_DIR, user_email)
    mime_types = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ]
    files, email_texts = download_attachments_and_emails(service, user_email, user_dir, mime_types=mime_types)
    print(f"Downloaded {len(files)} attachments and {len(email_texts)} emails for user {user_email}")
    index_user_documents(user_email, files, email_texts)

if __name__ == "__main__":
    main()
