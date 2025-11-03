import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import base64
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any, Union
from googleapiclient.errors import HttpError
from src.services.auth.google_auth import get_gmail_service
from src.core.logger import log
from src.core.adapters.provider_change_tracker import ProviderChangeTracker

logger = log.bind(name="src.core.adapters.google_email")

class GoogleEmail:
    """
    Class for handling Gmail operations using primarily the email_id (Message-ID).
    
    This class provides methods for:
    - Sending new emails
    - Replying to emails
    - Forwarding emails
    - Flagging/marking emails
    - Moving emails to different folders/labels
    
    It uses the Gmail API via an authenticated session and works with minimal information
    (preferably just the email_id) whenever possible.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the GoogleEmail handler.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.gmail_service = None
        self.authenticated = False
        
    def authenticate(self) -> bool:
        """
        Authenticate and build the Gmail service
        """
        try:
            self.gmail_service = get_gmail_service(self.user_id)
            self.authenticated = True
            logger.info(f"Successfully authenticated with Gmail for user {self.user_id}")
            return True
        except Exception as e:
            logger.error(f"Error authenticating with Gmail: {str(e)}")
            self.authenticated = False
            return False
            
    def send_email(self, subject: str, body: str, recipients: List[str], 
                  cc: Optional[List[str]] = None, bcc: Optional[List[str]] = None, 
                  html_content: Optional[str] = None) -> Dict[str, Any]:
        """
        Send a new email via Gmail API.
        
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
            # Create MIME message
            if html_content:
                message = MIMEMultipart('alternative')
                message['To'] = ', '.join(recipients)
                message['Subject'] = subject
                message.attach(MIMEText(body, 'plain'))
                message.attach(MIMEText(html_content, 'html'))
            else:
                message = MIMEText(body)
                message['To'] = ', '.join(recipients)
                message['Subject'] = subject
                
            # Add CC and BCC if provided
            if cc:
                message['Cc'] = ', '.join(cc)
            if bcc:
                message['Bcc'] = ', '.join(bcc)
                
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create the draft with the message
            draft = {
                'message': {
                    'raw': raw_message
                }
            }
            
            # Create the draft
            created_draft = self.gmail_service.users().drafts().create(
                userId='me',
                body=draft
            ).execute()
            
            # Send the draft
            #sent_message = self.gmail_service.users().drafts().send(
            #    userId='me',
            #    body={'id': created_draft['id']}
            #).execute()
            
            message_id = created_draft['id']
            thread_id = created_draft.get('threadId', 'unknown-thread')
            
            logger.info(f"Email sent successfully with message ID: {message_id}")
            
            # Track the email creation in the provider_changes table
            ProviderChangeTracker.log_email_add(
                provider='gmail',
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
            
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error sending email via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def reply_to_email(self, email_id: str, body: str, 
                       cc: Optional[List[str]] = None, 
                       include_original: bool = True) -> Dict[str, Any]:
        """
        Reply to an email using just the email_id.
        
        Args:
            email_id: Gmail message ID of the email to reply to
            body: Content of the reply
            cc: Optional list of CC recipients
            include_original: Whether to include original email content
            
        Returns:
            Dict with details of the created reply
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Get the original message
            original_message = self.gmail_service.users().messages().get(
                userId='me', id=email_id, format='metadata'
            ).execute()
            
            # Extract necessary headers
            headers = original_message.get('payload', {}).get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'Re: No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'unknown@example.com')
            thread_id = original_message.get('threadId')
            
            # Create reply message
            message = MIMEText(body)
            message['To'] = sender
            message['Subject'] = f"Re: {subject}"
            
            if cc:
                message['Cc'] = ', '.join(cc)
            
            # Encode the message
            raw_reply = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create draft payload
            draft_payload = {
                'message': {
                    'raw': raw_reply,
                    'threadId': thread_id
                }
            }
            
            # Create the draft
            created_draft = self.gmail_service.users().drafts().create(
                userId='me',
                body=draft_payload
            ).execute()
            
            # Send the draft
            #sent_message = self.gmail_service.users().drafts().send(
            #    userId='me',
            #    body={'id': created_draft['id']}
            #).execute()
            
            message_id = created_draft['id']
            
            logger.info(f"Reply to email {email_id} created successfully")
            
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error replying to email via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def forward_email(self, email_id: str, recipients: list, 
                     additional_comment: str = None) -> dict:
        """
        Forward an email using just the email_id.
        
        Args:
            email_id: Gmail message ID of the email to forward
            recipients: List of recipient email addresses
            additional_comment: Optional comment to include with the forwarded email
            
        Returns:
            Dict with details of the forwarded email
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Get the original message
            original_message = self.gmail_service.users().messages().get(
                userId='me', id=email_id, format='raw'
            ).execute()
            
            # Extract necessary headers
            headers = original_message.get('payload', {}).get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'Fwd: No Subject')
            
            # Create forward message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients)
            message['Subject'] = f"Fwd: {subject}"
            
            # Add comment if provided
            if additional_comment:
                message.attach(MIMEText(additional_comment + "\n\n", 'plain'))
            
            # Attach original message
            original_msg = MIMEText("\n\n---------- Forwarded message ----------\n")
            message.attach(original_msg)
            
            # Encode the message
            raw_forward = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create draft payload
            draft_payload = {
                'message': {
                    'raw': raw_forward
                }
            }
            
            # Create the draft
            created_draft = self.gmail_service.users().drafts().create(
                userId='me',
                body=draft_payload
            ).execute()
            
            # Send the draft
            #sent_message = self.gmail_service.users().drafts().send(
            #    userId='me',
            #    body={'id': created_draft['id']}
            #).execute()
            
            message_id = created_draft['id']
            thread_id = created_draft.get('threadId', 'unknown-thread')
            
            logger.info(f"Email {email_id} forwarded successfully")
            
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error forwarding email via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def _extract_email_content(self, message: Dict[str, Any]) -> str:
        """
        Helper method to extract content from an email message.
        
        Args:
            message: Gmail message object
            
        Returns:
            Extracted content as plain text
        """
        try:
            if 'parts' in message['payload']:
                for part in message['payload']['parts']:
                    if part['mimeType'] == 'text/plain':
                        # Decode the base64 content
                        if 'data' in part['body']:
                            data = part['body']['data']
                            decoded_bytes = base64.urlsafe_b64decode(data)
                            return decoded_bytes.decode('utf-8')
            elif 'body' in message['payload']:
                # Handle case where email is not multipart
                if 'data' in message['payload']['body']:
                    data = message['payload']['body']['data']
                    decoded_bytes = base64.urlsafe_b64decode(data)
                    return decoded_bytes.decode('utf-8')
            return ""
        except Exception as e:
            logger.error(f"Error extracting email content: {str(e)}")
            return ""
            
    def flag_email(self, email_id: str, mark_important: bool = None, 
                   mark_read: bool = None) -> Dict[str, Any]:
        """
        Flag/mark an email with specific attributes.
        
        Args:
            email_id: Gmail Message-ID of the email to flag
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
            
            # Handle important/not important marking
            if mark_important is not None:
                # Gmail uses IMPORTANT label to mark messages as important
                if mark_important:
                    # Add IMPORTANT label
                    self.gmail_service.users().messages().modify(
                        userId='me',
                        id=email_id,
                        body={'addLabelIds': ['IMPORTANT']}
                    ).execute()
                else:
                    # Remove IMPORTANT label
                    self.gmail_service.users().messages().modify(
                        userId='me',
                        id=email_id,
                        body={'removeLabelIds': ['IMPORTANT']}
                    ).execute()
                changes_made = True
                logger.info(f"Email {email_id} marked as {'important' if mark_important else 'not important'}")
            
            # Handle read/unread marking
            if mark_read is not None:
                if mark_read:
                    # Remove UNREAD label to mark as read
                    self.gmail_service.users().messages().modify(
                        userId='me',
                        id=email_id,
                        body={'removeLabelIds': ['UNREAD']}
                    ).execute()
                    logger.info(f"Email {email_id} marked as read")
                else:
                    # Add UNREAD label to mark as unread
                    self.gmail_service.users().messages().modify(
                        userId='me',
                        id=email_id,
                        body={'addLabelIds': ['UNREAD']}
                    ).execute()
                    logger.info(f"Email {email_id} marked as unread")
                changes_made = True
            
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
            
        except HttpError as e:
            error_message = f"HTTP error flagging email: {str(e)}"
            logger.error(error_message)
            return {
                "success": False,
                "error": error_message
            }
        except Exception as e:
            error_message = f"Error flagging email via Gmail API: {str(e)}"
            logger.error(error_message)
            return {
                "success": False,
                "error": error_message
            }
            
    def move_email(self, email_id: str, destination_folder: str) -> Dict[str, Any]:
        """
        Move an email to a different label/folder.
        
        Args:
            email_id: Gmail Message-ID of the email to move
            destination_folder: Label ID or name where the email should be moved
            
        Returns:
            Dict with details of the operation result
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # First, check if the destination label exists or needs to be created
            label_id = None
            
            # Get all labels
            labels = self.gmail_service.users().labels().list(userId='me').execute()
            
            # Check if destination_folder is a system label (like INBOX, SENT, etc.)
            system_labels = ["INBOX", "SENT", "TRASH", "DRAFT", "SPAM", "IMPORTANT", 
                           "STARRED", "UNREAD", "CATEGORY_PERSONAL", "CATEGORY_SOCIAL", 
                           "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS"]
            
            if destination_folder.upper() in system_labels:
                label_id = destination_folder.upper()
            else:
                # Check if the label already exists
                for label in labels.get('labels', []):
                    if label['name'].lower() == destination_folder.lower():
                        label_id = label['id']
                        break
                        
                # If label doesn't exist, create it
                if not label_id:
                    new_label = {
                        'name': destination_folder,
                        'labelListVisibility': 'labelShow',
                        'messageListVisibility': 'show'
                    }
                    created_label = self.gmail_service.users().labels().create(
                        userId='me', 
                        body=new_label
                    ).execute()
                    
                    label_id = created_label['id']
                    logger.info(f"Created new label: {destination_folder} with ID: {label_id}")
                    
            # Get current labels of the email
            message = self.gmail_service.users().messages().get(
                userId='me', 
                id=email_id,
                format='minimal'
            ).execute()
            
            current_labels = message.get('labelIds', [])
            
            # Determine which labels to keep
            # Remove folder-type labels but keep category and system labels like IMPORTANT, STARRED
            preserve_labels = [label for label in current_labels 
                             if label in ['IMPORTANT', 'STARRED', 'UNREAD'] 
                             or label.startswith('CATEGORY_')]
            
            # Move the email (remove all current labels and add the destination)
            modified_message = self.gmail_service.users().messages().modify(
                userId='me',
                id=email_id,
                body={
                    'removeLabelIds': [l for l in current_labels if l not in preserve_labels],
                    'addLabelIds': [label_id] + preserve_labels
                }
            ).execute()
            
            logger.info(f"Email {email_id} moved to label: {destination_folder}")
            
            # Get email subject for better tracking
            email_subject = "Unknown Subject"
            try:
                msg = self.gmail_service.users().messages().get(
                    userId='me', 
                    id=email_id,
                    format='metadata',
                    metadataHeaders=['subject']
                ).execute()
                
                headers = msg.get('payload', {}).get('headers', [])
                for header in headers:
                    if header['name'].lower() == 'subject':
                        email_subject = header['value']
                        break
            except Exception as e:
                logger.warning(f"Could not retrieve email subject for tracking: {e}")
            
            # Track the email move in the provider_changes table
            try:
                ProviderChangeTracker.log_email_modify(
                    provider='gmail',
                    user_id=self.user_id,
                    email_id=email_id,
                    subject=email_subject,
                    extra_details={
                        'action': 'move',
                        'destination_folder': destination_folder,
                        'destination_label_id': label_id,
                        'preserved_labels': preserve_labels,
                        'timestamp': datetime.datetime.now().isoformat()
                    }
                )
            except Exception as tracking_error:
                logger.error(f"Failed to track email move: {tracking_error}")
            
            return {
                "success": True,
                "message": f"Email moved to {destination_folder} successfully",
                "email_id": email_id,
                "label_id": label_id
            }
            
        except HttpError as e:
            error_message = f"HTTP error moving email: {str(e)}"
            logger.error(error_message)
            return {
                "success": False,
                "error": error_message
            }
        except Exception as e:
            error_message = f"Error moving email via Gmail API: {str(e)}"
            logger.error(error_message)
            return {
                "success": False,
                "error": error_message
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
                logger.error("Failed to authenticate with Gmail")
                return []
                
            # Query the sent mail folder
            query_params = {
                'userId': 'me',
                'labelIds': ['SENT'],
                'maxResults': limit
            }
            
            # Get message IDs first
            results = self.gmail_service.users().messages().list(**query_params).execute()
            messages = results.get('messages', [])
            
            sent_emails = []
            for message in messages:
                try:
                    msg_id = message['id']
                    # Get full message content
                    msg = self.gmail_service.users().messages().get(
                        userId='me', 
                        id=msg_id,
                        format='full'
                    ).execute()
                    
                    # Extract headers
                    headers = {}
                    for header in msg['payload']['headers']:
                        headers[header['name'].lower()] = header['value']
                    
                    # Extract content
                    content = self._extract_email_content(msg)
                    
                    sent_email = {
                        'id': msg_id,
                        'subject': headers.get('subject', ''),
                        'to': headers.get('to', ''),
                        'from': headers.get('from', ''),
                        'date': headers.get('date', ''),
                        'content': content
                    }
                    
                    sent_emails.append(sent_email)
                except Exception as e:
                    logger.error(f"Error processing sent email {message.get('id', 'unknown')}: {str(e)}")
                    continue
                    
            logger.info(f"Retrieved {len(sent_emails)} sent emails from Gmail")
            return sent_emails
            
        except HttpError as e:
            logger.error(f"HTTP error retrieving sent emails: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error retrieving sent emails via Gmail API: {str(e)}")
            return []

def main():    
    # Test configuration
    USER_ID = "test_user"
    TEST_RECIPIENT = "edoardogenissel@gmail.com"
    
    # Initialize GoogleEmail handler
    google_email = GoogleEmail(USER_ID)
    
    # Test 1: Authentication
    print("\n=== Testing Authentication ===")
    auth_result = google_email.authenticate()
    print("Authentication Result:", "Success" if auth_result else "Failed")
    
    if not auth_result:
        print("Skipping further tests due to authentication failure")
        return
    
    # Test 2: Sending Email
    print("\n=== Testing Email Sending ===")
    send_result = google_email.send_email(
        subject="Test Email from GoogleEmail",
        body="This is a test email sent using the GoogleEmail class.",
        recipients=[TEST_RECIPIENT]
    )
    print("Send Result:", send_result)
    
    if send_result.get("success"):
        sent_email_id = send_result["message_id"]
        
        # Test 3: Replying to Email
        print("\n=== Testing Email Replying ===")
        reply_result = google_email.reply_to_email(
            email_id=sent_email_id,
            body="This is a test reply to the email."
        )
        print("Reply Result:", reply_result)
        
        # Test 4: Forwarding Email
        print("\n=== Testing Email Forwarding ===")
        forward_result = google_email.forward_email(
            email_id=sent_email_id,
            recipients=[TEST_RECIPIENT],
            additional_comment="Forwarding for your review"
        )
        print("Forward Result:", forward_result)
        
        # Test 5: Flagging Email
        print("\n=== Testing Email Flagging ===")
        flag_result = google_email.flag_email(
            email_id=sent_email_id,
            mark_important=True,
            mark_read=True
        )
        print("Flagging Result:", flag_result)
        
        # Test 6: Moving Email
        print("\n=== Testing Email Moving ===")
        move_result = google_email.move_email(
            email_id=sent_email_id,
            destination_folder="Archive"
        )
        print("Move Result:", move_result)
    else:
        print("Skipping further tests due to email sending failure")

if __name__ == "__main__":
    main()
