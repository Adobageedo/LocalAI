"""
MCP Technician Service
Manages the technicians database
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class TechnicianService:
    """Service for managing technicians in JSON database"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            # Default to mcp/technicians_database.json
            project_root = Path(__file__).parent.parent.parent.parent
            db_path = project_root / "mcp" / "technicians_database.json"
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
    
    def load(self) -> Dict[str, Any]:
        """Load technicians database"""
        try:
            if self.db_path.exists():
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Ensure structure
                    if 'technicians' not in data or not isinstance(data['technicians'], list):
                        data = {"technicians": [], "metadata": {
                            "created": datetime.now().isoformat(),
                            "last_updated": datetime.now().isoformat(),
                            "version": "1.0.0"
                        }}
                    return data
            else:
                logger.info("Technicians database not found, creating new one")
                return {
                    "technicians": [],
                    "metadata": {
                        "created": datetime.now().isoformat(),
                        "last_updated": datetime.now().isoformat(),
                        "version": "1.0.0"
                    }
                }
        except Exception as e:
            logger.error(f"Error loading technicians database: {str(e)}")
            return {
                "technicians": [],
                "metadata": {
                    "created": datetime.now().isoformat(),
                    "last_updated": datetime.now().isoformat(),
                    "version": "1.0.0"
                }
            }
    
    def save(self, data: Dict[str, Any]) -> None:
        """Save technicians database"""
        try:
            # Update metadata
            if 'metadata' not in data:
                data['metadata'] = {}
            data['metadata']['last_updated'] = datetime.now().isoformat()
            
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.db_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Technicians database saved: {self.db_path}, count: {len(data.get('technicians', []))}")
        except Exception as e:
            logger.error(f"Error saving technicians database: {str(e)}")
            raise
    
    def _generate_id(self, first_name: str, last_name: str) -> str:
        """Generate technician ID from name"""
        return f"{first_name}_{last_name}".lower().replace(' ', '_')
    
    def get_all_technicians(self) -> List[Dict[str, Any]]:
        """Get all technicians"""
        db = self.load()
        return db.get('technicians', [])
    
    def get_technician_by_id(self, tech_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific technician by ID"""
        db = self.load()
        for tech in db.get('technicians', []):
            if tech['id'] == tech_id:
                return tech
        return None
    
    def upsert_technician(self, tech_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert or update a technician
        
        Args:
            tech_data: Technician data
            
        Returns:
            Dict with action (added/updated) and technician data
        """
        if 'first_name' not in tech_data or 'last_name' not in tech_data:
            raise ValueError("first_name and last_name are required")
        
        db = self.load()
        
        # Generate ID
        tech_id = tech_data.get('id') or self._generate_id(
            tech_data['first_name'],
            tech_data['last_name']
        )
        
        # Check if exists
        existing_index = None
        for i, tech in enumerate(db['technicians']):
            if tech['id'] == tech_id:
                existing_index = i
                break
        
        # Prepare technician object
        if existing_index is not None:
            # Update existing
            existing = db['technicians'][existing_index]
            updated_tech = {
                **existing,
                **tech_data,
                'id': tech_id,
                'created_at': existing.get('created_at', datetime.now().isoformat()),
                'updated_at': datetime.now().isoformat()
            }
            db['technicians'][existing_index] = updated_tech
            action = 'updated'
            logger.info(f"Technician updated: {tech_id}")
        else:
            # Add new
            new_tech = {
                'id': tech_id,
                'first_name': tech_data['first_name'],
                'last_name': tech_data['last_name'],
                'phone': tech_data.get('phone'),
                'email': tech_data.get('email'),
                'company': tech_data.get('company'),
                'certifications': tech_data.get('certifications', []),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'metadata': tech_data.get('metadata', {})
            }
            db['technicians'].append(new_tech)
            updated_tech = new_tech
            action = 'added'
            logger.info(f"Technician added: {tech_id}")
        
        # Save
        self.save(db)
        
        return {
            'action': action,
            'technician': updated_tech,
            'index': existing_index if existing_index is not None else len(db['technicians']) - 1
        }
    
    def update_technician(self, tech_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing technician"""
        db = self.load()
        
        for i, tech in enumerate(db['technicians']):
            if tech['id'] == tech_id:
                # Update fields
                for key, value in updates.items():
                    if key != 'id' and key != 'created_at':  # Preserve ID and creation date
                        tech[key] = value
                
                # Update timestamp
                tech['updated_at'] = datetime.now().isoformat()
                
                # Save
                self.save(db)
                
                logger.info(f"Technician updated: id={tech_id}")
                return tech
        
        return None
    
    def delete_technician(self, tech_id: str) -> bool:
        """Delete a technician"""
        db = self.load()
        
        initial_count = len(db['technicians'])
        db['technicians'] = [tech for tech in db['technicians'] if tech['id'] != tech_id]
        
        if len(db['technicians']) < initial_count:
            self.save(db)
            logger.info(f"Technician deleted: id={tech_id}")
            return True
        
        return False
    
    def find_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Find technicians by email"""
        db = self.load()
        email_lower = email.lower()
        return [tech for tech in db['technicians'] if tech.get('email', '').lower() == email_lower]
    
    def find_expiring_certifications(self, days_threshold: int = 30) -> List[Dict[str, Any]]:
        """Find technicians with certifications expiring soon"""
        db = self.load()
        result = []
        now = datetime.now()
        
        for tech in db['technicians']:
            expiring_certs = []
            for cert in tech.get('certifications', []):
                if cert.get('expiry_date'):
                    try:
                        expiry = datetime.fromisoformat(cert['expiry_date'])
                        days_until_expiry = (expiry - now).days
                        if 0 <= days_until_expiry <= days_threshold:
                            expiring_certs.append({
                                **cert,
                                'days_until_expiry': days_until_expiry
                            })
                    except (ValueError, TypeError):
                        pass
            
            if expiring_certs:
                result.append({
                    **tech,
                    'expiring_certifications': expiring_certs
                })
        
        return result
