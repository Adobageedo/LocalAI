"""
Email Agent
==========

Core module for intelligent email processing and response generation.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
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
        Initialize the EmailAgent.
        
        Args:
            user_id: The ID of the user for whom actions are being executed
            email_manager: Manager for accessing email data from the database
        """
        self.user_id = user_id
        self.email_manager = email_manager
        
        # Initialize provider-specific email handlers
        self.gmail_handler = GoogleEmail(user_id)
        self.microsoft_handler = MicrosoftEmail(user_id)
        
        # Provider handlers for email operations
        self.provider_handlers = {
            "gmail": self.gmail_handler,
            "google_email": self.gmail_handler,  # For backward compatibility
            "outlook": self.microsoft_handler,
            "microsoft_email": self.microsoft_handler
        }
        
        # Cache for writing style guidance to improve performance
        self._style_guidance_cache = {}  # Format: {user_id_provider: {"style": {...}, "timestamp": unix_time}}
        self._cache_expiry = 30 * 24 * 60 * 60  # 30 days in seconds
        
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
    
    def retrieve_user_writing_style(self, provider: str) -> Dict[str, Any]:
        """
        Analyze the user's writing style from their sent emails.
        
        This method retrieves sent emails from the specified provider and analyzes
        various aspects of the user's writing style including:
        - Greeting style
        - Closing style
        - Formality level
        - Sentence length
        - Emoji usage
        - Punctuation style
        - Capitalization preferences
        - Paragraph structure
        - Common phrases
        
        Args:
            provider: Email provider (gmail, outlook, etc.)
            
        Returns:
            Dictionary containing writing style features
        """
        if not self.user_id:
            logger.warning("No user_id provided for writing style analysis")
            return {}
            
        try:
            # Check if we have cached style guidance for this user and provider
            cache_key = f"{self.user_id}_{provider}"
            current_time = datetime.now().timestamp()
            
            if (cache_key in self._style_guidance_cache and 
                current_time - self._style_guidance_cache[cache_key]["timestamp"] < self._cache_expiry):
                logger.info(f"Using cached writing style for user {self.user_id} with provider {provider}")
                return self._style_guidance_cache[cache_key]["style"]
            
            # Get the appropriate handler for the provider
            email_handler = self.provider_handlers.get(provider.lower())
            if not email_handler:
                logger.warning(f"Unknown email provider: {provider}")
                return {}
                           
            # Retrieve sent emails (up to 100)
            sent_emails = email_handler.get_sent_emails(limit=100)
            
            if not sent_emails:
                logger.warning(f"No sent emails found for user {self.user_id} with provider {provider}")
                return {}
            
            # Initialize style features
            style_features = {
                "greeting_style": [],
                "closing_style": [],
                "formality": "neutral",  # Default
                "avg_sentence_length": 0,
                "emoji_usage": "none",  # Default
                "punctuation": "standard",  # Default
                "capitalization": "standard",  # Default
                "paragraph_length": "medium",  # Default
                "common_phrases": []
            }
            
            # Analyze emails for style features
            total_sentences = 0
            sentence_count = 0
            emoji_count = 0
            exclamation_count = 0
            all_text = ""
            
            # Regular expressions for analysis
            import re
            greeting_pattern = re.compile(r'^(hi|hello|hey|dear|good morning|good afternoon|good evening|greetings).*?[,\s]', re.IGNORECASE)
            closing_pattern = re.compile(r'(regards|sincerely|best|thanks|thank you|cheers|yours|warm regards|best wishes|cordially|respectfully)[,\s]*(.*?)$', re.IGNORECASE)
            emoji_pattern = re.compile(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F700-\U0001F77F\U0001F780-\U0001F7FF\U0001F800-\U0001F8FF\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF\U00002702-\U000027B0\U000024C2-\U0001F251]+')
            sentence_pattern = re.compile(r'[.!?]+\s+')
            
            # Process each email
            for email in sent_emails:
                content = email.get('body', '')  # Use 'body' instead of 'content' to match the email structure
                if not content:
                    continue
                    
                # Extract greeting
                greeting_match = greeting_pattern.search(content.lower().strip())
                if greeting_match:
                    greeting = greeting_match.group(0).strip()
                    if greeting and greeting not in style_features["greeting_style"]:
                        style_features["greeting_style"].append(greeting)
                
                # Extract closing
                closing_match = closing_pattern.search(content.lower().strip())
                if closing_match:
                    closing = closing_match.group(0).strip()
                    if closing and closing not in style_features["closing_style"]:
                        style_features["closing_style"].append(closing)
                
                # Count sentences and calculate average length
                sentences = sentence_pattern.split(content)
                for sentence in sentences:
                    if len(sentence.strip()) > 0:
                        total_sentences += len(sentence.strip().split())
                        sentence_count += 1
                
                # Count emojis
                emojis = emoji_pattern.findall(content)
                emoji_count += len(emojis)
                
                # Count exclamation marks for enthusiasm
                exclamation_count += content.count('!')
                
                # Append to all text for further analysis
                all_text += " " + content
            
            # Calculate average sentence length
            if sentence_count > 0:
                style_features["avg_sentence_length"] = total_sentences / sentence_count
            
            # Determine emoji usage
            if emoji_count == 0:
                style_features["emoji_usage"] = "none"
            elif emoji_count < 5:
                style_features["emoji_usage"] = "rare"
            elif emoji_count < 20:
                style_features["emoji_usage"] = "moderate"
            else:
                style_features["emoji_usage"] = "frequent"
            
            # Determine formality based on greetings, closings, and exclamations
            formal_indicators = ['dear', 'sincerely', 'regards', 'respectfully']
            informal_indicators = ['hey', 'hi', 'thanks', 'cheers']
            
            formal_count = 0
            informal_count = 0
            
            for indicator in formal_indicators:
                formal_count += all_text.lower().count(indicator)
                
            for indicator in informal_indicators:
                informal_count += all_text.lower().count(indicator)
                
            if formal_count > informal_count * 2:
                style_features["formality"] = "formal"
            elif informal_count > formal_count * 2:
                style_features["formality"] = "informal"
            else:
                style_features["formality"] = "neutral"
            
            # Determine punctuation style
            if exclamation_count > 10:
                style_features["punctuation"] = "expressive"
            else:
                style_features["punctuation"] = "standard"
            
            # Extract common phrases (3-5 word sequences)
            words = re.findall(r'\b\w+\b', all_text.lower())
            phrases = {}
            for i in range(len(words) - 2):
                phrase = ' '.join(words[i:i+3])
                if phrase not in phrases:
                    phrases[phrase] = 0
                phrases[phrase] += 1
            
            # Get top phrases
            common_phrases = sorted(phrases.items(), key=lambda x: x[1], reverse=True)[:5]
            style_features["common_phrases"] = [phrase for phrase, count in common_phrases if count > 1]
            
            # Cache the style guidance
            self._style_guidance_cache[cache_key] = {
                "style": style_features,
                "timestamp": current_time
            }
            logger.info(f"Cached writing style for user {self.user_id} with provider {provider}")
            
            return style_features
            
        except Exception as e:
            logger.error(f"Error analyzing writing style: {str(e)}")
            return {}
    
    def generate_email_response(
        self, 
        email: Dict[str, Any], 
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        use_rag: bool = False,
        temperature: float = 0.7,
        metadata_filter: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a response to an email using LLM, optionally enhanced with RAG.
        
        Args:
            email: The latest email to respond to
            conversation_history: Optional list of previous emails in the conversation
            use_rag: Whether to use RAG to enhance the response
            temperature: Temperature for LLM generation (higher = more creative)
            metadata_filter: Optional filter for RAG document retrieval
            user_id: User ID for document collection filtering
            provider: Email provider (gmail, outlook, etc.) for writing style analysis
            
        Returns:
            Dict with generated response text and metadata
        """
        try:
            # Format conversation history if provided
            formatted_history = ""
            if conversation_history:
                formatted_history = self.format_conversation_for_context(conversation_history)
            
            # Create prompt for email response
            prompt = self._create_email_response_prompt(email, "reply", formatted_history, provider)
            
            # Generate response using RAG if requested
            if use_rag:
                result = get_rag_response_modular(
                    question=prompt,
                    use_retrieval=True,
                    temperature=temperature,
                    metadata_filter=metadata_filter,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            else:
                result = get_rag_response_modular(
                    question=prompt,
                    use_retrieval=False,
                    temperature=temperature,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            
            # Extract subject and body from the response
            components = self.extract_email_components(response)
            
            return {
                "response": response,
                "subject": components.get("subject", f"Re: {email.get('subject', '')}"),
                "body": components.get("body", ""),
                "recipients": [email.get("sender", "")],
                "cc": []
            }
        except Exception as e:
            logger.error(f"Error generating email response: {str(e)}")
            return {
                "response": f"Error generating response: {str(e)}",
                "subject": f"Re: {email.get('subject', '')}",
                "body": "",
                "recipients": [email.get("sender", "")],
                "cc": []
            }
    
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
        Legacy method for backward compatibility.
        Redirects to generate_email_response.
        """
        return self.generate_email_response(
            email=email,
            conversation_history=conversation_history,
            use_rag=use_rag,
            temperature=temperature,
            metadata_filter=metadata_filter,
            user_id=user_id,
            provider=None  # No provider specified in legacy method
        )
    
    def _create_email_response_prompt(
        self, 
        email_data: Dict[str, Any], 
        action: str,
        conversation_history: str = "",
        provider: Optional[str] = None
    ) -> str:
        """
        Create a prompt for email response generation.
        
        Args:
            email_data: The email to respond to
            action: Type of action (reply, forward, etc.)
            conversation_history: Formatted conversation history
            provider: Email provider for writing style analysis
            
        Returns:
            Prompt for the LLM
        """
        # Extract email fields
        sender = email_data.get('sender', '')
        recipients = ', '.join(email_data.get('recipients', []))
        subject = email_data.get('subject', '')
        body = email_data.get('body', '')
        
        # Get writing style guidance if provider is specified
        style_guidance = ""
        if provider:
            try:
                writing_style = self.retrieve_user_writing_style(provider)
                if writing_style:
                    # Format writing style guidance for the LLM
                    greeting_examples = ", ".join(writing_style.get("greeting_style", []))
                    closing_examples = ", ".join(writing_style.get("closing_style", []))
                    common_phrases = ", ".join(writing_style.get("common_phrases", []))
                    
                    style_guidance = f"""
WRITING STYLE GUIDANCE:
Please emulate the user's typical writing style with these characteristics:
- Greeting style: {greeting_examples if greeting_examples else "Standard professional greeting"}
- Closing style: {closing_examples if closing_examples else "Standard professional closing"}
- Formality level: {writing_style.get("formality", "neutral")}
- Sentence length: {writing_style.get("avg_sentence_length", "medium")} words on average
- Emoji usage: {writing_style.get("emoji_usage", "none")}
- Punctuation style: {writing_style.get("punctuation", "standard")}
- Common phrases: {common_phrases if common_phrases else "No specific phrases identified"}

Your response should sound natural and match the user's typical communication style.
"""
            except Exception as e:
                logger.error(f"Error retrieving writing style: {str(e)}")
        # Create different prompts based on the action type
        if action.lower() == "forward":
            prompt = f"""
You are an intelligent email assistant tasked with drafting a professional forward of the following email:
FROM: {sender}
TO: {recipients}
SUBJECT: {subject}
---
{body}

{conversation_history}

{style_guidance}

Please draft a brief introduction for forwarding this email. Your introduction should:
1. Explain why this email is being forwarded
2. Provide any necessary context for the recipients
3. Be concise and professional

Include a subject line prefixed with "Subject:" (typically "Fwd: {subject}") and the body of your introduction after that.
Do not include the original email in your response as it will be automatically appended.
"""
        else:
            prompt = f"""
You are an intelligent email assistant tasked with drafting a professional {action} to the following email:
FROM: {sender}
TO: {recipients}
SUBJECT: {subject}
---
{body}

{conversation_history}

{style_guidance}

Please draft a complete, professional {action} that addresses the content of the email appropriately.
Include a subject line prefixed with "Subject:" and the body of the email after that.
"""
        return prompt
    
    def generate_new_email(
        self,
        prompt: str,
        recipients: Optional[List[str]] = None,
        cc: Optional[List[str]] = None,
        use_rag: bool = False,
        temperature: float = 0.7,
        metadata_filter: Optional[Dict[str, Any]] = None,
        provider: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a new email from scratch based on a user prompt.
        
        Args:
            prompt: User's instructions for the email
            recipients: List of email addresses for recipients
            cc: List of email addresses for CC
            use_rag: Whether to use RAG to enhance the email
            temperature: Temperature for LLM generation (higher = more creative)
            metadata_filter: Optional filter for RAG document retrieval
            provider: Email provider (gmail, outlook, etc.) for writing style analysis
            user_id: User ID for document collection filtering
            
        Returns:
            Dict with generated email text and metadata
        """
        try:
            # Prepare recipient information
            recipient_str = ", ".join(recipients) if recipients else ""
            cc_str = ", ".join(cc) if cc else ""
            
            # Get writing style guidance if provider is specified
            style_guidance = ""
            if provider:
                try:
                    writing_style = self.retrieve_user_writing_style(provider)
                    if writing_style:
                        # Format writing style guidance for the LLM
                        greeting_examples = ", ".join(writing_style.get("greeting_style", []))
                        closing_examples = ", ".join(writing_style.get("closing_style", []))
                        common_phrases = ", ".join(writing_style.get("common_phrases", []))
                        
                        style_guidance = f"""
WRITING STYLE GUIDANCE:
Please emulate the user's typical writing style with these characteristics:
- Greeting style: {greeting_examples if greeting_examples else "Standard professional greeting"}
- Closing style: {closing_examples if closing_examples else "Standard professional closing"}
- Formality level: {writing_style.get("formality", "neutral")}
- Sentence length: {writing_style.get("avg_sentence_length", "medium")} words on average
- Emoji usage: {writing_style.get("emoji_usage", "none")}
- Punctuation style: {writing_style.get("punctuation", "standard")}
- Common phrases: {common_phrases if common_phrases else "No specific phrases identified"}

Your response should sound natural and match the user's typical communication style.
"""
                except Exception as e:
                    logger.error(f"Error retrieving writing style: {str(e)}")
            # Create prompt for email generation
            email_prompt = f"""
You are an intelligent email assistant tasked with drafting a professional email based on the following instructions:

INSTRUCTIONS: {prompt}

RECIPIENTS: {recipient_str}
CC: {cc_str}

{style_guidance}

Please draft a complete, professional email that follows the instructions.
Include a subject line prefixed with "Subject:" and the body of the email after that.
"""
            
            # Generate email using RAG if requested
            if use_rag:
                result = get_rag_response_modular(
                    question=email_prompt,
                    use_retrieval=True,
                    temperature=temperature,
                    metadata_filter=metadata_filter,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            else:
                result = get_rag_response_modular(
                    question=email_prompt,
                    use_retrieval=False,
                    temperature=temperature,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            
            # Extract subject and body from the response
            components = self.extract_email_components(response)
            
            return {
                "response": response,
                "subject": components.get("subject", ""),
                "body": components.get("body", ""),
                "recipients": recipients or [],
                "cc": cc or []
            }
        except Exception as e:
            logger.error(f"Error generating new email: {str(e)}")
            return {
                "response": f"Error generating email: {str(e)}",
                "subject": "",
                "body": "",
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
            email_id = email.get("conversation_id", "") or email.get("email_id", "")
            if not email_id:
                return {"success": False, "error": "No email ID provided"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
            
            # Optional CC recipients if present in the email data
            cc = email.get("cc", [])
            include_original = email.get("include_original", True)
            
            # Reply to the email using the appropriate handler
            result = handler.reply_to_email(
                email_id=email_id,
                body=content,
                cc=cc,
                include_original=include_original
            )
            
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

            
    def generate_forward_content(
        self,
        email: Dict[str, Any],
        recipients: List[str],
        use_rag: bool = False,
        temperature: float = 0.7,
        metadata_filter: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content for forwarding an email using LLM, optionally enhanced with RAG.
        
        Args:
            email: The email to forward
            recipients: List of recipient email addresses
            use_rag: Whether to use RAG to enhance the forward content
            temperature: Temperature for LLM generation (higher = more creative)
            metadata_filter: Optional filter for RAG document retrieval
            user_id: User ID for document collection filtering
            provider: Email provider (gmail, outlook, etc.) for writing style analysis
            
        Returns:
            Dict with generated forward content and metadata
        """
        try:
            # Create prompt for email forwarding
            prompt = self._create_email_response_prompt(email, "forward", "", provider)
            
            # Add recipient context to the prompt
            recipient_context = f"\nYou are forwarding this email to: {', '.join(recipients)}"
            prompt += recipient_context
            prompt += "\n\nPlease include a brief introduction explaining why you're forwarding this email and any context the recipients should know."
            
            # Generate content using RAG if requested
            if use_rag:
                result = get_rag_response_modular(
                    question=prompt,
                    use_retrieval=True,
                    temperature=temperature,
                    metadata_filter=metadata_filter,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            else:
                result = get_rag_response_modular(
                    question=prompt,
                    use_retrieval=False,
                    temperature=temperature,
                    user_id=user_id or self.user_id
                )
                response = result.get("answer", "")
            
            # Extract subject and body from the response
            components = self.extract_email_components(response)
            
            return {
                "response": response,
                "subject": components.get("subject", f"Fwd: {email.get('subject', '')}"),
                "body": components.get("body", ""),
                "recipients": recipients,
                "cc": []
            }
        except Exception as e:
            logger.error(f"Error generating forward content: {str(e)}")
            return {
                "response": f"Error generating forward content: {str(e)}",
                "subject": f"Fwd: {email.get('subject', '')}",
                "body": "",
                "recipients": recipients,
                "cc": []
            }

    def forward_email(
        self,
        email_content: Dict[str, Any],
        recipients: List[str],
        additional_comment: Optional[str] = None,
        provider: Optional[str] = None,
        use_llm: bool = True,
        use_rag: bool = False,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Forward an email to new recipients, optionally using LLM to generate forwarding content.
        
        Args:
            email_content: Dictionary containing the email data to forward
            recipients: List of recipient email addresses
            additional_comment: Optional comment to add before the forwarded content
            provider: Email provider (gmail, outlook, etc.)
            use_llm: Whether to use LLM to generate forwarding content
            use_rag: Whether to use RAG to enhance the forward content (only if use_llm is True)
            temperature: Temperature for LLM generation (higher = more creative)
            
        Returns:
            Dict with details of the forwarded email
        """
        try:
            if not provider:
                return {"success": False, "error": "Email provider not specified"}
                
            email_id = email_content.get("conversation_id", "") or email_content.get("email_id", "")
            if not email_id:
                return {"success": False, "error": "No email ID provided"}
                
            # Get the appropriate handler for the provider
            handler = self.provider_handlers.get(provider.lower())
            if not handler:
                return {"success": False, "error": f"Unsupported email provider: {provider}"}
            
            # If using LLM to generate forwarding content
            if use_llm:
                try:
                    # Generate forwarding content using LLM
                    generated_content = self.generate_forward_content(
                        email=email_content,
                        recipients=recipients,
                        use_rag=use_rag,
                        temperature=temperature,
                        provider=provider
                    )
                    
                    # Use the generated content as the additional comment
                    additional_comment = generated_content.get("body", "")
                    
                    logger.info(f"Successfully generated forwarding content using LLM")
                except Exception as e:
                    logger.error(f"Error generating forwarding content with LLM: {str(e)}")
                    # Continue with the original additional_comment if LLM generation fails
                
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
    
def _clear_expired_cache(self):
    """
    Clear expired items from the writing style cache
    """
    current_time = datetime.now().timestamp()
    expired_keys = []
    
    for key, cache_data in self._style_guidance_cache.items():
        if current_time - cache_data["timestamp"] >= self._cache_expiry:
            expired_keys.append(key)
            
    for key in expired_keys:
        del self._style_guidance_cache[key]
        
    if expired_keys:
        logger.info(f"Cleared {len(expired_keys)} expired cache entries")

def main():
    """
    Test the EmailAgent functionality for both Gmail and Outlook providers.
    
    This function demonstrates core email operations:
    1. Authentication
    2. Sending emails
    3. Creating drafts
    4. Sending drafts
    5. Replying to emails
    6. Forwarding emails
    7. Flagging emails
    8. Moving emails
    
    Note: Replace placeholders with actual test values before running.
    """
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Test configuration - REPLACE WITH ACTUAL VALUES
    TEST_RECIPIENT = "luigigenissel@gmail.com"
    TEST_EMAIL_ID = "197c0b924617e725"
    email_manager = EmailManager()
    print("\n===== Testing Gmail Provider =====")
    gmail_agent = EmailAgent('gmail', email_manager)
    
    # Test authentication
    auth_result = True
    if not auth_result:
        print("Skipping Gmail tests due to authentication failure")
    else:
        # Test sending email
        send_result = gmail_agent.send_email(
            subject="Test Email from GmailAgent",
            body="This is a test email from GmailAgent",
            recipients=[TEST_RECIPIENT],
            provider='gmail'
        )
        print(f"Send Result: {send_result}")
        
        # Test replying to email
        reply_result = gmail_agent.reply_to_email(
            content="This is a test reply",
            provider='gmail',
            email={"email_id": TEST_EMAIL_ID}
        )
        print(f"Reply Result: {reply_result}")
        
        # Test forwarding email with LLM-generated content
        forward_result = gmail_agent.forward_email(
            email_content={"email_id": TEST_EMAIL_ID, "subject": "Original test email", "body": "This is the content of the original email to forward.", "sender": "original@example.com"},
            recipients=[TEST_RECIPIENT],
            provider='gmail',
            use_llm=True,
            use_rag=False,
            temperature=0.7
        )
        print(f"Forward Result with LLM: {forward_result}")
        
        # Test forwarding email without LLM
        forward_result_no_llm = gmail_agent.forward_email(
            email_content={"email_id": TEST_EMAIL_ID},
            recipients=[TEST_RECIPIENT],
            provider='gmail',
            use_llm=False,
            additional_comment="Forwarding this email for your information."
        )
        print(f"Forward Result without LLM: {forward_result_no_llm}")
        
        # Test flagging email
        flag_result = gmail_agent.update_email_flags(
            email_id=TEST_EMAIL_ID,
            mark_read=True,
            provider='gmail'
        )
        print(f"Flag Result: {flag_result}")
        
        # Test moving email
        move_result = gmail_agent.move_email(
            email_id=TEST_EMAIL_ID,
            destination_folder="Archive",
            provider='gmail'
        )
        print(f"Move Result: {move_result}")
    
    print("\n===== Testing Outlook Provider =====")
    outlook_agent = EmailAgent('outlook', email_manager)
    TEST_EMAIL_ID = "AQMkADAwATNiZmYAZS05NjM5LTlhMzAtMDACLTAwCgBGAAADfUkpWxw_xUa6Wf-obpcQsgcAmAM5xqpJYUO9Tf7tkZqlnQAAAgEMAAAAmAM5xqpJYUO9Tf7tkZqlnQAAACuLtOcAAAA="
    # Test authentication
    auth_result = True
    if not auth_result:
        print("Skipping Outlook tests due to authentication failure")
    else:
        # Test sending email
        send_result = outlook_agent.send_email(
            subject="Test Email from OutlookAgent",
            body="This is a test email from OutlookAgent",
            recipients=[TEST_RECIPIENT],
            provider='outlook'
        )
        print(f"Send Result: {send_result}")
                
        # Test replying to email
        reply_result = outlook_agent.reply_to_email(
            content="This is a test reply",
            provider='outlook',
            email={"email_id": TEST_EMAIL_ID}
        )
        print(f"Reply Result: {reply_result}")
        
        # Test forwarding email with LLM-generated content
        forward_result = outlook_agent.forward_email(
            email_content={"email_id": TEST_EMAIL_ID, "subject": "Original test email", "body": "This is the content of the original email to forward.", "sender": "original@example.com"},
            recipients=[TEST_RECIPIENT],
            provider='outlook',
            use_llm=True,
            use_rag=False,
            temperature=0.7
        )
        print(f"Forward Result with LLM: {forward_result}")
        
        # Test forwarding email without LLM
        forward_result_no_llm = outlook_agent.forward_email(
            email_content={"email_id": TEST_EMAIL_ID},
            recipients=[TEST_RECIPIENT],
            provider='outlook',
            use_llm=False,
            additional_comment="Forwarding this email for your information."
        )
        print(f"Forward Result without LLM: {forward_result_no_llm}")
        
        # Test flagging email
        flag_result = outlook_agent.update_email_flags(
            email_id=TEST_EMAIL_ID,
            mark_read=True,
            provider='outlook'
        )
        print(f"Flag Result: {flag_result}")
        
        # Test moving email
        move_result = outlook_agent.move_email(
            email_id=TEST_EMAIL_ID,
            destination_folder="Archive",
            provider='outlook'
        )
        print(f"Move Result: {move_result}")

if __name__ == "__main__":
    main()
