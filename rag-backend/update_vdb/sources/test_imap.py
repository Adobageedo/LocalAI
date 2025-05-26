#!/usr/bin/env python3
"""
Script de test pour la connexion IMAP avec les informations fournies.
"""

import os
import sys
import logging
import argparse
from typing import List

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import email sources
from email_sources import ImapEmailSource, EmailFetchResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test-imap")

def test_imap_connection(
    imap_server: str,
    imap_port: int,
    imap_user: str,
    imap_password: str,
    imap_folders: List[str] = None,
    limit: int = 5,
    verbose: bool = False
):
    """
    Test IMAP connection with the provided credentials.
    
    Args:
        imap_server: IMAP server hostname
        imap_port: IMAP server port
        imap_user: IMAP username
        imap_password: IMAP password
        imap_folder: IMAP folder to fetch from
        limit: Maximum number of emails to fetch
        verbose: Whether to print detailed information
    """
    if verbose:
        logger.setLevel(logging.DEBUG)
    
    # Use default folders (INBOX and Sent) if none provided
    if imap_folders is None:
        imap_folders = ['INBOX', 'Sent']
    
    logger.info(f"Testing IMAP connection to {imap_server}:{imap_port} for user {imap_user}")
    logger.info(f"Folders to check: {', '.join(imap_folders)}")
    
    # Create email source
    email_source = ImapEmailSource(
        collection_name="test",
        user=imap_user,
        limit=limit,
        save_attachments=True,
        save_email_body=True,
        delete_after_import=False
    )
    
    # Fetch emails
    fetch_result, emails = email_source.fetch_emails(
        imap_server=imap_server,
        imap_port=imap_port,
        imap_user=imap_user,
        imap_password=imap_password,
        imap_folders=imap_folders
    )
    
    # Print results
    print("\n===== IMAP Connection Test Results =====")
    print(f"Server: {imap_server}:{imap_port}")
    print(f"User: {imap_user}")
    print(f"Folders: {', '.join(imap_folders)}")
    print(f"Success: {fetch_result.success}")
    
    if not fetch_result.success:
        print(f"Error: {fetch_result.error}")
        if fetch_result.traceback:
            if verbose:
                print("\nTraceback:")
                print(fetch_result.traceback)
            else:
                print("Run with --verbose for detailed error information")
        return
    
    print(f"\nEmails found: {len(emails)}")
    print(f"Emails processed: {fetch_result.emails_processed}")
    print(f"Attachments processed: {fetch_result.attachments_processed}")
    
    if fetch_result.errors:
        print(f"\nErrors encountered ({len(fetch_result.errors)}):")
        for i, error in enumerate(fetch_result.errors, 1):
            print(f"{i}. {error}")
    
    # Print email details if verbose
    if emails and verbose:
        print("\n===== Email Details =====")
        for i, email in enumerate(emails, 1):
            print(f"\nEmail {i}:")
            print(f"  Subject: {email.metadata.subject}")
            print(f"  From: {email.metadata.sender}")
            print(f"  To: {email.metadata.receiver}")
            print(f"  Date: {email.metadata.date}")
            print(f"  Has Text Body: {bool(email.content.body_text)}")
            print(f"  Has HTML Body: {bool(email.content.body_html)}")
            print(f"  Attachments: {len(email.content.attachments)}")
            
            if email.content.attachments:
                print("  Attachment Details:")
                for j, att in enumerate(email.content.attachments, 1):
                    print(f"    {j}. {att.filename} ({att.content_type}, {len(att.content)} bytes)")

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Test IMAP connection with provided credentials.")
    parser.add_argument('--server', default="mail.newsflix.fr", help='IMAP server hostname')
    parser.add_argument('--port', type=int, default=993, help='IMAP server port')
    parser.add_argument('--user', default="noreply@newsflix.fr", help='IMAP username')
    parser.add_argument('--password', default="enzo789luigi", help='IMAP password')
    parser.add_argument('--folders', nargs='+', default=['INBOX', 'Sent'], help='IMAP folders to fetch from (space-separated list)')
    parser.add_argument('--limit', type=int, default=5, help='Maximum number of emails to fetch')
    parser.add_argument('--verbose', action='store_true', help='Print detailed information')
    
    args = parser.parse_args()
    
    # Test IMAP connection
    test_imap_connection(
        imap_server=args.server,
        imap_port=args.port,
        imap_user=args.user,
        imap_password=args.password,
        imap_folders=args.folders,
        limit=args.limit,
        verbose=args.verbose
    )

if __name__ == "__main__":
    main()
