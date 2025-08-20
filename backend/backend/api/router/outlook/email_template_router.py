from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional, Any, Dict, Union, AsyncGenerator
from pydantic import BaseModel, UUID4, Field, EmailStr
from uuid import UUID
from datetime import datetime
from enum import Enum
import os
import sys
import json
import asyncio
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

logger = log.bind(name="backend.api.outlook.email_template_router")

# Models
class Source(BaseModel):
    filename: str
    page_number: Optional[int] = None
    content: str

class EmailTemplateRequest(BaseModel):
    authToken: Optional[str] = None
    additionalInfo: Optional[str] = None
    tone: EmailTone = EmailTone.PROFESSIONAL
    subject: Optional[str] = None
    from_email: Optional[str] = Field(None, alias="from")
    body: Optional[str] = None
    conversationId: Optional[str] = None
    language: SupportedLanguage = SupportedLanguage.ENGLISH
    use_rag: Optional[bool] = False

class EmailTemplateResponse(BaseModel):
    generated_text: str
    sources: List[Union[Source, str]] = []
    temperature: Optional[float] = None
    model: Optional[str] = None
    use_retrieval: Optional[bool] = None
    include_profile_context: Optional[bool] = None
    conversation_history: Optional[List[Dict[str, Any]]] = None

# Router
router = APIRouter(prefix="/outlook", tags=["outlook"])

@router.post("/prompt", response_model=EmailTemplateResponse)
async def generate_email_template(data: EmailTemplateRequest, user = Depends(get_current_user), request: Request = None):
    """Generate an email template based on email context and user preferences"""
    
    # Get user_id from authenticated user, fallback to userId from request for development
    user_id = user.get("uid") if user else "None"
    
    logger.info(f"Generating email template for user: {user_id}")
    logger.debug(f"Request data: tone={data.tone.value}, language={data.language.value}, use_rag={data.use_rag}, subject={data.subject}, from={data.from_email}")
    
    # Build email context and system prompt using the production builder
    email_context = EmailPromptBuilder.build_email_context(
        subject=data.subject,
        from_email=data.from_email,
        body=data.body
    )
    
    system_prompt = EmailPromptBuilder.build_system_prompt(
        tone=data.tone,
        language=data.language,
        email_context=email_context,
        additional_info=data.additionalInfo,
        use_rag=data.use_rag
    )
    

    # Use the existing RAG system to generate the response
    try:
        # Use RAG system for enhanced email generation
        rag_result = get_rag_response_modular(
            system_prompt,
            user_id=user_id,
            conversation_history=None,  # Email templates don't need conversation history
            use_retrieval=data.use_rag,  # Use RAG based on request parameter
            temperature=0.7,  # Slightly creative but controlled
        )

        # Extract answer and sources
        generated_text = rag_result.get("answer", "")
        sources = rag_result.get("sources_info", [])
        
        if not generated_text:
            raise HTTPException(
                status_code=500, 
                detail="Failed to generate email template. Please try again."
            )
        
        logger.info(f"Successfully generated email template for user {user_id}")
        
        # Return the response in the expected format
        return EmailTemplateResponse(
            generated_text=generated_text,
            sources=sources,
            temperature=0.7,
            use_retrieval=data.use_rag,
            include_profile_context=False,
            conversation_history=None
        )
        
    except Exception as e:
        logger.error(f"Error generating email template for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email template: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for Outlook router"""
    return {"status": "healthy", "service": "outlook-email-template"}
