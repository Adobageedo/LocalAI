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
from backend.services.llm.llm import LLM
from backend.core.logger import log
from backend.api.utils.get_style_analysis import get_user_style_context
from backend.api.utils.config_loader import get_email_template_config, is_style_analysis_enabled
import json

logger = log.bind(name="backend.api.outlook.email_template_router")

# Models
class Source(BaseModel):
    filename: str
    page_number: Optional[int] = None
    content: str

class EmailTemplateRequest(BaseModel):
    subject: Optional[str] = None
    from_email: Optional[str] = Field(None, alias="from")
    additional_info: Optional[str] = None
    tone: Optional[str] = "professional"
    language: Optional[str] = "en"
    use_rag: Optional[bool] = None
    stream: Optional[bool] = False
    body: Optional[str] = None
    conversationId: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class TemplateRefineRequest(BaseModel):
    user_request: str
    conversation_id: str
    messages: List[ChatMessage]
    stream: Optional[bool] = False

class TemplateRefineResponse(BaseModel):
    refined_template: str
    explanation: str
    conversation_id: Optional[str] = None

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
    
    # Validate and convert string inputs to enums
    validated_tone = LanguageConfig.validate_tone(data.tone or "professional")
    validated_language = LanguageConfig.validate_language(data.language or "en")
    
    logger.info(f"Generating email template for user: {user_id}")
    logger.debug(f"Request data: tone={validated_tone.value}, language={validated_language.value}, use_rag={data.use_rag}, subject={data.subject}, from={data.from_email}")
    
    # Build email context and system prompt using the production builder
    email_context = EmailPromptBuilder.build_email_context(
        subject=data.subject,
        from_email=data.from_email,
        body=data.body
    )
    
    # Get configuration settings
    config = get_email_template_config()
    
    # Get user's style analysis for personalization (if enabled)
    style_context = None
    if is_style_analysis_enabled('email_template'):
        style_context = await get_user_style_context(user_id)
    
    system_prompt = EmailPromptBuilder.build_system_prompt(
        tone=validated_tone,
        language=validated_language,
        email_context=email_context,
        additional_info=data.additional_info,
        use_rag=data.use_rag if data.use_rag is not None else config['default_use_rag']
    )
    
    # Add style analysis to system prompt if available
    if style_context:
        system_prompt += style_context
    logger.debug(f"System prompt: {system_prompt}")

    # Use the existing RAG system to generate the response
    try:
        # Use RAG system for enhanced email generation
        rag_result = get_rag_response_modular(
            system_prompt,
            user_id=user_id,
            conversation_history=None,  # Email templates don't need conversation history
            use_retrieval=data.use_rag if data.use_rag is not None else config['default_use_rag'],
            temperature=config['default_temperature'],  # Use config temperature
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
        logger.debug(EmailTemplateResponse(
            generated_text=generated_text,
            sources=sources,
            temperature=config['default_temperature'],
            use_retrieval=data.use_rag if data.use_rag is not None else config['default_use_rag'],
            include_profile_context=bool(style_context),
            conversation_history=None
        ))
        # Return the response in the expected format
        return EmailTemplateResponse(
            generated_text=generated_text,
            sources=sources,
            temperature=config['default_temperature'],
            model=rag_result.get('model', config['default_model']),
            use_retrieval=data.use_rag if data.use_rag is not None else config['default_use_rag'],
            include_profile_context=bool(style_context),
            conversation_history=None
        )
        
    except Exception as e:
        logger.error(f"Error generating email template for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email template: {str(e)}"
        )

@router.post("/prompt/refine")
async def refine_email_template(data: TemplateRefineRequest, user = Depends(get_current_user)):
    """Refine an email template through conversational AI (supports both streaming and non-streaming)"""
    
    user_id = user.get("uid") if user else "None"
    
    logger.info(f"Refining email template for user: {user_id}, conversation: {data.conversation_id}, streaming: {data.stream}")
    logger.debug(f"User request: {data.user_request}")
    
    # Get user's style analysis for personalization
    style_context = ""
    if is_style_analysis_enabled('email_template'):
        style_context = await get_user_style_context(user_id)
    
    # Build conversation context for the LLM
    conversation_messages = []
    for msg in data.messages:
        conversation_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Create system prompt for template refinement
    system_prompt = f"""You are helping refine an email template based on the conversation history.

Please return only the email body.{style_context}"""
    
    # Use LLM for conversational refinement
    llm = LLM(temperature=0.7, model="gpt-4.1-mini")
    
    # Handle streaming response
    if data.stream:
        async def generate_stream():
            try:
                async for chunk in llm.stream_chat(
                    messages=conversation_messages,
                    system_prompt=system_prompt
                ):
                    if chunk:
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Send completion signal
                yield f"data: {json.dumps({'done': True})}\n\n"
                
            except Exception as e:
                logger.error(f"Error streaming refine template for user {user_id}: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
    # Handle non-streaming response
    try:
        generated_text = await llm.chat(
            messages=conversation_messages,
            system_prompt=system_prompt
        )
        
        if not generated_text:
            raise HTTPException(
                status_code=500,
                detail="Failed to refine template. Please try again."
            )
        
        # Use the LLM response directly as the refined template
        refined_template = generated_text.strip()
        explanation = "Template has been refined based on your request."
        
        logger.info(f"Successfully refined template for user {user_id}")
        
        return TemplateRefineResponse(
            refined_template=refined_template,
            explanation=explanation,
            conversation_id=data.conversation_id
        )
        
    except Exception as e:
        logger.error(f"Error refining template for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refine template: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint for Outlook router"""
    return {"status": "healthy", "service": "outlook-email-template"}
