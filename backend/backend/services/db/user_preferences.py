"""
User Preferences Database Model
This module provides the UserPreferences class for managing user preferences in PostgreSQL
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime
from backend.core.logger import log
from .postgres_manager import PostgresManager
logger = log.bind(name="backend.services.db.user_preferences")

class UserPreferences:
    """Model class for user_preferences table"""
    
    def __init__(self):
        self.db = PostgresManager()
    
    def save_user_classification_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """
        Save or update user's email classification preferences
        
        Args:
            user_id: User identifier
            preferences: Dictionary of classification preferences
            
        Returns:
            Boolean indicating success
        """
        try:
            # Convert preferences to JSON
            preferences_json = json.dumps(preferences)
            
            # Check if preferences already exist for this user
            check_query = "SELECT user_id FROM user_preferences WHERE user_id = %s"
            result = self.db.execute_query(check_query, (user_id,), fetch_one=True)
            
            if result:
                # Update existing preferences
                update_query = """
                    UPDATE user_preferences 
                    SET preferences = %s, updated_at = NOW()
                    WHERE user_id = %s
                """
                self.db.execute_query(update_query, (preferences_json, user_id))
            else:
                # Insert new preferences
                insert_query = """
                    INSERT INTO user_preferences 
                    (user_id, preferences, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                """
                self.db.execute_query(insert_query, (user_id, preferences_json))
            
            return True
        except Exception as e:
            logger.error(f"Error saving user classification preferences: {e}")
            return False
    
    def get_user_classification_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve user's email classification preferences
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary of classification preferences or None if not found
        """
        try:
            query = "SELECT preferences FROM user_preferences WHERE user_id = %s"
            result = self.db.execute_query(query, (user_id,), fetch_one=True)
            if result and result.get("preferences"):
                return result["preferences"]
            return None
        except Exception as e:
            logger.error(f"Error retrieving user classification preferences: {e}")
            return None
    
    def start(self, user_id: str, language: str = "fr", dark_mode: bool = False,
                 email_notifications: bool = False, mail_server: Optional[str] = None,
                 mail_username: Optional[str] = None, mail_password: Optional[str] = None,
                 mail_imap_port: Optional[int] = 993, mail_smtp_port: Optional[int] = 465,
                 mail_security: str = "ssl", created_at: Optional[datetime] = None, 
                 updated_at: Optional[datetime] = None):
        self.user_id = user_id
        self.language = language
        self.dark_mode = dark_mode
        self.email_notifications = email_notifications
        self.mail_server = mail_server
        self.mail_username = mail_username
        self.mail_password = mail_password
        self.mail_imap_port = mail_imap_port
        self.mail_smtp_port = mail_smtp_port
        self.mail_security = mail_security
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()
    
    @classmethod
    def create_table_if_not_exists(cls):
        """Create the user_preferences table if it doesn't exist"""
        db = PostgresManager()
        query = """
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id VARCHAR(255) PRIMARY KEY,
                language VARCHAR(10) NOT NULL DEFAULT 'fr',
                dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
                email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
                mail_server VARCHAR(255),
                mail_username VARCHAR(255),
                mail_password VARCHAR(255),
                mail_imap_port INTEGER,
                mail_smtp_port INTEGER,
                mail_security VARCHAR(20) DEFAULT 'ssl',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """
        db.execute_query(query)
        return True
    
    @classmethod
    def get_by_user_id(cls, user_id: str):
        """Get preferences for a user. If none exist, returns default preferences."""
        db = PostgresManager()
        query = """
            SELECT 
                user_id, language, dark_mode, email_notifications,
                mail_server, mail_username, mail_password,
                mail_imap_port, mail_smtp_port, mail_security,
                created_at, updated_at
            FROM user_preferences
            WHERE user_id = %s
        """
        result = db.execute_query(query, (user_id,), fetch_one=True)
        
        if result:
            return cls(**result)
        else:
            # Return default preferences
            return cls(user_id=user_id)
    
    def save(self) -> bool:
        """Save or update preferences"""
        db = PostgresManager()
        
        # Update timestamp
        self.updated_at = datetime.now()
        
        query = """
            INSERT INTO user_preferences (
                user_id, language, dark_mode, email_notifications,
                mail_server, mail_username, mail_password,
                mail_imap_port, mail_smtp_port, mail_security,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (user_id) DO UPDATE SET
                language = EXCLUDED.language,
                dark_mode = EXCLUDED.dark_mode,
                email_notifications = EXCLUDED.email_notifications,
                mail_server = EXCLUDED.mail_server,
                mail_username = EXCLUDED.mail_username,
                mail_password = EXCLUDED.mail_password,
                mail_imap_port = EXCLUDED.mail_imap_port,
                mail_smtp_port = EXCLUDED.mail_smtp_port,
                mail_security = EXCLUDED.mail_security,
                updated_at = NOW()
        """
        
        db.execute_query(query, (
            self.user_id, self.language, self.dark_mode, self.email_notifications,
            self.mail_server, self.mail_username, self.mail_password,
            self.mail_imap_port, self.mail_smtp_port, self.mail_security,
            self.created_at, self.updated_at
        ))
        return True
    
    def delete(self) -> bool:
        """Delete user preferences"""
        db = PostgresManager()
        query = """
            DELETE FROM user_preferences
            WHERE user_id = %s
        """
        db.execute_query(query, (self.user_id,))
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert preferences to dictionary"""
        return {
            "language": self.language,
            "darkMode": self.dark_mode,
            "emailNotifications": self.email_notifications,
            "mailServer": self.mail_server,
            "mailUsername": self.mail_username,
            "mailPassword": self.mail_password,
            "mailImapPort": self.mail_imap_port,
            "mailSmtpPort": self.mail_smtp_port,
            "mailSecurity": self.mail_security,
        }
    
    @classmethod
    def from_dict(cls, user_id: str, data: Dict[str, Any]):
        """Create preferences from dictionary"""
        return cls(
            user_id=user_id,
            language=data.get("language", "fr"),
            dark_mode=data.get("darkMode", False),
            email_notifications=data.get("emailNotifications", False),
            mail_server=data.get("mailServer"),
            mail_username=data.get("mailUsername"),
            mail_password=data.get("mailPassword"),
            mail_imap_port=data.get("mailImapPort", 993),
            mail_smtp_port=data.get("mailSmtpPort", 465),
            mail_security=data.get("mailSecurity", "ssl")
        )
