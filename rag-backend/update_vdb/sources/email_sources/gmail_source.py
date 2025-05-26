"""
Gmail email source implementation.
"""

import os
import base64
import json
import traceback
from typing import Dict, List, Optional, Any, Set, Tuple

from .base import EmailSource, EmailFetchResult, Email, EmailMetadata, EmailContent, EmailAttachment

class GmailEmailSource(EmailSource):
    """Email source for Gmail API."""
    
    def __init__(self, collection_name: str, user: str, limit: int = 10,
                 save_attachments: bool = True, save_email_body: bool = True,
                 delete_after_import: bool = False, additional_metadata: Optional[Dict[str, Any]] = None):
        """
        Initialize the Gmail email source.
        
        Args:
            collection_name: Name of the collection to store emails in.
            user: User identifier for metadata.
            limit: Maximum number of emails to fetch.
            save_attachments: Whether to save email attachments.
            save_email_body: Whether to save email body.
            delete_after_import: Whether to delete emails after import.
            additional_metadata: Additional metadata to include with each document.
        """
        super().__init__(
            collection_name=collection_name,
            user=user,
            limit=limit,
            save_attachments=save_attachments,
            save_email_body=save_email_body,
            delete_after_import=delete_after_import,
            additional_metadata=additional_metadata
        )
    
    def fetch_emails(self, **kwargs) -> Tuple[EmailFetchResult, List[Email]]:
        """
        Fetch emails from Gmail API.
        
        Args:
            **kwargs: Additional arguments for Gmail API.
                - credentials_file: Path to the OAuth2 credentials file
                - token_file: Path to the OAuth2 token file
                - existing_doc_ids: Set of existing document IDs to avoid duplicates
        
        Returns:
            Tuple[EmailFetchResult, List[Email]]: Result of the fetch operation and list of fetched emails.
        """
        result = EmailFetchResult()
        emails: List[Email] = []
        
        # Get Gmail parameters
        credentials_file = kwargs.get('credentials_file')
        token_file = kwargs.get('token_file')
        existing_doc_ids = kwargs.get('existing_doc_ids', set())
        
        # Validate parameters
        if not credentials_file or not token_file:
            error_msg = "Gmail API requires credentials_file and token_file parameters"
            self.logger.error(error_msg)
            result.success = False
            result.error = error_msg
            return result, emails
        
        try:
            # Import Google API libraries
            try:
                from googleapiclient.discovery import build
                from google_auth_oauthlib.flow import InstalledAppFlow
                from google.auth.transport.requests import Request
                from google.oauth2.credentials import Credentials
            except ImportError:
                error_msg = "Gmail API libraries not installed. Run: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib"
                self.logger.error(error_msg)
                result.success = False
                result.error = error_msg
                return result, emails
            
            # Authenticate with Gmail API
            self.logger.info(f"Authenticating with credentials from {credentials_file}")
            
            SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
            creds = None
            
            # Check if token exists
            if os.path.exists(token_file):
                creds = Credentials.from_authorized_user_info(json.loads(open(token_file).read()), SCOPES)
            
            # If no valid token, get a new one
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                    creds = flow.run_local_server(port=0)
                
                # Save token for next time
                with open(token_file, 'w') as token:
                    token.write(creds.to_json())
            
            # Create Gmail service
            service = build('gmail', 'v1', credentials=creds)
            
            # Fetch emails
            self.logger.info(f"Fetching up to {self.limit} emails for user {self.user}")
            results = service.users().messages().list(userId=self.user, maxResults=self.limit).execute()
            messages = results.get('messages', [])
            
            if not messages:
                self.logger.info("No messages found.")
                return result, emails
            
            self.logger.info(f"Found {len(messages)} messages, processing...")
            
            for i, message in enumerate(messages):
                try:
                    msg_id = message['id']
                    msg = service.users().messages().get(userId=self.user, id=msg_id, format='full').execute()
                    
                    # Extract email headers
                    headers = {}
                    for header in msg['payload']['headers']:
                        headers[header['name'].lower()] = header['value']
                    
                    # Extract basic email metadata
                    message_id = headers.get('message-id', f"UNKNOWN-{msg_id}")
                    subject = headers.get('subject', '[No Subject]')
                    sender = headers.get('from', '')
                    receiver = headers.get('to', '')
                    cc = headers.get('cc', '')
                    date_str = headers.get('date', '')
                    
                    # Parse date
                    email_date = self.parse_date(date_str)
                    
                    # Compute a unique document ID for this email
                    doc_id = self.compute_doc_id(message_id)
                    
                    # Skip if already ingested
                    if doc_id in existing_doc_ids:
                        self.logger.info(f"Skipping already ingested email: {subject}")
                        continue
                    
                    self.logger.info(f"Processing email {i+1}/{len(messages)}: {subject}")
                    
                    # Create email metadata
                    metadata = EmailMetadata(
                        doc_id=doc_id,
                        message_id=message_id,
                        subject=subject,
                        sender=sender,
                        receiver=receiver,
                        cc=cc,
                        date=email_date or date_str,
                        user=self.user,
                        document_type="email",
                        source="gmail",
                        ingest_date=None  # Will be set automatically
                    )
                    
                    # Add Gmail-specific metadata
                    metadata.update({
                        "gmail_id": msg_id,
                        "labels": msg.get('labelIds', [])
                    })
                    
                    # Add additional metadata
                    metadata.update(self.additional_metadata)
                    
                    # Process email content
                    email_content = EmailContent()
                    
                    # Get raw email data
                    raw_email = None
                    try:
                        raw_msg = service.users().messages().get(userId=self.user, id=msg_id, format='raw').execute()
                        raw_email = base64.urlsafe_b64decode(raw_msg['raw'])
                    except Exception as raw_err:
                        self.logger.warning(f"Failed to get raw email data: {str(raw_err)}")
                    
                    # Process email parts
                    if 'parts' in msg['payload']:
                        for part in msg['payload']['parts']:
                            # Process email body
                            if self.save_email_body and part['mimeType'] in ['text/plain', 'text/html']:
                                try:
                                    if 'data' in part['body']:
                                        body_data = part['body']['data']
                                        body_text = base64.urlsafe_b64decode(body_data).decode('utf-8')
                                        
                                        if part['mimeType'] == 'text/plain':
                                            email_content.body_text = body_text
                                        elif part['mimeType'] == 'text/html':
                                            email_content.body_html = body_text
                                except Exception as body_err:
                                    self.logger.error(f"Failed to process email body: {str(body_err)}")
                            
                            # Process attachments
                            if self.save_attachments and 'filename' in part and part['filename']:
                                try:
                                    filename = part['filename']
                                    if not filename:
                                        continue
                                    
                                    # Get attachment data
                                    if 'body' in part and 'attachmentId' in part['body']:
                                        attachment = service.users().messages().attachments().get(
                                            userId=self.user,
                                            messageId=msg_id,
                                            id=part['body']['attachmentId']
                                        ).execute()
                                        
                                        attachment_data = attachment['data']
                                        file_data = base64.urlsafe_b64decode(attachment_data)
                                        
                                        # Create attachment
                                        email_attachment = EmailAttachment(
                                            filename=filename,
                                            content=file_data,
                                            content_type=part.get('mimeType', 'application/octet-stream'),
                                            parent_email_id=doc_id
                                        )
                                        
                                        email_content.attachments.append(email_attachment)
                                except Exception as att_err:
                                    self.logger.error(f"Failed to process attachment: {str(att_err)}")
                                    result.errors.append(f"Attachment processing error: {str(att_err)}")
                    else:
                        # Handle single part messages
                        if self.save_email_body and 'body' in msg['payload'] and 'data' in msg['payload']['body']:
                            try:
                                body_data = msg['payload']['body']['data']
                                body_text = base64.urlsafe_b64decode(body_data).decode('utf-8')
                                
                                if msg['payload']['mimeType'] == 'text/plain':
                                    email_content.body_text = body_text
                                elif msg['payload']['mimeType'] == 'text/html':
                                    email_content.body_html = body_text
                            except Exception as body_err:
                                self.logger.error(f"Failed to process email body: {str(body_err)}")
                    
                    # Create email object
                    email_obj = Email(
                        metadata=metadata,
                        content=email_content,
                        raw_data=raw_email
                    )
                    
                    emails.append(email_obj)
                    result.emails_processed += 1
                    result.attachments_processed += len(email_content.attachments)
                    
                    # Mark email as read if requested (not implemented for Gmail)
                    if self.delete_after_import:
                        self.logger.warning("Delete after import not implemented for Gmail")
                except Exception as email_err:
                    self.logger.error(f"Error processing email {i+1}/{len(messages)}: {str(email_err)}")
                    result.errors.append(f"Email processing error: {str(email_err)}")
            
            self.logger.info(f"Fetch completed. Processed {result.emails_processed} emails and {result.attachments_processed} attachments.")
        except Exception as e:
            self.logger.error(f"Error during Gmail fetch: {str(e)}")
            self.logger.error(traceback.format_exc())
            result.success = False
            result.error = str(e)
            result.traceback = traceback.format_exc()
        
        return result, emails
