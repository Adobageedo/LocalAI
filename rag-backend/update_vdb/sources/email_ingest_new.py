#!/usr/bin/env python3
"""
Email ingestion script for RAG backend.
This script orchestrates the ingestion of emails from different sources (IMAP, Gmail, Outlook)
into the Qdrant vector database.
"""

import os
import sys
import argparse
import logging
import tempfile
import traceback
from typing import Dict, List, Any, Optional, Set, Tuple

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import RAG engine components
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
from update_vdb.core.ingest_core import ingest_document

# Import email sources
from email_sources import (
    EmailSource, EmailFetchResult, 
    ImapEmailSource, GmailEmailSource, OutlookEmailSource
)

# Configure logging
logger = logging.getLogger("rag-backend.email_ingest")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

def ingest_emails_to_qdrant(emails: List['Email'], collection_name: str, user: str) -> Dict[str, Any]:
    """
    Ingest emails and their attachments into Qdrant.
    
    Args:
        emails: List of Email objects to ingest
        collection_name: Name of the Qdrant collection
        user: User identifier for metadata
    
    Returns:
        Dict[str, Any]: Summary of ingestion process
    """
    result = {
        "success": True,
        "emails_ingested": 0,
        "bodies_ingested": 0,
        "attachments_ingested": 0,
        "errors": []
    }
    
    for email in emails:
        try:
            # Ingest email as .eml file
            tmp_path, suffix = email.save_to_temp_file()
            
            try:
                # Ingest the email
                ingest_document(
                    tmp_path,
                    user=user,
                    collection=collection_name,
                    doc_id=email.metadata.doc_id,
                    metadata=email.metadata.to_dict()
                )
                result["emails_ingested"] += 1
                logger.info(f"Ingested email: {email.metadata.subject}")
            except Exception as e:
                error_msg = f"Failed to ingest email {email.metadata.subject}: {str(e)}"
                logger.error(error_msg)
                result["errors"].append(error_msg)
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            
            # Ingest email body as separate document if available
            if email.content.body_text:
                try:
                    body_doc_id = EmailSource.compute_doc_id(email.metadata.message_id, "body-text")
                    
                    # Create body metadata
                    body_metadata = email.metadata.to_dict()
                    body_metadata.update({
                        'doc_id': body_doc_id,
                        'document_type': 'email_body',
                        'content_type': 'text/plain',
                        'parent_email_id': email.metadata.doc_id
                    })
                    
                    # Create temporary file for body
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as tmp_body:
                        tmp_body.write(email.content.body_text.encode('utf-8'))
                        tmp_body_path = tmp_body.name
                    
                    # Ingest body
                    ingest_document(
                        tmp_body_path,
                        user=user,
                        collection=collection_name,
                        doc_id=body_doc_id,
                        metadata=body_metadata
                    )
                    result["bodies_ingested"] += 1
                    logger.info(f"Ingested email body (text) for: {email.metadata.subject}")
                    
                    # Clean up temporary file
                    os.remove(tmp_body_path)
                except Exception as e:
                    error_msg = f"Failed to ingest email body (text) for {email.metadata.subject}: {str(e)}"
                    logger.error(error_msg)
                    result["errors"].append(error_msg)
            
            # Ingest HTML body if available
            if email.content.body_html:
                try:
                    body_doc_id = EmailSource.compute_doc_id(email.metadata.message_id, "body-html")
                    
                    # Create body metadata
                    body_metadata = email.metadata.to_dict()
                    body_metadata.update({
                        'doc_id': body_doc_id,
                        'document_type': 'email_body',
                        'content_type': 'text/html',
                        'parent_email_id': email.metadata.doc_id
                    })
                    
                    # Create temporary file for body
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.html') as tmp_body:
                        tmp_body.write(email.content.body_html.encode('utf-8'))
                        tmp_body_path = tmp_body.name
                    
                    # Ingest body
                    ingest_document(
                        tmp_body_path,
                        user=user,
                        collection=collection_name,
                        doc_id=body_doc_id,
                        metadata=body_metadata
                    )
                    result["bodies_ingested"] += 1
                    logger.info(f"Ingested email body (HTML) for: {email.metadata.subject}")
                    
                    # Clean up temporary file
                    os.remove(tmp_body_path)
                except Exception as e:
                    error_msg = f"Failed to ingest email body (HTML) for {email.metadata.subject}: {str(e)}"
                    logger.error(error_msg)
                    result["errors"].append(error_msg)
            
            # Ingest attachments
            for attachment in email.content.attachments:
                try:
                    # Compute attachment doc_id
                    att_doc_id = EmailSource.compute_doc_id(email.metadata.message_id, attachment.clean_filename)
                    
                    # Create attachment metadata
                    att_metadata = email.metadata.to_dict()
                    att_metadata.update({
                        'doc_id': att_doc_id,
                        'document_type': 'attachment',
                        'attachment_name': attachment.filename,
                        'content_type': attachment.content_type,
                        'parent_email_id': email.metadata.doc_id
                    })
                    
                    # Create temporary file for attachment
                    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(attachment.filename)[1]) as tmp_att:
                        tmp_att.write(attachment.content)
                        tmp_att_path = tmp_att.name
                    
                    # Ingest attachment
                    ingest_document(
                        tmp_att_path,
                        user=user,
                        collection=collection_name,
                        doc_id=att_doc_id,
                        metadata=att_metadata
                    )
                    result["attachments_ingested"] += 1
                    logger.info(f"Ingested attachment: {attachment.filename}")
                    
                    # Clean up temporary file
                    os.remove(tmp_att_path)
                except Exception as e:
                    error_msg = f"Failed to ingest attachment {attachment.filename}: {str(e)}"
                    logger.error(error_msg)
                    result["errors"].append(error_msg)
        except Exception as e:
            error_msg = f"Error processing email {email.metadata.subject}: {str(e)}"
            logger.error(error_msg)
            result["errors"].append(error_msg)
    
    return result

def fetch_and_sync_emails(method: str, **kwargs) -> Dict[str, Any]:
    """
    Fetch and synchronize emails from the specified method (imap, gmail, outlook).
    
    Args:
        method (str): The method to use for fetching emails ('imap', 'gmail', 'outlook')
        **kwargs: Additional arguments for the specific fetch method
            - collection_name: Qdrant collection name
            - user: User identifier for metadata
            - limit: Maximum number of emails to fetch
            - save_attachments: Whether to save email attachments
            - save_email_body: Whether to save email body
            - delete_after_import: Whether to mark emails as deleted after import
            - metadata: Additional metadata to include with each document
            
            IMAP-specific:
            - imap_server: IMAP server hostname
            - imap_port: IMAP server port
            - imap_user: IMAP username
            - imap_password: IMAP password
            - imap_folder: IMAP folder to fetch from
            
            Gmail-specific:
            - credentials_file: Path to the OAuth2 credentials file
            - token_file: Path to the OAuth2 token file
            
            Outlook-specific:
            - client_id: ID client of the Azure AD application
            - client_secret: Client secret of the Azure AD application
            - tenant_id: ID of the Azure AD tenant
            - user_id: ID of the Outlook user
    
    Returns:
        Dict[str, Any]: Summary of the ingestion process
    """
    logger.info(f"Email ingestion started: method={method}")
    
    method = method.lower()
    
    # Get common parameters with defaults
    collection_name = kwargs.get('collection_name', 'rag_documents1536')
    user = kwargs.get('user', 'unknown')
    limit = kwargs.get('limit', 100)
    save_attachments = kwargs.get('save_attachments', True)
    save_email_body = kwargs.get('save_email_body', True)
    delete_after_import = kwargs.get('delete_after_import', False)
    additional_metadata = kwargs.get('metadata', {})
    
    logger.info(f"Email ingestion parameters: collection={collection_name}, user={user}")
    
    result = {
        "method": method,
        "collection": collection_name,
        "user": user,
        "emails_processed": 0,
        "emails_ingested": 0,
        "bodies_ingested": 0,
        "attachments_processed": 0,
        "attachments_ingested": 0,
        "errors": [],
        "success": True
    }
    
    try:
        # Get existing document IDs to avoid duplicates
        manager = VectorStoreManager(collection_name)
        existing_doc_ids = manager.fetch_existing_doc_ids()
        logger.info(f"Fetched {len(existing_doc_ids)} existing doc_ids from Qdrant collection {collection_name}")
        
        # Add existing_doc_ids to kwargs
        kwargs['existing_doc_ids'] = existing_doc_ids
        
        # Create email source based on method
        email_source = None
        if method == "imap":
            email_source = ImapEmailSource(
                collection_name=collection_name,
                user=user,
                limit=limit,
                save_attachments=save_attachments,
                save_email_body=save_email_body,
                delete_after_import=delete_after_import,
                additional_metadata=additional_metadata
            )
        elif method == "gmail":
            email_source = GmailEmailSource(
                collection_name=collection_name,
                user=user,
                limit=limit,
                save_attachments=save_attachments,
                save_email_body=save_email_body,
                delete_after_import=delete_after_import,
                additional_metadata=additional_metadata
            )
        elif method == "outlook":
            email_source = OutlookEmailSource(
                collection_name=collection_name,
                user=user,
                limit=limit,
                save_attachments=save_attachments,
                save_email_body=save_email_body,
                delete_after_import=delete_after_import,
                additional_metadata=additional_metadata
            )
        else:
            error_msg = f"Unknown email fetch method: {method}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Fetch emails from source
        fetch_result, emails = email_source.fetch_emails(**kwargs)
        
        # Update result with fetch result
        result.update({
            "emails_processed": fetch_result.emails_processed,
            "attachments_processed": fetch_result.attachments_processed,
            "success": fetch_result.success
        })
        
        if fetch_result.errors:
            result["errors"].extend(fetch_result.errors)
        
        if fetch_result.error:
            result["error"] = fetch_result.error
            result["traceback"] = fetch_result.traceback
        
        # Ingest emails to Qdrant
        if emails:
            ingest_result = ingest_emails_to_qdrant(emails, collection_name, user)
            
            # Update result with ingest result
            result.update({
                "emails_ingested": ingest_result["emails_ingested"],
                "bodies_ingested": ingest_result["bodies_ingested"],
                "attachments_ingested": ingest_result["attachments_ingested"]
            })
            
            if ingest_result["errors"]:
                result["errors"].extend(ingest_result["errors"])
            
            if not ingest_result["success"]:
                result["success"] = False
        
        logger.info(f"Email ingestion completed: {result['emails_processed']} emails processed, {result['emails_ingested']} emails ingested")
        return result
    except Exception as e:
        error_msg = f"Error during {method} email ingestion: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        result["success"] = False
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        return result

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Fetch and sync emails from IMAP, Gmail, or Outlook.")
    parser.add_argument('--method', required=True, choices=['imap', 'gmail', 'outlook'], help='Email fetch method')
    
    # Common parameters
    parser.add_argument('--collection_name', default='rag_documents1536', help='Qdrant collection name')
    parser.add_argument('--user', default='unknown', help='User for metadata')
    parser.add_argument('--limit', type=int, default=100, help='Number of emails to fetch')
    parser.add_argument('--save_attachments', action='store_true', default=True, help='Save email attachments')
    parser.add_argument('--save_email_body', action='store_true', default=True, help='Save email body')
    parser.add_argument('--delete_after_import', action='store_true', default=False, help='Mark emails as deleted after import')
    
    # IMAP parameters
    parser.add_argument('--imap_server', help='IMAP server (for IMAP)')
    parser.add_argument('--imap_port', type=int, default=993, help='IMAP port (for IMAP)')
    parser.add_argument('--imap_user', help='IMAP user (for IMAP)')
    parser.add_argument('--imap_password', help='IMAP password (for IMAP)')
    parser.add_argument('--imap_folder', default='INBOX', help='IMAP folder (for IMAP)')
    
    # Gmail parameters
    parser.add_argument('--credentials_file', help='Path to OAuth2 credentials file (for Gmail)')
    parser.add_argument('--token_file', help='Path to OAuth2 token file (for Gmail)')
    
    # Outlook parameters
    parser.add_argument('--client_id', help='Azure AD application client ID (for Outlook)')
    parser.add_argument('--client_secret', help='Azure AD application client secret (for Outlook)')
    parser.add_argument('--tenant_id', help='Azure AD tenant ID (for Outlook)')
    parser.add_argument('--user_id', default='me', help='Outlook user ID (for Outlook)')
    
    args = parser.parse_args()
    
    # Convert args to dict
    kwargs = vars(args)
    method = kwargs.pop('method')
    
    # Call fetch_and_sync_emails
    result = fetch_and_sync_emails(method, **kwargs)
    
    # Print summary
    print("\nEmail Ingestion Summary:")
    print(f"Method: {result['method']}")
    print(f"Collection: {result['collection']}")
    print(f"User: {result['user']}")
    print(f"Success: {result['success']}")
    print(f"Emails processed: {result['emails_processed']}")
    print(f"Emails ingested: {result.get('emails_ingested', 0)}")
    print(f"Bodies ingested: {result.get('bodies_ingested', 0)}")
    print(f"Attachments processed: {result['attachments_processed']}")
    print(f"Attachments ingested: {result.get('attachments_ingested', 0)}")
    
    if result.get('errors'):
        print(f"\nErrors ({len(result['errors'])}):")
        for i, error in enumerate(result['errors'], 1):
            print(f"{i}. {error}")
    
    if not result['success']:
        sys.exit(1)

if __name__ == "__main__":
    main()
