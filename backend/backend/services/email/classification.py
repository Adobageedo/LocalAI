"""
Email Classification
=================

Module for classifying emails and suggesting appropriate actions.
"""

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log

# Setup logger
logger = log.bind(name="backend.services.email.classification")

class EmailActionType(Enum):
    """Possible actions to take on an email."""
    REPLY = "reply"
    FORWARD = "forward"
    NEW_EMAIL = "new_email"
    NO_ACTION = "no_action"
    FLAG_IMPORTANT = "flag_important"
    ARCHIVE = "archive"
    DELETE = "delete"


class EmailPriority(Enum):
    """Priority levels for email actions."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EmailClassifier:
    """
    Classifies emails and recommends appropriate actions based on content and context.
    """
    
    def __init__(self):
        """Initialize the email classifier."""
        pass
    
    async def classify_email(
        self, 
        email_content: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Classify an email and suggest appropriate actions.
        
        Args:
            email_content: The email content (subject, body, sender, etc.)
            conversation_history: Optional previous emails in the conversation
            user_preferences: Optional user preferences for classification
            
        Returns:
            Dict with classification results including suggested actions and priority
        """
        # Format the email and conversation history for the LLM
        formatted_email = self._format_email_for_classification(email_content)
        formatted_history = self._format_history_for_classification(conversation_history) if conversation_history else ""
        
        # Create the prompt for classification
        classification_prompt = self._create_classification_prompt(
            formatted_email, 
            formatted_history,
            user_preferences
        )
        
        try:
            # Use LLM to classify with low temperature for consistency
            result = get_rag_response_modular(
                question=classification_prompt,
                use_retrieval=False,
                temperature=0.2  # Low temperature for more deterministic results
            )
            
            classification_text = result.get("answer", "")
            # Parse the LLM's response to extract structured information
            parsed_classification = self._parse_classification_response(classification_text)
            
            return parsed_classification
            
        except Exception as e:
            logger.error(f"Error classifying email: {e}")
            # Default to reply with medium priority if classification fails
            return {
                "action": EmailActionType.REPLY.value,
                "priority": EmailPriority.MEDIUM.value,
                "reasoning": f"Default classification due to error: {str(e)}",
                "suggested_response": None
            }
    
    def _format_email_for_classification(self, email: Dict[str, Any]) -> str:
        """Format a single email for classification."""
        return f"""
EMAIL DETAILS:
From: {email.get('sender', '')}
To: {', '.join(email.get('recipients', []))}
Subject: {email.get('subject', '')}
Date: {email.get('sent_date', '')}

CONTENT:
{email.get('body', '')}
"""

    def _format_history_for_classification(self, emails: List[Dict[str, Any]]) -> str:
        """Format conversation history for classification."""
        if not emails:
            return ""
            
        formatted_emails = []
        for email in emails:
            formatted = f"""
EMAIL {len(formatted_emails) + 1}:
From: {email.get('sender', '')}
To: {', '.join(email.get('recipients', []))}
Subject: {email.get('subject', '')}
Date: {email.get('sent_date', '')}
Content: {email.get('body', '')}
"""
            formatted_emails.append(formatted)
            
        return "\n\nCONVERSATION HISTORY:\n" + "\n".join(formatted_emails)
    
    def _create_classification_prompt(
        self, 
        email: str, 
        conversation_history: str = "",
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a prompt for email classification."""
        # Add user preferences if available
        preferences_text = ""
        if user_preferences:
            preferences_text = "\nUSER PREFERENCES:\n"
            for key, value in user_preferences.items():
                preferences_text += f"- {key}: {value}\n"
        
        return f"""
You are an intelligent email assistant. Analyze the following email and determine the most appropriate action to take.

{email}
{conversation_history}
{preferences_text}

Based on this information, please categorize the email and suggest an action to take.
For your response, follow this format exactly:

ACTION: [One of: reply, forward, new_email, no_action, flag_important, archive, delete]
PRIORITY: [One of: high, medium, low]
REASONING: [Briefly explain why you chose this action and priority]
SUGGESTED_RESPONSE: [A brief outline of how to respond, if applicable]

For the ACTION field, use the following guidelines:
- "reply": The email requires a direct response
- "forward": The email should be forwarded to someone else
- "new_email": A new email should be composed (not a direct reply)
- "no_action": No action needed at this time
- "flag_important": The email should be flagged for later attention
- "archive": The email can be archived
- "delete": The email can be deleted

For the PRIORITY field:
- "high": Urgent, should be handled immediately
- "medium": Important but not urgent
- "low": Can be handled when convenient
"""
    
    def _parse_classification_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM's classification response into a structured format.
        
        Args:
            response: Raw text response from LLM
            
        Returns:
            Dictionary with parsed classification data
        """
        result = {
            "action": EmailActionType.NO_ACTION.value,
            "priority": EmailPriority.MEDIUM.value,
            "reasoning": "",
            "suggested_response": None
        }
        
        # Parse action
        if "ACTION:" in response:
            action_line = response.split("ACTION:")[1].split("\n")[0].strip().lower()
            if action_line in [action.value for action in EmailActionType]:
                result["action"] = action_line
        
        # Parse priority
        if "PRIORITY:" in response:
            priority_line = response.split("PRIORITY:")[1].split("\n")[0].strip().lower()
            if priority_line in [priority.value for priority in EmailPriority]:
                result["priority"] = priority_line
        
        # Parse reasoning
        if "REASONING:" in response:
            reasoning_parts = response.split("REASONING:")[1].split("SUGGESTED_RESPONSE:")
            result["reasoning"] = reasoning_parts[0].strip()
        
        # Parse suggested response
        if "SUGGESTED_RESPONSE:" in response:
            result["suggested_response"] = response.split("SUGGESTED_RESPONSE:")[1].strip()
        
        return result


class EmailAutoProcessor:
    """
    Processes emails automatically based on classification results.
    """
    
    def __init__(self):
        """Initialize the email auto processor."""
        self.classifier = EmailClassifier()
    
    async def process_incoming_email(
        self,
        email: Dict[str, Any],
        user_id: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        user_preferences: Optional[Dict[str, Any]] = None,
        auto_respond: bool = False
    ) -> Dict[str, Any]:
        """
        Process an incoming email by classifying it and taking appropriate actions.
        
        Args:
            email: The incoming email data
            user_id: User identifier
            conversation_history: Previous emails in the conversation
            user_preferences: User preferences for email handling
            auto_respond: Whether to automatically generate responses
            
        Returns:
            Dict with processing results and recommendations
        """
        # Classify the email
        classification = await self.classifier.classify_email(
            email, 
            conversation_history,
            user_preferences
        )
        
        result = {
            "email_id": email.get("id", ""),
            "classification": classification,
            "auto_processed": False,
            "response_generated": False,
            "generated_response": None
        }
        
        # Handle based on classification
        action = classification["action"]
        
        # Auto-generate response if requested and action is 'reply'
        if auto_respond and action == EmailActionType.REPLY.value:
            # Here we could integrate with EmailAgent to generate response
            # This is a placeholder - in a real implementation, you would
            # call the appropriate method from EmailAgent
            result["response_generated"] = True
            result["generated_response"] = {
                "subject": f"Re: {email.get('subject', '')}",
                "body": "Auto-generated response placeholder.",
                "recipients": [email.get('sender', '')],
                "cc": []
            }
            
        # For high priority emails that need action, add special flags
        if classification["priority"] == EmailPriority.HIGH.value:
            result["urgent_attention_required"] = True
            
        # Return processing results
        return result
