"""
Outlook email source implementation using Microsoft Graph API.
"""

import os
import base64
import requests
import traceback
from typing import Dict, List, Optional, Any, Set, Tuple

from .base import EmailSource, EmailFetchResult, Email, EmailMetadata, EmailContent, EmailAttachment

class OutlookEmailSource(EmailSource):
    """Email source for Outlook/Microsoft Graph API."""
    
    def __init__(self, collection_name: str, user: str, limit: int = 10,
                 save_attachments: bool = True, save_email_body: bool = True,
                 delete_after_import: bool = False, additional_metadata: Optional[Dict[str, Any]] = None):
        """
        Initialize the Outlook email source.
        
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
        Fetch emails from Outlook/Microsoft Graph API.
        
        Args:
            **kwargs: Additional arguments for Microsoft Graph API.
                - client_id: ID client of the Azure AD application
                - client_secret: Client secret of the Azure AD application
                - tenant_id: ID of the Azure AD tenant
                - user_id: ID of the Outlook user (default: 'me')
                - existing_doc_ids: Set of existing document IDs to avoid duplicates
        
        Returns:
            Tuple[EmailFetchResult, List[Email]]: Result of the fetch operation and list of fetched emails.
        """
        result = EmailFetchResult()
        emails: List[Email] = []
        
        # Get Outlook parameters
        client_id = kwargs.get('client_id')
        client_secret = kwargs.get('client_secret')
        tenant_id = kwargs.get('tenant_id')
        user_id = kwargs.get('user_id', 'me')
        existing_doc_ids = kwargs.get('existing_doc_ids', set())
        
        # Validate parameters
        if not client_id or not client_secret or not tenant_id:
            error_msg = "Outlook API requires client_id, client_secret, and tenant_id parameters"
            self.logger.error(error_msg)
            result.success = False
            result.error = error_msg
            return result, emails
        
        try:
            # Authenticate with Microsoft Graph API
            self.logger.info(f"Authenticating with Azure AD tenant {tenant_id}")
            
            # Get access token
            token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
            token_data = {
                'grant_type': 'client_credentials',
                'client_id': client_id,
                'client_secret': client_secret,
                'scope': 'https://graph.microsoft.com/.default'
            }
            
            token_response = requests.post(token_url, data=token_data)
            token_response.raise_for_status()
            
            access_token = token_response.json().get('access_token')
            if not access_token:
                error_msg = "Failed to obtain access token from Microsoft Graph API"
                self.logger.error(error_msg)
                result.success = False
                result.error = error_msg
                return result, emails
            
            # Fetch emails
            self.logger.info(f"Fetching up to {self.limit} emails for user {user_id}")
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get messages
            messages_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages?$top={self.limit}&$orderby=receivedDateTime desc"
            messages_response = requests.get(messages_url, headers=headers)
            messages_response.raise_for_status()
            
            messages_data = messages_response.json()
            messages = messages_data.get('value', [])
            
            if not messages:
                self.logger.info("No messages found.")
                return result, emails
            
            self.logger.info(f"Found {len(messages)} messages, processing...")
            
            for i, msg in enumerate(messages):
                try:
                    # Extract basic email metadata
                    msg_id = msg.get('id')
                    message_id = msg.get('internetMessageId', f"UNKNOWN-{msg_id}")
                    subject = msg.get('subject', '[No Subject]')
                    
                    # Extract sender and recipient information
                    sender = ""
                    if 'from' in msg and 'emailAddress' in msg['from']:
                        sender_name = msg['from']['emailAddress'].get('name', '')
                        sender_email = msg['from']['emailAddress'].get('address', '')
                        if sender_name and sender_email:
                            sender = f"{sender_name} <{sender_email}>"
                        else:
                            sender = sender_email
                    
                    # Extract recipients
                    receiver = ""
                    cc = ""
                    bcc = ""
                    
                    if 'toRecipients' in msg and msg['toRecipients']:
                        to_list = []
                        for recipient in msg['toRecipients']:
                            if 'emailAddress' in recipient:
                                email = recipient['emailAddress'].get('address', '')
                                if email:
                                    to_list.append(email)
                        receiver = "; ".join(to_list)
                    
                    if 'ccRecipients' in msg and msg['ccRecipients']:
                        cc_list = []
                        for recipient in msg['ccRecipients']:
                            if 'emailAddress' in recipient:
                                email = recipient['emailAddress'].get('address', '')
                                if email:
                                    cc_list.append(email)
                        cc = "; ".join(cc_list)
                    
                    if 'bccRecipients' in msg and msg['bccRecipients']:
                        bcc_list = []
                        for recipient in msg['bccRecipients']:
                            if 'emailAddress' in recipient:
                                email = recipient['emailAddress'].get('address', '')
                                if email:
                                    bcc_list.append(email)
                        bcc = "; ".join(bcc_list)
                    
                    # Extract date
                    received_date = msg.get('receivedDateTime')
                    sent_date = msg.get('sentDateTime')
                    email_date = received_date or sent_date
                    
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
                        bcc=bcc,
                        date=email_date,
                        user=self.user,
                        document_type="email",
                        source="outlook",
                        ingest_date=None  # Will be set automatically
                    )
                    
                    # Add Outlook-specific metadata
                    metadata.update({
                        "outlook_id": msg_id,
                        "categories": msg.get('categories', [])
                    })
                    
                    # Add additional metadata
                    metadata.update(self.additional_metadata)
                    
                    # Process email content
                    email_content = EmailContent()
                    
                    # Get raw email data
                    raw_email = None
                    mime_content_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{msg_id}/$value"
                    mime_response = requests.get(mime_content_url, headers=headers)
                    
                    if mime_response.status_code == 200:
                        raw_email = mime_response.content
                    else:
                        self.logger.warning(f"Failed to get MIME content for email: {subject}")
                    
                    # Process email body
                    if self.save_email_body:
                        try:
                            # Get HTML or text body
                            body_content = msg.get('body', {}).get('content', '')
                            content_type = msg.get('body', {}).get('contentType', 'text')
                            
                            if body_content:
                                if content_type.lower() == 'html':
                                    email_content.body_html = body_content
                                else:
                                    email_content.body_text = body_content
                        except Exception as body_err:
                            self.logger.error(f"Failed to process email body: {str(body_err)}")
                    
                    # Process attachments
                    if self.save_attachments and 'hasAttachments' in msg and msg['hasAttachments']:
                        # Get attachments
                        attachments_url = f"https://graph.microsoft.com/v1.0/users/{user_id}/messages/{msg_id}/attachments"
                        attachments_response = requests.get(attachments_url, headers=headers)
                        
                        if attachments_response.status_code == 200:
                            attachments_data = attachments_response.json()
                            attachments = attachments_data.get('value', [])
                            
                            for attachment in attachments:
                                try:
                                    attachment_id = attachment.get('id')
                                    filename = attachment.get('name')
                                    content_type = attachment.get('contentType')
                                    
                                    if not filename:
                                        continue
                                    
                                    # Get attachment content
                                    if 'contentBytes' in attachment:
                                        file_data = base64.b64decode(attachment['contentBytes'])
                                        
                                        # Create attachment
                                        email_attachment = EmailAttachment(
                                            filename=filename,
                                            content=file_data,
                                            content_type=content_type,
                                            parent_email_id=doc_id
                                        )
                                        
                                        email_content.attachments.append(email_attachment)
                                except Exception as att_err:
                                    self.logger.error(f"Failed to process attachment: {str(att_err)}")
                                    result.errors.append(f"Attachment processing error: {str(att_err)}")
                    
                    # Create email object
                    email_obj = Email(
                        metadata=metadata,
                        content=email_content,
                        raw_data=raw_email
                    )
                    
                    emails.append(email_obj)
                    result.emails_processed += 1
                    result.attachments_processed += len(email_content.attachments)
                except Exception as email_err:
                    self.logger.error(f"Error processing email {i+1}/{len(messages)}: {str(email_err)}")
                    result.errors.append(f"Email processing error: {str(email_err)}")
            
            self.logger.info(f"Fetch completed. Processed {result.emails_processed} emails and {result.attachments_processed} attachments.")
        except Exception as e:
            self.logger.error(f"Error during Outlook fetch: {str(e)}")
            self.logger.error(traceback.format_exc())
            result.success = False
            result.error = str(e)
            result.traceback = traceback.format_exc()
        
        return result, emails
