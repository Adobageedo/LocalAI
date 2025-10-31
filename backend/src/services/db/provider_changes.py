"""
Provider Changes Database Model
This module provides a model class for tracking changes to provider data (documents, emails, etc.)
"""

import uuid
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import json

from .postgres_manager import PostgresManager

class ProviderChange:
    """Model class for provider_changes table"""
    
    def __init__(self, 
                 id: Union[str, uuid.UUID] = None,
                 change_date: Optional[datetime] = None,
                 provider: str = None,
                 user_id: str = None,
                 change_type: str = None,
                 item_id: Optional[str] = None,
                 details: Optional[Dict[str, Any]] = None,
                 created_at: Optional[datetime] = None):
        """
        Initialize a ProviderChange object
        
        Args:
            id: Unique identifier for the change record
            change_date: Date when the change was made
            provider: Provider name (gdrive, gmail, outlook, onedrive, etc.)
            user_id: User identifier
            change_type: Type of change (add, remove, modify, create)
            item_id: ID of the item that was modified/created
            details: Additional details about the change
            created_at: Record creation timestamp
        """
        self.id = id or str(uuid.uuid4())
        self.change_date = change_date or datetime.now()
        self.provider = provider
        self.user_id = user_id
        self.change_type = change_type
        self.item_id = item_id
        self.details = details or {}
        self.created_at = created_at or datetime.now()
    
    @classmethod
    def create(cls, 
               provider: str,
               user_id: str,
               change_type: str,
               item_id: Optional[str] = None,
               details: Optional[Dict[str, Any]] = None) -> 'ProviderChange':
        """
        Create a new provider change record in the database
        
        Args:
            provider: Provider name (gdrive, gmail, outlook, onedrive, etc.)
            user_id: User identifier
            change_type: Type of change (add, remove, modify, create)
            item_id: ID of the item that was modified/created
            details: Additional details about the change
            
        Returns:
            ProviderChange object
        """
        db = PostgresManager()
        
        # Convert details to JSON if provided
        details_json = json.dumps(details) if details else None
        
        query = """
            INSERT INTO provider_changes 
            (provider, user_id, change_type, item_id, details)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, change_date, created_at
        """
        
        result = db.execute_query(
            query, 
            (provider, user_id, change_type, item_id, details_json),
            fetch_one=True
        )
        
        if not result:
            raise Exception("Failed to create provider change record")
        
        # Create and return the object with the database-generated values
        return cls(
            id=result['id'],
            change_date=result['change_date'],
            provider=provider,
            user_id=user_id,
            change_type=change_type,
            item_id=item_id,
            details=details,
            created_at=result['created_at']
        )
    
    @classmethod
    def get_by_id(cls, change_id: Union[str, uuid.UUID]) -> Optional['ProviderChange']:
        """
        Get a provider change record by ID
        
        Args:
            change_id: ID of the change record
            
        Returns:
            ProviderChange object or None if not found
        """
        db = PostgresManager()
        query = """
            SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at
            FROM provider_changes
            WHERE id = %s
        """
        
        result = db.execute_query(query, (change_id,), fetch_one=True)
        
        if not result:
            return None
            
        # Parse JSON details
        details = json.loads(result['details']) if result['details'] else {}
        
        return cls(
            id=result['id'],
            change_date=result['change_date'],
            provider=result['provider'],
            user_id=result['user_id'],
            change_type=result['change_type'],
            item_id=result['item_id'],
            details=details,
            created_at=result['created_at']
        )
    
    @classmethod
    def get_by_user_id(cls, user_id: str, limit: int = 100) -> List['ProviderChange']:
        """
        Get provider change records for a specific user
        
        Args:
            user_id: User identifier
            limit: Maximum number of records to return
            
        Returns:
            List of ProviderChange objects
        """
        db = PostgresManager()
        query = """
            SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at
            FROM provider_changes
            WHERE user_id = %s
            ORDER BY change_date DESC
            LIMIT %s
        """
        
        results = db.execute_query(query, (user_id, limit))
        
        if not results:
            return []
            
        changes = []
        for result in results:
            # Parse JSON details
            details = json.loads(result['details']) if result['details'] else {}
            
            changes.append(cls(
                id=result['id'],
                change_date=result['change_date'],
                provider=result['provider'],
                user_id=result['user_id'],
                change_type=result['change_type'],
                item_id=result['item_id'],
                details=details,
                created_at=result['created_at']
            ))
            
        return changes
    
    @classmethod
    def get_by_provider(cls, provider: str, limit: int = 100) -> List['ProviderChange']:
        """
        Get provider change records for a specific provider
        
        Args:
            provider: Provider name
            limit: Maximum number of records to return
            
        Returns:
            List of ProviderChange objects
        """
        db = PostgresManager()
        query = """
            SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at
            FROM provider_changes
            WHERE provider = %s
            ORDER BY change_date DESC
            LIMIT %s
        """
        
        results = db.execute_query(query, (provider, limit))
        
        if not results:
            return []
            
        changes = []
        for result in results:
            # Parse JSON details
            details = json.loads(result['details']) if result['details'] else {}
            
            changes.append(cls(
                id=result['id'],
                change_date=result['change_date'],
                provider=result['provider'],
                user_id=result['user_id'],
                change_type=result['change_type'],
                item_id=result['item_id'],
                details=details,
                created_at=result['created_at']
            ))
            
        return changes
    
    @classmethod
    def get_by_item_id(cls, item_id: str) -> List['ProviderChange']:
        """
        Get provider change records for a specific item
        
        Args:
            item_id: Item identifier
            
        Returns:
            List of ProviderChange objects
        """
        db = PostgresManager()
        query = """
            SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at
            FROM provider_changes
            WHERE item_id = %s
            ORDER BY change_date DESC
        """
        
        results = db.execute_query(query, (item_id,))
        
        if not results:
            return []
            
        changes = []
        for result in results:
            # Parse JSON details
            details = json.loads(result['details']) if result['details'] else {}
            
            changes.append(cls(
                id=result['id'],
                change_date=result['change_date'],
                provider=result['provider'],
                user_id=result['user_id'],
                change_type=result['change_type'],
                item_id=result['item_id'],
                details=details,
                created_at=result['created_at']
            ))
            
        return changes
    
    @classmethod
    def get_recent_changes(cls, limit: int = 100) -> List['ProviderChange']:
        """
        Get recent provider change records
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            List of ProviderChange objects
        """
        db = PostgresManager()
        query = """
            SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at
            FROM provider_changes
            ORDER BY change_date DESC
            LIMIT %s
        """
        
        results = db.execute_query(query, (limit,))
        
        if not results:
            return []
            
        changes = []
        for result in results:
            # Parse JSON details
            details = json.loads(result['details']) if result['details'] else {}
            
            changes.append(cls(
                id=result['id'],
                change_date=result['change_date'],
                provider=result['provider'],
                user_id=result['user_id'],
                change_type=result['change_type'],
                item_id=result['item_id'],
                details=details,
                created_at=result['created_at']
            ))
            
        return changes
    
    @classmethod
    def search(cls, 
               provider: Optional[str] = None,
               user_id: Optional[str] = None,
               change_type: Optional[str] = None,
               start_date: Optional[datetime] = None,
               end_date: Optional[datetime] = None,
               limit: int = 100) -> List['ProviderChange']:
        """
        Search for provider change records with various filters
        
        Args:
            provider: Provider name filter
            user_id: User identifier filter
            change_type: Change type filter
            start_date: Start date filter
            end_date: End date filter
            limit: Maximum number of records to return
            
        Returns:
            List of ProviderChange objects
        """
        db = PostgresManager()
        
        # Build the query dynamically based on provided filters
        query_parts = ["SELECT id, change_date, provider, user_id, change_type, item_id, details, created_at FROM provider_changes"]
        where_clauses = []
        params = []
        
        if provider:
            where_clauses.append("provider = %s")
            params.append(provider)
            
        if user_id:
            where_clauses.append("user_id = %s")
            params.append(user_id)
            
        if change_type:
            where_clauses.append("change_type = %s")
            params.append(change_type)
            
        if start_date:
            where_clauses.append("change_date >= %s")
            params.append(start_date)
            
        if end_date:
            where_clauses.append("change_date <= %s")
            params.append(end_date)
            
        if where_clauses:
            query_parts.append("WHERE " + " AND ".join(where_clauses))
            
        query_parts.append("ORDER BY change_date DESC")
        query_parts.append("LIMIT %s")
        params.append(limit)
        
        query = " ".join(query_parts)
        
        results = db.execute_query(query, params)
        
        if not results:
            return []
            
        changes = []
        for result in results:
            # Parse JSON details
            details = json.loads(result['details']) if result['details'] else {}
            
            changes.append(cls(
                id=result['id'],
                change_date=result['change_date'],
                provider=result['provider'],
                user_id=result['user_id'],
                change_type=result['change_type'],
                item_id=result['item_id'],
                details=details,
                created_at=result['created_at']
            ))
            
        return changes
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert provider change object to dictionary
        
        Returns:
            Dictionary representation of the provider change
        """
        return {
            "id": self.id,
            "change_date": self.change_date.isoformat() if self.change_date else None,
            "provider": self.provider,
            "user_id": self.user_id,
            "change_type": self.change_type,
            "item_id": self.item_id,
            "details": self.details,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def log_change(cls, provider: str, user_id: str, change_type: str, 
                  item_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> 'ProviderChange':
        """
        Convenience method to log a provider change
        
        Args:
            provider: Provider name (gdrive, gmail, outlook, onedrive, etc.)
            user_id: User identifier
            change_type: Type of change (add, remove, modify, create)
            item_id: ID of the item that was modified/created
            details: Additional details about the change
            
        Returns:
            ProviderChange object
        """
        return cls.create(
            provider=provider,
            user_id=user_id,
            change_type=change_type,
            item_id=item_id,
            details=details
        )
