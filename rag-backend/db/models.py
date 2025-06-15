"""
PostgreSQL Database Models
This module provides model classes for the PostgreSQL database tables:
- User: For managing user records
- Conversation: For managing chat conversations
- ChatMessage: For managing individual messages within conversations
"""

import uuid
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import json

from .postgres_manager import PostgresManager

class User:
    """Model class for users table"""
    
    def __init__(self, id: str, email: str, name: Optional[str] = None, 
                created_at: Optional[datetime] = None):
        self.id = id
        self.email = email
        self.name = name
        self.created_at = created_at or datetime.now()
    
    @classmethod
    def create(cls, id: str, email: str, name: Optional[str] = None) -> 'User':
        """Create a new user record in the database"""
        db = PostgresManager()
        query = """
            INSERT INTO users (id, email, name)
            VALUES (%s, %s, %s)
            RETURNING id, email, name, created_at
        """
        result = db.execute_query(query, (id, email, name), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_id(cls, user_id: str) -> Optional['User']:
        """Get a user by their ID"""
        db = PostgresManager()
        query = """
            SELECT id, email, name, created_at
            FROM users
            WHERE id = %s
        """
        result = db.execute_query(query, (user_id,), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_email(cls, email: str) -> Optional['User']:
        """Get a user by their email"""
        db = PostgresManager()
        query = """
            SELECT id, email, name, created_at
            FROM users
            WHERE email = %s
        """
        result = db.execute_query(query, (email,), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_all(cls) -> List['User']:
        """Get all users"""
        db = PostgresManager()
        query = """
            SELECT id, email, name, created_at
            FROM users
            ORDER BY created_at DESC
        """
        results = db.execute_query(query)
        return [cls(**row) for row in results] if results else []
    
    def update(self, email: Optional[str] = None, name: Optional[str] = None) -> bool:
        """Update user information"""
        updates = {}
        if email:
            updates['email'] = email
        if name is not None:
            updates['name'] = name
            
        if not updates:
            return True
            
        db = PostgresManager()
        query_parts = [f"{field} = %s" for field in updates.keys()]
        query = f"""
            UPDATE users
            SET {', '.join(query_parts)}
            WHERE id = %s
        """
        params = list(updates.values()) + [self.id]
        
        db.execute_query(query, params)
        
        # Update object attributes
        for key, value in updates.items():
            setattr(self, key, value)
            
        return True
    
    def delete(self) -> bool:
        """Delete user record"""
        db = PostgresManager()
        query = """
            DELETE FROM users
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user object to dictionary"""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Conversation:
    """Model class for conversations table"""
    
    def __init__(self, id: Union[str, uuid.UUID], user_id: str, name: str,
                created_at: Optional[datetime] = None, 
                updated_at: Optional[datetime] = None):
        self.id = str(id) if isinstance(id, uuid.UUID) else id
        self.user_id = user_id
        self.name = name
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
    
    @classmethod
    def create(cls, user_id: str, name: str) -> 'Conversation':
        """Create a new conversation"""
        db = PostgresManager()
        query = """
            INSERT INTO conversations (user_id, name)
            VALUES (%s, %s)
            RETURNING id, user_id, name, created_at, updated_at
        """
        result = db.execute_query(query, (user_id, name), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_id(cls, conversation_id: Union[str, uuid.UUID]) -> Optional['Conversation']:
        """Get a conversation by ID"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, name, created_at, updated_at
            FROM conversations
            WHERE id = %s
        """
        result = db.execute_query(query, (str(conversation_id),), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_user_id(cls, user_id: str) -> List['Conversation']:
        """Get all conversations for a user"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, name, created_at, updated_at
            FROM conversations
            WHERE user_id = %s
            ORDER BY updated_at DESC
        """
        results = db.execute_query(query, (user_id,))
        return [cls(**row) for row in results] if results else []
    
    def update(self, name: Optional[str] = None) -> bool:
        """Update conversation information"""
        if name is None:
            return True
            
        db = PostgresManager()
        query = """
            UPDATE conversations
            SET name = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING updated_at
        """
        result = db.execute_query(query, (name, self.id), fetch_one=True)
        
        if result:
            self.name = name
            self.updated_at = result['updated_at']
            return True
        return False
    
    def delete(self) -> bool:
        """Delete conversation and all associated messages"""
        db = PostgresManager()
        query = """
            DELETE FROM conversations
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert conversation object to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_messages(self) -> List['ChatMessage']:
        """Get all messages in this conversation"""
        return ChatMessage.get_by_conversation_id(self.id)


class ChatMessage:
    """Model class for chat_messages table"""
    
    def __init__(self, id: Union[str, uuid.UUID], conversation_id: Union[str, uuid.UUID], 
                user_id: str, role: str, message: str,
                sources: Optional[List[Dict[str, Any]]] = None,
                timestamp: Optional[datetime] = None):
        self.id = str(id) if isinstance(id, uuid.UUID) else id
        self.conversation_id = str(conversation_id) if isinstance(conversation_id, uuid.UUID) else conversation_id
        self.user_id = user_id
        self.role = role
        self.message = message
        self.sources = sources or []
        self.timestamp = timestamp or datetime.now()
    
    @classmethod
    def create(cls, conversation_id: Union[str, uuid.UUID], user_id: str, 
              role: str, message: str, 
              sources: Optional[List[Dict[str, Any]]] = None) -> 'ChatMessage':
        """Create a new chat message"""
        db = PostgresManager()
        query = """
            INSERT INTO chat_messages (conversation_id, user_id, role, message, sources)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, conversation_id, user_id, role, message, sources, timestamp
        """
        sources_json = json.dumps(sources) if sources else None
        result = db.execute_query(
            query, 
            (str(conversation_id), user_id, role, message, sources_json),
            fetch_one=True
        )
        
        # Also update the updated_at timestamp of the conversation
        update_query = """
            UPDATE conversations
            SET updated_at = NOW()
            WHERE id = %s
        """
        db.execute_query(update_query, (str(conversation_id),))
        
        return cls(**result) if result else None
    
    @classmethod
    def get_by_id(cls, message_id: Union[str, uuid.UUID]) -> Optional['ChatMessage']:
        """Get a message by ID"""
        db = PostgresManager()
        query = """
            SELECT id, conversation_id, user_id, role, message, sources, timestamp
            FROM chat_messages
            WHERE id = %s
        """
        result = db.execute_query(query, (str(message_id),), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_conversation_id(cls, conversation_id: Union[str, uuid.UUID]) -> List['ChatMessage']:
        """Get all messages in a conversation"""
        db = PostgresManager()
        query = """
            SELECT id, conversation_id, user_id, role, message, sources, timestamp
            FROM chat_messages
            WHERE conversation_id = %s
            ORDER BY timestamp
        """
        results = db.execute_query(query, (str(conversation_id),))
        return [cls(**row) for row in results] if results else []
    
    def update(self, message: Optional[str] = None, 
              sources: Optional[List[Dict[str, Any]]] = None) -> bool:
        """Update message information"""
        updates = {}
        if message is not None:
            updates['message'] = message
        if sources is not None:
            updates['sources'] = json.dumps(sources)
            
        if not updates:
            return True
            
        db = PostgresManager()
        query_parts = [f"{field} = %s" for field in updates.keys()]
        query = f"""
            UPDATE chat_messages
            SET {', '.join(query_parts)}
            WHERE id = %s
        """
        params = list(updates.values()) + [self.id]
        
        db.execute_query(query, params)
        
        # Update object attributes
        if message is not None:
            self.message = message
        if sources is not None:
            self.sources = sources
            
        return True
    
    def delete(self) -> bool:
        """Delete message"""
        db = PostgresManager()
        query = """
            DELETE FROM chat_messages
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message object to dictionary"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
            "role": self.role,
            "message": self.message,
            "sources": self.sources,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
