#!/usr/bin/env python3
"""
Gmail Actions
============

Module for performing Gmail actions (reply, forward, flag, archive) using the Google API.
All email operations (send, reply, forward) create drafts rather than sending directly.
Methods accept direct parameters for simplicity and ease of integration.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime

from backend.services.auth.credentials_manager import check_google_credentials
from backend.services.auth.google_auth import get_gmail_service
from backend.core.logger import log
from backend.core.config import CONFIG

# Setup logger
logger = log.bind(name="backend.services.email.gmail_actions")

class GmailActions:
    """
    Implements Gmail API actions with a simplified parameter structure.
    
    This class handles Gmail API calls for operations like:
    - Creating email drafts 
    - Replying to emails (as drafts)
    - Forwarding emails (as drafts)
    - Flagging emails as important
    - Moving emails to different folders (archive, trash)
    
    All methods accept direct parameters rather than complex dictionary structures.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the Gmail actions handler.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.gmail_service = None
        
    def authenticate(self) -> bool:
        """
        Authenticate with Gmail API.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            # Check if credentials exist and are valid
            creds_status = check_google_credentials(self.user_id)
            
            if not creds_status["authenticated"] or not creds_status["valid"]:
                logger.error(f"Invalid or missing Gmail credentials for user {self.user_id}")
                return False
                
            # Get authenticated Gmail service
            self.gmail_service = get_gmail_service(self.user_id)
            logger.info(f"Successfully authenticated with Gmail for user {self.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error authenticating with Gmail: {str(e)}")
            return False
                        
    def reply_to_email(
        self,
        email_id: str,
        sender: str,
        subject: str,
        body: str, 
        thread_id: Optional[str] = None,
        message_id: Optional[str] = None,
        cc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a draft reply to an email via Gmail API.
        
        Args:
            email_id: ID of the email being replied to
            sender: Email address of the original sender (will be the recipient of the reply)
            subject: Subject of the original email
            body: Content of the reply
            thread_id: Optional thread ID to attach reply to
            message_id: Optional message ID for threading
            cc: Optional list of CC recipients
        
        Returns:
            Dict with details of the created draft reply
        """
        if not self.gmail_service:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # Format subject if needed
            if not subject.lower().startswith("re:"):
                subject = f"Re: {subject}"
                
            # Set recipients
            recipients = [sender]
            cc = cc or []
            
            logger.info(f"Creating reply draft to email {email_id} via Gmail API")
            # Create a message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients)
            
            if cc and len(cc) > 0:
                message['Cc'] = ', '.join(cc)
                
            message['Subject'] = subject
            
            # Set In-Reply-To and References headers for threading if available
            if message_id:
                message['In-Reply-To'] = message_id
                message['References'] = message_id
                
            # Add body
            message.attach(MIMEText(body, 'html' if '<html>' in body.lower() else 'plain'))
                            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create the draft
            draft = self.gmail_service.users().drafts().create(
                userId='me',
                body={
                    'raw': raw_message,
                    'threadId': thread_id
                }
            ).execute()
            logger.info(f"Email reply draft created via Gmail API with ID {draft['id']}")
            
            return {
                "success": True,
                "gmail_message_id": draft['id'],
                "thread_id": thread_id,
                "email_id": email_id
            }
            
        except Exception as e:
            logger.error(f"Error creating reply draft via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "email_id": email_id
            }
    
    def create_draft_email(
        self,
        subject: str,
        body: str,
        recipients: List[str],
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        thread_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new email draft via Gmail API.
        
        Args:
            subject: Email subject
            body: Email body content
            recipients: List of recipient email addresses
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            thread_id: Optional thread ID to add draft to existing thread
            
        Returns:
            Dict with details of the created draft
        """
        if not self.gmail_service:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Set default values for optional parameters
            cc = cc or []
            bcc = bcc or []
            
            logger.info(f"Creating email draft with subject '{subject}' via Gmail API")
            
            # Create a message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients)
            
            if cc and len(cc) > 0:
                message['Cc'] = ', '.join(cc)
                
            if bcc and len(bcc) > 0:
                message['Bcc'] = ', '.join(bcc)
                
            message['Subject'] = subject
            
            # Add body
            message.attach(MIMEText(body, 'html' if '<html>' in body.lower() else 'plain'))
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create the draft
            draft_body = {'message': {'raw': raw_message}}
            if thread_id:
                draft_body['message']['threadId'] = thread_id
                
            draft = self.gmail_service.users().drafts().create(
                userId='me',
                body=draft_body
            ).execute()
            
            logger.info(f"Email draft created via Gmail API with ID {draft['id']}")
            
            return {
                "success": True,
                "gmail_draft_id": draft['id'],
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error creating email draft via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def forward_email(
        self,
        email_id: str,
        recipients: List[str],
        body: str,
        subject: str,
        thread_id: Optional[str] = None,
        additional_comment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a draft to forward an email via Gmail API.
        
        Args:
            email_id: ID of the email being forwarded
            recipients: List of recipient email addresses
            body: Content to forward (original email body)
            subject: Subject line (typically 'Fwd: Original Subject')
            thread_id: Optional thread ID for the draft
            additional_comment: Optional comment to include before the forwarded content
        
        Returns:
            Dict with details of the created forward draft
        """
        if not self.gmail_service:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
            
        try:
            logger.info(f"Creating forward draft for email {email_id} via Gmail API")
            
            # Format subject if needed
            if not subject.lower().startswith("fwd:") and not subject.lower().startswith("fw:"):
                subject = f"Fwd: {subject}"

            # Create a new message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients)
            message['Subject'] = subject
            
            # Prepare email content
            content = ""
            
            # Add additional comment if provided
            if additional_comment:
                content += f"{additional_comment}\n\n"
                
            # Add forwarded content
            content += body
            
            # Add the content to the message
            message.attach(MIMEText(content, 'html' if '<html>' in content.lower() else 'plain'))
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Create the forward draft
            draft_body = {'raw': raw_message}
            if thread_id:
                draft_body['threadId'] = thread_id
                
            draft = self.gmail_service.users().drafts().create(
                userId='me',
                body={'message': draft_body}
            ).execute()
            
            logger.info(f"Email forward draft created via Gmail API with ID {draft['id']}")
            
            return {
                "success": True,
                "gmail_draft_id": draft['id'],
                "thread_id": thread_id,
                "email_id": email_id
            }
            
        except Exception as e:
            logger.error(f"Error creating forward draft via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def update_email_flags(
        self,
        email_id: str,
        flag_important: Optional[bool] = None,
        mark_read: Optional[bool] = None,
    ) -> Dict[str, Any]:
        """
        Update flags for an email via Gmail API.
        
        Args:
            email_id: ID of the email to update
            flag_important: Whether to flag the email as important
            mark_read: Whether to mark the email as read
        
    Returns:
        Dict with details of the created draft
    """
        if not self.gmail_service:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
            
        try:
            
            # Now handle the actual Gmail API call
            # Get original email details to find Gmail message ID
            email = self.email_manager.get_email_by_id(email_id, self.user_id)
            if not email:
                raise ValueError(f"Email with ID {email_id} not found in database")
                
            # Extract Gmail message ID from metadata
            metadata = email.get('metadata', {}) or {}
            gmail_message_id = metadata.get('gmail_message_id')
            
            if not gmail_message_id:
                raise ValueError(f"Gmail message ID not found for email {email_id}")
            
            # Define label modifications
            label_modifications = {'removeLabelIds': [], 'addLabelIds': []}
            
            # Handle importance flag
            if flag_important is not None:
                if flag_important:
                    label_modifications['addLabelIds'].append('IMPORTANT')
                else:
                    label_modifications['removeLabelIds'].append('IMPORTANT')
            
            # Handle read/unread status
            if mark_read is not None:
                if mark_read:
                    label_modifications['removeLabelIds'].append('UNREAD')
                else:
                    label_modifications['addLabelIds'].append('UNREAD')
            
            # Apply the modifications if there are any
            if label_modifications['addLabelIds'] or label_modifications['removeLabelIds']:
                self.gmail_service.users().messages().modify(
                    userId='me',
                    id=gmail_message_id,
                    body=label_modifications
                ).execute()
                
                logger.info(f"Email {email_id} flags updated via Gmail API")
            
            return {
                "success": True,
                "email_id": email_id,
                "flags_updated": True
            }
            
        except Exception as e:
            logger.error(f"Error updating email flags via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def move_email(
        self,
        email_id: str,
        destination_folder: str
    ) -> Dict[str, Any]:
        """
        Move an email to a different folder via Gmail API.
        
        Args:
            email_id: ID of the email to move
            destination_folder: Target folder name ('ARCHIVE', 'TRASH', etc.)
            
        Returns:
            Dict with move status
        """
        if not self.gmail_service:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            
            # Now handle the actual Gmail API call                
            # Extract Gmail message ID from metadata
            metadata = email.get('metadata', {}) or {}
            gmail_message_id = metadata.get('gmail_message_id')
            
            # Map destination folder to Gmail label/action
            gmail_action = None
            label_modifications = {'removeLabelIds': ['INBOX'], 'addLabelIds': []}
            
            if destination_folder.lower() == 'archive':
                # For archive, we just remove INBOX label
                gmail_action = 'archive'
            elif destination_folder.lower() == 'trash':
                gmail_action = 'trash'
            elif destination_folder.lower() == 'spam':
                label_modifications['addLabelIds'].append('SPAM')
            else:
                # For custom folders, try to find or create the label
                labels_response = self.gmail_service.users().labels().list(userId='me').execute()
                labels = {label['name'].lower(): label['id'] for label in labels_response['labels']}
                
                if destination_folder.lower() in labels:
                    # Use existing label
                    label_modifications['addLabelIds'].append(labels[destination_folder.lower()])
                else:
                    # Create new label
                    created_label = self.gmail_service.users().labels().create(
                        userId='me',
                        body={'name': destination_folder}
                    ).execute()
                    label_modifications['addLabelIds'].append(created_label['id'])
            
            # Execute the appropriate action
            if gmail_action == 'archive':
                self.gmail_service.users().messages().modify(
                    userId='me',
                    id=gmail_message_id,
                    body=label_modifications
                ).execute()
                logger.info(f"Email {email_id} archived via Gmail API")
            elif gmail_action == 'trash':
                self.gmail_service.users().messages().trash(
                    userId='me',
                    id=gmail_message_id
                ).execute()
                logger.info(f"Email {email_id} moved to trash via Gmail API")
            else:
                # Apply label modifications
                self.gmail_service.users().messages().modify(
                    userId='me',
                    id=gmail_message_id,
                    body=label_modifications
                ).execute()
                logger.info(f"Email {email_id} moved to {destination_folder} via Gmail API")
            
            return {
                "success": True,
                "email_id": email_id,
                "destination_folder": destination_folder
            }
            
        except Exception as e:
            logger.error(f"Error moving email via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
def main():
    """
    Test function to demonstrate Gmail actions.
    """    
    # User ID for testing
    user_id = "hupTIQvuO4R3BxklIWs1AqbKDP13"
    
    # Initialize Gmail actions
    gmail_actions = GmailActions(user_id)
    
    # Authenticate
    authenticated = gmail_actions.authenticate()
    if not authenticated:
        print("Authentication failed.")
        return 1
        
    print("Authentication successful.")
    
    # Get a list of emails to work with
    from backend.services.db.email_manager import EmailManager
    email_manager = EmailManager()
    emails = email_manager.get_emails_by_user(user_id=user_id, limit=5)
    
    if not emails:
        print("No emails found for this user.")
        return 1
        
    print(f"Found {len(emails)} emails.")
    
    # Display available emails
    for i, email in enumerate(emails):
        print(f"{i+1}. Subject: {email.get('subject', 'No subject')} | From: {email.get('sender', 'Unknown')}")
    
    # Let user choose an email
    choice = int(input("\nSelect an email number to test actions: ")) - 1
    if choice < 0 or choice >= len(emails):
        print("Invalid selection.")
        return 1
    content = "edvewihbdwejkb"
    test_email = emails[choice]
    logger.info(f"Selected email: {test_email}")
    reply_data = {
                "email": test_email,
                "body": content,
            }
    
    # Menu of actions
    print("\nAvailable Actions:")
    print("1. Reply to email")
    print("2. Forward email")
    print("3. Flag/unflag as important")
    print("4. Mark as read/unread")
    print("5. Move email (archive/trash)")
    
    action = int(input("\nChoose an action: "))
    
    if action == 1:
        result = gmail_actions.reply_to_email(reply_data)
        
    elif action == 2:
        recipients = input("Enter recipient emails (comma-separated): ").split(',')
        comment = input("Enter optional comment: ")
        result = gmail_actions.forward_email(
            email_id, 
            recipients, 
            additional_comment=comment if comment else None
        )
        
    elif action == 3:
        flag_important = input("Flag as important? (y/n): ").lower() == 'y'
        result = gmail_actions.update_email_flags(email_id, flag_important=flag_important)
        
    elif action == 4:
        mark_read = input("Mark as read? (y/n): ").lower() == 'y'
        result = gmail_actions.update_email_flags(email_id, mark_read=mark_read)
        
    elif action == 5:
        destination = input("Destination folder (archive/trash/spam/custom): ")
        result = gmail_actions.move_email(email_id, destination)
        
    else:
        print("Invalid action.")
        return 1
    
    # Display result
    print("\nAction result:")
    print(json.dumps(result, indent=2))
    
    return 0

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
