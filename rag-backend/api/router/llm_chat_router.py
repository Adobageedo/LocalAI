from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, UUID4
from uuid import UUID
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from middleware.auth import get_current_user
from Agent_AI.retrieve_rag_information_modular import get_rag_response_modular
import logging

logger = logging.getLogger(__name__)
# Database connection parameters
DB_NAME = os.getenv("POSTGRES_DB", "localai_db")
DB_USER = os.getenv("POSTGRES_USER", "localai")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "localai_password")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")

# Models
class PromptResponse(BaseModel):
    answer: str
    sources: List[str]

class TitleResponse(BaseModel):
    title: str
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

def get_db_connection():
    """Create and return a database connection"""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=RealDictCursor
        )
        logger.info("Database connection successful")
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not connect to the database"
        )

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations(user=Depends(get_current_user)):
    """Get all conversations for the current user"""
    import uuid
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        user_id = user.get("uid") if user else None

        # If user authentication is enabled, filter by user_id
        if user and user_id:
            cursor.execute(
                """SELECT * FROM conversations 
                WHERE user_id = %s 
                ORDER BY updated_at DESC""",
                (user_id,)
            )
        else:
            # If authentication is disabled, get all conversations
            cursor.execute(
                """SELECT * FROM conversations 
                ORDER BY updated_at DESC"""
            )

        conversations = cursor.fetchall()
        return [dict(conversation) for conversation in conversations]
    except Exception as e:
        print(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching conversations"
        )
    finally:
        conn.close()

@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: UUID4, user=Depends(get_current_user)):
    """Get a specific conversation by ID"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # If user authentication is enabled, ensure the conversation belongs to the user
        if user:
            cursor.execute(
                """SELECT * FROM conversations 
                WHERE id = %s AND user_id = %s""", 
                (str(conversation_id), user.get("uid"))
            )
        else:
            cursor.execute(
                """SELECT * FROM conversations 
                WHERE id = %s""", 
                (str(conversation_id),)
            )
            
        conversation = cursor.fetchone()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        return dict(conversation)
    except Exception as e:
        print(f"Error fetching conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching conversation"
        )
    finally:
        conn.close()

@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(conversation: ConversationCreate, user=Depends(get_current_user)):
    """Create a new conversation"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now()
        
        # If user authentication is enabled, use the user_id
        user_id = user.get("uid") if user else None
        cursor.execute(
            """INSERT INTO conversations (user_id, name, created_at, updated_at)
            VALUES (%s, %s, %s, %s)
            RETURNING *""",
            (user_id, conversation.name, now, now)
        )
        new_conversation = cursor.fetchone()
        conn.commit()
        return dict(new_conversation)
    except Exception as e:
        conn.rollback()
        print(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating conversation"
        )
    finally:
        conn.close()

@router.put("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: UUID4, conversation: ConversationUpdate, user=Depends(get_current_user)
):
    """Update a conversation name"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now()
        
        # If user authentication is enabled, ensure the conversation belongs to the user
        if user:
            cursor.execute(
                """UPDATE conversations 
                SET name = %s, updated_at = %s
                WHERE id = %s AND user_id = %s
                RETURNING *""",
                (conversation.name, now, str(conversation_id), user.get("uid"))
            )
        else:
            cursor.execute(
                """UPDATE conversations 
                SET name = %s, updated_at = %s
                WHERE id = %s
                RETURNING *""",
                (conversation.name, now, str(conversation_id))
            )
            
        updated_conversation = cursor.fetchone()
        
        if not updated_conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        conn.commit()
        return dict(updated_conversation)
    except Exception as e:
        conn.rollback()
        print(f"Error updating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating conversation"
        )
    finally:
        conn.close()

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: UUID4, user=Depends(get_current_user)):
    """Delete a conversation"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # First, delete all messages in the conversation
        if user:
            cursor.execute(
                """DELETE FROM chat_messages 
                WHERE conversation_id = %s
                AND conversation_id IN (
                    SELECT id FROM conversations WHERE id = %s AND user_id = %s
                )""",
                (str(conversation_id), str(conversation_id), user.get("uid"))
            )
        else:
            cursor.execute(
                """DELETE FROM chat_messages 
                WHERE conversation_id = %s""",
                (str(conversation_id),)
            )
        
        # Then, delete the conversation itself
        if user:
            cursor.execute(
                """DELETE FROM conversations 
                WHERE id = %s AND user_id = %s
                RETURNING id""",
                (str(conversation_id), user.get("uid"))
            )
        else:
            cursor.execute(
                """DELETE FROM conversations 
                WHERE id = %s
                RETURNING id""",
                (str(conversation_id),)
            )
            
        deleted = cursor.fetchone()
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
            
        conn.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        conn.rollback()
        print(f"Error deleting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting conversation"
        )
    finally:
        conn.close()

@router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(conversation_id: str = None, user=Depends(get_current_user)):
    """Get all messages in a conversation"""
    if not conversation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation ID is required"
        )
        
    print(f"Fetching messages for conversation {conversation_id}")
    conversation_id = UUID(conversation_id)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # First check if the conversation exists
        cursor.execute(
            """SELECT id, user_id FROM conversations WHERE id = %s""",
            (str(conversation_id),)
        )
        conversation = cursor.fetchone()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation with ID {conversation_id} not found"
            )

        # Get all messages for the conversation
        cursor.execute(
            """SELECT * FROM chat_messages 
            WHERE conversation_id = %s
            ORDER BY timestamp ASC""",
            (str(conversation_id),)
        )
            
        messages = cursor.fetchall()
        print(f"Found {len(messages) if messages else 0} messages for conversation {conversation_id}")
        return [dict(message) for message in messages]
        
    except psycopg2.Error as e:
        print(f"Database error fetching messages: {e}")
        if e.pgcode == '22P02':  # Invalid text representation
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid conversation ID format"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e.pgcode} - {e.diag.message_primary if hasattr(e, 'diag') else str(e)}"
            )
    except Exception as e:
        print(f"Error fetching messages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching messages: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/conversations/{conversation_id}/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
async def add_message(conversation_id: Optional[UUID4] = None, message: MessageCreate = None, user=Depends(get_current_user)):
    """Add a message to a conversation. If conversation_id is None, create a new conversation first."""
    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content required"
        )
        
    # Validate role - must match CHECK constraint in database
    if message.role not in ['user', 'assistant', 'system']:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{message.role}'. Must be one of: 'user', 'assistant', 'system'"
        )
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        now = datetime.now()
        user_id = user.get("uid") if user else "TestNone" # Use a default test user if no user authenticated
        
        # Check if the user exists in database
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            # User doesn't exist, create it
            try:
                cursor.execute(
                    """INSERT INTO users (id, email, name) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (id) DO NOTHING""", 
                    (user_id, f"{user_id}@example.com", f"User {user_id}")
                )
                conn.commit()
                print(f"Created test user with id {user_id}")
            except Exception as e:
                print(f"Error creating user: {e}")
                conn.rollback()
        
        # If conversation_id is None or null string, create a new conversation
        if not conversation_id:
            cursor.execute(
                """INSERT INTO conversations (user_id, name, created_at, updated_at)
                VALUES (%s, %s, %s, %s)
                RETURNING *""",
                (user_id, "New Conversation", now, now)
            )
            new_conversation = cursor.fetchone()
            conversation_id = new_conversation["id"]
            print(f"Created new conversation with id {conversation_id}")
        else:
            # Check if the conversation exists
            cursor.execute("""SELECT id FROM conversations WHERE id = %s""", (str(conversation_id),))
            conversation = cursor.fetchone()
            
            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Conversation with id {conversation_id} not found"
                )
                
        print(f"Adding message to conversation {conversation_id} for user {user_id}")
        # Process sources data - convert string sources to objects for consistency
        sources_data = None
        if message.sources:
            if isinstance(message.sources, list):
                # Convert string sources to objects with 'source' field for consistency
                processed_sources = []
                for src in message.sources:
                    if isinstance(src, str):
                        processed_sources.append({"source": src})
                    else:
                        # Keep dict sources as they are
                        processed_sources.append(src)
                sources_data = processed_sources
        
        # Insert the message (let PostgreSQL generate the id)
        cursor.execute(
            """INSERT INTO chat_messages (conversation_id, user_id, role, message, sources, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *""",
            (str(conversation_id), user_id, message.role, message.message, 
             psycopg2.extras.Json(sources_data) if sources_data else None, now)
        )
        new_message = cursor.fetchone()
        if not new_message:
            conn.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create message in database"
            )
            
        # Update the conversation's updated_at timestamp
        cursor.execute(
            """UPDATE conversations 
            SET updated_at = %s
            WHERE id = %s""",
            (now, str(conversation_id))
        )
        conn.commit()
        return dict(new_message)
    except psycopg2.Error as e:
        conn.rollback()
        print(f"Database error adding message: {e}")
        # Check for specific database errors
        if e.pgcode == '23503':  # Foreign key violation
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid conversation_id or user_id reference"
            )
        elif e.pgcode == '23502':  # Not null violation
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Required field missing (likely role, message, or conversation_id)"
            )
        elif e.pgcode == '23514':  # Check constraint violation
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Check constraint failed - role must be 'user', 'assistant', or 'system'"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {e.pgcode} - {e.pgerror}"
            )
    except Exception as e:
        conn.rollback()
        print(f"Error adding message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding message: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/prompt", response_model=PromptResponse)
def prompt_ia(data: dict, user=Depends(get_current_user)):
    user_id = user.get("uid")
    question = data.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Champ 'question' requis.")

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
    rag_result = get_rag_response_modular(question, user_id=user_id,conversation_history=conversation_history)

    # Extract filenames cited in the answer (e.g., [contract.pdf])
    import re, os
    answer = rag_result.get("answer", "")
    cited_filenames = set(re.findall(r'\[([^\[\]]+)\]', answer))

    # Only include sources whose filename is actually cited in the answer
    sources = []
    seen = set()
    for doc in rag_result.get("documents", []):
        metadata = getattr(doc, "metadata", {}) or {}
        path = metadata.get("source_path")
        if path:
            filename = os.path.basename(path)
            if filename in cited_filenames and path not in seen:
                sources.append(path)
                seen.add(path)
        if len(sources) == 5:
            break

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
    # Extract the message from the request
    message = data.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        # Use the LLM router directly to generate a title
        llm_prompt = f"{TITLE_SYSTEM_MESSAGE}\n\nUser message: {message}\n\nTitle:"
        
        # Direct LLM invocation without RAG retrieval
        from rag_engine.retrieval.llm_router import LLMRouter
        
        router = LLMRouter()
        llm = router.route(llm_prompt)
        
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
