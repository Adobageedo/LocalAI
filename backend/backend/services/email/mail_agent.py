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
from backend.services.email.gmail_actions import GmailActions

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
    """
    
    def __init__(self):
        """Initialize the email agent."""
        self.email_manager = EmailManager()
        
    async def retrieve_conversation_history(self, conversation_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all emails in a conversation thread and sort by timestamp.
        
        Args:
            conversation_id: The ID of the conversation/thread
            user_id: Optional user ID to filter by user
            
        Returns:
            List of emails in chronological order
        """
        try:
            emails = await self.email_manager.get_emails_by_conversation(conversation_id, user_id)
            # Sort by sent_date (should already be sorted from the query, but ensuring here)
            emails.sort(key=lambda x: x.get('sent_date', ''))
            return emails
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {e}")
            return []
    
    async def format_conversation_for_context(self, emails: List[Dict[str, Any]]) -> str:
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
    
    async def generate_response(
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
            formatted_history = await self.format_conversation_for_context(conversation_history)
        
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
    
    async def generate_new_email(
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

    async def reply_to_email(
        self,
        email_id: str,
        content: str,
        provider: str,
        thread_id: Optional[str] = None,
        subject: Optional[str] = None,
        recipients: Optional[List[str]] = None,
        cc: Optional[List[str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reply to an email thread with generated content.
        
        Args:
            email_id: ID of the email to reply to
            content: Content of the reply
            thread_id: Optional thread/conversation ID (will be extracted from email if not provided)
            subject: Subject line (defaults to "Re: original subject")
            recipients: List of recipients (defaults to original sender)
            cc: List of CC recipients
            user_id: User ID for the sender
            
        Returns:
            Dict with details of the sent reply
        """
        try:
            # Get the original email if needed to extract info
            original_email = None
                                
            if not subject and original_email:
                original_subject = original_email.get("subject", "")
                subject = f"Re: {original_subject}" if not original_subject.startswith("Re:") else original_subject
                
            if not recipients and original_email:
                recipients = [original_email.get("sender")]
                
            if not cc:
                cc = []
                
            # Prepare reply data
            reply_data = {
                "conversation_id": thread_id,
                "in_reply_to": email_id,
                "subject": subject,
                "body": content,
                "recipients": recipients,
                "cc": cc,
                "sent_date": datetime.now().isoformat(),
                "folder": "sent",
                "source_type": "api_generated"
            }
            
            if user_id:
                reply_data["user_id"] = user_id
            
            if provider=="google_email":
                gmail_actions = GmailActions(user_id)
                email_id = await gmail_actions.reply_to_email(email_id, content, provider, thread_id, subject, recipients, cc, user_id)
                # Store the reply in database
                #message_id = await self.email_manager.save_email(reply_data)
            
            logger.info(f"Reply to email {email_id} created with message ID {message_id}")
            
            return {
                "success": True,
                "message_id": message_id,
                "thread_id": thread_id
            }
            
        except Exception as e:
            logger.error(f"Error sending reply to email {email_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def forward_email(
        self,
        email_id: str,
        recipients: List[str],
        subject: Optional[str] = None,
        additional_comment: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Forward an email to new recipients.
        
        Args:
            email_id: ID of the email to forward
            recipients: List of recipient email addresses
            subject: Optional new subject (defaults to "Fwd: original subject")
            additional_comment: Optional comment to add before the forwarded content
            user_id: User ID for the sender
            
        Returns:
            Dict with details of the forwarded email
        """
        try:
            # Get the original email
            original_email = await self.email_manager.get_email_by_id(email_id, user_id)
            if not original_email:
                raise ValueError(f"Could not find original email with ID {email_id}")
                
            # Prepare subject
            original_subject = original_email.get("subject", "")
            if not subject:
                subject = f"Fwd: {original_subject}" if not original_subject.startswith("Fwd:") else original_subject
            
            # Prepare forwarded content
            original_body = original_email.get("body", "")
            original_sender = original_email.get("sender", "unknown")
            original_date = original_email.get("sent_date", "unknown date")
            
            # Format the forwarded content
            forwarded_content = f"""
{additional_comment if additional_comment else ""}

---------- Forwarded message ---------
From: {original_sender}
Date: {original_date}
Subject: {original_subject}

{original_body}
"""
            
            # Prepare forward data
            forward_data = {
                "subject": subject,
                "body": forwarded_content,
                "recipients": recipients,
                "cc": [],
                "sent_date": datetime.now().isoformat(),
                "folder": "sent",
                "source_type": "api_generated",
                "forwarded_from": email_id
            }
            
            if user_id:
                forward_data["user_id"] = user_id
                
            # Store the forwarded email in database
            message_id = await self.email_manager.save_email(forward_data)
            
            # Here in a real implementation, you would also send the email via API
            # For example: await self._send_via_api(forward_data) 
                
            logger.info(f"Email {email_id} forwarded with message ID {message_id}")
            
            return {
                "success": True,
                "message_id": message_id
            }
            
        except Exception as e:
            logger.error(f"Error forwarding email {email_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def update_email_flags(
        self,
        email_id: str,
        flag_important: Optional[bool] = None,
        mark_read: Optional[bool] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update flags for an email (important, read status).
        
        Args:
            email_id: ID of the email to update
            flag_important: Whether to flag the email as important
            mark_read: Whether to mark the email as read
            user_id: User ID for the email owner
            
        Returns:
            Dict with update status
        """
        try:
            # Get the original email
            original_email = await self.email_manager.get_email_by_id(email_id, user_id)
            if not original_email:
                raise ValueError(f"Could not find email with ID {email_id}")
            
            # Prepare update data
            update_data = {}
            
            # Update metadata with flags
            metadata = original_email.get("metadata", {}) or {}
            
            if flag_important is not None:
                metadata["important"] = flag_important
                logger.info(f"Email {email_id} {'flagged as important' if flag_important else 'unflagged'}")
                
            if mark_read is not None:
                metadata["read"] = mark_read
                logger.info(f"Email {email_id} {'marked as read' if mark_read else 'marked as unread'}")
                
            # Only update if there are changes
            if metadata != original_email.get("metadata", {}):
                update_data["metadata"] = metadata
                
                # Update the email in the database
                await self.email_manager.update_email(email_id, update_data, user_id)
                
                # Here in a real implementation, you would also update via API if needed
                # For example: await self._update_flags_via_api(email_id, metadata)
                
            return {
                "success": True,
                "email_id": email_id,
                "flags_updated": True if update_data else False
            }
            
        except Exception as e:
            logger.error(f"Error updating flags for email {email_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def move_email(
        self,
        email_id: str,
        destination_folder: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Move an email to a different folder (archive, trash, etc).
        
        Args:
            email_id: ID of the email to move
            destination_folder: Target folder name
            user_id: User ID for the email owner
            
        Returns:
            Dict with move status
        """
        try:
            # Get the original email
            original_email = await self.email_manager.get_email_by_id(email_id, user_id)
            if not original_email:
                raise ValueError(f"Could not find email with ID {email_id}")
                
            # Update the folder
            update_data = {
                "folder": destination_folder
            }
            
            # Update the email in the database
            await self.email_manager.update_email(email_id, update_data, user_id)
            
            # Here in a real implementation, you would also move via API if needed
            # For example: await self._move_via_api(email_id, destination_folder)
            
            logger.info(f"Email {email_id} moved to folder '{destination_folder}'")
            
            return {
                "success": True,
                "email_id": email_id,
                "destination_folder": destination_folder
            }
            
        except Exception as e:
            logger.error(f"Error moving email {email_id} to folder {destination_folder}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
