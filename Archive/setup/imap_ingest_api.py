from setup.imap_ingest import main_with_args

def ingest_emails_api(imap_host, imap_port, imap_user, imap_password, imap_folder="INBOX", collection_name="rag_documents", user="unknown", limit=10):
    """
    API function to ingest emails using the advanced logic from imap_ingest.py.
    """
    main_with_args(
        imap_server=imap_host,
        imap_port=imap_port,
        imap_user=imap_user,
        imap_password=imap_password,
        imap_folder=imap_folder,
        collection_name=collection_name,
        user=user,
        limit=limit
    )

def main(imap_host, imap_port, email_user, email_pass, use_ssl=True, mailbox="INBOX", limit=50):
    """Main entry point for IMAP ingest, can be imported and called with variables."""
    fetch_and_ingest_emails(imap_host, imap_port, email_user, email_pass, use_ssl, mailbox, limit)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest emails from IMAP server.")
    parser.add_argument('--host', required=True)
    parser.add_argument('--port', required=True)
    parser.add_argument('--user', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--ssl', action='store_true')
    parser.add_argument('--mailbox', default='INBOX')
    parser.add_argument('--limit', type=int, default=50)
    args = parser.parse_args()
    main(args.host, args.port, args.user, args.password, args.ssl, args.mailbox, args.limit)
