import sys
import os
import hashlib
import logging
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import email
import imaplib
from email.header import decode_header
from dotenv import load_dotenv

load_dotenv()
IMAP_SERVER = os.getenv("IMAP_SERVER")
IMAP_PORT = int(os.getenv("IMAP_PORT", 993))
IMAP_USER = os.getenv("IMAP_USER")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
IMAP_FOLDER = os.getenv("IMAP_FOLDER", "INBOX")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "rag_documents")
USER = os.getenv("USER", "unknown")

print(f"Using collection: {COLLECTION_NAME}")


def compute_doc_id(msg_id, extra=None):
    base = msg_id if extra is None else f"{msg_id}:{extra}"
    return hashlib.sha256(base.encode()).hexdigest()

def clean_subject(subject):
    if subject is None:
        return ""
    if isinstance(subject, bytes):
        subject = subject.decode(errors="ignore")
    dh = decode_header(subject)
    return ''.join([
        (t.decode(enc or 'utf-8') if isinstance(t, bytes) else t)
        for t, enc in dh
    ])

def set_ingest_status_env(user, status):
    # Try FastAPI status setter if imported, else fallback to temp file (demo)
    try:
        from api.main import set_imap_status
        set_imap_status(user, status)
    except Exception:
        # Fallback: write to /tmp/imap_status_{user}.txt
        import tempfile
        fname = os.path.join(tempfile.gettempdir(), f"imap_status_{user}.txt")
        with open(fname, "w") as f:
            f.write(status)

def main_with_args(imap_server, imap_port, imap_user, imap_password, imap_folder, collection_name, user, limit=10):

    # Granular status updates
    set_ingest_status_env(user, "connection to the mail")
    mail = imaplib.IMAP4_SSL(imap_server, int(imap_port))
    mail.login(imap_user, imap_password)
    mail.select(imap_folder)
    set_ingest_status_env(user, "retrieving emails")
    status, messages = mail.search(None, 'ALL')
    mail_ids = messages[0].split()
    mail_ids = mail_ids[-limit:]  # Only process the last 'limit' emails
    total = len(mail_ids)
    print(f"Found {total} emails in {imap_folder}")
    from setup.upload_documents import upload_documents_inmemory
    docs_to_upload = []
    BATCH_SIZE = 252
    for idx, num in enumerate(mail_ids, 1):
        set_ingest_status_env(user, f"retrieving emails ({idx}/{total})")
        status, data = mail.fetch(num, '(RFC822)')
        msg = email.message_from_bytes(data[0][1])
        msg_id = msg.get('Message-ID', str(num))
        subject = clean_subject(msg.get('Subject'))
        sender = msg.get('From')
        to = msg.get('To')
        date = msg.get('Date')
        # Get email body
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                disp = str(part.get('Content-Disposition'))
                if ctype == 'text/plain' and 'attachment' not in disp:
                    charset = part.get_content_charset() or 'utf-8'
                    body += part.get_payload(decode=True).decode(charset, errors="ignore")
        else:
            charset = msg.get_content_charset() or 'utf-8'
            body = msg.get_payload(decode=True).decode(charset, errors="ignore")
        doc_id = compute_doc_id(msg_id)
        metadata = {
            "doc_id": doc_id,
            "unique_id": doc_id,
            "source_path": msg_id,
            "document_type": "email",
            "user": user,
            "subject": subject,
            "from": sender,
            "to": to,
            "date": date
        }
        docs_to_upload.append({
            "content": body,
            "metadata": metadata
        })
        # Attachments
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    payload = part.get_payload(decode=True)
                    attach_id = compute_doc_id(msg_id, filename)
                    meta = metadata.copy()
                    meta["doc_id"] = attach_id
                    meta["unique_id"] = attach_id
                    meta["document_type"] = os.path.splitext(filename)[1].lstrip(".")
                    meta["attachment_name"] = filename
                    docs_to_upload.append({
                        "content": "[binary attachment omitted]",
                        "metadata": meta
                    })
        if len(docs_to_upload) >= BATCH_SIZE:
            print(len(docs_to_upload))
            set_ingest_status_env(user, "indexing with qdrant")
            upload_documents_inmemory(docs_to_upload, collection_name=collection_name, user=user)
            docs_to_upload = []
    if docs_to_upload:
        set_ingest_status_env(user, "indexing with qdrant")
        upload_documents_inmemory(docs_to_upload, collection_name=collection_name, user=user)
    mail.logout()
    set_ingest_status_env(user, "completed")

def main():
    # Use environment variables for backwards compatibility
    main_with_args(
        imap_server=IMAP_SERVER,
        imap_port=IMAP_PORT,
        imap_user=IMAP_USER,
        imap_password=IMAP_PASSWORD,
        imap_folder=IMAP_FOLDER,
        collection_name=COLLECTION_NAME,
        user=USER,
        limit=10
    )

if __name__ == "__main__":
    main()
