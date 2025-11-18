"""
Technicians API Router
CRUD operations for technicians database
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import sys
import os

# Add the project root so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from src.services.mcp.mcp_technician_service import TechnicianService
from src.core.logger import log

logger = log.bind(name="api.router.llm.technicians")

router = APIRouter()

# Initialize service
technician_service = TechnicianService()


# ==================== SCHEMAS ====================

class Certification(BaseModel):
    certification_type: str
    certification_name: str
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None


class TechnicianBase(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    certifications: List[Certification] = []
    metadata: Dict[str, Any] = {}


class TechnicianResponse(TechnicianBase):
    id: str
    created_at: str
    updated_at: str


class TechnicianUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    certifications: Optional[List[Certification]] = None
    metadata: Optional[Dict[str, Any]] = None


# ==================== ROUTES ====================

@router.get("/", response_model=Dict[str, Any])
async def list_technicians():
    """Get all technicians"""
    try:
        technicians = technician_service.get_all_technicians()
        return {
            "success": True,
            "data": technicians,
            "total": len(technicians)
        }
    except Exception as e:
        logger.error(f"Error loading technicians: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load technicians"
        )


@router.get("/{tech_id}", response_model=Dict[str, Any])
async def get_technician(tech_id: str):
    """Get a single technician by ID"""
    try:
        technician = technician_service.get_technician_by_id(tech_id)
        
        if not technician:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return {
            "success": True,
            "data": technician
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading technician: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load technician"
        )


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_technician(technician: TechnicianBase):
    """Create a new technician"""
    try:
        # Convert Pydantic model to dict
        tech_dict = technician.dict()
        
        # Convert certifications to dicts
        tech_dict['certifications'] = [cert.dict() for cert in technician.certifications]
        
        # Upsert (will add new if doesn't exist)
        result = technician_service.upsert_technician(tech_dict)
        
        if result['action'] != 'added':
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Technician with this name already exists"
            )
        
        return {
            "success": True,
            "data": result['technician']
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating technician: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create technician"
        )


@router.put("/{tech_id}", response_model=Dict[str, Any])
async def update_technician(tech_id: str, updates: TechnicianUpdate):
    """Update an existing technician"""
    try:
        # Convert to dict and remove None values
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        
        # Convert certifications to dicts if present
        if 'certifications' in update_dict:
            update_dict['certifications'] = [cert.dict() for cert in updates.certifications]
        
        updated_tech = technician_service.update_technician(tech_id, update_dict)
        
        if not updated_tech:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return {
            "success": True,
            "data": updated_tech
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating technician: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update technician"
        )


@router.delete("/{tech_id}", response_model=Dict[str, Any])
async def delete_technician(tech_id: str):
    """Delete a technician"""
    try:
        deleted = technician_service.delete_technician(tech_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Technician not found"
            )
        
        return {
            "success": True,
            "message": "Technician deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting technician: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete technician"
        )
