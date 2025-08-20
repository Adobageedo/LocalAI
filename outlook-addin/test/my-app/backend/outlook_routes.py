from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from firebase_admin import auth
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
outlook_router = APIRouter(prefix="/api/outlook", tags=["outlook"])

# Models
class BaseRequest(BaseModel):
    authToken: Optional[str] = None
    userId: str

class EmailComposeRequest(BaseRequest):
    prompt: str
    tone: str = "professional"
    language: str = "english"
    use_rag: bool = False

class EmailSummarizeRequest(BaseRequest):
    subject: Optional[str] = None
    from_email: Optional[str] = Field(None, alias="from")
    body: str
    language: str = "english"
    use_rag: bool = False
    summary_type: str = "concise"  # concise, detailed, bullet, action

class EmailImproveRequest(BaseRequest):
    body: str
    tone: str = "professional"
    language: str = "english"
    use_rag: bool = False
    improvement_type: str = "general"  # general, grammar, clarity, tone

class AIResponse(BaseModel):
    generated_text: str
    sources: List[Dict[str, Any]] = []
    temperature: float = 0.7
    model: str = "gpt-4"
    use_retrieval: bool = False

# Helper function for Firebase authentication
async def get_current_user(request: BaseRequest):
    if not request.authToken:
        # For development, allow requests without auth token
        logger.warning("No auth token provided, using userId directly")
        return request.userId
    
    try:
        # Verify Firebase token
        decoded_token = auth.verify_id_token(request.authToken)
        uid = decoded_token.get('uid')
        
        # Check if the token UID matches the provided userId
        if uid != request.userId:
            logger.warning(f"Token UID {uid} doesn't match provided userId {request.userId}")
        
        return uid
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# Routes
@outlook_router.post("/compose", response_model=AIResponse)
async def compose_email(request: EmailComposeRequest = Body(...)):
    """Generate a new email based on a prompt description"""
    try:
        # Log request (with redacted token)
        logger.info(f"Compose request: {request.prompt[:100]}... | Tone: {request.tone} | Language: {request.language}")
        
        # In a real implementation, this would call your AI service
        # For now, we'll return a mock response
        
        # Build prompt based on request parameters
        system_prompt = f"""You are an AI assistant that generates professional email content.
        Write an email based on the user's description.
        Use a {request.tone} tone.
        Write the response in {request.language}.
        """
        
        # Mock AI generation
        generated_text = f"This is a {request.tone} email generated based on: '{request.prompt}'"
        
        return AIResponse(
            generated_text=generated_text,
            use_retrieval=request.use_rag
        )
    except Exception as e:
        logger.error(f"Error in compose_email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@outlook_router.post("/summarize", response_model=AIResponse)
async def summarize_email(request: EmailSummarizeRequest = Body(...)):
    """Summarize an email or document"""
    try:
        # Log request (with redacted token)
        logger.info(f"Summarize request: Subject: {request.subject} | Type: {request.summary_type}")
        
        # Build prompt based on request parameters
        system_prompt = f"""You are an AI assistant that summarizes emails.
        Create a {request.summary_type} summary of the email.
        Write the summary in {request.language}.
        """
        
        # Handle different summary types
        summary_style = {
            "concise": "brief and to the point",
            "detailed": "comprehensive but focused",
            "bullet": "organized as bullet points",
            "action": "focused on required actions and next steps"
        }.get(request.summary_type, "concise")
        
        # Mock AI generation
        if request.summary_type == "bullet":
            generated_text = f"• This is a bullet point summary\n• Of the provided email\n• In {request.language}"
        elif request.summary_type == "action":
            generated_text = f"ACTION ITEMS:\n1. First action item\n2. Second action item\n3. Follow up by Friday"
        else:
            generated_text = f"This is a {summary_style} summary of the email with subject: '{request.subject or 'No subject'}'"
        
        return AIResponse(
            generated_text=generated_text,
            summary=generated_text,  # Additional field for convenience
            use_retrieval=request.use_rag
        )
    except Exception as e:
        logger.error(f"Error in summarize_email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@outlook_router.post("/improve", response_model=AIResponse)
async def improve_email(request: EmailImproveRequest = Body(...)):
    """Improve or change the tone of an email draft"""
    try:
        # Log request (with redacted token)
        logger.info(f"Improve request: Type: {request.improvement_type} | Tone: {request.tone}")
        
        # Build prompt based on request parameters
        system_prompt = f"""You are an AI assistant that improves email drafts.
        {request.improvement_type.capitalize()} improvement of the email draft.
        Use a {request.tone} tone.
        Write the improved email in {request.language}.
        """
        
        # Mock AI generation
        improvement_type_desc = {
            "general": "overall improved",
            "grammar": "grammatically corrected",
            "clarity": "clearer and more concise",
            "tone": f"rewritten with a {request.tone} tone"
        }.get(request.improvement_type, "improved")
        
        generated_text = f"This is a {improvement_type_desc} version of your email draft in {request.language}."
        
        return AIResponse(
            generated_text=generated_text,
            use_retrieval=request.use_rag
        )
    except Exception as e:
        logger.error(f"Error in improve_email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@outlook_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "outlook-api"}
