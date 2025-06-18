"""
API router for Gmail integration endpoints.
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status

# Pydantic schemas
from pydantic import BaseModel, Field

# Authentication deps
from ..deps.auth import get_current_user

# Services
from ...services.gmail.gmail_service import GmailService
from ...services.storage.sync_status_service import SyncStatusService
from ...workers.gmail_ingestion_worker import gmail_worker

logger = logging.getLogger(__name__)

# Define router
router = APIRouter()

# Pydantic models for request/response
class OAuth2CallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

class IngestGmailRequest(BaseModel):
    labels: List[str] = Field(default=["INBOX", "SENT"])
    limit: int = Field(default=100)
    query: Optional[str] = None
    force_reingest: bool = Field(default=False)
    save_attachments: bool = Field(default=True)

class EmailListItem(BaseModel):
    id: str
    subject: str
    sender: str
    date: str
    has_attachments: bool
    labels: List[str] = []
    doc_id: Optional[str] = None

class EmailListResponse(BaseModel):
    emails: List[EmailListItem]
    total: int


@router.post("/gmail/oauth2_callback")
async def gmail_oauth2_callback(
    request: OAuth2CallbackRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Endpoint for OAuth2 callback from Gmail authorization.
    """
    try:
        # Import the gmail auth module
        from ...services.gmail.auth import save_token
        
        # Exchange the authorization code for tokens
        token_info = {
            "access_token": request.code,
            "refresh_token": request.state  # Note: This is a simplified approach
        }
        
        # Save the token for the user
        success = save_token(token_info, user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save Gmail authentication token"
            )
        
        return {"success": True, "message": "Gmail authentication successful"}
    except Exception as e:
        logger.error(f"Gmail OAuth callback error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gmail authentication failed: {str(e)}"
        )


@router.get("/gmail/auth_url")
async def get_gmail_auth_url(user_id: str = Depends(get_current_user)):
    """
    Get the authorization URL for Gmail OAuth2.
    """
    try:
        from ...services.gmail.auth import get_auth_url
        import os
        
        # Get the redirect URI from environment variable or use a default
        redirect_uri = os.getenv("GMAIL_REDIRECT_URI", "/api/gmail/oauth2_callback")
        
        # Generate the authorization URL
        auth_url = get_auth_url(redirect_uri)
        
        if not auth_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate Gmail authorization URL"
            )
        
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error generating Gmail auth URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating Gmail auth URL: {str(e)}"
        )


@router.post("/gmail/ingest")
async def ingest_gmail_emails(
    request: IngestGmailRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Ingest emails from Gmail into the vector database.
    This operation will run in the background.
    """
    # Initialize the sync status
    sync_service = SyncStatusService()
    sync_service.start_sync(user_id, "gmail")
    
    # Add the ingestion task to the worker queue
    await gmail_worker.add_task({
        "user_id": user_id,
        "labels": request.labels,
        "limit": request.limit,
        "query": request.query,
        "force_reingest": request.force_reingest,
        "save_attachments": request.save_attachments
    })
    
    return {
        "success": True,
        "message": "Gmail ingestion started in background",
        "status": "running"
    }


# Note: We've removed the _ingest_gmail_background function
# as it's now handled by the gmail_worker


@router.get("/gmail/recent_emails")
async def get_recent_emails(
    limit: int = 20,
    user_id: str = Depends(get_current_user)
):
    """
    Get recent emails from the file registry.
    """
    try:
        gmail_service = GmailService(user_id=user_id)
        emails = gmail_service.get_recent_emails(user_id=user_id, limit=limit)
        
        return {
            "emails": emails,
            "total": len(emails)
        }
    except Exception as e:
        logger.error(f"Error retrieving recent emails: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve recent emails: {str(e)}"
        )


@router.get("/gmail/sync_status")
async def get_gmail_sync_status(user_id: str = Depends(get_current_user)):
    """
    Get the current sync status for Gmail.
    """
    try:
        sync_service = SyncStatusService()
        status = sync_service.get_status(user_id, "gmail")
        
        if not status:
            return {
                "status": "not_started",
                "progress": 0.0,
                "error_details": None
            }
        
        return status
    except Exception as e:
        logger.error(f"Error retrieving Gmail sync status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve Gmail sync status: {str(e)}"
        )
