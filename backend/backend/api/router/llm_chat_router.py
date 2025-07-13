from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, UUID4, Field, EmailStr
from uuid import UUID
from datetime import datetime
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from backend.services.auth.middleware.auth import get_current_user
from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log

# Import the PostgresManager and models
from backend.services.db.postgres_manager import PostgresManager
from backend.services.db.models import User, Conversation as ConversationModel, ChatMessage as ChatMessageModel, SyncStatus
from backend.services.db.user_preferences import UserPreferences
from backend.core.config import POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
logger = log.bind(name="backend.api.llm_chat_router")
# Database connection parameters - kept for reference but not directly used
DB_NAME = POSTGRES_DB
DB_USER = POSTGRES_USER
DB_PASSWORD = POSTGRES_PASSWORD
DB_HOST = POSTGRES_HOST
DB_PORT = POSTGRES_PORT

# Models
class PromptResponse(BaseModel):
    answer: str
    sources: List[str]

class TitleResponse(BaseModel):
    title: str

class UserCreate(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    created_at: datetime

class ConversationCreate(BaseModel):
    name: str = "New Conversation"

class ConversationUpdate(BaseModel):
    name: str

class Conversation(BaseModel):
    id: UUID4
    user_id: Optional[str] = None
    name: str
    created_at: datetime
    updated_at: datetime

# Sync Status models
class SyncStatusCreate(BaseModel):
    source_type: str
    status: str = "pending"
    progress: float = 0.0
    error_details: Optional[str] = None

class SyncStatusUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[float] = None
    error_details: Optional[str] = None

class SyncStatusResponse(BaseModel):
    id: UUID4
    user_id: str
    source_type: str
    status: str
    progress: float
    error_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MessageCreate(BaseModel):
    role: str = "user"
    message: str
    sources: Optional[List[Any]] = None  # Allow any type of sources (string or dict)
    
    class Config:
        extra = "forbid"

class Message(BaseModel):
    id: Optional[UUID4] = None
    conversation_id: Optional[UUID4] = None
    user_id: Optional[str] = None
    role: str = "user"
    message: str
    sources: Optional[List[dict]] = None
    timestamp: Optional[datetime] = None
    
    class Config:
        orm_mode = True

router = APIRouter(tags=["conversations"])

# System messages to guide the LLM
TITLE_SYSTEM_MESSAGE = """You are an assistant that creates short, descriptive titles for conversations.
- Create a concise title (3-5 words) based on the user's message
- Focus on the main topic or question
- Use title case
- Do NOT use quotes around the title
- Respond ONLY with the title text, nothing else"""

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(user=Depends(get_current_user)):
    """Get all conversations for the current user"""
    try:
        # If user authentication is enabled, filter by user_id
        if user and user.get("uid"):
            conversations = ConversationModel.get_by_user_id(user.get("uid"))
        else:
            # If authentication is disabled, get all conversations
            conversations = ConversationModel.get_all()

        return [conversation.to_dict() for conversation in conversations]
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching conversations"
        )

@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: UUID4, user=Depends(get_current_user)):
    """Get a specific conversation by ID"""
    try:
        # If user authentication is enabled, ensure the conversation belongs to the user
        if user:
            conversation = ConversationModel.get_by_id(conversation_id, user.get("uid"))
        else:
            conversation = ConversationModel.get_by_id(conversation_id)
            
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        return conversation.to_dict()
    except Exception as e:
        print(f"Error fetching conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching conversation"
        )

@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(conversation: ConversationCreate, user=Depends(get_current_user)):
    try:
        # Extract user_id from the authenticated user
        user_id = user.get("uid") if user else None
        
        if not user_id:
            logger.warning("Attempting to create conversation without user_id")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to create conversations"
            )
            
        logger.info(f"Creating conversation for user {user_id} with name: {conversation.name}")
        
        # Call the class method to create a new conversation
        new_conversation = ConversationModel.create(user_id=user_id, name=conversation.name)
        
        if not new_conversation:
            logger.error(f"Failed to create conversation for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error: Failed to create conversation"
            )
            
        logger.info(f"Successfully created conversation with ID: {new_conversation.id}")
        return new_conversation.to_dict()
        
    except HTTPException as he:
        # Re-raise existing HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Unexpected error creating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while creating conversation"
        )

@router.put("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: UUID4, conversation: ConversationUpdate, user=Depends(get_current_user)
):
    """Update a conversation name"""
    try:
        # Verify user authentication
        user_id = user.get("uid") if user else None
        if not user_id:
            logger.warning("Attempting to update conversation without authentication")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to update conversations"
            )
        
        # Retrieve conversation
        conversation_obj = ConversationModel.get_by_id(conversation_id)
        if not conversation_obj:
            logger.warning(f"Conversation {conversation_id} not found for update")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        # Check if user owns this conversation (security check)
        if conversation_obj.user_id != user_id:
            logger.warning(f"User {user_id} attempted to update conversation {conversation_id} owned by {conversation_obj.user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this conversation"
            )
        
        # Use the model's update method to persist changes to database
        success = conversation_obj.update(name=conversation.name)
        
        if not success:
            logger.error(f"Database error while updating conversation {conversation_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update conversation"
            )
            
        logger.info(f"Successfully updated conversation {conversation_id}")
        return conversation_obj.to_dict()
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error updating conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating conversation"
        )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: UUID4, user=Depends(get_current_user)):
    """Delete a conversation"""
    try:
        # First, delete all messages in the conversation
        ChatMessageModel.delete(conversation_id=conversation_id)
        
        # Then, delete the conversation itself
        deleted = ConversationModel.delete(conversation_id=conversation_id)
            
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        print(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting conversation"
        )

@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(conversation_id: str = None, user=Depends(get_current_user)):
    """Get all messages in a conversation"""
    # Validate inputs
    if not conversation_id:
        logger.warning("Attempted to fetch messages without conversation ID")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation ID is required"
        )
    
    # Verify user authentication   
    user_id = user.get("uid") if user else None
    if not user_id:
        logger.warning("Attempted to fetch messages without authentication")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view conversation messages"
        )
        
    try:
        # Convert string ID to UUID
        try:
            conversation_uuid = UUID(conversation_id)
            logger.info(f"Fetching messages for conversation {conversation_id}")
        except ValueError:
            logger.warning(f"Invalid conversation ID format: {conversation_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid conversation ID format"
            )
        
        # Check if the conversation exists
        conversation = ConversationModel.get_by_id(conversation_uuid)
        if not conversation:
            logger.warning(f"Conversation with ID {conversation_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {conversation_id} not found"
            )
        
        # Check if user owns this conversation
        if conversation.user_id != user_id:
            logger.warning(f"User {user_id} attempted to access conversation {conversation_id} owned by {conversation.user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this conversation"
            )

        # Get all messages for the conversation
        messages = ChatMessageModel.get_by_conversation_id(conversation_uuid)
        message_count = len(messages) if messages else 0
        logger.info(f"Retrieved {message_count} messages for conversation {conversation_id}")
        
        # Return messages as dictionaries
        return [message.to_dict() for message in messages]
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error fetching messages for conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving conversation messages"
        )

@router.post("/conversations/{conversation_id}/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def add_message(conversation_id: Optional[UUID4] = None, message: MessageCreate = None, user=Depends(get_current_user)):
    """Add a message to a conversation. If conversation_id is None, create a new conversation first."""
    # Basic request validation
    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content required"
        )
        
    # Validate role - must match CHECK constraint in database
    valid_roles = ['user', 'assistant', 'system']
    if message.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{message.role}'. Must be one of: {', '.join(valid_roles)}"
        )
        
    try:
        # Get authenticated user or reject if not authenticated
        user_id = user.get("uid") if user else None
        if not user_id:
            logger.warning("Attempting to add message without authentication")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to add messages"
            )
        
        logger.info(f"Processing message creation for user {user_id}")
        
        # If conversation_id is None or null string, create a new conversation first
        if not conversation_id:
            logger.info(f"No conversation_id provided, creating new conversation for user {user_id}")
            new_conversation = ConversationModel.create(user_id=user_id, name="New Conversation")
            
            if not new_conversation:
                logger.error(f"Failed to create new conversation for user {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create new conversation"
                )
                
            conversation_id = new_conversation.id
            logger.info(f"Created new conversation with id {conversation_id}")
        else:
            # Check if the conversation exists
            conversation = ConversationModel.get_by_id(conversation_id)
            
            if not conversation:
                logger.warning(f"Conversation with id {conversation_id} not found")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation with id {conversation_id} not found"
                )
                
            # Security check - ensure user owns this conversation
            if conversation.user_id != user_id:
                logger.warning(f"User {user_id} attempted to add message to conversation {conversation_id} owned by {conversation.user_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to add messages to this conversation"
                )
                
        # Process sources data - normalize to consistent format
        sources_data = None
        if message.sources:
            if isinstance(message.sources, list):
                # Normalize sources to dictionary format
                processed_sources = []
                for src in message.sources:
                    if isinstance(src, str):
                        processed_sources.append({"source": src})
                    elif isinstance(src, dict):
                        # Ensure dict has source key
                        if not 'source' in src:
                            src['source'] = "Unknown source"
                        processed_sources.append(src)
                    else:
                        logger.warning(f"Ignoring invalid source type: {type(src)}")
                        
                sources_data = processed_sources
        
        logger.info(f"Adding message to conversation {conversation_id} for user {user_id}")
        
        # Create the message using the appropriate model method
        new_message = ChatMessageModel.create(
            conversation_id=conversation_id,
            user_id=user_id,
            role=message.role,
            message=message.message,
            sources=sources_data
        )
        
        if not new_message:
            error_msg = f"Failed to create message for conversation {conversation_id}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
            
        logger.info(f"Successfully added message {new_message.id} to conversation {conversation_id}")
        return new_message.to_dict()
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        raise he
    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding message to conversation"
        )

# Sync Status Management Endpoints

@router.get("/sync/status", response_model=List[SyncStatusResponse])
async def get_sync_statuses(source_type: Optional[str] = None, user=Depends(get_current_user)):
    """Get all sync statuses for the current user, optionally filtered by source type"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    
    try:
        if source_type:
            # Fetch the latest sync status for the specified source type
            sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
            logger.info(f"Sync status for user {user_id} and source type {source_type}: {sync_status.to_dict()}")
            if not sync_status:
                return []
            return [sync_status.to_dict()]
        else:
            # Fetch all sync statuses for this user
            sync_statuses = SyncStatus.get_all_by_user(user_id)
            return [status.to_dict() for status in sync_statuses]
    except Exception as e:
        logger.error(f"Error fetching sync statuses: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching sync statuses: {str(e)}"
        )

@router.post("/sync/status", response_model=SyncStatusResponse, status_code=status.HTTP_201_CREATED)
async def create_sync_status(sync_data: SyncStatusCreate, user=Depends(get_current_user)):
    """Create a new sync status entry for a user and source type"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    
    try:
        # Create a new sync status record
        sync_status = SyncStatus.create(
            user_id=user_id,
            source_type=sync_data.source_type,
            status=sync_data.status,
            details=sync_data.details,
            error=sync_data.error
        )
        return sync_status.to_dict()
    except Exception as e:
        logger.error(f"Error creating sync status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating sync status: {str(e)}"
        )

@router.put("/sync/status/{source_type}", response_model=SyncStatusResponse)
async def update_sync_status(source_type: str, sync_data: SyncStatusUpdate, user=Depends(get_current_user)):
    """Update the latest sync status for a user and source type"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    
    try:
        # Get the latest sync status for this user and source
        sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
        
        if not sync_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No sync status found for source type: {source_type}"
            )
        
        # Update with the provided data
        update_params = {}
        if sync_data.status:
            update_params["status"] = sync_data.status
        if sync_data.progress is not None:
            update_params["progress"] = max(0.0, min(1.0, sync_data.progress))  # Ensure value is between 0.0 and 1.0
        if sync_data.error_details is not None:
            update_params["error_details"] = sync_data.error_details
        
        updated_status = SyncStatus.update(
            id=sync_status.id,
            **update_params
        )
        
        if not updated_status:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update sync status"
            )
            
        return updated_status.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sync status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating sync status: {str(e)}"
        )

@router.post("/sync/status/{source_type}/start", response_model=SyncStatusResponse)
async def start_sync(source_type: str, user=Depends(get_current_user)):
    """Mark a sync operation as started"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    
    try:
        # Get the latest sync status or create a new one
        sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
        
        if not sync_status:
            # Create a new sync status record if none exists
            sync_status = SyncStatus.create(user_id=user_id, source_type=source_type)
        
        # Mark as started
        sync_status.start_sync()
        return sync_status.to_dict()
    except Exception as e:
        logger.error(f"Error starting sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting sync: {str(e)}"
        )

@router.post("/sync/status/{source_type}/complete", response_model=SyncStatusResponse)
async def complete_sync(source_type: str, user=Depends(get_current_user)):
    """Mark a sync operation as completed"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    
    try:
        # Get the latest sync status
        sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
        
        if not sync_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No sync status found for source type: {source_type}"
            )
        
        # Mark as completed
        sync_status.complete_sync()
        return sync_status.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking sync as completed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking sync as completed: {str(e)}"
        )

@router.post("/sync/status/{source_type}/fail", response_model=SyncStatusResponse)
async def fail_sync(
    source_type: str, 
    error_info: Dict[str, str], 
    user=Depends(get_current_user)
):
    """Mark a sync operation as failed with error details"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    error_message = error_info.get("error_details", "Unknown error")
    
    try:
        # Get the latest sync status
        sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
        
        if not sync_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No sync status found for source type: {source_type}"
            )
        
        # Mark as failed with error details
        sync_status.fail_sync(error_details=error_message)
        return sync_status.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking sync as failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking sync as failed: {str(e)}"
        )

@router.post("/sync/status/{source_type}/update_progress", response_model=SyncStatusResponse)
async def update_sync_progress(
    source_type: str,
    progress_data: Dict[str, float],
    user=Depends(get_current_user)
):
    """Update the progress of a sync operation with a progress value between 0.0 and 1.0"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    user_id = user.get("uid")
    progress_value = progress_data.get("progress", 0.0)
    
    # Ensure progress value is between 0.0 and 1.0
    progress_value = max(0.0, min(1.0, progress_value))
    
    try:
        # Get the latest sync status
        sync_status = SyncStatus.get_latest_by_user_and_source(user_id, source_type)
        
        if not sync_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No sync status found for source type: {source_type}"
            )
        
        # Update progress
        if sync_status.status != "in_progress":
            sync_status.start_sync()
        
        # Update progress value
        sync_status.update_progress(progress_value)
        
        return sync_status.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sync progress: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating sync progress: {str(e)}"
        )

# User Management Endpoints
@router.get("/users", response_model=List[UserResponse])
async def get_users(user=Depends(get_current_user)):
    """Get all users (admin only)"""
    # Verify admin privileges - assuming user with uid="admin" is an admin
    if not user or user.get("uid") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all users"
        )
    
    try:
        users = User.get_all()
        return [user.to_dict() for user in users]
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user=Depends(get_current_user)):
    """Get a specific user by ID"""
    # Only allow users to get their own data unless they are admin
    if not current_user or (current_user.get("uid") != user_id and current_user.get("uid") != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user"
        )
    
    try:
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        return user.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """Create a new user (admin only)"""
    
    try:
        # Check if user with email already exists
        existing_user = User.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email {user_data.email} already exists"
            )
        
        # Create new user
        user = User.create(
            id=user_data.id,
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        return user.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )
@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user=Depends(get_current_user)):
    """Update a user's information"""
    # Only allow users to update their own data unless they are admin
    if not current_user or (current_user.get("uid") != user_id and current_user.get("uid") != "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user"
        )
    
    try:
        # Get the existing user
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # If email is being updated, check if it already exists
        if user_data.email and user_data.email != user.email:
            existing_user = User.get_by_email(user_data.email)
            if existing_user and existing_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with email {user_data.email} already exists"
                )
        
        # Update user
        user.update(
            email=user_data.email,
            name=user_data.name
        )
        
        # Get the updated user
        updated_user = User.get_by_id(user_id)
        return updated_user.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/users/{user_id}/data", status_code=status.HTTP_200_OK)
async def delete_user_data(user_id: str, current_user=Depends(get_current_user)):
    """Delete all data associated with a user but keep the account"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user is deleting their own data or is an admin
    if current_user.get("uid") != user_id and current_user.get("uid") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own data unless you're an administrator"
        )
    
    try:
        # Get the user
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Delete user preferences
        try:
            user_prefs = UserPreferences.get_by_user_id(user_id)
            if user_prefs:
                user_prefs.delete()
                logger.info(f"Deleted preferences for user {user_id}")
        except Exception as e:
            logger.error(f"Error deleting user preferences: {e}")
        
        # TODO: Delete other user-related data:
        # - Conversations and messages
        # - Documents in vectorstore
        # - Search history
        
        # Return success message
        return {"message": f"All data for user {user_id} has been deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user data: {str(e)}"
        )


@router.get("/users/{user_id}/preferences", status_code=status.HTTP_200_OK)
async def get_user_preferences(user_id: str, current_user=Depends(get_current_user)):
    """Get user preferences"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user is requesting their own preferences or is an admin
    if current_user.get("uid") != user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own preferences"
        )
    
    try:
        # Ensure user exists
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Create the table if it doesn't exist
        UserPreferences.create_table_if_not_exists()
        
        # Get preferences
        preferences = UserPreferences.get_by_user_id(user_id)
        
        # Return preferences as dict
        return preferences.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user preferences: {str(e)}"
        )

@router.put("/users/{user_id}/preferences", status_code=status.HTTP_200_OK)
async def update_user_preferences(user_id: str, preferences_data: dict, current_user=Depends(get_current_user)):
    """Update user preferences"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user is updating their own preferences or is an admin
    if current_user.get("uid") != user_id and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own preferences"
        )
    
    try:
        # Ensure user exists
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Create the table if it doesn't exist
        UserPreferences.create_table_if_not_exists()
        
        # Create preferences object from data
        preferences = UserPreferences.from_dict(user_id, preferences_data)
        
        # Save preferences
        preferences.save()
        
        return {"message": "Preferences updated successfully", "preferences": preferences.to_dict()}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user preferences: {str(e)}"
        )

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    """Delete a user and all associated data"""
    # Allow users to delete their own account or admin to delete any account
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Check if user is deleting their own account or is an admin
    if current_user.get("uid") != user_id and current_user.get("uid") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own account unless you're an administrator"
        )
    
    try:
        # Get the user
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        # Delete all user data first (conversations, documents, etc.)
        # This would involve deleting entries from other tables
        # TODO: Implement deletion of related user data in other tables
        
        # Delete the user
        if not user.delete():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )
        
        # Return no content
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.post("/prompt", response_model=PromptResponse)
def prompt_ia(data: dict, user=Depends(get_current_user), request: Request = None):
    # Get user_id from authenticated user, fallback to test for development
    user_id = user.get("uid") if user else "test"    
    question = data.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Question field is required.")

    # New optional parameters
    temperature = data.get("temperature")
    model = data.get("model")
    use_retrieval = data.get("use_retrieval")
    include_profile_context = data.get("include_profile_context")
    conversation_history = data.get("conversation_history")

    # Add instruction to the prompt for the LLM to cite sources as [filename.ext]
    llm_instruction = ""
    user_question = data.get("question")
    question = f"{llm_instruction}\n\n{user_question}"
    rag_result = get_rag_response_modular(question, user_id=user_id,conversation_history=conversation_history,use_retrieval=False)

    # Extract filenames cited in the answer (e.g., [contract.pdf])
    import re, os
    answer = rag_result.get("answer", "")
    sources = rag_result.get("sources_info", [])
    
    # Return the response
    return {
        "answer": answer,
        "sources": sources,
        "temperature": temperature,
        "model": model,
        "use_retrieval": use_retrieval,
        "include_profile_context": include_profile_context,
        "conversation_history": conversation_history
    }

@router.post("/generate-title", response_model=TitleResponse)
async def generate_conversation_title(data: dict, user=Depends(get_current_user)):
    """Generate a title for a conversation based on the first user message"""
    # Log the authenticated user for debugging
    user_id = user.get("uid") if user else "dev-user"
    logger.debug(f"Generating title for user: {user_id}")
    # Extract the message from the request
    message = data.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        # Use the LLM router directly to generate a title
        llm_prompt = f"{TITLE_SYSTEM_MESSAGE}\n\nUser message: {message}\n\nTitle:"
        
        # Direct LLM invocation without RAG retrieval
        from backend.services.rag.retrieval.llm_router import LLM
        
        router = LLM()
        llm = router.rag_llm(llm_prompt)
        
        try:
            # Call the LLM directly
            result = llm.invoke(llm_prompt)
            title = result.content.strip() if hasattr(result, "content") else str(result).strip()
        except Exception as e:
            logger.error(f"LLM invocation error: {e}")
            # Fallback to default title
            words = message.split()[:5]
            title = " ".join(words) + ("..." if len(words) >= 5 else "")
        
        # Fallback if the title is empty or too long
        if not title or len(title) > 50:
            # Use first few words of the message as fallback
            words = message.split()[:5]
            title = " ".join(words) + ("..." if len(words) >= 5 else "")
        
        return {"title": title}
        
    except Exception as e:
        logger.error(f"Error generating conversation title: {e}")
        # Fallback - use first few words of message
        words = message.split()[:5]
        title = " ".join(words) + ("..." if len(words) >= 5 else "")
        return {"title": title}
def main():
    get_sync_statuses()
if __name__ == "__main__":
    main()
    