from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, Field
from datetime import datetime
import os
import sys
import json
import traceback
from .email_config import (
    SupportedLanguage, 
    EmailTone, 
    LanguageConfig, 
    EmailPromptBuilder
)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from backend.services.auth.middleware.auth_firebase import get_current_user
from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log
from backend.api.utils.get_style_analysis import get_user_style_context

logger = log.bind(name="backend.api.outlook.compose_router")

# Request/Response Models
class ComposeRequest(BaseModel):
    """Request model for email composition operations"""
    # Core email data
    subject: Optional[str] = None
    body: Optional[str] = None
    from_email: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None
    
    # AI generation parameters
    additionalInfo: Optional[str] = None
    tone: EmailTone = EmailTone.PROFESSIONAL
    language: SupportedLanguage = SupportedLanguage.FRENCH
    use_rag: Optional[bool] = False
    
    # User context
    userId: Optional[str] = None
    conversationId: Optional[str] = None

class ComposeResponse(BaseModel):
    """Response model for email composition operations"""
    generated_text: str
    success: bool = True
    message: Optional[str] = None
    sources: List[Dict[str, Any]] = []
    metadata: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

# Router setup
router = APIRouter(tags=["Outlook Compose"])

@router.get("/compose/health")
async def compose_health_check():
    """Health check endpoint for compose service"""
    return {
        "status": "healthy",
        "service": "outlook-compose",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.post("/compose/generate", response_model=ComposeResponse)
async def generate_email(
    request: ComposeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Generate a new email based on user description and parameters
    
    This endpoint creates email content from scratch based on:
    - User description in additionalInfo
    - Selected tone and language
    - Optional subject and recipient context
    """
    try:        
        # Validate required fields for generation
        if not request.additionalInfo or not request.additionalInfo.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="additionalInfo (description) is required for email generation"
            )
        
        # Build generation prompt
        prompt_builder = EmailPromptBuilder()
        
        # Create context for generation
        email_context = {
            "operation": "generate",
            "description": request.additionalInfo,
            "subject": request.subject,
            "recipient": request.to,
            "sender": request.from_email or (current_user.get("email") if current_user else None)
        }
        
        # Build email context
        email_context = prompt_builder.build_email_context(
            subject=request.subject,
            from_email=request.from_email,
            body=None  # No original body for generation
        )
        
        # Get user's style analysis for personalization
        user_id = request.userId or (current_user.get("uid") if current_user else "anonymous")
        style_context = await get_user_style_context(user_id)
        
        # Build the system prompt
        system_prompt = prompt_builder.build_system_prompt(
            tone=request.tone,
            language=request.language,
            email_context=email_context,
            additional_info=request.additionalInfo,
            use_rag=request.use_rag or False
        )
        
        # Add style analysis to system prompt if available
        if style_context:
            system_prompt += style_context
        logger.info(f"System prompt: {system_prompt}")
        
        # Create user prompt for generation
        user_prompt = f"Please generate an email based on this description: {request.additionalInfo}. Return only the text of the email generated."
        
        # Get AI response
        rag_response = get_rag_response_modular(
            question=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_history=request.conversationId,
            use_retrieval=request.use_rag or False,
            temperature=0.7
        )
        logger.debug(ComposeResponse(
            generated_text=rag_response.get("answer", ""),
            success=True,
            message="Email généré avec succès",
            sources=rag_response.get("sources", []),
            metadata={
                "tone": request.tone,
                "language": request.language,
                "use_rag": request.use_rag,
                "model": rag_response.get("model"),
                "temperature": rag_response.get("temperature", 0.7)
            }
        ))
        return ComposeResponse(
            generated_text=rag_response.get("answer", ""),
            success=True,
            message="Email généré avec succès",
            sources=rag_response.get("sources", []),
            metadata={
                "tone": request.tone,
                "language": request.language,
                "use_rag": request.use_rag,
                "model": rag_response.get("model"),
                "temperature": rag_response.get("temperature", 0.7),
                "style_analysis_used": bool(style_context)
            }
        )
        
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(
            "Email generation failed", 
            error=str(e), 
            user_id=request.userId,
            traceback=error_traceback,
            request_data={
                "tone": request.tone,
                "language": request.language,
                "use_rag": request.use_rag,
                "has_additional_info": bool(request.additionalInfo),
                "has_subject": bool(request.subject),
                "has_to": bool(request.to)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération de l'email: {str(e)}"
        )

@router.post("/compose/correct", response_model=ComposeResponse)
async def correct_email(
    request: ComposeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Correct grammar, spelling, and syntax errors in existing email text
    
    This endpoint improves email text by:
    - Fixing grammar and spelling errors
    - Improving sentence structure
    - Maintaining original meaning and tone
    """
    try:
        logger.info("Starting email correction", 
                   user_id=request.userId or (current_user.get("uid") if current_user else None),
                   language=request.language)
        
        # Validate required fields for correction
        if not request.body or not request.body.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="body (email text) is required for correction"
            )
        
        # Build correction prompt using EmailPromptBuilder
        prompt_builder = EmailPromptBuilder()
        
        # Build email context with the original body
        email_context = prompt_builder.build_email_context(
            subject=request.subject,
            from_email=request.from_email,
            body=request.body
        )
        
        # Get user's style analysis for personalization
        user_id = request.userId or (current_user.get("uid") if current_user else "anonymous")
        style_context = await get_user_style_context(user_id)
        # Build system prompt for correction
        system_prompt = prompt_builder.build_system_prompt(
            tone=request.tone,
            language=request.language,
            email_context=email_context,
            additional_info="Please correct grammar, spelling, punctuation, and syntax errors while preserving the original meaning and tone. Return only the text of the email corrected.",
            use_rag=False  # Correction doesn't need RAG
        )
        
        # Add style analysis to system prompt if available
        if style_context:
            system_prompt += style_context
        logger.info(f"System prompt: {system_prompt}")
        user_prompt = f"Please correct this email text: {request.body}. Return only the text of the email corrected."
        
        # Get AI response
        rag_response = get_rag_response_modular(
            question=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_history=request.conversationId,
            use_retrieval=False,  # Correction doesn't need RAG
            temperature=0.3  # Lower temperature for more consistent corrections
        )
        
        logger.info("Email correction completed successfully",
                   user_id=request.userId,
                   original_length=len(request.body),
                   corrected_length=len(rag_response.get("answer", "")))
        
        return ComposeResponse(
            generated_text=rag_response.get("answer", ""),
            success=True,
            message="Email corrigé avec succès",
            metadata={
                "operation": "correction",
                "language": request.language,
                "original_length": len(request.body),
                "corrected_length": len(rag_response.get("answer", "")),
                "model": rag_response.get("model"),
                "temperature": 0.3,
                "style_analysis_used": bool(style_context)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(
            "Email correction failed", 
            error=str(e), 
            user_id=request.userId,
            traceback=error_traceback,
            request_data={
                "language": request.language,
                "has_body": bool(request.body),
                "body_length": len(request.body) if request.body else 0
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la correction de l'email: {str(e)}"
        )

@router.post("/compose/reformulate", response_model=ComposeResponse)
async def reformulate_email(
    request: ComposeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Reformulate email text to improve clarity, style, and tone
    
    This endpoint enhances email text by:
    - Improving clarity and readability
    - Adjusting tone and style
    - Following specific reformulation instructions
    - Maintaining core message meaning
    """
    try:
        logger.info("Starting email reformulation", 
                   user_id=request.userId or (current_user.get("uid") if current_user else None),
                   tone=request.tone,
                   language=request.language)
        
        # Validate required fields for reformulation
        if not request.body or not request.body.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="body (email text) is required for reformulation"
            )
        
        # Build reformulation prompt using EmailPromptBuilder
        prompt_builder = EmailPromptBuilder()
        
        # Build email context with the original body
        email_context = prompt_builder.build_email_context(
            subject=request.subject,
            from_email=request.from_email,
            body=request.body
        )
        
        # Get user's style analysis for personalization
        user_id = request.userId or (current_user.get("uid") if current_user else "anonymous")
        style_context = await get_user_style_context(user_id)
        
        # Build system prompt for reformulation
        additional_instructions = f"Please reformulate this email to improve clarity, style, and impact while preserving the original meaning. {request.additionalInfo if request.additionalInfo else ''}. Return only the text of the email reformulated."
        
        system_prompt = prompt_builder.build_system_prompt(
            tone=request.tone,
            language=request.language,
            email_context=email_context,
            additional_info=additional_instructions,
            use_rag=request.use_rag or False
        )
        logger.info(f"System prompt: {system_prompt}")
        # Add style analysis to system prompt if available
        if style_context:
            system_prompt += style_context
        
        user_prompt = f"Please reformulate this email text to improve clarity and style: {request.body}. Return only the text of the email reformulated."
        
        # Get AI response
        rag_response = get_rag_response_modular(
            question=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_history=request.conversationId,
            use_retrieval=request.use_rag or False,
            temperature=0.5  # Moderate temperature for creative reformulation
        )
        
        logger.info("Email reformulation completed successfully",
                   user_id=request.userId,
                   original_length=len(request.body),
                   reformulated_length=len(rag_response.get("answer", "")))
        
        return ComposeResponse(
            generated_text=rag_response.get("answer", ""),
            success=True,
            message="Email reformulé avec succès",
            sources=rag_response.get("sources", []) if request.use_rag else [],
            metadata={
                "operation": "reformulation",
                "tone": request.tone,
                "language": request.language,
                "use_rag": request.use_rag,
                "original_length": len(request.body),
                "reformulated_length": len(rag_response.get("answer", "")),
                "model": rag_response.get("model"),
                "temperature": 0.5,
                "instructions": request.additionalInfo,
                "style_analysis_used": bool(style_context)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error(
            "Email reformulation failed", 
            error=str(e), 
            user_id=request.userId,
            traceback=error_traceback,
            request_data={
                "tone": request.tone,
                "language": request.language,
                "has_body": bool(request.body),
                "body_length": len(request.body) if request.body else 0,
                "has_additional_info": bool(request.additionalInfo)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la reformulation de l'email: {str(e)}"
        )

# Note: Error handlers should be defined on the main FastAPI app, not on routers
# They are handled by the global exception handlers in main.py
