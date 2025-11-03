from typing import List, Dict, Any, Optional, Union
from datetime import datetime

from ..postgres_manager import PostgresManager

class UserPreferences:
    """Model class for user_preferences table"""
    
    def __init__(self, id: int, user_id: str, language: str = 'en', 
                 dark_mode: bool = False, email_notifications: bool = False,
                 personnal_style_analysis: bool = False, use_meeting_scripts: bool = False,
                 use_own_documents: bool = True, created_at: Optional[datetime] = None,
                 updated_at: Optional[datetime] = None):
        self.id = id
        self.user_id = user_id
        self.language = language
        self.dark_mode = dark_mode
        self.email_notifications = email_notifications
        self.personnal_style_analysis = personnal_style_analysis
        self.use_meeting_scripts = use_meeting_scripts
        self.use_own_documents = use_own_documents
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
    
    @classmethod
    def create(cls, user_id: str, language: str = 'en', dark_mode: bool = False,
               email_notifications: bool = False, personnal_style_analysis: bool = False,
               use_meeting_scripts: bool = False, use_own_documents: bool = True) -> Optional['UserPreferences']:
        """Create a new user preferences record"""
        db = PostgresManager()
        query = """
            INSERT INTO user_preferences (user_id, language, dark_mode, email_notifications, 
                                        personnal_style_analysis, use_meeting_scripts, use_own_documents)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, language, dark_mode, email_notifications, 
                     personnal_style_analysis, use_meeting_scripts, use_own_documents, 
                     created_at, updated_at
        """
        result = db.execute_query(query, (user_id, language, dark_mode, email_notifications,
                                        personnal_style_analysis, use_meeting_scripts, use_own_documents), 
                                fetch_one=True)
        
        if result:
            return cls(**result)
        return None
    
    @classmethod
    def get_by_user_id(cls, user_id: str) -> Optional['UserPreferences']:
        """Get user preferences by user ID"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, language, dark_mode, email_notifications, 
                   personnal_style_analysis, use_meeting_scripts, use_own_documents, 
                   created_at, updated_at
            FROM user_preferences
            WHERE user_id = %s
        """
        result = db.execute_query(query, (user_id,), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_id(cls, preferences_id: int) -> Optional['UserPreferences']:
        """Get user preferences by ID"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, language, dark_mode, email_notifications, 
                   personnal_style_analysis, use_meeting_scripts, use_own_documents, 
                   created_at, updated_at
            FROM user_preferences
            WHERE id = %s
        """
        result = db.execute_query(query, (preferences_id,), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_all(cls) -> List['UserPreferences']:
        """Get all user preferences"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, language, dark_mode, email_notifications, 
                   personnal_style_analysis, use_meeting_scripts, use_own_documents, 
                   created_at, updated_at
            FROM user_preferences
            ORDER BY created_at DESC
        """
        results = db.execute_query(query)
        return [cls(**row) for row in results] if results else []
    
    def update(self, language: Optional[str] = None, dark_mode: Optional[bool] = None,
               email_notifications: Optional[bool] = None, personnal_style_analysis: Optional[bool] = None,
               use_meeting_scripts: Optional[bool] = None, use_own_documents: Optional[bool] = None) -> bool:
        """Update user preferences"""
        updates = {}
        if language is not None:
            updates['language'] = language
        if dark_mode is not None:
            updates['dark_mode'] = dark_mode
        if email_notifications is not None:
            updates['email_notifications'] = email_notifications
        if personnal_style_analysis is not None:
            updates['personnal_style_analysis'] = personnal_style_analysis
        if use_meeting_scripts is not None:
            updates['use_meeting_scripts'] = use_meeting_scripts
        if use_own_documents is not None:
            updates['use_own_documents'] = use_own_documents
            
        if not updates:
            return True
            
        # Always update the updated_at timestamp
        updates['updated_at'] = datetime.now()
        
        db = PostgresManager()
        query_parts = [f"{field} = %s" for field in updates.keys()]
        query = f"""
            UPDATE user_preferences
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
        """Delete user preferences record"""
        db = PostgresManager()
        query = """
            DELETE FROM user_preferences
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user preferences object to dictionary"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "language": self.language,
            "dark_mode": self.dark_mode,
            "email_notifications": self.email_notifications,
            "personnal_style_analysis": self.personnal_style_analysis,
            "use_meeting_scripts": self.use_meeting_scripts,
            "use_own_documents": self.use_own_documents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }