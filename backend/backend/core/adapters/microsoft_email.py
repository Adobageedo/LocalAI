"""
Module pour l'authentification Microsoft OAuth2 (Outlook, Graph API, etc.).
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import json
import msal
import requests
import time
import base64
import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any, Union
from backend.core.logger import log
from backend.services.auth.microsoft_auth import get_outlook_service
from backend.core.adapters.provider_change_tracker import ProviderChangeTracker

logger = log.bind(name="backend.core.adapters.microsoft_email")

class MicrosoftEmail:
    """
    Class for handling Microsoft Outlook operations using primarily the email_id (Message-ID).
    
    This class provides methods for:
    - Sending new emails
    - Replying to emails
    - Forwarding emails
    - Flagging/marking emails
    - Moving emails to different folders/labels
    
    It uses the Microsoft Graph API via an authenticated session and works with minimal information
    (preferably just the email_id) whenever possible.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the MicrosoftEmail handler.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.access_token = None
        self.authenticated = False
        self.graph_endpoint = "https://graph.microsoft.com/v1.0"
        
    def authenticate(self) -> bool:
        """
        Authenticate with Microsoft Graph API.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            token_data = get_outlook_service(self.user_id)
            if token_data and "access_token" in token_data:
                self.access_token = token_data["access_token"]
                self.authenticated = True
                logger.info(f"Successfully authenticated with Microsoft Graph for user {self.user_id}")
                return True
            else:
                logger.error(f"Failed to obtain access token for user {self.user_id}")
                self.authenticated = False
                return False
        except Exception as e:
            logger.error(f"Error authenticating with Microsoft Graph: {str(e)}")
            self.authenticated = False
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Helper method to get authenticated headers for API requests.
        
        Returns:
            Dict with authorization headers
        """
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
            
    def send_email(self, subject: str, body: str, recipients: List[str], 
                  cc: Optional[List[str]] = None, bcc: Optional[List[str]] = None, 
                  html_content: Optional[str] = None) -> Dict[str, Any]:
        """
        Send a new email via Microsoft Graph API.
        
        Args:
            subject: Email subject
            body: Email body content (plain text)
            recipients: List of recipient email addresses
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            html_content: Optional HTML version of the email body
            
        Returns:
            Dict with details of the sent email
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # Initialize lists
            cc = cc or []
            bcc = bcc or []
            
            # Format recipients for Microsoft Graph API
            to_recipients = [{"emailAddress": {"address": email}} for email in recipients]
            cc_recipients = [{"emailAddress": {"address": email}} for email in cc]
            bcc_recipients = [{"emailAddress": {"address": email}} for email in bcc]
            
            # Determine if we're using HTML or plain text
            content_type = "html" if html_content else "text"
            content = html_content if html_content else body
            
            # Create email payload
            email_payload = {
                "subject": subject,
                "body": {
                    "contentType": content_type,
                    "content": content
                },
                "toRecipients": to_recipients,
                "ccRecipients": cc_recipients,
                "bccRecipients": bcc_recipients
            }
            
            # Send the email
            send_url = f"{self.graph_endpoint}/me/messages"
            response = requests.post(
                send_url, 
                headers=self._get_headers(),
                json=email_payload
            )
            response.raise_for_status()
            
            # Get the message ID if possible from the response
            message_id = "unknown-id"
            thread_id = "unknown-thread"
            try:
                message_data = response.json()
                if 'id' in message_data:
                    message_id = message_data['id']
                if 'conversationId' in message_data:
                    thread_id = message_data['conversationId']
            except Exception as e:
                logger.warning(f"Could not extract message ID from response: {e}")
                
            logger.info(f"Email sent successfully with message ID: {message_id}")
            
            # Track the email creation in the provider_changes table
            try:
                ProviderChangeTracker.log_email_add(
                    provider='outlook',
                    user_id=self.user_id,
                    email_id=message_id,
                    subject=subject,
                    sender='me',  # Since this is a sent email
                    extra_details={
                        'recipients': recipients,
                        'cc': cc if cc else [],
                        'bcc': bcc if bcc else [],
                        'thread_id': thread_id,
                        'has_html': html_content is not None,
                        'timestamp': datetime.datetime.now().isoformat()
                    }
                )
            except Exception as tracking_error:
                logger.error(f"Failed to track email creation: {tracking_error}")
                
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id,
                "warning": message_id == "unknown-id" and "Email sent but message ID not retrieved" or None
            }
            
        except Exception as e:
            # Enhanced error logging
            error_details = ""
            if hasattr(e, 'response') and e.response is not None:
                error_details = f"\nStatus Code: {e.response.status_code}\nResponse: {e.response.text}"
            logger.error(f"Error sending email via Microsoft Graph API: {str(e)}{error_details}")
            return {
                "success": False,
                "error": str(e),
                "details": error_details
            }
            
    def reply_to_email(self, email_id: str, body: str, 
                      cc: Optional[List[str]] = None, 
                      include_original: bool = True) -> Dict[str, Any]:
        from urllib.parse import quote
        encoded_email_id = quote(email_id, safe='')
        
        try:
            # Step 1: Create a draft reply
            draft_url = f"{self.graph_endpoint}/me/messages/{encoded_email_id}/createReply"
            draft_payload = {
                "comment": body
            }
            
            if cc:
                cc_recipients = [{"emailAddress": {"address": email}} for email in cc]
                draft_payload["ccRecipients"] = cc_recipients
            
            draft_response = requests.post(
                draft_url, 
                headers=self._get_headers(),
                json=draft_payload
            )
            draft_response.raise_for_status()
            draft_data = draft_response.json()
            draft_id = draft_data.get('id')
            
            if not draft_id:
                return {
                    "success": False,
                    "error": "Failed to create draft reply"
                }            
            return {
                "success": True,
                "message_id": draft_id,
                "thread_id": "unknown-thread"
            }
            
        except Exception as e:
            # Enhanced error logging with full response details
            error_details = ""
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = (
                        f"\nStatus Code: {e.response.status_code}"
                        f"\nResponse: {e.response.text}"
                    )
                except Exception as log_error:
                    error_details = f"\nFailed to extract error details: {str(log_error)}"
            
            logger.error(f"Error replying to email via Microsoft Graph API: {str(e)}{error_details}")
            return {
                "success": False,
                "error": str(e),
                "details": error_details
            }
            
    def forward_email(self, email_id: str, recipients: list, 
                     additional_comment: str = None) -> dict:
        """
        Forward an email using just the email_id.
        
        Args:
            email_id: Microsoft Message-ID of the email to forward
            recipients: List of recipient email addresses
            additional_comment: Optional comment to include with the forwarded email
            
        Returns:
            Dict with details of the forwarded email
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Format recipients for Microsoft Graph API
            to_recipients = [{"emailAddress": {"address": email}} for email in recipients]
            
            # Create forward payload
            forward_payload = {
                "comment": additional_comment if additional_comment else "",
                "toRecipients": to_recipients
            }
            
            # Send the forward
            forward_url = f"{self.graph_endpoint}/me/messages/{email_id}/createForward"
            response = requests.post(
                forward_url, 
                headers=self._get_headers(),
                json=forward_payload
            )
            response.raise_for_status()
            
            logger.info(f"Email {email_id} forwarded successfully")
            
            # Microsoft Graph API doesn't return the new message ID, so we just return the original
            return {
                "success": True,
                "message_id": email_id,
                "recipients": recipients
            }
            
        except Exception as e:
            logger.error(f"Error forwarding email via Microsoft Graph API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def flag_email(self, email_id: str, mark_important: bool = None, 
                  mark_read: bool = None) -> Dict[str, Any]:
        """
        Flag/mark an email with specific attributes.
        
        Args:
            email_id: Microsoft Message-ID of the email to flag
            mark_important: If True, marks as important. If False, marks as not important. If None, doesn't change.
            mark_read: If True, marks as read. If False, marks as unread. If None, doesn't change.
            
        Returns:
            Dict with details of the operation result
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Track if any changes were made
            changes_made = False
            
            # Handle read/unread status
            if mark_read is not None:
                read_url = f"{self.graph_endpoint}/me/messages/{email_id}"
                read_payload = {
                    "isRead": mark_read
                }
                read_response = requests.patch(
                    read_url, 
                    headers=self._get_headers(),
                    json=read_payload
                )
                read_response.raise_for_status()
                changes_made = True
                logger.info(f"Email {email_id} marked as {'read' if mark_read else 'unread'}")
            
            # Handle important/not important status
            if mark_important is not None:
                importance_url = f"{self.graph_endpoint}/me/messages/{email_id}"
                importance_payload = {
                    "importance": "high" if mark_important else "normal"
                }
                importance_response = requests.patch(
                    importance_url, 
                    headers=self._get_headers(),
                    json=importance_payload
                )
                importance_response.raise_for_status()
                changes_made = True
                logger.info(f"Email {email_id} marked as {'important' if mark_important else 'normal importance'}")
            
            if not changes_made:
                return {
                    "success": True,
                    "message": "No flag changes requested",
                    "email_id": email_id
                }
                
            return {
                "success": True,
                "message": "Email flags updated successfully",
                "email_id": email_id
            }
            
        except Exception as e:
            logger.error(f"Error flagging email via Microsoft Graph API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def move_email(self, email_id: str, destination_folder: str) -> Dict[str, Any]:
        """
        Move an email to a different folder.
        
        Args:
            email_id: Microsoft Message-ID of the email to move
            destination_folder: Folder name where the email should be moved
            
        Returns:
            Dict with details of the operation result
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Map common folder names to well-known folders
            folder_mapping = {
                "inbox": "inbox",
                "sent": "sentitems",
                "drafts": "drafts",
                "deleted": "deleteditems",
                "junk": "junkemail",
                "archive": "archive"
            }
            
            # Normalize the destination folder name
            target_folder = folder_mapping.get(destination_folder.lower(), destination_folder)
            
            # First, check if it's a well-known folder or if we need to find/create a custom folder
            folder_id = None
            
            # Check if it's a well-known folder
            folders_url = f"{self.graph_endpoint}/me/mailFolders"
            folders_response = requests.get(folders_url, headers=self._get_headers())
            folders_response.raise_for_status()
            folders_data = folders_response.json()
            
            # Look for the folder with matching name
            for folder in folders_data.get("value", []):
                if folder.get("displayName", "").lower() == target_folder.lower():
                    folder_id = folder.get("id")
                    break
                    
            # If folder not found and it's not a well-known folder, create it
            if not folder_id and target_folder not in folder_mapping.values():
                create_folder_url = f"{self.graph_endpoint}/me/mailFolders"
                create_folder_payload = {
                    "displayName": destination_folder
                }
                create_response = requests.post(
                    create_folder_url, 
                    headers=self._get_headers(),
                    json=create_folder_payload
                )
                create_response.raise_for_status()
                create_data = create_response.json()
                folder_id = create_data.get("id")
                logger.info(f"Created new folder: {destination_folder}")
            
            # Move the email to the target folder
            if folder_id:
                move_url = f"{self.graph_endpoint}/me/messages/{email_id}/move"
                move_payload = {
                    "destinationId": folder_id
                }
                move_response = requests.post(
                    move_url, 
                    headers=self._get_headers(),
                    json=move_payload
                )
                move_response.raise_for_status()
                move_data = move_response.json()
                
                logger.info(f"Email {email_id} moved to folder: {destination_folder}")
                
                # Get email subject for better tracking
                email_subject = "Unknown Subject"
                try:
                    # Get email metadata
                    email_url = f"{self.graph_endpoint}/me/messages/{email_id}?$select=subject"
                    email_response = requests.get(email_url, headers=self._get_headers())
                    email_response.raise_for_status()
                    email_data = email_response.json()
                    email_subject = email_data.get('subject', 'Unknown Subject')
                except Exception as e:
                    logger.warning(f"Could not retrieve email subject for tracking: {e}")
                
                # Track the email move in the provider_changes table
                try:
                    ProviderChangeTracker.log_email_modify(
                        provider='outlook',
                        user_id=self.user_id,
                        email_id=email_id,
                        subject=email_subject,
                        extra_details={
                            'action': 'move',
                            'destination_folder': destination_folder,
                            'destination_folder_id': folder_id,
                            'timestamp': datetime.datetime.now().isoformat()
                        }
                    )
                except Exception as tracking_error:
                    logger.error(f"Failed to track email move: {tracking_error}")
                
                return {
                    "success": True,
                    "message": f"Email moved to {destination_folder} successfully",
                    "email_id": email_id,
                    "destination_folder": destination_folder
                }
            else:
                # Handle well-known folders that don't appear in the folder list
                if target_folder in folder_mapping.values():
                    move_url = f"{self.graph_endpoint}/me/messages/{email_id}/move"
                    move_payload = {
                        "destinationId": target_folder
                    }
                    move_response = requests.post(
                        move_url, 
                        headers=self._get_headers(),
                        json=move_payload
                    )
                    move_response.raise_for_status()
                    move_data = move_response.json()
                    
                    logger.info(f"Email {email_id} moved to well-known folder: {destination_folder}")
                    
                    # Get email subject for better tracking
                    email_subject = "Unknown Subject"
                    try:
                        # Get email metadata
                        email_url = f"{self.graph_endpoint}/me/messages/{email_id}?$select=subject"
                        email_response = requests.get(email_url, headers=self._get_headers())
                        email_response.raise_for_status()
                        email_data = email_response.json()
                        email_subject = email_data.get('subject', 'Unknown Subject')
                    except Exception as e:
                        logger.warning(f"Could not retrieve email subject for tracking: {e}")
                    
                    # Track the email move in the provider_changes table
                    try:
                        ProviderChangeTracker.log_email_modify(
                            provider='outlook',
                            user_id=self.user_id,
                            email_id=email_id,
                            subject=email_subject,
                            extra_details={
                                'action': 'move',
                                'destination_folder': destination_folder,
                                'destination_folder_id': target_folder,
                                'is_well_known_folder': True,
                                'timestamp': datetime.datetime.now().isoformat()
                            }
                        )
                    except Exception as tracking_error:
                        logger.error(f"Failed to track email move: {tracking_error}")
                    
                    return {
                        "success": True,
                        "message": f"Email moved to {destination_folder} successfully",
                        "email_id": email_id,
                        "destination_folder": destination_folder
                    }
                else:
                    raise ValueError(f"Could not find or create folder '{destination_folder}'")
            
        except Exception as e:
            logger.error(f"Error moving email via Microsoft Graph API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def get_sent_emails(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve sent emails from the user's sent folder.
        
        Args:
            limit: Maximum number of emails to retrieve (default: 100)
            
        Returns:
            List of sent email objects with their content
        """
        try:
            if not self.authenticate():
                logger.error("Failed to authenticate with Microsoft Graph")
                return []
                
            # Construct the URL for sent items folder
            sent_items_url = f"{self.graph_endpoint}/me/mailFolders/sentItems/messages?$top={limit}"
            
            # Get messages from sent folder
            response = requests.get(sent_items_url, headers=self._get_headers())
            response.raise_for_status()
            data = response.json()
            
            sent_emails = []
            for msg in data.get('value', []):
                try:
                    # Extract message details
                    msg_id = msg.get('id')
                    subject = msg.get('subject', '')
                    
                    # Extract recipients
                    to_recipients = msg.get('toRecipients', [])
                    to_emails = [r.get('emailAddress', {}).get('address', '') for r in to_recipients]
                    to_str = '; '.join(to_emails)
                    
                    # Extract sender
                    from_email = msg.get('sender', {}).get('emailAddress', {}).get('address', '')
                    
                    # Extract date
                    date = msg.get('sentDateTime', '')
                    
                    # Extract content
                    content = msg.get('body', {}).get('content', '')
                    
                    sent_email = {
                        'id': msg_id,
                        'subject': subject,
                        'to': to_str,
                        'from': from_email,
                        'date': date,
                        'content': content
                    }
                    
                    sent_emails.append(sent_email)
                except Exception as e:
                    logger.error(f"Error processing sent email {msg.get('id', 'unknown')}: {str(e)}")
                    continue
                    
            logger.info(f"Retrieved {len(sent_emails)} sent emails from Outlook")
            return sent_emails
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP error retrieving sent emails: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error retrieving sent emails via Microsoft Graph API: {str(e)}")
            return []

def main():
    # Test configuration
    USER_ID = "test_user"
    TEST_RECIPIENT = "edoardogenissel@gmail.com"  # Replace with test email
    
    # Initialize MicrosoftEmail handler
    microsoft_email = MicrosoftEmail(USER_ID)
    
    print("\n=== Testing Authentication ===")
    auth_result = microsoft_email.authenticate()
    print(f"Authentication Result: {'Success' if auth_result else 'Failure'}")
    message_id=None
    if not auth_result:
        print("Skipping further tests due to authentication failure")
        return
    test_send=False
    if test_send:
        print("\n=== Testing Email Sending ===")
        send_result = microsoft_email.send_email(
            subject="Test Email from MicrosoftEmail",
            body="This is a test email sent from MicrosoftEmail class",
            recipients=[TEST_RECIPIENT]
    )
        print(f"Send Result: {send_result}")
    
    # Only proceed if we have a message ID
        message_id = send_result.get('message_id')
    if not message_id or message_id == 'unknown-id' or message_id is None:
        print("Attempting to fetch last received email ID...")
        
        # Fetch last received email in the inbox
        inbox_url = f"{microsoft_email.graph_endpoint}/me/mailFolders/inbox/messages?$top=1&$orderby=receivedDateTime desc"
        try:
            inbox_response = requests.get(inbox_url, headers=microsoft_email._get_headers())
            inbox_response.raise_for_status()
            inbox_data = inbox_response.json()
            
            if inbox_data.get('value'):
                last_email = inbox_data['value'][0]
                message_id = last_email.get('id')
                # Extract sender and receiver information
                sender = last_email.get('sender', {}).get('emailAddress', {}).get('address', 'unknown')
                to_recipients = last_email.get('toRecipients', [])
                to_emails = [r.get('emailAddress', {}).get('address') for r in to_recipients]
                
                print(f"Found last received email with ID: {message_id}")
                print(f"  From: {sender}")
                print(f"  To: {', '.join(to_emails)}")
            else:
                print("No emails found in inbox")
                return
        except Exception as e:
            print(f"Error fetching inbox: {str(e)}")
            return
    message_id=None
    if message_id:
        sent_email_id = message_id
        
        print("\n=== Testing Email Replying ===")
        reply_result = microsoft_email.reply_to_email(
            email_id=sent_email_id,
            body="This is a test reply to the email.TEST"
        )
        print("Reply Result:", reply_result)
    test_other=False
    if test_other:
        print("\n=== Testing Email Forwarding ===")
        forward_result = microsoft_email.forward_email(
            email_id=sent_email_id,
            recipients=[TEST_RECIPIENT],
            additional_comment="Forwarding for your review"
        )
        print("Forward Result:", forward_result)
        
        print("\n=== Testing Email Flagging ===")
        flag_result = microsoft_email.flag_email(
            email_id=sent_email_id,
            mark_important=True,
            mark_read=True
        )
        print("Flagging Result:", flag_result)
        
        print("\n=== Testing Email Moving ===")
        move_result = microsoft_email.move_email(
            email_id=sent_email_id,
            destination_folder="Archive"
        )
        print("Move Result:", move_result)
    
    else:
        print("Skipping further tests due to email sending failure")

if __name__ == "__main__":
    main()
