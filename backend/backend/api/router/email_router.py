from fastapi import APIRouter

from backend.api.endpoints.email_preferences import router as email_preferences_router

# Main email router
router = APIRouter()

# Include sub-routers
router.include_router(email_preferences_router, prefix="/preferences")
