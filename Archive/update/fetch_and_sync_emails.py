import argparse
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def imap_fetch(imap_server, imap_port, imap_user, imap_password, imap_folder, collection_name, user, limit=10):
    import imaplib
    import email
    import hashlib
    from email.header import decode_header
    from update_vdb.ingest_from_config import ingest_document
    from rag_engine.vectorstore_manager import VectorStoreManager

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

    def compute_doc_id(msg_id, extra=None):
        base = msg_id if extra is None else f"{msg_id}:{extra}"
        return hashlib.sha256(base.encode()).hexdigest()

    # Fetch existing doc_ids from Qdrant
    manager = VectorStoreManager(collection_name)
    existing_doc_ids = manager.fetch_existing_doc_ids()
    print(f"Fetched {len(existing_doc_ids)} existing doc_ids from Qdrant.")

    mail = imaplib.IMAP4_SSL(imap_server, int(imap_port))
    mail.login(imap_user, imap_password)
    mail.select(imap_folder)
    status, messages = mail.search(None, 'ALL')
    mail_ids = messages[0].split()
    mail_ids = mail_ids[-limit:]
    total = len(mail_ids)
    print(f"Found {total} emails in {imap_folder}")
    for idx, num in enumerate(mail_ids, 1):
        status, data = mail.fetch(num, '(RFC822)')
        msg = email.message_from_bytes(data[0][1])
        msg_id = msg.get('Message-ID', str(num))
        doc_id = compute_doc_id(msg_id)
        print(f"Processing email {idx}/{total} with doc_id: {doc_id}")
        if doc_id in existing_doc_ids:
            print(f"Skipping already ingested email: {msg_id}")
            continue
        subject = clean_subject(msg.get('Subject'))
        sender = msg.get('From')
        receiver = msg.get('To')
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
        import tempfile
        # Save email as .eml temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.eml') as tmp_eml:
            tmp_eml.write(data[0][1])
            tmp_eml_path = tmp_eml.name
        print(f"Uploading new email {idx}/{total} (subject: {subject})")
        ingest_document(
            tmp_eml_path,
            user=user,
            collection=collection_name,
            doc_id=doc_id
        )
        os.remove(tmp_eml_path)
        # Save and ingest attachments
        for part in msg.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    payload = part.get_payload(decode=True)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_att:
                        tmp_att.write(payload)
                        tmp_att_path = tmp_att.name
                    print(f"Uploading attachment: {filename}")
                    ingest_document(
                        tmp_att_path,
                        user=user,
                        collection=collection_name,
                        doc_id=doc_id
                    )
                    os.remove(tmp_att_path)

    mail.logout()

def gmail_fetch(*args, **kwargs):
    print("Gmail fetch not implemented yet. Implement logic in update_vdb.")
    # Implement Gmail fetch logic here or import from update_vdb
    return

def outlook_fetch(*args, **kwargs):
    print("Outlook fetch not implemented yet.")
    # Implement using Microsoft Graph API or similar
    return

def fetch_and_sync_emails(method: str, **kwargs):
    """
    Fetch and synchronize emails from the specified method (imap, gmail, outlook).
    kwargs are passed to the specific fetch function.
    """
    method = method.lower()
    if method == "imap":
        print("Fetching emails via IMAP...")
        imap_fetch(
            imap_server=kwargs.get('imap_server'),
            imap_port=kwargs.get('imap_port'),
            imap_user=kwargs.get('imap_user'),
            imap_password=kwargs.get('imap_password'),
            imap_folder=kwargs.get('imap_folder', 'INBOX'),
            collection_name=kwargs.get('collection_name', 'rag_documents'),
            user=kwargs.get('user', 'unknown'),
            limit=kwargs.get('limit', 10)
        )
    elif method == "gmail":
        print("Fetching emails via Gmail...")
        gmail_fetch()
    elif method == "outlook":
        print("Fetching emails via Outlook...")
        outlook_fetch(**kwargs)
    else:
        raise ValueError(f"Unknown email fetch method: {method}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch and sync emails from IMAP, Gmail, or Outlook.")
    parser.add_argument('--method', required=True, choices=['imap', 'gmail', 'outlook'], help='Email fetch method')
    parser.add_argument('--imap_server', help='IMAP server (for IMAP)')
    parser.add_argument('--imap_port', type=int, default=993, help='IMAP port (for IMAP)')
    parser.add_argument('--imap_user', help='IMAP user (for IMAP)')
    parser.add_argument('--imap_password', help='IMAP password (for IMAP)')
    parser.add_argument('--imap_folder', default='INBOX', help='IMAP folder (for IMAP)')
    parser.add_argument('--collection_name', default='rag_documents', help='Qdrant collection name')
    parser.add_argument('--user', default='unknown', help='User for metadata')
    parser.add_argument('--limit', type=int, default=10, help='Number of emails to fetch (IMAP)')
    args = parser.parse_args()
    fetch_and_sync_emails(
        method=args.method,
        imap_server=args.imap_server,
        imap_port=args.imap_port,
        imap_user=args.imap_user,
        imap_password=args.imap_password,
        imap_folder=args.imap_folder,
        collection_name=args.collection_name,
        user=args.user,
        limit=args.limit
    )
