"""
Email tools for the MCP server.
Provides functions that interface with the EmailAgent to perform email operations.
"""

from typing import Dict, List, Optional, Any
import sys
import os
from backend.core.logger import log

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.services.email.mail_agent import EmailAgent
from backend.services.db.email_manager import EmailManager

# Setup logger
logger = log.bind(name="backend.mcp.tools.email_tools")


class EmailTools:
    """
    Tools for interacting with emails via the EmailAgent.
    """
    
    @staticmethod
    def _get_email_agent(user_id: str) -> EmailAgent:
        """
        Create and return an EmailAgent instance for the given user.
        
        Args:
            user_id: User ID for whom to create the EmailAgent
            
        Returns:
            EmailAgent instance
        """
        email_manager = EmailManager()
        return EmailAgent(user_id, email_manager)
    
    @staticmethod
    def send_email(user_id: str, to: List[str], subject: str, body: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Send a new email.
        
        Args:
            user_id: User ID of the sender
            to: List of recipient email addresses
            subject: Subject of the email
            body: Body content of the email
            provider: Email provider (gmail or outlook)
            
        Returns:
            Dict with operation result
        """
        try:
            agent = EmailTools._get_email_agent(user_id)
            result = agent.send_email(
                subject=subject,
                body=body,
                recipients=to,
                provider=provider
            )
            
            if not result.get("success", False):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to send email")
                }
                
            return {
                "success": True,
                "data": {
                    "message_id": result.get("message_id"),
                    "thread_id": result.get("thread_id")
                }
            }
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return {
                "success": False,
                "error": f"Error sending email: {str(e)}"
            }
    
    @staticmethod
    def reply_to_email(user_id: str, email_id: str, body: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Reply to an existing email.
        
        Args:
            user_id: User ID of the sender
            email_id: ID of the email to reply to
            body: Body content of the reply
            provider: Email provider (gmail or outlook)
            
        Returns:
            Dict with operation result
        """
        try:
            agent = EmailTools._get_email_agent(user_id)
            result = agent.reply_to_email(
                content=body,
                provider=provider,
                email={"email_id": email_id}
            )
            
            if not result.get("success", False):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to reply to email")
                }
                
            return {
                "success": True,
                "data": {
                    "message_id": result.get("message_id"),
                    "thread_id": result.get("thread_id")
                }
            }
        except Exception as e:
            logger.error(f"Error replying to email: {str(e)}")
            return {
                "success": False,
                "error": f"Error replying to email: {str(e)}"
            }
    
    @staticmethod
    def forward_email(user_id: str, email_id: str, to: List[str], additional_comment: Optional[str] = None, provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Forward an email to new recipients.
        
        Args:
            user_id: User ID of the sender
            email_id: ID of the email to forward
            to: List of recipient email addresses
            additional_comment: Optional comment to add to the forwarded email
            provider: Email provider (gmail or outlook)
            
        Returns:
            Dict with operation result
        """
        try:
            agent = EmailTools._get_email_agent(user_id)
            result = agent.forward_email(
                email_content={"email_id": email_id},
                recipients=to,
                additional_comment=additional_comment,
                provider=provider
            )
            
            if not result.get("success", False):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to forward email")
                }
                
            return {
                "success": True,
                "data": {
                    "message_id": result.get("message_id"),
                    "thread_id": result.get("thread_id")
                }
            }
        except Exception as e:
            logger.error(f"Error forwarding email: {str(e)}")
            return {
                "success": False,
                "error": f"Error forwarding email: {str(e)}"
            }
    
    @staticmethod
    def move_email_to_folder(user_id: str, email_id: str, folder: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Move an email to a specific folder.
        
        Args:
            user_id: User ID of the email owner
            email_id: ID of the email to move
            folder: Destination folder name
            provider: Email provider (gmail or outlook)
            
        Returns:
            Dict with operation result
        """
        try:
            agent = EmailTools._get_email_agent(user_id)
            result = agent.move_email(
                email_id=email_id,
                destination_folder=folder,
                provider=provider
            )
            
            if not result.get("success", False):
                return {
                    "success": False,
                    "error": result.get("error", "Failed to move email")
                }
                
            return {
                "success": True,
                "data": {
                    "email_id": email_id,
                    "destination_folder": folder
                }
            }
        except Exception as e:
            logger.error(f"Error moving email: {str(e)}")
            return {
                "success": False,
                "error": f"Error moving email: {str(e)}"
            }
    
    @staticmethod
    def retrieve_conversation_history(user_id: str, conversation_id: str) -> Dict[str, Any]:
        """
        Retrieve the history of a conversation thread.
        
        Args:
            user_id: User ID of the conversation owner
            conversation_id: ID of the conversation to retrieve
            
        Returns:
            Dict with conversation history
        """
        try:
            agent = EmailTools._get_email_agent(user_id)
            emails = agent.retrieve_conversation_history(conversation_id, user_id)
            
            if not emails:
                return {
                    "success": True,
                    "data": {
                        "conversation_id": conversation_id,
                        "emails": []
                    }
                }
            
            # Format the conversation for better readability
            formatted_conversation = agent.format_conversation_for_context(emails)
            
            return {
                "success": True,
                "data": {
                    "conversation_id": conversation_id,
                    "emails": emails,
                    "formatted_conversation": formatted_conversation
                }
            }
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {str(e)}")
            return {
                "success": False,
                "error": f"Error retrieving conversation history: {str(e)}"
            }
