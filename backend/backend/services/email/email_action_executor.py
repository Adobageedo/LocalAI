#!/usr/bin/env python3
"""
Email Action Executor
===================

Module for executing email actions by connecting all components of the email processing system:
1. Email Processing (fetching emails from providers)
2. Email Classification (determining appropriate actions)
3. Email Actions (executing provider-specific actions like Gmail API calls)
"""

import asyncio
import sys
import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from backend.services.email.email_processor import EmailProcessor, EmailProvider
from backend.services.email.classification import EmailAutoProcessor, EmailClassifier
from backend.services.email.mail_agent import EmailAgent
from backend.services.email.gmail_actions import GmailActions
from backend.services.db.email_manager import EmailManager
from backend.core.logger import log

# Setup logger
logger = log.bind(name="backend.services.email.action_executor")

class EmailActionExecutor:
    """
    Orchestrates the complete email processing flow.
    
    This class:
    1. Fetches emails using EmailProcessor
    2. Classifies emails using EmailClassifier
    3. Executes appropriate actions using provider-specific implementations
    """
    
    def __init__(self, user_id: str):
        """
        Initialize the email action executor.
        
        Args:
            user_id: User identifier for authentication
        """
        self.user_id = user_id
        self.email_processor = EmailProcessor()
        self.auto_processor = EmailAutoProcessor()
        self.email_agent = EmailAgent(user_id)
        self.email_manager = EmailManager()
        
        # Provider-specific action handlers
        self.gmail_actions = GmailActions(user_id)
        # Add other providers as needed (e.g., OutlookActions)
        
        # Map of provider types to their action handlers
        self.action_handlers = {
            EmailProvider.GMAIL.value: self.gmail_actions,
            # Add other mappings as needed
        }
    
    async def process_and_execute(
        self,
        limit: int = 10,
        providers: Optional[List[str]] = None,
        auto_actions: bool = False,
        dry_run: bool = False,
        folders: Optional[List[str]] = None,
        query: Optional[str] = None,
        min_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Process emails, classify them, and execute appropriate actions.
        
        Args:
            limit: Maximum number of emails to process
            providers: List of email providers to process
            auto_actions: Whether to perform actions automatically
            dry_run: If True, will classify and show action plan but not execute
            folders: List of folders to filter emails by
            query: Search query for filtering emails
            min_date: Minimum date for emails
            
        Returns:
            Dict with processing results
        """
        # Convert string providers to enum values if provided
        provider_enums = None
        if providers:
            provider_enums = [EmailProvider(p) for p in providers]
            
        # First, process emails to get them from providers
        processing_results = await self.email_processor.process_emails(
            user_id=self.user_id,
            providers=provider_enums,
            limit=limit,
            min_date=min_date,
            auto_actions=False,  # We'll handle actions ourselves
            folders=folders,
            query=query
        )
        
        # Extract emails from processing results
        emails = []
        for result in processing_results.get("results", []):
            if "email" in result:
                emails.append(result["email"])
        
        # Track statistics
        results = {
            "processed_count": len(emails),
            "classified_count": 0,
            "actions_executed": 0,
            "errors": [],
            "emails": []
        }
        
        # Process each email
        for email in emails:
            try:
                # Get conversation history for context
                conversation_id = email.get("conversation_id")
                conversation_history = []
                
                if conversation_id:
                    conversation_history = await self.email_agent.retrieve_conversation_history(
                        conversation_id, 
                        self.user_id
                    )
                
                # Classify the email
                classification = await self.auto_processor.classify_email(
                    email=email,
                    user_id=self.user_id,
                    conversation_history=conversation_history
                )
                
                results["classified_count"] += 1
                
                # Prepare result tracking for this email
                email_result = {
                    "email_id": email.get("id"),
                    "subject": email.get("subject", "No subject"),
                    "classification": classification,
                    "action_executed": False,
                    "action_result": None,
                    "error": None
                }
                
                # Execute actions if requested
                if auto_actions and not dry_run:
                    # Determine which provider action handler to use
                    provider = email.get("provider", "").lower()
                    action_handler = self._get_action_handler(provider)
                    
                    if action_handler:
                        action_result = await self._execute_action(
                            email=email,
                            classification=classification,
                            action_handler=action_handler
                        )
                        
                        email_result["action_executed"] = action_result.get("success", False)
                        email_result["action_result"] = action_result
                        
                        if action_result.get("success", False):
                            results["actions_executed"] += 1
                        else:
                            email_result["error"] = action_result.get("error")
                    else:
                        email_result["error"] = f"No action handler found for provider: {provider}"
                
                # Track this email's result
                results["emails"].append(email_result)
                
            except Exception as e:
                logger.error(f"Error processing email {email.get('id', 'unknown')}: {str(e)}")
                results["errors"].append({
                    "email_id": email.get("id", "unknown"),
                    "error": str(e)
                })
                
        return results
    
    def _get_action_handler(self, provider: str):
        """Get the appropriate action handler for the provider."""
        return self.action_handlers.get(provider.lower())
        
    async def _execute_action(
        self, 
        email: Dict[str, Any], 
        classification: Dict[str, Any],
        action_handler: Any
    ) -> Dict[str, Any]:
        """
        Execute an action based on classification results using the provider-specific handler.
        
        Args:
            email: Email content and metadata
            classification: Classification results
            action_handler: Provider-specific action handler
            
        Returns:
            Dict with action execution result
        """
        email_id = email.get("id")
        action = classification.get("action", "no_action")
        
        logger.info(f"Executing action '{action}' for email {email_id}")
        
        try:
            # Execute different actions based on classification
            if action == "reply":
                # Generate a reply using classification data or LLM
                reply_content = classification.get("response_content") or classification.get("suggested_response")
                
                if not reply_content:
                    # Get conversation history for context
                    conversation_id = email.get("conversation_id")
                    conversation_history = []
                    
                    if conversation_id:
                        conversation_history = await self.email_agent.retrieve_conversation_history(
                            conversation_id, 
                            self.user_id
                        )
                    
                    # Generate response with EmailAgent
                    response = await self.email_agent.generate_response(
                        email=email,
                        conversation_history=conversation_history,
                        use_rag=True,
                        user_id=self.user_id
                    )
                    
                    # Get the response content
                    reply_content = response.get("rag_response") or response.get("standard_response") or ""
                
                # Send the reply
                if hasattr(action_handler, "reply_to_email"):
                    return await action_handler.reply_to_email(
                        email_id=email_id,
                        content=reply_content
                    )
                else:
                    # Fallback to email_agent if provider-specific handler doesn't exist
                    result = await self.email_agent.reply_to_email(
                        email_id=email_id,
                        content=reply_content,
                        user_id=self.user_id
                    )
                    return {"success": True, "email_id": email_id, "message_id": result.get("message_id")}
                
            elif action == "forward":
                # Extract recipients from classification
                recipients = self._extract_recipients(classification)
                if not recipients:
                    return {
                        "success": False, 
                        "error": "No recipients found for forwarding"
                    }
                
                # Generate any additional comment if specified
                comment = classification.get("additional_comment", "")
                
                # Forward the email
                if hasattr(action_handler, "forward_email"):
                    return await action_handler.forward_email(
                        email_id=email_id,
                        recipients=recipients,
                        additional_comment=comment if comment else None
                    )
                else:
                    # Fallback to email_agent
                    result = await self.email_agent.forward_email(
                        email_id=email_id,
                        recipients=recipients,
                        additional_comment=comment,
                        user_id=self.user_id
                    )
                    return {"success": True, "email_id": email_id, "message_id": result.get("message_id")}
                
            elif action == "flag_important":
                # Flag the email as important
                if hasattr(action_handler, "update_email_flags"):
                    return await action_handler.update_email_flags(
                        email_id=email_id,
                        flag_important=True
                    )
                else:
                    # Fallback to email_agent
                    await self.email_agent.update_email_flags(
                        email_id=email_id,
                        flag_important=True,
                        user_id=self.user_id
                    )
                    return {"success": True, "email_id": email_id}
                
            elif action == "archive":
                # Archive the email
                if hasattr(action_handler, "move_email"):
                    return await action_handler.move_email(
                        email_id=email_id,
                        destination_folder="archive"
                    )
                else:
                    # Fallback to email_agent
                    await self.email_agent.move_email(
                        email_id=email_id,
                        destination_folder="archive",
                        user_id=self.user_id
                    )
                    return {"success": True, "email_id": email_id}
                
            elif action == "delete" or action == "trash":
                # Move the email to trash
                if hasattr(action_handler, "move_email"):
                    return await action_handler.move_email(
                        email_id=email_id,
                        destination_folder="trash"
                    )
                else:
                    # Fallback to email_agent
                    await self.email_agent.move_email(
                        email_id=email_id,
                        destination_folder="trash",
                        user_id=self.user_id
                    )
                    return {"success": True, "email_id": email_id}
                
            elif action == "no_action":
                # No action needed
                return {
                    "success": True,
                    "action": "no_action",
                    "email_id": email_id
                }
                
            else:
                # Unknown action
                return {
                    "success": False,
                    "error": f"Unknown action: {action}",
                    "email_id": email_id
                }
                
        except Exception as e:
            logger.error(f"Error executing action {action} for email {email_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "email_id": email_id
            }
    
    def _extract_recipients(self, classification: Dict[str, Any]) -> List[str]:
        """
        Extract recipient email addresses from classification.
        
        Args:
            classification: Classification results
            
        Returns:
            List of recipient email addresses
        """
        recipients = []
        
        # Check various possible locations in classification
        if "recipients" in classification and classification["recipients"]:
            if isinstance(classification["recipients"], list):
                recipients.extend(classification["recipients"])
            elif isinstance(classification["recipients"], str):
                # Try to split comma separated emails
                recipients.extend([r.strip() for r in classification["recipients"].split(",")])
                
        # Check for a "forward_to" field
        if "forward_to" in classification and classification["forward_to"]:
            if isinstance(classification["forward_to"], list):
                recipients.extend(classification["forward_to"])
            elif isinstance(classification["forward_to"], str):
                recipients.extend([r.strip() for r in classification["forward_to"].split(",")])
        
        # Remove duplicates and empty strings
        return [r for r in list(dict.fromkeys(recipients)) if r.strip()]


async def process_and_execute(
    user_id: str,
    limit: int = 10,
    providers: Optional[List[str]] = None,
    auto_actions: bool = True,
    dry_run: bool = False,
    folders: Optional[List[str]] = None,
    query: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process emails, classify them, and execute appropriate actions.
    
    Args:
        user_id: User identifier
        limit: Maximum number of emails to process
        providers: List of email providers to process
        auto_actions: Whether to perform actions automatically
        dry_run: If True, will classify and show action plan but not execute
        folders: List of folders to filter emails by
        query: Search query for filtering emails
        
    Returns:
        Dict with processing results
    """
    executor = EmailActionExecutor(user_id)
    
    results = await executor.process_and_execute(
        limit=limit,
        providers=providers,
        auto_actions=auto_actions,
        dry_run=dry_run,
        folders=folders,
        query=query
    )
    
    return results


async def main():
    """
    Command-line interface for email action execution.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Process emails, classify them, and execute actions")
    parser.add_argument("--user-id", required=True, help="User identifier")
    parser.add_argument("--limit", type=int, default=10, help="Maximum number of emails to process")
    parser.add_argument("--providers", nargs="*", help="Email providers to process (gmail, outlook, database)")
    parser.add_argument("--dry-run", action="store_true", help="Classify but don't execute actions")
    parser.add_argument("--no-auto-actions", dest="auto_actions", action="store_false", help="Don't execute actions")
    parser.add_argument("--folders", nargs="*", help="Folders to filter emails by")
    parser.add_argument("--query", help="Search query for filtering emails")
    
    args = parser.parse_args()
    
    print(f"Processing emails for user {args.user_id}")
    print(f"Auto actions: {args.auto_actions}")
    print(f"Dry run: {args.dry_run}")
    
    results = await process_and_execute(
        user_id=args.user_id,
        limit=args.limit,
        providers=args.providers,
        auto_actions=args.auto_actions,
        dry_run=args.dry_run,
        folders=args.folders,
        query=args.query
    )
    
    # Print summary
    print(f"\nProcessed {results['processed_count']} emails")
    print(f"Classified {results['classified_count']} emails")
    print(f"Executed {results['actions_executed']} actions")
    
    if results["errors"]:
        print(f"Encountered {len(results['errors'])} errors:")
        for error in results["errors"]:
            print(f"  - {error}")
    
    # Print details for each email
    print("\nEmail processing details:")
    for email in results["emails"]:
        action = email["classification"].get("action", "no_action")
        priority = email["classification"].get("priority", "low")
        
        status = "✓" if email.get("action_executed", False) else "✗"
        print(f"{status} {email['subject']} | Action: {action} | Priority: {priority}")
        
        if email.get("error"):
            print(f"   Error: {email['error']}")
    
    return 0


if __name__ == "__main__":
    asyncio.run(main())
