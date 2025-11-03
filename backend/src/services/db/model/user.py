from typing import List, Dict, Any, Optional, Union
from datetime import datetime

from ..postgres_manager import PostgresManager


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
    
    def update(self, email: Optional[str] = None, name: Optional[str] = None, phone: Optional[str] = None) -> bool:
        """Update user information"""
        updates = {}
        if email:
            updates['email'] = email
        if name is not None:
            updates['name'] = name
        if phone is not None:
            updates['phone'] = phone
            
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
