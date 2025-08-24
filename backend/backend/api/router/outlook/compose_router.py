from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, Field
from datetime import datetime
import os
import sys
import json
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
        logger.info("Starting email generation", 
                   user_id=request.userId or (current_user.get("uid") if current_user else None),
                   tone=request.tone.value,
                   language=request.language.value,
                   use_rag=request.use_rag)
        
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
        
        # Build the prompt based on operation type and RAG usage
        if request.use_rag:
            system_prompt = prompt_builder.build_rag_prompt(
                tone=request.tone,
                language=request.language,
                operation="generate"
            )
        else:
            system_prompt = prompt_builder.build_generation_prompt(
                tone=request.tone,
                language=request.language
            )
        
        # Create user prompt for generation
        user_prompt = f"""
Génère un email professionnel basé sur les informations suivantes :

Description : {request.additionalInfo}
{f"Sujet souhaité : {request.subject}" if request.subject else ""}
{f"Destinataire : {request.to}" if request.to else ""}
{f"Expéditeur : {request.from_email}" if request.from_email else ""}

Ton : {request.tone.value}
Langue : {request.language.value}

Crée un email complet et professionnel qui répond à cette demande.
"""
        
        # Get AI response
        rag_response = await get_rag_response_modular(
            query=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_id=request.conversationId,
            use_retrieval=request.use_rag or False,
            include_profile_context=False,
            temperature=0.7
        )
        
        logger.info("Email generation completed successfully",
                   user_id=request.userId,
                   response_length=len(rag_response.get("response", "")))
        
        return ComposeResponse(
            generated_text=rag_response.get("response", ""),
            success=True,
            message="Email généré avec succès",
            sources=rag_response.get("sources", []),
            metadata={
                "tone": request.tone.value,
                "language": request.language.value,
                "use_rag": request.use_rag,
                "model": rag_response.get("model"),
                "temperature": rag_response.get("temperature", 0.7)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email generation failed", error=str(e), user_id=request.userId)
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
                   language=request.language.value)
        
        # Validate required fields for correction
        if not request.body or not request.body.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="body (email text) is required for correction"
            )
        
        # Build correction prompt
        prompt_builder = EmailPromptBuilder()
        
        # Get language-specific correction instructions
        lang_config = LanguageConfig.get_config(request.language)
        
        system_prompt = f"""Tu es un expert en correction de texte en {lang_config['name']}. 
Ta tâche est de corriger les erreurs de grammaire, d'orthographe, de ponctuation et de syntaxe 
tout en préservant le sens original et le style du texte.

Instructions :
- Corrige toutes les erreurs grammaticales et d'orthographe
- Améliore la ponctuation si nécessaire
- Maintiens le ton et le style original
- Préserve le sens et l'intention du message
- {lang_config['instruction']}

Réponds uniquement avec le texte corrigé, sans commentaires additionnels."""
        
        user_prompt = f"""Corrige ce texte d'email :

{request.body}

Retourne uniquement le texte corrigé."""
        
        # Get AI response
        rag_response = await get_rag_response_modular(
            query=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_id=request.conversationId,
            use_retrieval=False,  # Correction doesn't need RAG
            include_profile_context=False,
            temperature=0.3  # Lower temperature for more consistent corrections
        )
        
        logger.info("Email correction completed successfully",
                   user_id=request.userId,
                   original_length=len(request.body),
                   corrected_length=len(rag_response.get("response", "")))
        
        return ComposeResponse(
            generated_text=rag_response.get("response", ""),
            success=True,
            message="Email corrigé avec succès",
            metadata={
                "operation": "correction",
                "language": request.language.value,
                "original_length": len(request.body),
                "corrected_length": len(rag_response.get("response", "")),
                "model": rag_response.get("model"),
                "temperature": 0.3
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email correction failed", error=str(e), user_id=request.userId)
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
                   tone=request.tone.value,
                   language=request.language.value)
        
        # Validate required fields for reformulation
        if not request.body or not request.body.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="body (email text) is required for reformulation"
            )
        
        # Build reformulation prompt
        prompt_builder = EmailPromptBuilder()
        
        # Get language and tone configurations
        lang_config = LanguageConfig.get_config(request.language)
        tone_instruction = prompt_builder.get_tone_instruction(request.tone)
        
        system_prompt = f"""Tu es un expert en rédaction et reformulation de texte en {lang_config['name']}. 
Ta tâche est de reformuler le texte pour améliorer sa clarté, son style et son impact 
tout en préservant le sens original.

Instructions :
- {tone_instruction}
- Améliore la clarté et la fluidité du texte
- Maintiens le sens et l'intention originale
- Adapte le style au ton demandé : {request.tone.value}
- {lang_config['instruction']}
{f"- Instructions spécifiques : {request.additionalInfo}" if request.additionalInfo else ""}

Réponds uniquement avec le texte reformulé, sans commentaires additionnels."""
        
        user_prompt = f"""Reformule ce texte d'email selon les instructions :

Texte original :
{request.body}

{f"Instructions de reformulation : {request.additionalInfo}" if request.additionalInfo else "Améliore la clarté, le style et la fluidité du texte."}

Ton souhaité : {request.tone.value}

Retourne uniquement le texte reformulé."""
        
        # Get AI response
        rag_response = await get_rag_response_modular(
            query=user_prompt,
            system_prompt=system_prompt,
            user_id=request.userId or (current_user.get("uid") if current_user else "anonymous"),
            conversation_id=request.conversationId,
            use_retrieval=request.use_rag or False,
            include_profile_context=False,
            temperature=0.5  # Moderate temperature for creative reformulation
        )
        
        logger.info("Email reformulation completed successfully",
                   user_id=request.userId,
                   original_length=len(request.body),
                   reformulated_length=len(rag_response.get("response", "")))
        
        return ComposeResponse(
            generated_text=rag_response.get("response", ""),
            success=True,
            message="Email reformulé avec succès",
            sources=rag_response.get("sources", []) if request.use_rag else [],
            metadata={
                "operation": "reformulation",
                "tone": request.tone.value,
                "language": request.language.value,
                "use_rag": request.use_rag,
                "original_length": len(request.body),
                "reformulated_length": len(rag_response.get("response", "")),
                "model": rag_response.get("model"),
                "temperature": 0.5,
                "instructions": request.additionalInfo
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Email reformulation failed", error=str(e), user_id=request.userId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la reformulation de l'email: {str(e)}"
        )

# Note: Error handlers should be defined on the main FastAPI app, not on routers
# They are handled by the global exception handlers in main.py
