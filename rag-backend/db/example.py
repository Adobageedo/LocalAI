"""
Example usage of the PostgreSQL database manager and models.
This script demonstrates how to use the User, Conversation, and ChatMessage classes.
"""

import logging
import uuid
from datetime import datetime

from .postgres_manager import PostgresManager
from .models import User, Conversation, ChatMessage

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("postgres_example")

def run_example():
    """Demonstrate the usage of database models"""
    try:
        # Initialize database connection
        db = PostgresManager()
        
        # Example 1: Create a new user
        user_id = "user123"
        logger.info("Creating a new user...")
        user = User.create(
            id=user_id,
            email="user@example.com",
            name="Test User"
        )
        logger.info(f"Created user: {user.to_dict()}")
        
        # Example 2: Create a conversation
        logger.info("Creating a new conversation...")
        conversation = Conversation.create(
            user_id=user.id,
            name="Test Conversation"
        )
        logger.info(f"Created conversation: {conversation.to_dict()}")
        
        # Example 3: Add messages to the conversation
        logger.info("Adding user message...")
        user_message = ChatMessage.create(
            conversation_id=conversation.id,
            user_id=user.id,
            role="user",
            message="Hello, this is a test message"
        )
        logger.info(f"Added user message: {user_message.to_dict()}")
        
        logger.info("Adding assistant message...")
        assistant_message = ChatMessage.create(
            conversation_id=conversation.id,
            user_id=user.id,
            role="assistant",
            message="Hello! How can I help you today?",
            sources=[{"title": "Example Source", "url": "https://example.com"}]
        )
        logger.info(f"Added assistant message: {assistant_message.to_dict()}")
        
        # Example 4: Retrieve conversation messages
        logger.info("Retrieving all messages in the conversation...")
        messages = conversation.get_messages()
        logger.info(f"Found {len(messages)} messages")
        for msg in messages:
            logger.info(f"Message: {msg.role} - {msg.message}")
        
        # Example 5: Update conversation name
        logger.info("Updating conversation name...")
        conversation.update(name="Updated Conversation Name")
        logger.info(f"Updated conversation: {conversation.to_dict()}")
        
        # Example 6: Get all user conversations
        logger.info("Getting all user conversations...")
        user_conversations = Conversation.get_by_user_id(user.id)
        logger.info(f"Found {len(user_conversations)} conversations for user")
        
        # Clean up (optional - remove for production)
        # Uncomment the lines below to clean up the example data
        # logger.info("Cleaning up example data...")
        # conversation.delete()
        # user.delete()
        # logger.info("Cleanup complete")
        
    except Exception as e:
        logger.error(f"Error in example: {str(e)}")
        raise
    
if __name__ == "__main__":
    run_example()
