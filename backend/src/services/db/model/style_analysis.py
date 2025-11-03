from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import uuid
from ..postgres_manager import PostgresManager

class StyleAnalysis:
    """Model class for style_analysis table"""
    
    def __init__(self, id: Union[str, uuid.UUID], user_id: str, provider: str,
                 style_analysis: str, email_count: int,
                 analysis_date: Optional[datetime] = None,
                 created_at: Optional[datetime] = None,
                 updated_at: Optional[datetime] = None):
        self.id = id
        self.user_id = user_id
        self.provider = provider  # 'outlook' or 'gmail'
        self.style_analysis = style_analysis
        self.email_count = email_count
        self.analysis_date = analysis_date or datetime.now()
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
    
    @classmethod
    def create(cls, user_id: str, provider: str, style_analysis: str, email_count: int,
               analysis_date: Optional[datetime] = None) -> 'StyleAnalysis':
        """Create a new tone profile record in the database"""
        profile_id = str(uuid.uuid4())
        analysis_date = analysis_date or datetime.now()
        
        db = PostgresManager()
        query = """
            INSERT INTO tone_profiles (id, user_id, provider, style_analysis, email_count, analysis_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, provider, style_analysis, email_count, analysis_date, created_at, updated_at
        """
        result = db.execute_query(query, (profile_id, user_id, provider, style_analysis, email_count, analysis_date), fetch_one=True)
        
        if result:
            return cls(**result)
        return None
    
    @classmethod
    def get_by_user_and_provider(cls, user_id: str, provider: str) -> Optional['StyleAnalysis']:
        """Get tone profile by user ID and provider"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, provider, style_analysis, email_count, analysis_date, created_at, updated_at
            FROM tone_profiles
            WHERE user_id = %s AND provider = %s
            ORDER BY created_at DESC
            LIMIT 1
        """
        result = db.execute_query(query, (user_id, provider), fetch_one=True)
        return cls(**result) if result else None
    
    @classmethod
    def get_by_user_id(cls, user_id: str) -> List['StyleAnalysis']:
        """Get all tone profiles for a user"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, provider, style_analysis, email_count, analysis_date, created_at, updated_at
            FROM tone_profiles
            WHERE user_id = %s
            ORDER BY created_at DESC
        """
        results = db.execute_query(query, (user_id,))
        return [cls(**row) for row in results] if results else []
    
    @classmethod
    def get_all(cls) -> List['StyleAnalysis']:
        """Get all tone profiles"""
        db = PostgresManager()
        query = """
            SELECT id, user_id, provider, style_analysis, email_count, analysis_date, created_at, updated_at
            FROM tone_profiles
            ORDER BY created_at DESC
        """
        results = db.execute_query(query)
        return [cls(**row) for row in results] if results else []
    
    def update(self, style_analysis: Optional[str] = None, email_count: Optional[int] = None) -> bool:
        """Update tone profile information"""
        updates = {}
        if style_analysis is not None:
            updates['style_analysis'] = style_analysis
        if email_count is not None:
            updates['email_count'] = email_count
            
        if not updates:
            return True
            
        # Always update the updated_at timestamp
        updates['updated_at'] = datetime.now()
        
        db = PostgresManager()
        query_parts = [f"{field} = %s" for field in updates.keys()]
        query = f"""
            UPDATE tone_profiles
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
        """Delete tone profile record"""
        db = PostgresManager()
        query = """
            DELETE FROM tone_profiles
            WHERE id = %s
        """
        db.execute_query(query, (self.id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tone profile object to dictionary"""
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "provider": self.provider,
            "style_analysis": self.style_analysis,
            "email_count": self.email_count,
            "analysis_date": self.analysis_date.isoformat() if self.analysis_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }