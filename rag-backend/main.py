from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag_engine.Retrieve_rag_information import get_rag_response
from rag_engine.config import load_config
from dotenv import load_dotenv
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

if __name__ == "__main__":
    import uvicorn
    config = load_config()
    api_cfg = config.get("api", {})
    host = api_cfg.get("host", "0.0.0.0")
    port = api_cfg.get("port", 8000)
    uvicorn.run("main:app", host=host, port=port, reload=True)

app = FastAPI()

class QueryRequest(BaseModel):
    question: str

@app.post("/query")
def query_endpoint(req: QueryRequest):
    try:
        response = get_rag_response(req.question)
        return {"answer": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Gmail utils ---
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
GMAIL_SETUP_DIR = os.path.join(os.path.dirname(__file__), "setup")

def gmail_authenticate():
    token_path = os.path.join(GMAIL_SETUP_DIR, 'token.json')
    creds_path = os.path.join(GMAIL_SETUP_DIR, 'credentials.json')
    creds = None
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

@app.get("/gmail_email/{message_id}")
def get_gmail_email(message_id: str):
    try:
        creds = gmail_authenticate()
        service = build('gmail', 'v1', credentials=creds)
        msg = service.users().messages().get(userId='me', id=message_id, format='full').execute()
        payload = msg.get('payload', {})
        headers = payload.get('headers', [])
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), None)
        sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), None)
        to = next((h['value'] for h in headers if h['name'].lower() == 'to'), None)
        cc = next((h['value'] for h in headers if h['name'].lower() == 'cc'), None)
        date = next((h['value'] for h in headers if h['name'].lower() == 'date'), None)
        # Get plain text body
        body = ""
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain' and 'data' in part['body']:
                    import base64
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    break
        elif 'body' in payload and 'data' in payload['body']:
            import base64
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        return {
            "subject": subject,
            "from": sender,
            "to": to,
            "cc": cc,
            "date": date,
            "body": body,
            "message_id": message_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail error: {e}")
