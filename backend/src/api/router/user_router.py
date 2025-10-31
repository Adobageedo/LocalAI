from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
import os
import sys
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
from src.services.auth.middleware.auth_firebase import get_current_user
from src.services.db.model.user import User
from src.services.db.model.user_preferences import UserPreferences
from src.core.logger import log

logger = log.bind(name="src.api.user_router")

# Request/Response Models
class UserResponse(BaseModel):
    """Response model for user data"""
    id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[str] = None

class UserPreferencesRequest(BaseModel):
    """Request model for user preferences operations"""
    language: Optional[str] = Field(default='en', description="User language preference")
    dark_mode: Optional[bool] = Field(default=False, description="Dark mode preference")
    email_notifications: Optional[bool] = Field(default=False, description="Email notifications preference")
    personnal_style_analysis: Optional[bool] = Field(default=False, description="Personal style analysis preference")
    use_meeting_scripts: Optional[bool] = Field(default=False, description="Use meeting scripts preference")
    use_own_documents: Optional[bool] = Field(default=True, description="Use own documents preference")

class UserPreferencesResponse(BaseModel):
    """Response model for user preferences"""
    id: int
    user_id: str
    language: str
    dark_mode: bool
    email_notifications: bool
    personnal_style_analysis: bool
    use_meeting_scripts: bool
    use_own_documents: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserCreateRequest(BaseModel):
    """Request model for creating a user"""
    email: str = Field(..., description="User email address")
    name: Optional[str] = Field(None, description="User full name")
    phone: Optional[str] = Field(None, description="User phone number")

class UserUpdateRequest(BaseModel):
    """Request model for updating a user"""
    name: Optional[str] = Field(None, description="User full name")
    phone: Optional[str] = Field(None, description="User phone number")

# Initialize router
router = APIRouter(prefix="/user", tags=["User Management"])

# User endpoints
@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        user_dict = user.to_dict()
        return UserResponse(**user_dict)
        
    except Exception as e:
        logger.error(f"Error getting user profile: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    request: UserUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        # Update user fields
        update_data = {}
        if request.name is not None:
            update_data['name'] = request.name
        if request.phone is not None:
            update_data['phone'] = request.phone
            
        if update_data:
            user.update(**update_data)
        
        user_dict = user.to_dict()
        return UserResponse(**user_dict)
        
    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/profile")
async def delete_user_profile(current_user: dict = Depends(get_current_user)):
    """Delete current user profile"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        user.delete()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "User profile deleted successfully"}
        )
        
    except Exception as e:
        logger.error(f"Error deleting user profile: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/profile", response_model=UserResponse)
async def create_user_profile(
    request: UserCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new user profile (for new user registration)"""
    try:
        user_id = current_user.get('uid')
        user_email = current_user.get('email')
        
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        if not user_email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User email not found")
        
        # Check if user already exists
        existing_user = User.get_by_id(user_id)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")
        
        # Create new user
        user = User.create(
            id=user_id,
            email=user_email,
            name=request.name,
            phone=request.phone
        )
        
        if not user:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")
        
        logger.info(f"User profile created successfully for user_id: {user_id}")
        user_dict = user.to_dict()
        return UserResponse(**user_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# User Preferences endpoints
@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """Get current user preferences"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        # Check if user exists first
        user = User.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        preferences = UserPreferences.get_by_user_id(user_id)
        if not preferences:
            # Create default preferences if they don't exist (only if user exists)
            preferences = UserPreferences.create(user_id=user_id)
            if not preferences:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user preferences")
        
        preferences_dict = preferences.to_dict()
        return UserPreferencesResponse(**preferences_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user preferences: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/preferences", response_model=UserPreferencesResponse)
async def create_user_preferences(
    request: UserPreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create user preferences"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        # Check if preferences already exist
        existing_preferences = UserPreferences.get_by_user_id(user_id)
        if existing_preferences:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User preferences already exist")
        
        # Create new preferences
        preferences = UserPreferences.create(
            user_id=user_id,
            language=request.language or 'en',
            dark_mode=request.dark_mode or False,
            email_notifications=request.email_notifications or False,
            personnal_style_analysis=request.personnal_style_analysis or False,
            use_meeting_scripts=request.use_meeting_scripts or False,
            use_own_documents=request.use_own_documents if request.use_own_documents is not None else True
        )
        
        if not preferences:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user preferences")
        
        preferences_dict = preferences.to_dict()
        return UserPreferencesResponse(**preferences_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user preferences: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.put("/preferences", response_model=UserPreferencesResponse)
async def update_user_preferences(
    request: UserPreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user preferences"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        preferences = UserPreferences.get_by_user_id(user_id)
        if not preferences:
            # Create preferences if they don't exist
            preferences = UserPreferences.create(
                user_id=user_id,
                language=request.language or 'en',
                dark_mode=request.dark_mode or False,
                email_notifications=request.email_notifications or False,
                personnal_style_analysis=request.personnal_style_analysis or False,
                use_meeting_scripts=request.use_meeting_scripts or False,
                use_own_documents=request.use_own_documents if request.use_own_documents is not None else True
            )
        else:
            # Update existing preferences
            update_data = {}
            if request.language is not None:
                update_data['language'] = request.language
            if request.dark_mode is not None:
                update_data['dark_mode'] = request.dark_mode
            if request.email_notifications is not None:
                update_data['email_notifications'] = request.email_notifications
            if request.personnal_style_analysis is not None:
                update_data['personnal_style_analysis'] = request.personnal_style_analysis
            if request.use_meeting_scripts is not None:
                update_data['use_meeting_scripts'] = request.use_meeting_scripts
            if request.use_own_documents is not None:
                update_data['use_own_documents'] = request.use_own_documents
                
            if update_data:
                preferences.update(**update_data)
        
        if not preferences:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user preferences")
        
        preferences_dict = preferences.to_dict()
        return UserPreferencesResponse(**preferences_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user preferences: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/preferences")
async def delete_user_preferences(current_user: dict = Depends(get_current_user)):
    """Delete user preferences"""
    try:
        user_id = current_user.get('uid')
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        
        preferences = UserPreferences.get_by_user_id(user_id)
        if not preferences:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User preferences not found")
        
        preferences.delete()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "User preferences deleted successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user preferences: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# Admin endpoints (optional - for administrative purposes)
@router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only)"""
    try:
        # Note: You might want to add admin role checking here
        users = User.get_all()
        return [UserResponse(**user.to_dict()) for user in users]
        
    except Exception as e:
        logger.error(f"Error getting all users: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/admin/preferences", response_model=List[UserPreferencesResponse])
async def get_all_user_preferences(current_user: dict = Depends(get_current_user)):
    """Get all user preferences (admin only)"""
    try:
        # Note: You might want to add admin role checking here
        preferences_list = UserPreferences.get_all()
        return [UserPreferencesResponse(**prefs.to_dict()) for prefs in preferences_list]
        
    except Exception as e:
        logger.error(f"Error getting all user preferences: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
