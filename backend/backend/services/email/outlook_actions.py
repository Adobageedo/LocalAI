#!/usr/bin/env python3
"""
Outlook Actions
==============

Module for performing Outlook email actions (reply, forward, flag, archive) using Microsoft Graph API.
All email operations (send, reply, forward) create drafts rather than sending directly.
Methods accept direct parameters for simplicity and ease of integration.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import base64
import json
import requests
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime

from backend.services.auth.credentials_manager import check_microsoft_credentials
from backend.services.auth.microsoft_auth import get_outlook_token
from backend.core.logger import log
from backend.core.config import CONFIG

# Setup logger
logger = log.bind(name="backend.services.email.outlook_actions")


class OutlookActions:
    """
    Implements Microsoft Graph API actions with a simplified parameter structure.
    
    This class handles Outlook email operations like:
    - Creating email drafts 
    - Replying to emails (as drafts)
    - Forwarding emails (as drafts)
    - Flagging emails as important
    - Moving emails to different folders (archive, trash)
    
    All methods accept direct parameters rather than complex dictionary structures.
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the Outlook actions handler.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.outlook_client = None
        self.graph_endpoint = "https://graph.microsoft.com/v1.0"
        
    def authenticate(self) -> bool:
        """
        Authenticate with Microsoft Graph API.
        
        Returns:
            bool: True if authentication was successful
        """
        try:
            # Check if credentials exist and are valid
            creds_status = check_microsoft_credentials(self.user_id)
            
            if not creds_status["authenticated"] or not creds_status["valid"]:
                logger.error(f"Invalid or missing Microsoft credentials for user {self.user_id}")
                return False
                
            # Get authenticated Outlook client
            self.outlook_client = get_outlook_token(self.user_id)
            logger.info(f"Successfully authenticated with Outlook for user {self.user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error authenticating with Outlook: {str(e)}")
            return False
            
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
        Create a draft email in Outlook via Microsoft Graph API.
        
        Args:
            subject: Email subject
            body: Email body content
            recipients: List of recipient email addresses
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            thread_id: Optional conversation ID to add draft to existing thread
            
        Returns:
            Dict with details of the created draft
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Set default values for optional parameters
            cc = cc or []
            bcc = bcc or []
            
            logger.info(f"Creating email draft with subject '{subject}' via Outlook API")
            
            # Format recipients for Microsoft Graph API
            to_recipients = [{"emailAddress": {"address": email}} for email in recipients]
            cc_recipients = [{"emailAddress": {"address": email}} for email in cc]
            bcc_recipients = [{"emailAddress": {"address": email}} for email in bcc]
            
            # Determine if HTML formatting is needed
            content_type = "html" if "<html>" in body.lower() else "text"
            
            # Prepare email draft payload
            draft_payload = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": content_type,
                        "content": body
                    },
                    "toRecipients": to_recipients,
                    "ccRecipients": cc_recipients,
                    "bccRecipients": bcc_recipients
                }
            }
            
            # If thread_id is provided, add it to the payload
            if thread_id:
                draft_payload["message"]["conversationId"] = thread_id
            
            # Create the draft via Microsoft Graph API
            endpoint = f"{self.graph_endpoint}/me/messages"
            response = self.outlook_client.post(endpoint, json=draft_payload)
            response.raise_for_status()
            
            draft_data = response.json()
            draft_id = draft_data.get("id")
            
            logger.info(f"Email draft with ID {draft_id} successfully created via Outlook API")
            
            return {
                "success": True,
                "outlook_draft_id": draft_id,
                "thread_id": thread_id or draft_data.get("conversationId"),
                "subject": subject
            }
            
        except Exception as e:
            logger.error(f"Error creating email draft via Outlook API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
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
        Create a draft reply to an email via Microsoft Graph API.
        
        Args:
            email_id: ID of the email in the system database
            sender: Email address of the original sender (to reply to)
            subject: Email subject (usually with Re: prefix)
            body: Email body content
            thread_id: Optional thread/conversation ID 
            message_id: Optional message ID from Outlook
            cc: Optional list of CC recipients
            
        Returns:
            Dict with details of the created reply draft
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Set default values for optional parameters
            cc = cc or []
            
            logger.info(f"Creating reply draft to email {email_id} via Outlook API")
            
            # We need the Outlook message ID to reply
            if not message_id:
                # Try to get message details from email_id
                # This would require an email_manager to get email metadata
                # For now, we'll assume message_id is provided directly
                if not message_id:
                    raise ValueError("Outlook message_id is required for replying to emails")
            
            # Format recipients (original sender)
            to_recipients = [{"emailAddress": {"address": sender}}]
            cc_recipients = [{"emailAddress": {"address": email}} for email in cc]
            
            # Determine if HTML formatting is needed
            content_type = "html" if "<html>" in body.lower() else "text"
            
            # Prepare reply draft payload
            reply_payload = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": content_type,
                        "content": body
                    },
                    "toRecipients": to_recipients,
                    "ccRecipients": cc_recipients
                }
            }
            
            # If thread_id is provided, add it to maintain conversation
            if thread_id:
                reply_payload["message"]["conversationId"] = thread_id
                
            # Create reply draft via Microsoft Graph API
            # Use the createReply endpoint to maintain threading
            endpoint = f"{self.graph_endpoint}/me/messages/{message_id}/createReply"
            response = self.outlook_client.post(endpoint)
            response.raise_for_status()
            
            # Get the draft message ID from response
            reply_data = response.json()
            draft_id = reply_data.get("id")
            
            # Update the draft with our content
            update_endpoint = f"{self.graph_endpoint}/me/messages/{draft_id}"
            update_payload = {
                "body": {
                    "contentType": content_type,
                    "content": body
                }
            }
            
            # Add CC if provided
            if cc:
                update_payload["ccRecipients"] = cc_recipients
                
            update_response = self.outlook_client.patch(update_endpoint, json=update_payload)
            update_response.raise_for_status()
            
            logger.info(f"Reply draft with ID {draft_id} successfully created via Outlook API")
            
            return {
                "success": True,
                "outlook_message_id": draft_id,
                "thread_id": thread_id or reply_data.get("conversationId"),
                "subject": subject
            }
            
        except Exception as e:
            logger.error(f"Error creating reply draft via Outlook API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    def forward_email(
        self,
        email_id: str,
        recipients: List[str],
        body: Optional[str] = None,  # Not used in direct API approach
        subject: Optional[str] = None,  # Not used in direct API approach
        thread_id: Optional[str] = None,  # Not used in direct API approach
        additional_comment: Optional[str] = ""
    ) -> Dict[str, Any]:
        """
        Forward an email directly via Microsoft Graph API.
        
        Args:
            email_id: ID of the email to forward
            recipients: List of recipient email addresses
            body: Optional body content (unused in direct forward)
            subject: Optional subject (unused in direct forward)
            thread_id: Optional thread ID (unused in direct forward)
            additional_comment: Optional comment to add to forwarded email
            
        Returns:
            Dict with details of the forward operation
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
            
        try:
            logger.info(f"Forwarding email {email_id} to {', '.join(recipients)} via Outlook API")
            
            # Format recipients for Microsoft Graph API
            to_recipients = [{"emailAddress": {"address": email}} for email in recipients]
            
            # Get access token from the outlook_client
            access_token = self.outlook_client["access_token"]
            
            # Set up the direct forward API call
            url = f"{self.graph_endpoint}/me/messages/{email_id}/forward"
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Prepare the forward payload
            data = {
                "toRecipients": to_recipients
            }
            
            # Add comment if provided
            if additional_comment:
                data["comment"] = additional_comment
            
            # Make the forward API call
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            logger.info(f"Email {email_id} successfully forwarded to {len(recipients)} recipients")
            
            return {
                "success": True,
                "email_id": email_id,
                "recipients": recipients
            }
            
        except Exception as e:
            logger.error(f"Error forwarding email via Outlook API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def update_email_flags(
        self,
        email_id: str,
        flag_important: Optional[bool] = None,
        mark_read: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Update flags for an email via Microsoft Graph API.
        
        Args:
            email_id: ID of the email to update
            flag_important: Whether to flag the email as important
            mark_read: Whether to mark the email as read
            
        Returns:
            Dict with update status
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
                
        try:
            logger.info(f"Updating flags for email {email_id} via Outlook API")
            
            # Get access token from the outlook_client
            access_token = self.outlook_client["access_token"]
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Handle read/unread flag
            if mark_read is not None:
                # In Microsoft Graph, we directly use a different endpoint for read/unread
                read_status_endpoint = f"{self.graph_endpoint}/me/messages/{email_id}"
                if mark_read:
                    read_status_payload = {"isRead": True}
                else:
                    read_status_payload = {"isRead": False}
                    
                read_response = requests.patch(read_status_endpoint, headers=headers, json=read_status_payload)
                read_response.raise_for_status()
                
            # Handle importance flag
            if flag_important is not None:
                importance_endpoint = f"{self.graph_endpoint}/me/messages/{email_id}"
                if flag_important:
                    importance_payload = {"importance": "high"}
                else:
                    importance_payload = {"importance": "normal"}
                    
                importance_response = requests.patch(importance_endpoint, headers=headers, json=importance_payload)
                importance_response.raise_for_status()
                
            logger.info(f"Email {email_id} flags successfully updated via Outlook API")
            
            return {
                "success": True,
                "email_id": email_id,
                "flags_updated": True
            }
            
        except Exception as e:
            logger.error(f"Error updating email flags via Outlook API: {str(e)}")
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
        Move an email to a different folder via Microsoft Graph API.
        
        Args:
            email_id: ID of the email to move
            destination_folder: Target folder name ('Archive', 'DeletedItems', etc.)
            
        Returns:
            Dict with move status
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            logger.info(f"Moving email {email_id} to {destination_folder} via Outlook API")
            
            # Get access token from the outlook_client
            access_token = self.outlook_client["access_token"]
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Map common folder names to Outlook well-known folder names
            folder_mapping = {
                "inbox": "inbox",
                "sent": "sentitems",
                "archive": "archive",
                "trash": "deleteditems",
                "junk": "junkemail",
                "drafts": "drafts"
            }
            
            # Get the well-known folder name if it's a common folder
            target_folder = folder_mapping.get(destination_folder.lower(), destination_folder)
            
            # First we need to get the target folder ID
            folder_id = None
            
            # Check if it's a well-known folder
            if target_folder.lower() in folder_mapping.values():
                # Get the folder ID for the well-known folder
                well_known_url = f"{self.graph_endpoint}/me/mailFolders/{target_folder}"
                folder_response = requests.get(well_known_url, headers=headers)
                folder_response.raise_for_status()
                folder_data = folder_response.json()
                folder_id = folder_data.get("id")
            else:
                # Search for the custom folder by name
                folders_url = f"{self.graph_endpoint}/me/mailFolders"
                folders_response = requests.get(folders_url, headers=headers)
                folders_response.raise_for_status()
                folders_data = folders_response.json()
                
                # Look for the folder with matching name
                for folder in folders_data.get("value", []):
                    if folder.get("displayName").lower() == target_folder.lower():
                        folder_id = folder.get("id")
                        break
                        
                # If folder not found, create it
                if not folder_id:
                    create_folder_url = f"{self.graph_endpoint}/me/mailFolders"
                    create_folder_payload = {
                        "displayName": destination_folder
                    }
                    create_response = requests.post(create_folder_url, headers=headers, json=create_folder_payload)
                    create_response.raise_for_status()
                    create_data = create_response.json()
                    folder_id = create_data.get("id")
            
            # Move the email to the target folder
            if folder_id:
                move_url = f"{self.graph_endpoint}/me/messages/{email_id}/move"
                move_payload = {
                    "destinationId": folder_id
                }
                move_response = requests.post(move_url, headers=headers, json=move_payload)
                move_response.raise_for_status()
                
                logger.info(f"Email {email_id} successfully moved to {destination_folder}")
                
                return {
                    "success": True,
                    "email_id": email_id,
                    "destination_folder": destination_folder
                }
            else:
                raise ValueError(f"Could not find or create folder '{destination_folder}'")
                
        except Exception as e:
            logger.error(f"Error moving email via Outlook API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    from backend.services.auth.microsoft_auth import MicrosoftAuthService  # Import the auth service
    
    # Load environment variables
    load_dotenv()
    
    # Initialize with a test user ID
    USER_ID = "test_user"
    outlook = OutlookActions(USER_ID)
    
    # Test authentication
    auth_service = MicrosoftAuthService()
    token = auth_service.get_token(USER_ID)
    
    if not token:
        print("Authentication required. Please authenticate first.")
        # Here you would normally trigger the auth flow
        # For testing, you'd need to implement the auth flow
    else:
        print("Authentication successful. Testing basic functionality...")
        
        # Test getting emails
        try:
            emails = outlook.get_emails(max_results=2)
            print(f"Retrieved {len(emails)} emails")
            if emails:
                print(f"First email subject: {emails[0].get('subject')}")
        except Exception as e:
            print(f"Email retrieval test failed: {str(e)}")
        
        # Add more test cases as needed
        # Example: Test moving an email
        # email_id = "example_email_id"
        # outlook.move_email(email_id, "Inbox")
    def move_email(
        self,
        email_id: str,
        destination_folder: str
    ) -> Dict[str, Any]:
        """
        Move an email to a different folder via Microsoft Graph API.
        
        Args:
            email_id: ID of the email to move
            destination_folder: Target folder name ('Archive', 'DeletedItems', etc.)
            
        Returns:
            Dict with move status
        """
        if not self.outlook_client:
            authenticated = self.authenticate()
            if not authenticated:
                return {"success": False, "error": "Authentication failed"}
        
        try:
            logger.info(f"Moving email {email_id} to {destination_folder} via Outlook API")
            
            # Get access token from the outlook_client
            access_token = self.outlook_client["access_token"]
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Map common folder names to Outlook well-known folder names
            folder_mapping = {
                "inbox": "inbox",
                "sent": "sentitems",
                "archive": "archive",
                "trash": "deleteditems",
                "junk": "junkemail",
                "drafts": "drafts"
            }
            
            # Get the well-known folder name if it's a common folder
            target_folder = folder_mapping.get(destination_folder.lower(), destination_folder)
            
            # First we need to get the target folder ID
            folder_id = None
            
            # Check if it's a well-known folder
            if target_folder.lower() in folder_mapping.values():
                # Get the folder ID for the well-known folder
                well_known_url = f"{self.graph_endpoint}/me/mailFolders/{target_folder}"
                folder_response = requests.get(well_known_url, headers=headers)
                folder_response.raise_for_status()
                folder_data = folder_response.json()
                folder_id = folder_data.get("id")
            else:
                # Search for the custom folder by name
                folders_url = f"{self.graph_endpoint}/me/mailFolders"
                folders_response = requests.get(folders_url, headers=headers)
                folders_response.raise_for_status()
                folders_data = folders_response.json()
                
                # Look for the folder with matching name
                for folder in folders_data.get("value", []):
                    if folder.get("displayName").lower() == target_folder.lower():
                        folder_id = folder.get("id")
                        break
                        
                # If folder not found, create it
                if not folder_id:
                    create_folder_url = f"{self.graph_endpoint}/me/mailFolders"
                    create_folder_payload = {
                        "displayName": destination_folder
                    }
                    create_response = requests.post(create_folder_url, headers=headers, json=create_folder_payload)
                    create_response.raise_for_status()
                    create_data = create_response.json()
                    folder_id = create_data.get("id")
            
            # Move the email to the target folder
            if folder_id:
                move_url = f"{self.graph_endpoint}/me/messages/{email_id}/move"
                move_payload = {
                    "destinationId": folder_id
                }
                move_response = requests.post(move_url, headers=headers, json=move_payload)
                move_response.raise_for_status()
                
                logger.info(f"Email {email_id} successfully moved to {destination_folder}")
                
                return {
                    "success": True,
                    "email_id": email_id,
                    "destination_folder": destination_folder
                }
            else:
                raise ValueError(f"Could not find or create folder '{destination_folder}'")
                
        except Exception as e:
            logger.error(f"Error moving email via Outlook API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
