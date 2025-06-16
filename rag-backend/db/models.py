"""
PostgreSQL Database Models
This module provides model classes for the PostgreSQL database tables:
- User: For managing user records
- Conversation: For managing chat conversations
- ChatMessage: For managing individual messages within conversations
- SyncStatus: For tracking synchronization operations
"""

import uuid
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import json

from .postgres_manager import PostgresManager

class User:
    """Model class for users table"""
    
    def __init__(self, id: str, email: str, name: Optional[str] = None, 
                phone: Optional[str] = None, created_at: Optional[datetime] = None):
        self.id = id
        self.email = email
        self.name = name
        self.phone = phone
        self.created_at = created_at or datetime.now()
    
    @classmethod
    def create(cls, id: str, email: str, name: Optional[str] = None, phone: Optional[str] = None) -> 'User':
        """Create a new user record in the database"""
        db = PostgresManager()
        query = """
            INSERT INTO users (id, email, name, phone)
            VALUES (%s, %s, %s, %s)
        """
        db.execute_query(query, (id, email, name, phone))
        return cls(id=id, email=email, name=name, phone=phone)
    
    @classmethod
    def get_by_id(cls, user_id: str) -> Optional['User']:
        """Get a user by their ID"""
        db = PostgresManager()
        query = """
            SELECT id, email, name, phone, created_at
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
            SELECT id, email, name, phone, created_at
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
            SELECT id, email, name, phone, created_at
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
            "phone": self.phone,
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


class SyncStatus:
    """Model class for sync_status table to track synchronization operations"""
    
    def __init__(self, id: Union[str, uuid.UUID], user_id: str, source_type: str,
                last_sync_attempt: Optional[datetime] = None,
                last_successful_sync: Optional[datetime] = None,
                status: str = "pending",
                items_processed: int = 0,
                items_succeeded: int = 0,
                items_failed: int = 0,
                error_details: Optional[str] = None,
                metadata: Optional[Dict[str, Any]] = None,
                created_at: Optional[datetime] = None,
                updated_at: Optional[datetime] = None):
        self.id = str(id) if isinstance(id, uuid.UUID) else id
        self.user_id = user_id
        self.source_type = source_type
        self.last_sync_attempt = last_sync_attempt or datetime.now()
        self.last_successful_sync = last_successful_sync
        self.status = status
        self.items_processed = items_processed
        self.items_succeeded = items_succeeded
        self.items_failed = items_failed
        self.error_details = error_details
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
    
    @classmethod
    def create(cls, user_id: str, source_type: str, status: str = "pending",
              metadata: Optional[Dict[str, Any]] = None) -> 'SyncStatus':
        """Create a new sync status record in the database"""
        db = PostgresManager()
        query = """
            INSERT INTO sync_status (
                user_id, source_type, status, metadata
            ) VALUES (%s, %s, %s, %s)
            RETURNING id, user_id, source_type, last_sync_attempt, 
                      last_successful_sync, status, items_processed, 
                      items_succeeded, items_failed, error_details, 
                      metadata, created_at, updated_at
        """
        metadata_json = json.dumps(metadata) if metadata else '{}'
        result = db.execute_query(
            query, 
            (user_id, source_type, status, metadata_json), 
            fetch_one=True
        )
        return cls(**result) if result else None
    
    @classmethod
    def get_by_id(cls, sync_id: Union[str, uuid.UUID]) -> Optional['SyncStatus']:
        """Get a sync status record by ID"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, source_type, last_sync_attempt, 
                   last_successful_sync, status, items_processed, 
                   items_succeeded, items_failed, error_details, 
                   metadata, created_at, updated_at
            FROM sync_status
            WHERE id = %s
        """
        result = db.execute_query(query, (str(sync_id),), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_user_source(cls, user_id: str, source_type: str) -> Optional['SyncStatus']:
        """Get the latest sync status for a specific user and source type"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, source_type, last_sync_attempt, 
                   last_successful_sync, status, items_processed, 
                   items_succeeded, items_failed, error_details, 
                   metadata, created_at, updated_at
            FROM sync_status
            WHERE user_id = %s AND source_type = %s
            ORDER BY last_sync_attempt DESC
            LIMIT 1
        """
        result = db.execute_query(query, (user_id, source_type), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_user_id(cls, user_id: str) -> List['SyncStatus']:
        """Get all sync status records for a user"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, source_type, last_sync_attempt, 
                   last_successful_sync, status, items_processed, 
                   items_succeeded, items_failed, error_details, 
                   metadata, created_at, updated_at
            FROM sync_status
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        results = db.execute_query(query, (user_id,))
        return [cls(**row) for row in results] if results else []
    
    @classmethod
    def get_latest_by_user_and_source(cls, user_id: str, source_type: str) -> Optional['SyncStatus']:
        """Get the latest sync status for a user and source type"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, source_type, last_sync_attempt, 
                   last_successful_sync, status, items_processed, 
                   items_succeeded, items_failed, error_details, 
                   metadata, created_at, updated_at
            FROM sync_status
            WHERE user_id = %s AND source_type = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        result = db.execute_query(query, (user_id, source_type), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_all_by_user(cls, user_id: str) -> List['SyncStatus']:
        """Get all sync status records for a user (alias for get_by_user_id)"""
        return cls.get_by_user_id(user_id)
    
    @classmethod
    def update(cls, id: Union[str, uuid.UUID], 
              status: Optional[str] = None,
              details: Optional[Dict[str, Any]] = None, 
              error: Optional[str] = None) -> Optional['SyncStatus']:
        """Update a sync status record (static method)"""
        updates = {}
        values = []
        
        if status:
            updates['status'] = '%s'
            values.append(status)
        
        if details is not None:
            updates['details'] = '%s'
            values.append(json.dumps(details))
            
        if error is not None:
            updates['error'] = '%s'
            values.append(error)
        
        # Always update the timestamp
        updates['updated_at'] = 'NOW()'
        
        # Build the query
        query_parts = [f"{field} = {val if val == 'NOW()' else '%s'}" 
                      for field, val in updates.items()]
        
        if not query_parts:
            return None
            
        query = f"""
            UPDATE sync_status
            SET {', '.join(query_parts)}
            WHERE id = %s
            RETURNING id, user_id, source_type, status, details, error, created_at, updated_at
        """
        
        # Add the id parameter to the values list
        values.append(id)
        
        # Execute the query
        db = PostgresManager()
        result = db.execute_query(query, values, fetch_one=True)
        
        # Return updated object
        return cls(**result) if result else None
    
    def update_status(self, status: str, 
                     items_processed: Optional[int] = None,
                     items_succeeded: Optional[int] = None,
                     items_failed: Optional[int] = None,
                     error_details: Optional[str] = None,
                     metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update sync operation status"""
        updates = {'status': status, 'updated_at': 'NOW()'}
        values = [status]
        
        # Update last_successful_sync if completed
        if status == 'completed':
            updates['last_successful_sync'] = 'NOW()'
        
        if items_processed is not None:
            updates['items_processed'] = items_processed
            values.append(items_processed)
        
        if items_succeeded is not None:
            updates['items_succeeded'] = items_succeeded
            values.append(items_succeeded)
            
        if items_failed is not None:
            updates['items_failed'] = items_failed
            values.append(items_failed)
            
        if error_details is not None:
            updates['error_details'] = error_details
            values.append(error_details)
            
        if metadata is not None:
            updates['metadata'] = json.dumps(metadata)
            values.append(json.dumps(metadata))
            
        # Build the query
        query_parts = [f"{field} = {val if val == 'NOW()' else '%s'}" 
                      for field, val in updates.items()]
        query = f"""
            UPDATE sync_status
            SET {', '.join(query_parts)}
            WHERE id = %s
            RETURNING id, user_id, source_type, last_sync_attempt, 
                      last_successful_sync, status, items_processed, 
                      items_succeeded, items_failed, error_details, 
                      metadata, created_at, updated_at
        """
        
        # Remove NOW() placeholders from values as they're directly in the query
        values = [v for v in values if v != 'NOW()']
        values.append(self.id)
        
        # Execute the query
        db = PostgresManager()
        result = db.execute_query(query, values, fetch_one=True)
        
        # Update object with new values
        if result:
            for key, value in result.items():
                setattr(self, key, value)
            return True
        return False
    
    def start_sync(self) -> bool:
        """Mark sync operation as started"""
        return self.update_status('in_progress')
    
    def complete_sync(self, items_processed: int, items_succeeded: int, 
                     items_failed: int = 0) -> bool:
        """Mark sync operation as completed"""
        return self.update_status(
            'completed', 
            items_processed=items_processed,
            items_succeeded=items_succeeded,
            items_failed=items_failed
        )
    
    def fail_sync(self, error_details: str, items_processed: int = 0,
                 items_succeeded: int = 0, items_failed: int = 0) -> bool:
        """Mark sync operation as failed"""
        return self.update_status(
            'failed', 
            items_processed=items_processed,
            items_succeeded=items_succeeded,
            items_failed=items_failed,
            error_details=error_details
        )
    
    def delete(self) -> bool:
        """Delete sync status record"""
        db = PostgresManager()
        query = """
            DELETE FROM sync_status
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert sync status object to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "source_type": self.source_type,
            "last_sync_attempt": self.last_sync_attempt.isoformat() if self.last_sync_attempt else None,
            "last_successful_sync": self.last_successful_sync.isoformat() if self.last_successful_sync else None,
            "status": self.status,
            "items_processed": self.items_processed,
            "items_succeeded": self.items_succeeded,
            "items_failed": self.items_failed,
            "error_details": self.error_details,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
