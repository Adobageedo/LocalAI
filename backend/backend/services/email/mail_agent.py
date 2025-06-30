"""
Email Agent
==========

Core module for intelligent email processing and response generation.
"""

import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from backend.services.db.email_manager import EmailManager
from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log
from backend.core.config import CONFIG
from backend.services.auth.google_auth import GoogleEmail
from backend.services.auth.microsoft_auth import MicrosoftEmail

# Setup logger
logger = log.bind(name="backend.services.email.agent")

class EmailAgent:
    """
    Intelligent agent for processing emails and generating responses.
    
    This agent can:
    - Retrieve conversation history
    - Generate context-aware email responses
    - Use RAG for information retrieval to enhance responses
    - Compare RAG-enhanced vs. standard LLM responses
    - Handle emails across different providers (Gmail, Outlook) through a unified interface
    """
    
    def __init__(self, user_id: str, email_manager: EmailManager):
        """
        Initialize the email agent.
        
        Args:
            user_id: The ID of the user for whom actions are being executed
            email_manager: Manager for accessing email data from the database
        """
        self.user_id = user_id
        self.email_manager = email_manager
        
        # Initialize provider-specific email handlers
        self.gmail_handler = GoogleEmail(user_id)
        self.microsoft_handler = MicrosoftEmail(user_id)
        
        # Provider mapping for easy dispatch
        self.provider_handlers = {
            "gmail": self.gmail_handler,
            "google_email": self.gmail_handler,  # For backward compatibility
            "outlook": self.microsoft_handler,
            "microsoft_email": self.microsoft_handler
        }
        
    def retrieve_conversation_history(self, conversation_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all emails in a conversation thread and sort by timestamp.
        
        Args:
            conversation_id: The ID of the conversation/thread
            user_id: Optional user ID to filter by user
            
        Returns:
            List of emails in chronological order
        """
        try:
            emails = self.email_manager.get_emails_by_conversation(conversation_id, user_id)
            # Sort by sent_date (should already be sorted from the query, but ensuring here)
            emails.sort(key=lambda x: x.get('sent_date', ''))
            return emails
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []
    
    def format_conversation_for_context(self, emails: List[Dict[str, Any]]) -> str:
        """
        Format a list of emails into a conversation context string for the LLM.
        
        Args:
            emails: List of email dictionaries
            
        Returns:
            Formatted conversation history as a string
        """
        if not emails:
            return ""
            
        formatted_conversation = []
        
        for email in emails:
            # Format each email in a clear way for the LLM
            timestamp = email.get('sent_date', '')
            if isinstance(timestamp, str):
                try:
                    # Try to parse ISO format string
                    dt = datetime.fromisoformat(timestamp)
                    timestamp = dt.strftime("%Y-%m-%d %H:%M")
                except:
                    pass
                    
            email_text = f"""
FROM: {email.get('sender', '')}
TO: {', '.join(email.get('recipients', []))}
DATE: {timestamp}
SUBJECT: {email.get('subject', '')}
---
{email.get('body', '')}
"""
            formatted_conversation.append(email_text)
            
        # Join all email texts with a separator
        return "\n\n" + "-"*40 + " PREVIOUS MESSAGES " + "-"*40 + "\n\n" + "\n\n" + "-"*80 + "\n\n".join(formatted_conversation)
    
    def generate_response(
        self, 
        email: Dict[str, Any], 
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        use_rag: bool = False,
        user_id: Optional[str] = None,
        temperature: float = 0.7,
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Generate a response to an email using LLM, optionally enhanced with RAG.
        
        Args:
            email: The latest email to respond to
            conversation_history: Optional list of previous emails in the conversation
            use_rag: Whether to use RAG to enhance the response
            user_id: User ID for document collection filtering
            temperature: LLM temperature
            metadata_filter: Optional filter for document retrieval
            
        Returns:
            Dict containing generated response with and without RAG
        """
        # Format the conversation history
        formatted_history = ""
        if conversation_history:
            formatted_history = self.format_conversation_for_context(conversation_history)
        
        # Create the prompt for the LLM
        prompt = self._create_email_response_prompt(email, formatted_history)
        
        # Generate response with RAG if requested
        response = None
        if use_rag:
            try:
                rag_result = get_rag_response_modular(
                    question=prompt,
                    metadata_filter=metadata_filter,
                    user_id=user_id,
                    temperature=temperature,
                    use_retrieval=True,
                    conversation_history=formatted_history
                )
                response = rag_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating RAG response: {str(e)}")
                response = f"[Error generating RAG-enhanced response: {str(e)}]"
        else:
            try:
                standard_result = get_rag_response_modular(
                    question=prompt,
                    temperature=temperature,
                    use_retrieval=False,
                    conversation_history=formatted_history
                )
                response = standard_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating standard response: {str(e)}")
                response = f"[Error generating standard response: {str(e)}]"
        
        # Extract components from the response
        components = self.extract_email_components(response)
        
        # Return both responses and components
        return {
            "response": response,
            "subject": components.get("subject", f"Re: {email.get('subject', '')}"),
            "body": components.get("body", ""),
            "recipients": [email.get("sender", "")],  # Reply to sender by default
            "cc": []  # No CC by default for replies
        }
    
    def _create_email_response_prompt(self, email: Dict[str, Any], conversation_history: str = "") -> str:
        """
        Create a prompt for email response generation.
        
        Args:
            email: The email to respond to
            conversation_history: Formatted conversation history
            
        Returns:
            Prompt for the LLM
        """
        sender = email.get('sender', '')
        subject = email.get('subject', '')
        body = email.get('body', '')
        recipients = ', '.join(email.get('recipients', []))
        
        # Create email-specific prompt
        prompt = f"""
You are an intelligent email assistant tasked with drafting a professional response to the following email:

FROM: {sender}
TO: {recipients}
SUBJECT: {subject}
---
{body}

{conversation_history}

Please draft a clear, concise, and professional response that:
1. Addresses the key points in the email
2. Maintains an appropriate professional tone
3. Includes a proper greeting and sign-off
4. Focuses only on the most relevant information

Your response should be formatted as a complete email ready to send.
"""
        return prompt
    
    def generate_new_email(
        self,
        user_id: str,
        prompt: str,
        recipients: Optional[List[str]] = None,
        cc: Optional[List[str]] = None,
        use_rag: bool = False,
        temperature: float = 0.7,
        metadata_filter: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Generate a new email from scratch based on a user prompt.
        
        Args:
            user_id: User ID
            prompt: User's instructions for the email
            recipients: List of email addresses for recipients
            cc: List of email addresses for CC
            use_rag: Whether to use RAG to enhance the response
            temperature: LLM temperature
            metadata_filter: Optional filter for document retrieval
            
        Returns:
            Dict containing generated email with and without RAG
        """
        # Create recipient information for the prompt
        recipient_info = ""
        if recipients:
            recipient_info += f"\nTO: {', '.join(recipients)}"
        if cc:
            recipient_info += f"\nCC: {', '.join(cc)}"
            
        # Create the prompt
        email_prompt = f"""
You are an intelligent email assistant tasked with drafting a new email based on the following instructions:

INSTRUCTIONS:{recipient_info}
{prompt}

Please draft a clear, concise, and professional email that:
1. Addresses all points mentioned in the instructions
2. Maintains an appropriate professional tone
3. Includes a proper subject line, greeting, and sign-off
4. Focuses only on the most relevant information
5. Is addressed to the specified recipients{' and CC recipients' if cc else ''}

Your response should be formatted as a complete email ready to send, including a SUBJECT line.
"""
        
        # Generate response with RAG if requested
        response = None
        if use_rag:
            try:
                rag_result = get_rag_response_modular(
                    question=email_prompt,
                    metadata_filter=metadata_filter,
                    user_id=user_id,
                    temperature=temperature,
                    use_retrieval=True
                )
                response = rag_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating RAG response: {e}")
                response = f"[Error generating RAG-enhanced email: {str(e)}]"
        else:
            try:
                standard_result = get_rag_response_modular(
                    question=email_prompt,
                    temperature=temperature,
                    use_retrieval=False
                )
                response = standard_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating standard response: {e}")
                response = f"[Error generating standard email: {str(e)}]"
        
        # Return both responses and recipient info
        return {
            "response": response,
            "recipients": recipients or [],
            "cc": cc or []
        }
        
    def extract_email_components(self, generated_email: str) -> Dict[str, str]:
        """
        Extract components (subject, body) from a generated email.
        
        Args:
            generated_email: The generated email text
            
        Returns:
            Dict with extracted components
        """
        # Default values
        result = {
            "subject": "",
            "body": generated_email
        }
        
        # Extract subject if present
        if "SUBJECT:" in generated_email:
            parts = generated_email.split("SUBJECT:", 1)
            if len(parts) > 1:
                subject_and_body = parts[1].strip()
                # Further split to separate subject from body
                subject_parts = subject_and_body.split("\n", 1)
                if len(subject_parts) > 1:
                    result["subject"] = subject_parts[0].strip()
                    result["body"] = subject_parts[1].strip()
                else:
                    result["subject"] = subject_parts[0].strip()
                    result["body"] = ""
        
        return result

    def reply_to_email(
        self,
        content: str,
        provider: str,
        email: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Reply to an email thread with generated content.
        
        Args:
            content: Content of the reply
            provider: Email provider (gmail, outlook, etc.)
            email: Email data dictionary containing necessary metadata
            
        Returns:
            Dict with details of the sent reply
        """
        try:
            email_id = email.get("email_id", "")
            if not email_id:
                return {"success": False, "error": "No email ID provided"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
            
            # Optional CC recipients if present in the email data
            cc = email.get("cc", [])
            
            # Reply to the email using the appropriate handler
            result = handler.reply_to_email(email_id=email_id, body=content, cc=cc)
            
            if result.get("success", False):
                logger.info(f"Successfully replied to email {email_id} via {provider}")
            else:
                logger.error(f"Failed to reply to email {email_id} via {provider}: {result.get('error')}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error replying to email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
            
    def forward_email(
        self,
        email_content: Dict[str, Any],
        recipients: List[str],
        additional_comment: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Forward an email to new recipients.
        
        Args:
            email_content: Dictionary containing the email data to forward
            recipients: List of recipient email addresses
            additional_comment: Optional comment to add before the forwarded content
            provider: Email provider (gmail, outlook, etc.)
            
        Returns:
            Dict with details of the forwarded email
        """
        try:
            if not provider:
                return {"success": False, "error": "Email provider not specified"}
                
            email_id = email_content.get("email_id", "")
            if not email_id:
                return {"success": False, "error": "No email ID provided"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
                
            # Forward the email using the appropriate handler
            result = handler.forward_email(
                email_id=email_id,
                recipients=recipients,
                additional_comment=additional_comment
            )
            
            if result.get("success", False):
                logger.info(f"Successfully forwarded email {email_id} to {', '.join(recipients)} via {provider}")
            else:
                logger.error(f"Failed to forward email {email_id} via {provider}: {result.get('error')}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error forwarding email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def move_email(self, email_id: str, destination_folder: str, provider: str) -> Dict[str, Any]:
        """
        Move an email to a different folder.
        
        Args:
            email_id: ID of the email to move
            destination_folder: Destination folder name
            provider: Email provider (gmail, outlook, etc.)
            
        Returns:
            Dict with success status and details
        """
        try:
            if not provider:
                return {"success": False, "error": "Email provider not specified"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
                
            # Move the email using the appropriate handler
            result = handler.move_email(email_id=email_id, destination_folder=destination_folder)
            
            if result.get("success", False):
                logger.info(f"Successfully moved email {email_id} to {destination_folder} via {provider}")
            else:
                logger.error(f"Failed to move email {email_id} via {provider}: {result.get('error')}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error moving email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def update_email_flags(self, email_id: str, flag_important: Optional[bool] = None, 
                          mark_read: Optional[bool] = None, provider: str = None) -> Dict[str, Any]:
        """
        Update flags for an email (important, read status).
        
        Args:
            email_id: ID of the email to update
            flag_important: Whether to flag the email as important
            mark_read: Whether to mark the email as read
            provider: Email provider (gmail, outlook, etc.)
            
        Returns:
            Dict with update status
        """
        try:
            if not provider:
                return {"success": False, "error": "Email provider not specified"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
                
            # Update email flags using the appropriate handler
            result = handler.flag_email(
                email_id=email_id,
                mark_important=flag_important,
                mark_read=mark_read
            )
            
            if result.get("success", False):
                logger.info(f"Successfully updated flags for email {email_id} via {provider}")
            else:
                logger.error(f"Failed to update flags for email {email_id} via {provider}: {result.get('error')}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error updating email flags: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_email(
        self, 
        subject: str,
        body: str,
        recipients: List[str],
        provider: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        html_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a new email.
        
        Args:
            subject: Email subject
            body: Email body (plain text)
            recipients: List of recipient email addresses
            provider: Email provider (gmail, outlook, etc.)
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            html_content: Optional HTML version of the email body
            
        Returns:
            Dict with details of the sent email
        """
        try:
            if not provider:
                return {"success": False, "error": "Email provider not specified"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
                
            # Send email using the appropriate handler
            result = handler.send_email(
                subject=subject,
                body=body,
                recipients=recipients,
                cc=cc,
                bcc=bcc,
                html_content=html_content
            )
            
            if result.get("success", False):
                logger.info(f"Successfully sent email with subject '{subject}' via {provider}")
            else:
                logger.error(f"Failed to send email via {provider}: {result.get('error')}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
