"""
IMAP email source implementation.
"""

import os
import imaplib
import email
import tempfile
import traceback
from typing import Dict, List, Optional, Any, Set, Tuple
from email.header import decode_header

from .base import EmailSource, EmailFetchResult, Email, EmailMetadata, EmailContent, EmailAttachment

class ImapEmailSource(EmailSource):
    """Email source for IMAP servers."""
    
    def __init__(self, collection_name: str, user: str, limit: int = 10,
                 save_attachments: bool = True, save_email_body: bool = True,
                 delete_after_import: bool = False, additional_metadata: Optional[Dict[str, Any]] = None):
        """
        Initialize the IMAP email source.
        
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
    
    def decode_header_value(self, header_value: str) -> str:
        """Decode email header value."""
        if not header_value:
            return ""
        
        try:
            decoded_parts = []
            for part, encoding in decode_header(header_value):
                if isinstance(part, bytes):
                    if encoding:
                        try:
                            decoded_parts.append(part.decode(encoding))
                        except:
                            decoded_parts.append(part.decode('utf-8', errors='replace'))
                    else:
                        decoded_parts.append(part.decode('utf-8', errors='replace'))
                else:
                    decoded_parts.append(part)
            return ''.join(decoded_parts)
        except Exception as e:
            self.logger.warning(f"Failed to decode header: {str(e)}")
            return header_value
    
    def parse_date(self, date_str: str) -> Optional[str]:
        """Parse email date string to ISO format."""
        if not date_str:
            return None
        
        try:
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(date_str)
            return dt.isoformat()
        except Exception as e:
            self.logger.warning(f"Failed to parse date: {str(e)}")
            return None
    
    def fetch_emails(self, **kwargs) -> Tuple[EmailFetchResult, List[Email]]:
        """
        Fetch emails from an IMAP server.
        
        Args:
            **kwargs: Additional arguments for IMAP connection.
                - imap_server: IMAP server hostname
                - imap_port: IMAP server port
                - imap_user: IMAP username
                - imap_password: IMAP password
                - imap_folders: List of IMAP folders to fetch from (default: ['INBOX', 'Sent'])
                - imap_folder: Single IMAP folder to fetch from (deprecated, use imap_folders instead)
                - existing_doc_ids: Set of existing document IDs to avoid duplicates
        
        Returns:
            Tuple[EmailFetchResult, List[Email]]: Result of the fetch operation and list of fetched emails.
        """
        result = EmailFetchResult()
        emails: List[Email] = []
        
        # Get IMAP parameters
        imap_server = kwargs.get('imap_server')
        imap_port = kwargs.get('imap_port', 993)
        imap_user = kwargs.get('imap_user')
        imap_password = kwargs.get('imap_password')
        
        # Handle both single folder and multiple folders
        imap_folder = kwargs.get('imap_folder')
        imap_folders = kwargs.get('imap_folders')
        
        # Convert single folder to list if provided
        if imap_folder and not imap_folders:
            imap_folders = [imap_folder]
        elif not imap_folders:
            # Default to both INBOX and Sent folders
            imap_folders = ['INBOX', 'Sent']
            
        existing_doc_ids = kwargs.get('existing_doc_ids', set())
        
        # Validate parameters
        if not imap_server or not imap_user or not imap_password:
            error_msg = "IMAP requires server, user, and password parameters"
            self.logger.error(error_msg)
            result.success = False
            result.error = error_msg
            return result, emails
        
        self.logger.info(f"Connecting to {imap_server}:{imap_port} for user {imap_user}")
        
        try:
            # Connect to IMAP server
            mail = imaplib.IMAP4_SSL(imap_server, imap_port)
            mail.login(imap_user, imap_password)
            
            # Get list of available folders
            status, folder_list = mail.list()
            available_folders = []
            
            if status == 'OK':
                for folder_info in folder_list:
                    folder_parts = folder_info.decode().split(' "')
                    if len(folder_parts) > 1:
                        folder_name = folder_parts[-1].strip('"')
                        available_folders.append(folder_name)
                self.logger.info(f"Available folders: {', '.join(available_folders)}")
            
            # Process each folder
            for folder_index, imap_folder in enumerate(imap_folders):
                # Check if folder exists in available folders or try common variations
                folder_to_use = None
                
                if imap_folder in available_folders:
                    folder_to_use = imap_folder
                else:
                    # Try common variations for Sent folder
                    sent_variations = ['Sent', 'Sent Items', 'Sent Mail', 'Envoyés', 'Enviados']
                    if imap_folder.lower() == 'sent':
                        for variation in sent_variations:
                            if variation in available_folders:
                                folder_to_use = variation
                                self.logger.info(f"Using '{folder_to_use}' instead of '{imap_folder}'")
                                break
                
                if not folder_to_use:
                    self.logger.warning(f"Folder '{imap_folder}' not found in available folders, skipping")
                    continue
                
                try:
                    # Select folder
                    self.logger.info(f"Selecting folder {folder_index+1}/{len(imap_folders)}: {folder_to_use}")
                    status, folder_info = mail.select(folder_to_use)
                    
                    if status != 'OK':
                        error_msg = f"Failed to select folder {folder_to_use}: {status}"
                        self.logger.error(error_msg)
                        result.errors.append(error_msg)
                        continue
                    
                    # Search for emails
                    self.logger.info(f"Searching for emails in {folder_to_use}")
                    status, messages = mail.search(None, 'ALL')
                    
                    if status != 'OK':
                        error_msg = f"Failed to search for emails in folder {folder_to_use}: {status}"
                        self.logger.error(error_msg)
                        result.errors.append(error_msg)
                        continue
                    
                    # Get message IDs
                    message_ids = messages[0].split()
                    
                    # Calculate limit per folder if multiple folders
                    folder_limit = self.limit
                    if len(imap_folders) > 1 and self.limit > 0:
                        # Distribute limit across folders, with a minimum of 1 per folder
                        folder_limit = max(1, self.limit // len(imap_folders))
                    
                    # Limit the number of emails to process
                    if folder_limit > 0 and len(message_ids) > folder_limit:
                        message_ids = message_ids[-folder_limit:]
                    
                    self.logger.info(f"Found {len(message_ids)} emails in {folder_to_use}, processing up to {folder_limit}")
                    
                    # Skip processing if no messages found
                    if not message_ids:
                        self.logger.info(f"No messages found in folder {folder_to_use}")
                        continue
                    
                    # Process each message
                    for i, msg_id in enumerate(message_ids):
                        try:
                            status, msg_data = mail.fetch(msg_id, '(RFC822)')
                            if status != 'OK':
                                self.logger.error(f"Failed to fetch message {msg_id}: {status}")
                                continue
                                
                            raw_email = msg_data[0][1]
                            msg = email.message_from_bytes(raw_email)
                            
                            # Extract basic email metadata
                            message_id = msg.get('Message-ID', f"UNKNOWN-{folder_to_use}-{i}")
                            subject = self.decode_header_value(msg.get('Subject', '[No Subject]'))
                            sender = self.decode_header_value(msg.get('From', ''))
                            receiver = self.decode_header_value(msg.get('To', ''))
                            cc = self.decode_header_value(msg.get('Cc', ''))
                            date_str = msg.get('Date', '')
                            
                            # Parse date
                            email_date = self.parse_date(date_str)
                            
                            # Compute a unique document ID for this email
                            doc_id = self.compute_doc_id(message_id)
                            
                            # Skip if already ingested
                            if doc_id in existing_doc_ids:
                                self.logger.info(f"Skipping already ingested email: {subject}")
                                continue
                            
                            self.logger.info(f"Processing email {i+1}/{len(message_ids)} from {folder_to_use}: {subject}")
                            
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
                                source="imap",
                                ingest_date=None  # Will be set automatically
                            )
                            
                            # Add IMAP-specific metadata
                            metadata.update({
                                "imap_folder": folder_to_use,
                                "imap_uid": msg_id.decode() if isinstance(msg_id, bytes) else msg_id
                            })
                            
                            # Add additional metadata
                            metadata.update(self.additional_metadata)
                            
                            # Process email content
                            email_content = EmailContent()
                            
                            # Process email parts
                            if msg.is_multipart():
                                for part in msg.walk():
                                    content_type = part.get_content_type()
                                    content_disposition = str(part.get("Content-Disposition"))
                                    
                                    # Process email body
                                    if self.save_email_body and content_type in ['text/plain', 'text/html'] and 'attachment' not in content_disposition:
                                        try:
                                            charset = part.get_content_charset() or 'utf-8'
                                            body = part.get_payload(decode=True)
                                            if body:
                                                body_text = body.decode(charset, errors='replace')
                                                
                                                if content_type == 'text/plain':
                                                    email_content.body_text = body_text
                                                elif content_type == 'text/html':
                                                    email_content.body_html = body_text
                                        except Exception as body_err:
                                            self.logger.error(f"Failed to process email body: {str(body_err)}")
                                    
                                    # Process attachments
                                    if self.save_attachments and 'attachment' in content_disposition:
                                        try:
                                            filename = part.get_filename()
                                            if not filename:
                                                filename = f"attachment-{i}-{hash(part)}.bin"
                                            
                                            payload = part.get_payload(decode=True)
                                            
                                            if not payload:
                                                continue
                                            
                                            # Create attachment
                                            attachment = EmailAttachment(
                                                filename=filename,
                                                content=payload,
                                                content_type=content_type,
                                                parent_email_id=doc_id
                                            )
                                            
                                            email_content.attachments.append(attachment)
                                        except Exception as att_err:
                                            self.logger.error(f"Failed to process attachment: {str(att_err)}")
                                            result.errors.append(f"Attachment processing error: {str(att_err)}")
                            else:
                                # Process non-multipart email body
                                if self.save_email_body:
                                    try:
                                        charset = msg.get_content_charset() or 'utf-8'
                                        body = msg.get_payload(decode=True)
                                        if body:
                                            body_text = body.decode(charset, errors="replace")
                                            
                                            content_type = msg.get_content_type()
                                            if content_type == 'text/plain':
                                                email_content.body_text = body_text
                                            elif content_type == 'text/html':
                                                email_content.body_html = body_text
                                            else:
                                                email_content.body_text = body_text
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
                            
                            # Mark email as deleted if requested
                            if self.delete_after_import:
                                try:
                                    mail.store(msg_id, '+FLAGS', '\\Deleted')
                                    self.logger.info(f"Marked email as deleted: {subject}")
                                except Exception as del_err:
                                    self.logger.error(f"Failed to mark email as deleted: {str(del_err)}")
                        except Exception as email_err:
                            self.logger.error(f"Error processing email {i+1}/{len(message_ids)}: {str(email_err)}")
                            result.errors.append(f"Email processing error: {str(email_err)}")
                except Exception as folder_err:
                    self.logger.error(f"Error processing folder {folder_to_use}: {str(folder_err)}")
                    result.errors.append(f"Folder processing error: {str(folder_err)}")
            
            # Expunge deleted emails if necessary
            if self.delete_after_import:
                try:
                    mail.expunge()
                    self.logger.info("Expunged deleted emails")
                except Exception as exp_err:
                    self.logger.error(f"Failed to expunge deleted emails: {str(exp_err)}")
            
            mail.close()
            mail.logout()
            self.logger.info(f"Fetch completed. Processed {result.emails_processed} emails and {result.attachments_processed} attachments.")
        except Exception as e:
            self.logger.error(f"Error during IMAP fetch: {str(e)}")
            self.logger.error(traceback.format_exc())
            result.success = False
            result.error = str(e)
            result.traceback = traceback.format_exc()
            return result, emails
        
        return result, emails
