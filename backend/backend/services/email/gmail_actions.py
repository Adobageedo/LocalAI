#!/usr/bin/env python3
"""
Gmail Actions
============

Module for performing Gmail actions (reply, forward, flag, archive) using the Google API.
This module implements the direct API calls that work alongside the database operations 
in EmailAgent to provide complete email handling functionality.
"""

import os
import sys
import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from backend.services.auth.credentials_manager import check_google_credentials
from backend.services.auth.google_auth import get_gmail_service
from backend.services.email.mail_agent import EmailAgent
from backend.services.db.email_manager import EmailManager
from backend.core.logger import log
from backend.core.config import CONFIG

# Setup logger
logger = log.bind(name="backend.services.email.gmail_actions")

class GmailActions:
    """
    Implements Gmail API actions that complement the EmailAgent database operations.
    
    This class handles the direct Gmail API calls for operations like:
    - Sending replies
    - Forwarding emails
    - Flagging emails as important
    - Moving emails to different folders (archive, trash)
    
    It works alongside EmailAgent, which handles the database operations.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the Gmail actions handler.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.email_agent = EmailAgent()
        self.email_manager = EmailManager()
        self.gmail_service = None
        
    async def authenticate(self) -> bool:
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
            
    async def _get_raw_email(self, email_id: str) -> Dict[str, Any]:
        """
        Get raw email data from Gmail by message ID.
        
        Args:
            email_id: Email ID in the database
            
        Returns:
            Dict with Gmail API message data
        """
        try:
            # First get the email from database to get Gmail message ID
            email = await self.email_manager.get_email_by_id(email_id, self.user_id)
            if not email:
                raise ValueError(f"Email with ID {email_id} not found in database")
                
            # Extract Gmail message ID from metadata
            metadata = email.get('metadata', {}) or {}
            gmail_message_id = metadata.get('gmail_message_id')
            
            if not gmail_message_id:
                raise ValueError(f"Gmail message ID not found for email {email_id}")
                
            # Get the raw message from Gmail API
            message = self.gmail_service.users().messages().get(
                userId='me', 
                id=gmail_message_id, 
                format='full'
            ).execute()
            
            return message
            
        except Exception as e:
            logger.error(f"Error retrieving raw email {email_id}: {str(e)}")
            raise
            
    async def reply_to_email(
        self,
        email_id: str,
        content: str,
        thread_id: Optional[str] = None,
        subject: Optional[str] = None,
        recipients: Optional[List[str]] = None,
        cc: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Reply to an email via Gmail API.
        
        Args:
            email_id: ID of the email to reply to
            content: Content of the reply
            thread_id: Optional thread ID
            subject: Optional subject (default: Re: original subject)
            recipients: Optional list of recipients (default: original sender)
            cc: Optional list of CC recipients
            
        Returns:
            Dict with details of the sent reply
        """
        if not self.gmail_service:
            authenticated = await self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:                
            # Now handle the actual Gmail API call
            # Get original email details
            email = await self.email_manager.get_email_by_id(email_id, self.user_id)
            if not email:
                raise ValueError(f"Email with ID {email_id} not found in database")
                
            # Create a message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients) if recipients else email.get('sender', '')
            
            if cc and len(cc) > 0:
                message['Cc'] = ', '.join(cc)
                
            message['Subject'] = subject if subject else f"Re: {email.get('subject', '')}"
            
            # Set In-Reply-To and References headers for threading
            message_id = email.get('message_id')
            if message_id:
                message['In-Reply-To'] = message_id
                message['References'] = message_id
                
            # Add body
            message.attach(MIMEText(content, 'html' if '<html>' in content.lower() else 'plain'))
            
            # Get thread ID if not provided
            if not thread_id:
                thread_id = email.get('conversation_id')
                
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send the message
            sent_message = self.gmail_service.users().messages().send(
                userId='me',
                body={
                    'raw': raw_message,
                    'threadId': thread_id
                }
            ).execute()
            
            # Update the database record with Gmail message ID
            await self.email_manager.update_email(
                db_result["message_id"], 
                {"metadata": {"gmail_message_id": sent_message['id']}},
                self.user_id
            )
            
            logger.info(f"Email reply sent via Gmail API with ID {sent_message['id']}")
            
            return {
                "success": True,
                "message_id": db_result["message_id"],
                "gmail_message_id": sent_message['id'],
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error sending reply via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def forward_email(
        self,
        email_id: str,
        recipients: List[str],
        subject: Optional[str] = None,
        additional_comment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Forward an email via Gmail API.
        
        Args:
            email_id: ID of the email to forward
            recipients: List of recipient email addresses
            subject: Optional new subject (defaults to "Fwd: original subject")
            additional_comment: Optional comment to add before the forwarded content
            
        Returns:
            Dict with details of the forwarded email
        """
        if not self.gmail_service:
            authenticated = await self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # First call EmailAgent to handle database operations
            db_result = await self.email_agent.forward_email(
                email_id=email_id,
                recipients=recipients,
                subject=subject,
                additional_comment=additional_comment,
                user_id=self.user_id
            )
            
            if not db_result["success"]:
                return db_result
                
            # Now handle the actual Gmail API call
            # Get original email details
            email = await self.email_manager.get_email_by_id(email_id, self.user_id)
            if not email:
                raise ValueError(f"Email with ID {email_id} not found in database")
                
            # Get the raw email message
            raw_email = await self._get_raw_email(email_id)
            
            # Create a message
            message = MIMEMultipart()
            message['To'] = ', '.join(recipients)
            message['Subject'] = subject if subject else f"Fwd: {email.get('subject', '')}"
            
            # Create forwarded content
            original_sender = email.get('sender', 'Unknown')
            original_date = email.get('sent_date', 'Unknown date')
            original_subject = email.get('subject', 'No subject')
            original_recipients = ', '.join(email.get('recipients', []))
            
            # Format the forwarded header
            forwarded_header = f"""
---------- Forwarded message ---------
From: {original_sender}
Date: {original_date}
Subject: {original_subject}
To: {original_recipients}

"""
            
            # Add additional comment if provided
            if additional_comment:
                message.attach(MIMEText(additional_comment + "\n\n" + forwarded_header, 'plain'))
            else:
                message.attach(MIMEText(forwarded_header, 'plain'))
            
            # Add the original content
            original_body = email.get('body', '')
            message.attach(MIMEText(original_body, 'html' if email.get('is_html', False) else 'plain'))
            
            # Encode the message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send the message
            sent_message = self.gmail_service.users().messages().send(
                userId='me',
                body={
                    'raw': raw_message
                }
            ).execute()
            
            # Update the database record with Gmail message ID
            await self.email_manager.update_email(
                db_result["message_id"],
                {"metadata": {"gmail_message_id": sent_message['id']}},
                self.user_id
            )
            
            logger.info(f"Email forwarded via Gmail API with ID {sent_message['id']}")
            
            return {
                "success": True,
                "message_id": db_result["message_id"],
                "gmail_message_id": sent_message['id']
            }
            
        except Exception as e:
            logger.error(f"Error forwarding email via Gmail API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_email_flags(
        self,
        email_id: str,
        flag_important: Optional[bool] = None,
        mark_read: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Update flags for an email via Gmail API.
        
        Args:
            email_id: ID of the email to update
            flag_important: Whether to flag the email as important
            mark_read: Whether to mark the email as read
            
        Returns:
            Dict with update status
        """
        if not self.gmail_service:
            authenticated = await self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # First call EmailAgent to handle database operations
            db_result = await self.email_agent.update_email_flags(
                email_id=email_id,
                flag_important=flag_important,
                mark_read=mark_read,
                user_id=self.user_id
            )
            
            if not db_result["success"]:
                return db_result
                
            # Now handle the actual Gmail API call
            # Get original email details to find Gmail message ID
            email = await self.email_manager.get_email_by_id(email_id, self.user_id)
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
    
    async def move_email(
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
            authenticated = await self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            # First call EmailAgent to handle database operations
            db_result = await self.email_agent.move_email(
                email_id=email_id,
                destination_folder=destination_folder,
                user_id=self.user_id
            )
            
            if not db_result["success"]:
                return db_result
                
            # Now handle the actual Gmail API call
            # Get original email details to find Gmail message ID
            email = await self.email_manager.get_email_by_id(email_id, self.user_id)
            if not email:
                raise ValueError(f"Email with ID {email_id} not found in database")
                
            # Extract Gmail message ID from metadata
            metadata = email.get('metadata', {}) or {}
            gmail_message_id = metadata.get('gmail_message_id')
            
            if not gmail_message_id:
                raise ValueError(f"Gmail message ID not found for email {email_id}")
            
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

async def main():
    """
    Test function to demonstrate Gmail actions.
    """
    import asyncio
    
    # User ID for testing
    user_id = input("Enter user ID: ")
    
    # Initialize Gmail actions
    gmail_actions = GmailActions(user_id)
    
    # Authenticate
    authenticated = await gmail_actions.authenticate()
    if not authenticated:
        print("Authentication failed.")
        return 1
        
    print("Authentication successful.")
    
    # Get a list of emails to work with
    email_manager = EmailManager()
    emails = await email_manager.get_emails_by_user(user_id=user_id, limit=5)
    
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
        
    test_email = emails[choice]
    email_id = test_email.get('id')
    
    # Menu of actions
    print("\nAvailable Actions:")
    print("1. Reply to email")
    print("2. Forward email")
    print("3. Flag/unflag as important")
    print("4. Mark as read/unread")
    print("5. Move email (archive/trash)")
    
    action = int(input("\nChoose an action: "))
    
    if action == 1:
        content = input("Enter reply message: ")
        result = await gmail_actions.reply_to_email(email_id, content)
        
    elif action == 2:
        recipients = input("Enter recipient emails (comma-separated): ").split(',')
        comment = input("Enter optional comment: ")
        result = await gmail_actions.forward_email(
            email_id, 
            recipients, 
            additional_comment=comment if comment else None
        )
        
    elif action == 3:
        flag_important = input("Flag as important? (y/n): ").lower() == 'y'
        result = await gmail_actions.update_email_flags(email_id, flag_important=flag_important)
        
    elif action == 4:
        mark_read = input("Mark as read? (y/n): ").lower() == 'y'
        result = await gmail_actions.update_email_flags(email_id, mark_read=mark_read)
        
    elif action == 5:
        destination = input("Destination folder (archive/trash/spam/custom): ")
        result = await gmail_actions.move_email(email_id, destination)
        
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
