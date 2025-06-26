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
        rag_response = None
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
                rag_response = rag_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating RAG response: {e}")
                rag_response = f"[Error generating RAG-enhanced response: {str(e)}]"
        
        # Generate standard response (without RAG)
        standard_response = None
        try:
            standard_result = get_rag_response_modular(
                question=prompt,
                temperature=temperature,
                use_retrieval=False,
                conversation_history=formatted_history
            )
            standard_response = standard_result.get("answer", "")
        except Exception as e:
            logger.error(f"Error generating standard response: {e}")
            standard_response = f"[Error generating standard response: {str(e)}]"
        
        # Return both responses
        return {
            "standard_response": standard_response,
            "rag_response": rag_response if use_rag else None
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
        rag_response = None
        if use_rag:
            try:
                rag_result = get_rag_response_modular(
                    question=email_prompt,
                    metadata_filter=metadata_filter,
                    user_id=user_id,
                    temperature=temperature,
                    use_retrieval=True
                )
                rag_response = rag_result.get("answer", "")
            except Exception as e:
                logger.error(f"Error generating RAG response: {e}")
                rag_response = f"[Error generating RAG-enhanced email: {str(e)}]"
        
        # Generate standard response (without RAG)
        standard_response = None
        try:
            standard_result = get_rag_response_modular(
                question=email_prompt,
                temperature=temperature,
                use_retrieval=False
            )
            standard_response = standard_result.get("answer", "")
        except Exception as e:
            logger.error(f"Error generating standard response: {e}")
            standard_response = f"[Error generating standard email: {str(e)}]"
        
        # Return both responses and recipient info
        return {
            "standard_response": standard_response,
            "rag_response": rag_response if use_rag else None,
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
