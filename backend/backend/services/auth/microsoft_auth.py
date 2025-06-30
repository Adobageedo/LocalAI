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
from pathlib import Path
from typing import Optional, Dict, List, Any, Union
from backend.core.config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_TENANT_ID
)
from backend.services.auth.credentials_manager import load_microsoft_token, save_microsoft_token
from backend.core.logger import log

logger = log.bind(name="backend.services.auth.microsoft_auth")

SCOPES = ['Mail.Read', 'User.Read', 'Mail.ReadWrite', 'Mail.Send']

def get_outlook_token(user_id: str) -> Optional[Dict]:
    """
    Authentifie l'utilisateur et renvoie un token d'accès à Microsoft Graph.
    Args:
        client_id: ID client Azure
        client_secret: Secret client Azure
        tenant_id: ID du tenant Azure
        user_id: Identifiant de l'utilisateur
    Returns:
        Token d'accès ou None en cas d'erreur
    """
    client_id = OUTLOOK_CLIENT_ID
    client_secret = OUTLOOK_CLIENT_SECRET
    tenant_id = OUTLOOK_TENANT_ID
    
    try:
        # Utilisation de la fonction de chargement du token depuis credentials_manager
        cache_data = load_microsoft_token(user_id)
        token_cache = msal.SerializableTokenCache()
        if cache_data:
            token_cache.deserialize(cache_data)
        app = msal.PublicClientApplication(
            client_id=client_id,
            authority=f"https://login.microsoftonline.com/common",
            token_cache=token_cache
        )
        accounts = app.get_accounts()
        result = None
        if accounts:
            logger.info(f"Compte trouvé dans le cache : {accounts[0].get('username', 'compte inconnu')}")
            result = app.acquire_token_silent(SCOPES, account=accounts[0])
        if not result:
            logger.info("Aucun token valide trouvé, lancement de l'authentification interactive")
            result = app.acquire_token_interactive(
                scopes=SCOPES,
                prompt="select_account"
            )
            # Vérifier si l'authentification a réussi
            if "error" in result:
                error_msg = result.get("error_description", "Erreur inconnue")
                logger.error(f"Erreur lors de l'authentification interactive: {error_msg}")
                raise Exception(f"Échec de l'authentification: {error_msg}")
        

        if token_cache.has_state_changed:
            # Utilisation de la fonction de sauvegarde du token depuis credentials_manager
            save_microsoft_token(user_id, token_cache.serialize())
        if "access_token" in result:
            username = "outlook_user"
            if "id_token_claims" in result and result["id_token_claims"].get("preferred_username"):
                username = result["id_token_claims"]["preferred_username"]
            elif accounts and accounts[0].get("username"):
                username = accounts[0].get("username")
            logger.info(f"Authentification à Outlook réussie pour {username}")
            result["account"] = {"username": username}
            return result
        else:
            error_desc = result.get('error_description', 'Erreur inconnue')
            logger.error(f"Erreur d'authentification: {error_desc}")
            return None
    except Exception as e:
        logger.error(f"Erreur lors de l'authentification à Outlook: {str(e)}")
        return None

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
            token_data = get_outlook_token(self.user_id)
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
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": content_type,
                        "content": content
                    },
                    "toRecipients": to_recipients,
                    "ccRecipients": cc_recipients,
                    "bccRecipients": bcc_recipients
                },
                "saveToSentItems": "true"
            }
            
            # Send the email
            send_url = f"{self.graph_endpoint}/me/sendMail"
            response = requests.post(
                send_url, 
                headers=self._get_headers(),
                json=email_payload
            )
            response.raise_for_status()
            
            # Microsoft Graph API doesn't return the message ID in the response
            # We need to search for the sent message to get its ID
            # This is a bit inefficient but necessary with the current API
            
            # Wait a moment for the message to be saved in the sent items folder
            time.sleep(2)
            
            # Properly escape the subject for URL
            from urllib.parse import quote
            escaped_subject = quote(subject)
            
            # Query the sent items folder for the recently sent message
            query_url = f"{self.graph_endpoint}/me/mailFolders/sentItems/messages?$filter=subject eq '{escaped_subject}'&$top=1&$orderby=createdDateTime desc"
            try:
                query_response = requests.get(query_url, headers=self._get_headers())
                query_response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                logger.error(f"Error querying sent items: {str(e)}")
                # Return partial success with the sent status
                return {
                    "success": True,
                    "message_id": "unknown-id",
                    "thread_id": "unknown-thread",
                    "warning": "Email sent but could not retrieve message ID"
                }
            
            message_data = query_response.json()
            message_id = message_data.get("value", [{}])[0].get("id", "unknown-id")
            thread_id = message_data.get("value", [{}])[0].get("conversationId", "unknown-thread")
            
            logger.info(f"Email sent successfully with message ID: {message_id}")
            
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error sending email via Microsoft Graph API: {str(e)}")
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
            email_id: Microsoft Message-ID of the email to reply to
            body: Content of the reply
            cc: Optional list of CC recipients
            include_original: Whether to include original email content (not applicable for MS Graph)
            
        Returns:
            Dict with details of the created reply
        """
        if not self.authenticated:
            if not self.authenticate():
                return {"success": False, "error": "Authentication failed"}
                
        try:
            # Format CC recipients if provided
            cc_recipients = []
            if cc:
                cc_recipients = [{"emailAddress": {"address": email}} for email in cc]
                
            # Create reply payload
            reply_payload = {
                "message": {
                    "body": {
                        "contentType": "text",
                        "content": body
                    }
                },
                "comment": body  # For API compatibility
            }
            
            # Add CC recipients if provided
            if cc_recipients:
                reply_payload["message"]["ccRecipients"] = cc_recipients
            
            # Send the reply
            reply_url = f"{self.graph_endpoint}/me/messages/{email_id}/reply"
            response = requests.post(
                reply_url, 
                headers=self._get_headers(),
                json=reply_payload
            )
            response.raise_for_status()
            
            # Get the message details to return the ID
            message_url = f"{self.graph_endpoint}/me/messages/{email_id}"
            message_response = requests.get(message_url, headers=self._get_headers())
            message_response.raise_for_status()
            
            message_data = message_response.json()
            thread_id = message_data.get("conversationId", "unknown-thread")
            
            logger.info(f"Reply sent to email {email_id}")
            
            return {
                "success": True,
                "message_id": email_id,  # The ID of the original message
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error replying to email via Microsoft Graph API: {str(e)}")
            return {
                "success": False,
                "error": str(e)
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
            forward_url = f"{self.graph_endpoint}/me/messages/{email_id}/forward"
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
def main():
    # Test configuration
    USER_ID = "test_user"
    TEST_RECIPIENT = "edoardogenissel@gmail.com"  # Replace with test email
    
    # Initialize MicrosoftEmail handler
    microsoft_email = MicrosoftEmail(USER_ID)
    
    print("\n=== Testing Authentication ===")
    auth_result = microsoft_email.authenticate()
    print(f"Authentication Result: {'Success' if auth_result else 'Failure'}")
    
    if not auth_result:
        print("Skipping further tests due to authentication failure")
        return
    
    print("\n=== Testing Email Sending ===")
    send_result = microsoft_email.send_email(
        subject="Test Email from MicrosoftEmail",
        body="This is a test email sent from MicrosoftEmail class",
        recipients=[TEST_RECIPIENT]
    )
    print("Send Result:", send_result)
    
    if send_result.get("success"):
        sent_email_id = send_result["message_id"]
        
        print("\n=== Testing Email Replying ===")
        reply_result = microsoft_email.reply_to_email(
            email_id=sent_email_id,
            body="This is a test reply to the email."
        )
        print("Reply Result:", reply_result)
        
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
