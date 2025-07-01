#!/usr/bin/env python3
"""
Email Processor Module.

Provides functionality for fetching, classifying, and processing emails
from various sources including Gmail and Outlook.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

import asyncio
import argparse
import datetime
import json
import enum
from typing import List, Dict, Optional, Any

from backend.services.auth.credentials_manager import check_google_credentials, check_microsoft_credentials
from backend.services.auth.google_auth import get_gmail_service
from backend.services.auth.microsoft_auth import get_outlook_token
from backend.core.logger import log
from backend.services.email.classification import EmailClassifier, EmailAutoProcessor
from backend.services.db.email_manager import EmailManager

logger = log.bind(name="backend.services.email.processor")


class EmailProvider(str, enum.Enum):
    """Enum of supported email providers."""
    GMAIL = "gmail"
    OUTLOOK = "outlook"
    DATABASE = "database"


class EmailProcessor:
    """
    Class for processing emails from different providers.
    Handles fetching, classification, and possible automated actions.
    """
    
    def __init__(self):
        self.classifier = EmailClassifier()
        self.auto_processor = EmailAutoProcessor()
        self.email_manager = EmailManager()
    
    def process_emails(
        self,
        user_id: str,
        provider: Optional[str],
        limit: int = 10,
        min_date: Optional[datetime.datetime] = None,
        auto_actions: bool = False,
        folders: Optional[List[str]] = None,
        query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process emails for a user from specified providers.
        
        Args:
            user_id: User ID for authentication
            provider: Email provider to process (gmail, outlook, database)
            limit: Maximum number of emails to fetch per provider
            min_date: Minimum date for emails to consider
            auto_actions: Whether to perform actions automatically based on classification
            folders: List of folders/labels to search
            query: Search query for filtering emails
            
        Returns:
            Dictionary with processing results
        """
        # Track statistics
        stats = {
            "processed_count": 0,
            "classified_count": 0,
            "actions_taken": 0,
            "errors": [],
            "results": []
        }
            
        # Process emails from database
        if provider == EmailProvider.DATABASE:
            try:
                emails = self._fetch_db_emails(
                    user_id=user_id,
                    limit=limit,
                    min_date=min_date,
                    only_unclassified=True
                )
                
                emails_processed = 0
                for email in emails:
                    try:
                        result = self._process_single_email(
                            user_id=user_id,
                            email=email,
                            auto_action=auto_actions,
                        )
                        stats["results"].append(result)
                        emails_processed += 1
                        stats["classified_count"] += 1
                        if result.get("action_taken"):
                            stats["actions_taken"] += 1
                    except Exception as e:
                        logger.error(f"Error processing email {email.get('id', 'unknown')}: {str(e)}")
                        stats["errors"].append({
                            "email_id": email.get("id", "unknown"),
                            "error": str(e)
                        })
                
                stats["processed_count"] += emails_processed
                logger.info(f"Processed {emails_processed} database emails for user {user_id}")
            except Exception as e:
                logger.error(f"Error fetching database emails for user {user_id}: {str(e)}")
                stats["errors"].append({
                    "provider": "database",
                    "error": str(e)
                })
        
        return stats
    
    def _fetch_db_emails(
        self, 
        user_id: str,
        limit: int = 10,
        query: Optional[str] = None,
        min_date: Optional[datetime.datetime] = None,
        only_unclassified: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch emails from database for the user.
        
        Args:
            user_id: User ID for database lookup
            limit: Maximum number of emails to fetch
            query: Text to search for in subject/body
            min_date: Minimum date for emails to consider
            only_unclassified: If True, only fetch emails that haven't been classified yet
        
        Returns:
            List of email objects
        """
        # Default to inbox folder if none specified
        folders = ['inbox']
        
        emails = []
        
        try:
            # Start building search parameters
            start_date = min_date
            end_date = None  # No upper bound
            
            # Process each requested folder
            logger.info(f"Fetching emails from database folder 'inbox' for user {user_id}")
            
            # We'll retrieve emails in batches respecting the limit
            folder_limit = max(limit - len(emails), 0)
            if folder_limit == 0:
                return emails
                
            if query:
                # Use search_emails when we have query text
                folder_emails = self.email_manager.search_emails(
                            user_id=user_id,
                            query_text=query,
                            start_date=start_date,
                            end_date=end_date,
                            limit=folder_limit,
                            offset=0
                        )
                        
                # Filter by folder after search since the search doesn't take folder param
                folder_emails = [email for email in folder_emails if email.get('folder') == 'inbox']
            else:
                # Get emails by user and filter by folder
                all_user_emails = self.email_manager.get_emails_by_user(
                    user_id=user_id,
                        limit=limit*5,  # Get more than we need since we'll filter
                        offset=0
                    )
                        
                # Filter for this folder and respect date constraints
                folder_emails = []
                for email in all_user_emails:
                    if email.get('folder') == 'inbox':
                        # Check min_date if provided
                        if min_date:
                            # Convert the string date back to datetime for comparison
                            if isinstance(email.get('sent_date'), str):
                                email_date = datetime.datetime.fromisoformat(email.get('sent_date').replace('Z', '+00:00'))
                            else:
                                email_date = email.get('sent_date')
                                    
                            if email_date < min_date:
                                continue
                                
                        folder_emails.append(email)
                        if len(folder_emails) >= folder_limit:
                            break
            
            logger.info(f"Found {len(folder_emails)} emails in database folder 'inbox'")
            emails.extend(folder_emails)
            logger.info(f"Successfully fetched {len(emails)} database emails for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error fetching database emails for user {user_id}: {str(e)}")
            
        return emails
    
    def _process_single_email(
        self,
        user_id: str,
        email: Dict[str, Any],
        auto_action: bool = False
    ) -> Dict[str, Any]:
        """
        Process a single email through classification and optional automation.
        
        Args:
            user_id: User ID for authentication
            email: Email dict with content and metadata
            auto_action: Whether to perform automatic actions
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Get conversation history if available
            conversation_history = []
            provider = email.get("source_type")
            if email.get("thread_id") or email.get("conversation_id"):
                thread_id = email.get("thread_id") or email.get("conversation_id")
                try:
                    conversation_history = self.email_manager.get_emails_by_conversation(
                        conversation_id=thread_id,
                        user_id=user_id
                    )
                    # Remove the current email from history to avoid duplication
                    conversation_history = [
                        e for e in conversation_history 
                        if e.get("id") != email.get("id")
                    ]
                    logger.info(f"Retrieved {len(conversation_history)} messages in conversation history")
                except Exception as e:
                    logger.warning(f"Failed to get conversation history: {str(e)}")
            
            # Classify the email
            classification_result = self.classifier.classify_email(
                email_content=email, 
                conversation_history=conversation_history,
                user_id=user_id
            )
            
            result = {
                "email_id": email.get("id", ""),
                "subject": email.get("subject", ""),
                "sender": email.get("sender", ""),
                "date": email.get("date") or email.get("sent_date", ""),
                "classification": classification_result,
                "action_taken": None  # Will be populated if auto-action is taken
            }
            
            # Take action if requested
            if auto_action and classification_result:
                action_result = self.auto_processor.process_email_action(
                    user_id=user_id,
                    provider=provider,
                    email_content=email,
                    classification=classification_result
                )
                result["action_taken"] = action_result
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing email: {str(e)}")
            return {
                "email_id": email.get("id", "unknown"),
                "error": str(e)
            }


def process_emails_cli():
    """
    Command-line interface for processing emails.
    Parses arguments and calls the appropriate methods.
    """
    parser = argparse.ArgumentParser(description="Process emails from various providers")
    parser.add_argument("--user-id", required=True, help="User ID for authentication")
    parser.add_argument("--provider", choices=["gmail", "outlook", "database"],
                        default="database", help="Email provider to process")
    parser.add_argument("--limit", type=int, default=10, help="Maximum emails to process")
    parser.add_argument("--folders", nargs="+", help="Folders/labels to search")
    parser.add_argument("--min-date", help="Minimum date (YYYY-MM-DD)")
    parser.add_argument("--query", help="Search query for filtering emails")
    parser.add_argument("--auto-actions", action="store_true", help="Automatically perform actions")
    
    args = parser.parse_args()
    
    # Convert string arguments to proper types
    min_date = None
    if args.min_date:
        try:
            min_date = datetime.datetime.strptime(args.min_date, "%Y-%m-%d")
        except ValueError:
            print(f"Invalid date format: {args.min_date}. Use YYYY-MM-DD format.")
            return
    
    provider = args.provider
    
    # Process emails
    processor = EmailProcessor()
    results = processor.process_emails(
        user_id=args.user_id,
        provider=provider,
        limit=args.limit,
        min_date=min_date,
        auto_actions=args.auto_actions,
        folders=args.folders,
        query=args.query
    )
    
    # Print results
    print(json.dumps(results, indent=2))


def scheduled_email_processing(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Function to be called by the scheduler for processing emails on a schedule.
    
    Args:
        args: Dictionary with processing parameters:
            - user_id: User ID for authentication
            - provider: Email provider string
            - limit: Maximum number of emails to fetch
            - folders: List of folders/labels to search
            - auto_actions: Whether to automatically perform actions
            
    Returns:
        Processing results dictionary
    """
    user_id = args.get('user_id')
    provider_str = args.get('provider')
    limit = args.get('limit', 10)
    folders = args.get('folders')
    auto_actions = args.get('auto_actions', False)
    
    if not user_id:
        logger.error("No user_id provided for scheduled email processing")
        return {
            "success": False,
            "error": "Missing required parameter: user_id"
        }
    
    # Convert provider string to enum value if provided
    provider = None
    if provider_str:
        try:
            provider = EmailProvider(provider_str)
        except ValueError as e:
            logger.error(f"Invalid provider in scheduled job: {e}")
            return {
                "success": False,
                "error": f"Invalid provider: {str(e)}"
            }
    
    # Process emails
    try:
        logger.info(f"Running scheduled email processing for user {user_id}")
        processor = EmailProcessor()
        results = processor.process_emails(
            user_id=user_id,
            provider=provider,
            limit=limit,
            auto_actions=auto_actions,
            folders=folders
        )
        
        # Log the summary results
        processed_count = results.get('processed_count', 0)
        classified_count = results.get('classified_count', 0)
        actions_taken = results.get('actions_taken', 0)
        
        logger.info(f"Scheduled processing completed for user {user_id}: "
                   f"{processed_count} emails processed, {classified_count} classified, "
                   f"{actions_taken} actions taken")
        
        return {
            "success": True,
            "user_id": user_id,
            "processed_count": processed_count,
            "classified_count": classified_count,
            "actions_taken": actions_taken,
            "errors": results.get("errors", [])
        }
        
    except Exception as e:
        logger.error(f"Error in scheduled email processing: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def test_process_emails_real_user():
    """Test the process_emails method with a real user ID"""
    # Use the specific user ID
    user_id = "CpixGo0ZYif2Fi33bNrI08WVSfi1"
    provider = EmailProvider.DATABASE
    
    # Create the EmailProcessor instance
    processor = EmailProcessor()
    
    try:
        # Process emails with auto_actions=False
        print(f"\nProcessing emails for user {user_id}...")
        result = processor.process_emails(
            user_id=user_id,
            provider=provider,
            limit=5,  # Limit to 5 emails to avoid processing too many
            auto_actions=False  # Don't take actions automatically
        )
        
        # Print the results
        print(f"\nProcessed {result['processed_count']} emails")
        print(f"Classified {result['classified_count']} emails")
        
        if result["errors"]:
            print("\nErrors encountered:")
            for error in result["errors"]:
                print(f"  - {error}")
        
        if result["results"]:
            print("\nEmail classification results:")
            for i, email_result in enumerate(result["results"]):
                print(f"\nEmail {i+1}:")
                print(f"  Subject: {email_result.get('subject', 'N/A')}")
                print(f"  Sender: {email_result.get('sender', 'N/A')}")
                print(f"  Classification: {email_result.get('classification', {}).get('action', 'N/A')}")
                print(f"  Priority: {email_result.get('classification', {}).get('priority', 'N/A')}")
        else:
            print("\nNo emails were processed. This could be because:")
            print("  - The user has no emails in the database")
            print("  - All emails have already been classified")
            print("  - There was an issue connecting to the database")
        
        print("\nReal user test completed!")
        
    except Exception as e:
        print(f"\nError during real user test: {str(e)}")

if __name__ == "__main__":
    # Run both tests    
    print("\n=== Running real user test ===")
    test_process_emails_real_user()
