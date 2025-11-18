"""
Records API Router
CRUD operations for records/notes database
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import sys
import os

# Add the project root so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from src.services.mcp.mcp_notes_service import NotesService
from src.core.logger import log

logger = log.bind(name="api.router.llm.records")

router = APIRouter()

# Initialize service
notes_service = NotesService()


# ==================== SCHEMAS ====================

class RecordBase(BaseModel):
    date: str
    windfarm: str
    topic: str
    comment: str
    type: str
    company: Optional[str] = None


class RecordResponse(RecordBase):
    id: str
    created_at: str
    updated_at: str


class RecordUpdate(BaseModel):
    date: Optional[str] = None
    windfarm: Optional[str] = None
    topic: Optional[str] = None
    comment: Optional[str] = None
    type: Optional[str] = None
    company: Optional[str] = None


# ==================== ROUTES ====================

@router.get("/", response_model=Dict[str, Any])
async def list_records():
    """Get all records"""
    try:
        records = notes_service.get_all_notes()
        return {
            "success": True,
            "data": records,
            "total": len(records)
        }
    except Exception as e:
        logger.error(f"Error loading records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load records"
        )


@router.get("/{record_id}", response_model=Dict[str, Any])
async def get_record(record_id: str):
    """Get a single record by ID"""
    try:
        record = notes_service.get_note_by_id(record_id)
        
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        return {
            "success": True,
            "data": record
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load record"
        )


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_record(record: RecordBase):
    """Create a new record"""
    try:
        # Convert Pydantic model to dict
        record_dict = record.dict()
        
        # Add note
        result = notes_service.add_note(record_dict)
        
        return {
            "success": True,
            "data": result['note']
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create record"
        )


@router.put("/{record_id}", response_model=Dict[str, Any])
async def update_record(record_id: str, updates: RecordUpdate):
    """Update an existing record"""
    try:
        # Convert to dict and remove None values
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        
        updated_record = notes_service.update_note(record_id, update_dict)
        
        if not updated_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        return {
            "success": True,
            "data": updated_record
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update record"
        )


@router.delete("/{record_id}", response_model=Dict[str, Any])
async def delete_record(record_id: str):
    """Delete a record"""
    try:
        deleted = notes_service.delete_note(record_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Record not found"
            )
        
        return {
            "success": True,
            "message": "Record deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete record"
        )
