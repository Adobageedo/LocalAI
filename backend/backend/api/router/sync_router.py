# In /backend/backend/api/router/sync_router.py (create if doesn't exist)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, Any

from backend.core.auth import get_current_user
from backend.services.sync_service.scheduled_sync_service import get_sync_metrics
from backend.services.db.models import SyncStatus

router = APIRouter(prefix="/sync")

@router.get("/metrics", response_model=Dict[str, Any])
async def get_metrics(current_user=Depends(get_current_user)):
    """Get synchronization metrics and status"""
    try:
        metrics = get_sync_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync metrics: {str(e)}"
        )


@router.get("/status", response_model=Dict[str, Any])
async def get_sync_status(
    limit: int = Query(10, description="Number of sync operations to return"),
    current_user=Depends(get_current_user)
):
    """Get recent sync operations status from database"""
    try:
        # Get recent sync operations
        sync_operations = SyncStatus.get_recent_syncs(limit)
        return {
            "sync_operations": [op.to_dict() for op in sync_operations]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sync status: {str(e)}"
        )


@router.post("/trigger", response_model=Dict[str, Any])
async def trigger_sync(current_user=Depends(get_current_user)):
    """Manually trigger a synchronization"""
    from backend.services.sync_service.scheduled_sync_service import run_sync_with_metrics
    
    try:
        # Run sync in a separate thread to avoid blocking
        import threading
        thread = threading.Thread(target=run_sync_with_metrics)
        thread.daemon = True
        thread.start()
        
        return {"status": "sync_started", "message": "Synchronization started successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to start sync: {str(e)}"
        )