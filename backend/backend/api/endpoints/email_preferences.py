from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from pydantic import BaseModel

from backend.services.db.user_preferences import UserPreferences
from backend.services.auth.middleware.auth import get_current_user
from backend.core.logger import log

router = APIRouter()
logger = log.bind(name="backend.api.endpoints.email_preferences")

class ClassificationPreferences(BaseModel):
    """Model for email classification preferences"""
    custom_prompt: Optional[str] = None
    custom_actions: Optional[list] = None
    custom_priorities: Optional[list] = None
    sender_rules: Optional[Dict[str, Any]] = None
    subject_rules: Optional[Dict[str, Any]] = None
    content_rules: Optional[Dict[str, Any]] = None
    general_preferences: Optional[Dict[str, Any]] = None

@router.get("/classification", response_model=ClassificationPreferences)
async def get_classification_preferences(current_user: Dict = Depends(get_current_user)):
    """
    Get the current user's email classification preferences
    """
    try:
        user_id = current_user.get("id")
        user_preferences = UserPreferences()
        preferences = user_preferences.get_user_classification_preferences(user_id)
        
        if not preferences:
            # Return default preferences if none are set
            return ClassificationPreferences()
        
        return ClassificationPreferences(**preferences)
    except Exception as e:
        logger.error(f"Error retrieving classification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve classification preferences"
        )

@router.post("/classification", status_code=status.HTTP_200_OK)
async def update_classification_preferences(
    preferences: ClassificationPreferences,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update the current user's email classification preferences
    """
    try:
        user_id = current_user.get("id")
        email_manager = EmailManager()
        
        # Convert Pydantic model to dict
        preferences_dict = preferences.dict(exclude_unset=True)
        
        # Save preferences to database
        success = email_manager.save_user_classification_preferences(user_id, preferences_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save classification preferences"
            )
        
        return {"message": "Classification preferences updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating classification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update classification preferences"
        )
