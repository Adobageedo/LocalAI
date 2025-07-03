"""
Email Classification
=================

Module for classifying emails and suggesting appropriate actions.
"""
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log
from backend.services.email.mail_agent import EmailAgent
from backend.services.db.email_manager import EmailManager
from backend.services.storage.file_registry import FileRegistry
from backend.services.db.user_preferences import UserPreferences
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
        self.user_preferences = UserPreferences()
    
    def classify_email(
        self, 
        email_content: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        user_preferences: Optional[Dict[str, Any]] = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Classify an email and suggest appropriate actions.
        
        Args:
            email_content: The email content (subject, body, sender, etc.)
            conversation_history: Optional previous emails in the conversation
            user_preferences: Optional user preferences for classification
            user_id: User identifier
        
        Returns:
            Dict with classification results including suggested actions and priority
        """
        # Format the email and conversation history for the LLM
        formatted_email = self._format_email_for_classification(email_content)
        formatted_history = self._format_history_for_classification(conversation_history) if conversation_history else ""
        
        # If user_id is provided but no preferences, try to load them from the database
        if user_id and not user_preferences:
            try:
                user_preferences = self.user_preferences.get_user_classification_preferences(user_id)
                logger.info(f"Loaded classification preferences for user {user_id}")
            except Exception as e:
                logger.error(f"Error loading user preferences: {e}")
        
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
            
            # Store classification in database if user_id is provided
            if user_id and email_content.get('id'):
                try:
                    email_manager = EmailManager()
                    
                    # Update the is_classified flag in email_content table
                    email_manager.update_email_classification(
                        email_id=email_content['email_id'],
                        user_id=user_id,
                        classified_action=parsed_classification['action']
                    )
                    file_registry = FileRegistry(user_id)
                    file_registry.update_email_classification(
                        email_id=email_content['email_id'],
                        user_id=user_id,
                        classified_action=parsed_classification['action']
                    )
                    logger.info(f"Email classification stored in file registry with ID: {email_content['email_id']}")
                except Exception as e:
                    logger.error(f"Error storing email classification in database: {e}")
            
            return parsed_classification
            
        except Exception as e:
            logger.error(f"Error classifying email: {e}")
            # Default to reply with medium priority if classification fails
            return {
                "action": EmailActionType.REPLY.value,
                "priority": EmailPriority.MEDIUM.value,
                "reasoning": f"Default classification due to error: {str(e)}",
                "suggested_response": None,
                "stored_in_db": False
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
        rules_text = ""
        
        if user_preferences:
            # Extract and format rules if provided
            if "rules" in user_preferences and user_preferences["rules"]:
                rules = user_preferences.get("rules", [])
                rules_text = "\nUSER CLASSIFICATION RULES:\n"
                for i, rule in enumerate(rules, 1):
                    keyword = rule.get("keyword", "")
                    action = rule.get("action", "")
                    recipient = rule.get("recipient", "")
                    description = rule.get("description", "")
                    
                    rule_text = f"{i}. When an email contains \"{keyword}\", perform action \"{action}\""
                    if recipient and (action == "forward" or action == "new_email"):
                        rule_text += f" to {recipient}"
                    if description:
                        rule_text += f" - {description}"
                    
                    rules_text += rule_text + "\n"
        
        # Default actions and priorities
        action_options = [action.value for action in EmailActionType]
        priority_options = [priority.value for priority in EmailPriority]
        
        # Format action and priority guidelines
        action_guidelines = "\n".join([f"- \"{action}\": {self._get_action_description(action)}" for action in action_options])
        priority_guidelines = "\n".join([f"- \"{priority}\": {self._get_priority_description(priority)}" for priority in priority_options])
        
        # Always use the default prompt, but incorporate user rules if available
        return f"""
You are an intelligent email assistant. Analyze the following email and determine the most appropriate action to take.

{email}
{conversation_history}
{rules_text}

Based on this information, please categorize the email and suggest an action to take.
For your response, follow this format exactly:

ACTION: [One of: {', '.join(action_options)}]
PRIORITY: [One of: {', '.join(priority_options)}]
REASONING: [Briefly explain why you chose this action and priority]
SUGGESTED_RESPONSE: [A brief outline of how to respond, if applicable]

For the ACTION field, use the following guidelines:
{action_guidelines}

For the PRIORITY field:
{priority_guidelines}
"""
    
    def _get_action_description(self, action: str) -> str:
        """Get description for an action type."""
        descriptions = {
            "reply": "The email requires a direct response",
            "forward": "The email should be forwarded to someone else",
            "new_email": "A new email should be composed (not a direct reply)",
            "no_action": "No action needed at this time",
            "flag_important": "The email should be flagged for later attention",
            "archive": "The email can be archived",
            "delete": "The email can be deleted"
        }
        return descriptions.get(action, "Custom action")
    
    def _get_priority_description(self, priority: str) -> str:
        """Get description for a priority level."""
        descriptions = {
            "high": "Urgent, should be handled immediately",
            "medium": "Important but not urgent",
            "low": "Can be handled when convenient"
        }
        return descriptions.get(priority, "Custom priority")
    
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
    
    def process_incoming_email(
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
        classification = self.classifier.classify_email(
            email, 
            conversation_history,
            user_preferences,
            user_id
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
    
    def process_email_action(
        self,
        user_id: str,
        provider: str,
        email_content: Dict[str, Any],
        classification: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes an email action based on classification results.
        
        This method executes the appropriate action (reply, forward, archive, etc.)
        based on the classification provided.
        
        Args:
            user_id: The ID of the user who owns the email
            email_content: The full email content
            classification: The classification result containing action, priority, etc.
            
        Returns:
            Dict containing information about the action taken
        """
        
        logger = log.bind(name="backend.services.email.auto_processor")
        
        action = classification.get("action")
        priority = classification.get("priority")
        reasoning = classification.get("reasoning", "")
        suggested_response = classification.get("suggested_response", "")
        
        result = {
            "action": action,
            "success": False,
            "details": "",
            "priority": priority
        }
        
        try:
            # Initialize email agent for API actions if needed
            
            email_manager = EmailManager()
            email_agent = EmailAgent(user_id=user_id, email_manager=email_manager)
            
            if action == "reply":
                logger.info(f"Auto-replying to email {email_content.get('id')} for user {user_id}")
                
                # Generate response content
                response_body = suggested_response
                if not response_body:
                    response_body = "Auto-generated response based on classification."
                
                # Send reply
                reply_result = email_agent.reply_to_email(
                    content=response_body,
                    provider=provider,
                    email=email_content
                )
                
                result["success"] = True
                result["details"] = "Auto-reply sent successfully"
                result["message_id"] = reply_result.get("message_id")
                
            elif action == "forward":
                logger.info(f"Auto-forwarding email {email_content.get('id')} for user {user_id}")
                
                # Determine recipients from suggested_response if available
                # This assumes the suggested_response contains recipient info
                forward_recipients = []
                if suggested_response and "@" in suggested_response:
                    # Extract email addresses from suggested response
                    import re
                    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', suggested_response)
                    if emails:
                        forward_recipients = emails
                
                if not forward_recipients:
                    result["success"] = False
                    result["details"] = "No forward recipients identified"
                    return result
                    
                forward_message = f"Forwarded message:\n\n{reasoning}\n\n"
                forward_message += email_content.get("body", "")
                
                # Forward email
                forward_result = email_agent.forward_email(
                    email_content=email_content,
                    additional_comment=reasoning,
                    recipients=forward_recipients,
                    provider=provider
                )
                
                result["success"] = True
                result["details"] = f"Forwarded to {', '.join(forward_recipients)}"
                result["message_id"] = forward_result.get("message_id")
                
            elif action == "new_email":
                logger.info(f"Creating new email based on classification for user {user_id}")
                
                # Extract potential recipients from suggested_response
                import re
                recipients = []
                if suggested_response and "@" in suggested_response:
                    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', suggested_response)
                    if emails:
                        recipients = emails
                
                subject = ""
                if ":" in suggested_response:
                    subject_part = suggested_response.split(":", 1)[0].strip()
                    if len(subject_part) < 100:  # Reasonable subject length
                        subject = subject_part
                        
                if not subject:
                    # Try to generate a subject based on the email content
                    subject = "Follow-up: " + email_content.get("subject", "")
                
                if recipients:
                    # Send new email
                    new_email_result = email_agent.generate_new_email(
                        subject=subject,
                        content=suggested_response,
                        recipients=recipients,
                        provider=provider
                    )
                    
                    result["success"] = True
                    result["details"] = f"New email sent to {', '.join(recipients)}"
                    result["message_id"] = new_email_result.get("message_id")
                else:
                    result["success"] = False
                    result["details"] = "No recipients identified for new email"
                
            elif action == "flag_important":
                logger.info(f"Flagging email {email_content.get('id')} as important")
                
                # Flag the email as important
                email_agent.update_email_flags(
                    email_id=email_content.get("id"),
                    flag_important=True,
                    provider=provider
                )
                
                result["success"] = True
                result["details"] = "Email flagged as important"
                
            elif action == "archive":
                logger.info(f"Archiving email {email_content.get('id')}")
                
                # Archive the email
                email_agent.move_email(
                    email_id=email_content.get("id"),
                    destination_folder="archive",
                    provider=provider
                )
                
                result["success"] = True
                result["details"] = "Email archived"
                
            elif action == "delete":
                logger.info(f"Moving email {email_content.get('id')} to trash")
                
                # Move to trash (soft delete)
                email_agent.move_email(
                    email_id=email_content.get("id"),
                    destination_folder="trash",
                    provider=provider
                )
                
                result["success"] = True
                result["details"] = "Email moved to trash"
                
            elif action == "no_action":
                # No action taken, but still mark as successful processing
                logger.info(f"No action required for email {email_content.get('id')}")
                result["success"] = True
                result["details"] = "No action required based on classification"
                
            else:
                logger.warning(f"Unknown action type: {action}")
                result["success"] = False
                result["details"] = f"Unknown action type: {action}"
                
        except Exception as e:
            logger.error(f"Error executing email action: {str(e)}")
            result["success"] = False
            result["details"] = f"Error: {str(e)}"
        
        return result

def main():
    """
    Test the email classification functionality.
    
    This function demonstrates:
    1. Classification of different email types
    2. Extraction of key information from emails
    3. Handling of edge cases
    """
    from datetime import datetime
    classifier = EmailClassifier()
    email_agent = EmailAutoProcessor()
    test_emails = [
        {
            "subject": "Meeting Reminder: Project Sync Tomorrow",
            "body": "Hi team, just a reminder that we have our weekly project sync tomorrow at 10 AM. Please come prepared with updates.",
            "sender": "project.manager@company.com",
            "received_date": datetime.now().isoformat()
        },
        {
            "subject": "URGENT: Server Down in Production",
            "body": "The production server is down. All hands on deck to resolve this issue immediately!",
            "sender": "alerts@it.company.com",
            "received_date": datetime.now().isoformat()
        },
        {
            "subject": "Your Order Confirmation #12345",
            "body": "Thank you for your purchase! Your order has been confirmed and will be shipped soon.",
            "sender": "orders@ecommerce.com",
            "received_date": datetime.now().isoformat()
        },
        {
            "subject": "Invitation: John's Birthday Party",
            "body": "You're invited to John's birthday party this Saturday at 7 PM. Please RSVP by Thursday.",
            "sender": "jane@personal.com",
            "received_date": datetime.now().isoformat()
        },
        {
            "subject": "Security Alert: Suspicious Login Attempt",
            "body": "We detected a suspicious login attempt to your account. Please verify your activity.",
            "sender": "security@company.com",
            "received_date": datetime.now().isoformat()
        },
        {
            "subject": "Newsletter: Weekly Tech Digest",
            "body": "This week in tech: New AI breakthroughs, security updates, and industry trends.",
            "sender": "newsletter@techdigest.com",
            "received_date": datetime.now().isoformat()
        }
    ]
    
    print("===== Testing Email Classification =====")
    for i, email in enumerate(test_emails, 1):
        print(f"\n--- Test Email {i} ---")
        print(f"Subject: {email['subject']}")
        print(f"From: {email['sender']}")
        
        # Classify the email
        classification_result = classifier.classify_email(email, user_id="test_user")
        print(f"Classification: {classification_result['action']}")
        print(f"Priority: {classification_result['priority']}")
        print(f"Key Information: {classification_result.get('key_info', {})}")
        
        action_result = email_agent.process_email_action(
            user_id="test_user",
            provider="gmail",  # Use 'outlook' for Outlook test emails
            email_content=email,
            classification=classification_result
        )
        print(f"Action Result: {action_result}")

        # Test information extraction

if __name__ == "__main__":
    main()
