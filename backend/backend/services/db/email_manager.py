from typing import Dict, List, Optional, Any
import uuid
import json
from datetime import datetime

from backend.services.db.postgres_manager import PostgresManager
from backend.core.logger import log

logger = log.bind(name="backend.services.db.email_manager")

class EmailManager:
    """
    Manager for handling email content stored in the database.
    Provides methods to save, retrieve, and query email data.
    """
    
    def __init__(self):
        self.db = PostgresManager()
    
    def save_email(self, 
                         user_id: str,
                         email_id: str,
                         sender: str,
                         recipients: List[str], 
                         subject: str,
                         body: str,
                         sent_date: datetime,
                         source_type: str,
                         html_body: Optional[str] = None,
                         conversation_id: Optional[str] = None,
                         received_date: Optional[datetime] = None,
                         folder: Optional[str] = None,
                         attachments: Optional[List[Dict[str, Any]]] = None,
                         doc_id: Optional[uuid.UUID] = None,
                         metadata: Optional[Dict[str, Any]] = None) -> int:
        """
        Save email content to the database
        """
        try:
            # Convert Python objects to JSON strings for JSONB fields
            recipients_json = json.dumps(recipients)
            attachments_json = json.dumps(attachments) if attachments else None
            metadata_json = json.dumps(metadata) if metadata else None
            
            # Convert UUID to string if present
            doc_id_str = str(doc_id) if doc_id else None
            
            query = """
                INSERT INTO email_content (
                    user_id, email_id, conversation_id, sender, recipients, subject, body, html_body,
                    sent_date, received_date, folder, attachments, source_type, doc_id, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) 
                ON CONFLICT ON CONSTRAINT unique_email_content
                DO UPDATE SET
                    conversation_id = EXCLUDED.conversation_id,
                    sender = EXCLUDED.sender,
                    recipients = EXCLUDED.recipients,
                    subject = EXCLUDED.subject,
                    body = EXCLUDED.body,
                    html_body = EXCLUDED.html_body,
                    sent_date = EXCLUDED.sent_date,
                    received_date = EXCLUDED.received_date,
                    folder = EXCLUDED.folder,
                    attachments = EXCLUDED.attachments,
                    doc_id = EXCLUDED.doc_id,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id;
            """
            
            params = (
                user_id, email_id, conversation_id, sender, recipients_json, subject, body, html_body,
                sent_date, received_date, folder, attachments_json, source_type, doc_id_str, metadata_json
            )
            
            result = self.db.execute_query(query, params)
            if result and len(result) > 0:
                return result[0]['id']
            return None
        except Exception as e:
            logger.error(f"Error saving email to database: {e}")
            raise
    
    def get_emails_by_user(self, user_id: str, limit: int = 100, offset: int = 0, source_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve emails for a specific user
        """
        if source_type:
            query = """
                SELECT * FROM email_content 
                WHERE user_id = %s AND source_type = %s
                ORDER BY sent_date DESC
                LIMIT %s OFFSET %s;
            """
            results = self.db.execute_query(query, (user_id, source_type, limit, offset))
        else:
            query = """
                SELECT * FROM email_content 
                WHERE user_id = %s
                ORDER BY sent_date DESC
                LIMIT %s OFFSET %s;
            """
            results = self.db.execute_query(query, (user_id, limit, offset))
            
        return self._process_email_results(results)
    
    def get_emails_by_conversation(self, conversation_id: str, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all emails in a specific conversation/thread
        """
        if user_id:
            query = """
                SELECT * FROM email_content 
                WHERE conversation_id = %s AND user_id = %s
                ORDER BY sent_date ASC;
            """
            results = self.db.execute_query(query, (conversation_id, user_id))
        else:
            query = """
                SELECT * FROM email_content 
                WHERE conversation_id = %s
                ORDER BY sent_date ASC;
            """
            results = self.db.execute_query(query, (conversation_id,))
            
        return self._process_email_results(results)
    
    def get_email_by_id(self, email_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get a specific email by its ID
        """
        if user_id:
            query = "SELECT * FROM email_content WHERE email_id = %s AND user_id = %s;"
            results = self.db.execute_query(query, (email_id, user_id))
        else:
            query = "SELECT * FROM email_content WHERE email_id = %s;"
            results = self.db.execute_query(query, (email_id,))
            
        if results and len(results) > 0:
            return self._process_email_results([results[0]])[0]
        return None
    
    def search_emails(self, 
                           user_id: str,
                           query_text: str,
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           source_type: Optional[str] = None,
                           limit: int = 100,
                           offset: int = 0) -> List[Dict[str, Any]]:
        """
        Search for emails with various filters
        """
        where_clauses = ["user_id = %s"]
        params = [user_id]
        
        if query_text:
            where_clauses.append("(subject ILIKE %s OR body ILIKE %s)")
            params.extend([f"%{query_text}%", f"%{query_text}%"])
        
        if start_date:
            where_clauses.append("sent_date >= %s")
            params.append(start_date)
        
        if end_date:
            where_clauses.append("sent_date <= %s")
            params.append(end_date)
        
        if source_type:
            where_clauses.append("source_type = %s")
            params.append(source_type)
        
        where_clause = " AND ".join(where_clauses)
        query = f"""
            SELECT * FROM email_content 
            WHERE {where_clause}
            ORDER BY sent_date DESC
            LIMIT %s OFFSET %s;
        """
        
        params.extend([limit, offset])
        results = self.db.execute_query(query, tuple(params))
        return self._process_email_results(results)
    
    def _process_email_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process database results by parsing JSON fields
        """
        if not results:
            return []
            
        processed_results = []
        for row in results:
            # Parse JSON fields
            for json_field in ['recipients', 'attachments', 'metadata']:
                if row.get(json_field) and isinstance(row[json_field], str):
                    try:
                        row[json_field] = json.loads(row[json_field])
                    except:
                        row[json_field] = [] if json_field != 'metadata' else {}
                    
            # Convert datetime objects to ISO format strings for serialization
            for key in ['sent_date', 'received_date', 'created_at', 'updated_at']:
                if key in row and row[key]:
                    if isinstance(row[key], datetime):
                        row[key] = row[key].isoformat()
            
            processed_results.append(row)
            
        return processed_results