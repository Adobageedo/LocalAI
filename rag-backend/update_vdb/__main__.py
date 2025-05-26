import argparse
import sys
import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Adjust sys.path to allow running as a module from project root
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sources.document_ingest import fetch_and_sync_documents
from sources.email_ingest import fetch_and_sync_emails

def main():
    parser = argparse.ArgumentParser(description="Unified ingestion CLI for documents and emails.")
    subparsers = parser.add_subparsers(dest="mode", required=True, help="Ingestion mode: documents or emails")

    # Document ingestion
    doc_parser = subparsers.add_parser("documents", help="Ingest documents from local, Google Drive, or SharePoint")
    doc_parser.add_argument('--method', required=True, choices=['local', 'google_drive', 'sharepoint'], help='Document fetch method')
    doc_parser.add_argument('--directory', default='./data/documents', help='Local directory for documents (for local)')
    doc_parser.add_argument('--collection_name', default='rag_documents', help='Qdrant collection name')
    doc_parser.add_argument('--user', default='unknown', help='User for metadata')

    # Email ingestion
    email_parser = subparsers.add_parser("emails", help="Ingest emails from IMAP, Gmail, or Outlook")
    email_parser.add_argument('--method', required=True, choices=['imap', 'gmail', 'outlook'], help='Email fetch method')
    email_parser.add_argument('--imap_server', help='IMAP server (for IMAP)')
    email_parser.add_argument('--imap_port', type=int, default=993, help='IMAP port (for IMAP)')
    email_parser.add_argument('--imap_user', help='IMAP user (for IMAP)')
    email_parser.add_argument('--imap_password', help='IMAP password (for IMAP)')
    email_parser.add_argument('--imap_folder', default='INBOX', help='IMAP folder (for IMAP)')
    email_parser.add_argument('--collection_name', default='rag_documents', help='Qdrant collection name')
    email_parser.add_argument('--user', default='unknown', help='User for metadata')
    email_parser.add_argument('--limit', type=int, default=10, help='Number of emails to fetch (IMAP)')

    args = parser.parse_args()

    if args.mode == "documents":
        fetch_and_sync_documents(
            method=args.method,
            directory=args.directory,
            collection_name=args.collection_name,
            user=args.user
        )
    elif args.mode == "emails":
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
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
