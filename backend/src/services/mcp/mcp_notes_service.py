"""
MCP Notes Service
Manages the notes/records database
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class NotesService:
    """Service for managing notes/points in JSON database"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Default to mcp/data/PDP/notes_database.json
            project_root = Path(__file__).parent.parent.parent.parent
            db_path = project_root / "mcp" / "data" / "PDP" / "notes_database.json"
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
    
    def load(self) -> Dict[str, List[Dict]]:
        """Load notes database"""
        try:
            if self.db_path.exists():
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.info("Notes database not found, creating new one")
                return {"notes": []}
        except Exception as e:
            logger.error(f"Error loading notes database: {str(e)}")
            return {"notes": []}
    
    def save(self, data: Dict[str, List[Dict]]) -> None:
        """Save notes database"""
        try:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Notes database saved: {self.db_path}, count: {len(data.get('notes', []))}")
        except Exception as e:
            logger.error(f"Error saving notes database: {str(e)}")
            raise
    
    def add_note(self, note: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a new note/point to the database
        
        Args:
            note: Note object with date, windfarm, topic, comment, type, company
            
        Returns:
            Dict with success status, note data, and total count
        """
        required_fields = ['date', 'windfarm', 'topic', 'comment', 'type']
        for field in required_fields:
            if field not in note or not note[field]:
                raise ValueError(f"Missing required field: {field}")
        
        # Load current database
        db = self.load()
        
        # Create new note with ID and timestamps
        new_note = {
            "id": str(int(datetime.now().timestamp() * 1000)),
            "date": note['date'],
            "windfarm": note['windfarm'],
            "topic": note['topic'],
            "comment": note['comment'],
            "type": note['type'],
            "company": note.get('company') or None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Add to database
        db['notes'].append(new_note)
        
        # Save
        self.save(db)
        
        logger.info(f"Note added: id={new_note['id']}, windfarm={note['windfarm']}, type={note['type']}")
        
        return {
            "success": True,
            "note": new_note,
            "total_notes": len(db['notes'])
        }
    
    def get_all_notes(self) -> List[Dict[str, Any]]:
        """Get all notes"""
        db = self.load()
        return db.get('notes', [])
    
    def get_note_by_id(self, note_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific note by ID"""
        db = self.load()
        for note in db.get('notes', []):
            if note['id'] == note_id:
                return note
        return None
    
    def update_note(self, note_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing note"""
        db = self.load()
        
        for i, note in enumerate(db['notes']):
            if note['id'] == note_id:
                # Update fields
                for key, value in updates.items():
                    if key != 'id' and key != 'created_at':  # Preserve ID and creation date
                        note[key] = value
                
                # Update timestamp
                note['updated_at'] = datetime.now().isoformat()
                
                # Save
                self.save(db)
                
                logger.info(f"Note updated: id={note_id}")
                return note
        
        return None
    
    def delete_note(self, note_id: str) -> bool:
        """Delete a note"""
        db = self.load()
        
        initial_count = len(db['notes'])
        db['notes'] = [note for note in db['notes'] if note['id'] != note_id]
        
        if len(db['notes']) < initial_count:
            self.save(db)
            logger.info(f"Note deleted: id={note_id}")
            return True
        
        return False
    
    def get_notes_by_filter(self, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get notes filtered by various criteria"""
        db = self.load()
        notes = db.get('notes', [])
        
        if 'windfarm' in filters:
            windfarm = filters['windfarm'].lower()
            notes = [n for n in notes if windfarm in n.get('windfarm', '').lower()]
        
        if 'type' in filters:
            type_filter = filters['type'].lower()
            notes = [n for n in notes if n.get('type', '').lower() == type_filter]
        
        if 'company' in filters:
            company = filters['company'].lower()
            notes = [n for n in notes if company in n.get('company', '').lower()]
        
        if 'date_from' in filters:
            date_from = datetime.fromisoformat(filters['date_from'])
            notes = [n for n in notes if datetime.fromisoformat(n.get('date', '')) >= date_from]
        
        if 'date_to' in filters:
            date_to = datetime.fromisoformat(filters['date_to'])
            notes = [n for n in notes if datetime.fromisoformat(n.get('date', '')) <= date_to]
        
        return notes
