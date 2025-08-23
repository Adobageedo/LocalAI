from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Optional, Any, Dict, Union
from pydantic import BaseModel, Field
from enum import Enum
import os
import sys
import json
import base64
from .email_config import SupportedLanguage

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from backend.services.auth.middleware.auth_firebase import get_current_user
from backend.services.rag.retrieve_rag_information_modular import get_rag_response_modular
from backend.core.logger import log

logger = log.bind(name="backend.api.outlook.summarize_router")

# Models
class SummaryType(str, Enum):
    """Types of summary available"""
    CONCISE = "concise"
    DETAILED = "detailed"
    BULLET_POINTS = "bullet_points"
    ACTION_ITEMS = "action_items"

class Source(BaseModel):
    """Source document used in RAG"""
    filename: str
    page_number: Optional[int] = None
    content: str

class ProcessingMode(str, Enum):
    """Processing mode used for the request"""
    CLIENT = "client"
    SERVER = "server"
    HYBRID = "hybrid"
    
class SummarizeRequest(BaseModel):
    """Request model for summarization"""
    authToken: Optional[str] = None
    userId: str
    
    # Email fields
    subject: Optional[str] = None
    from_email: Optional[str] = Field(None, alias="from")
    body: Optional[str] = None  # Now optional to support file-only requests
    
    # Configuration
    language: SupportedLanguage = SupportedLanguage.ENGLISH
    summary_type: SummaryType = SummaryType.CONCISE
    use_rag: Optional[bool] = False
    processing_mode: Optional[ProcessingMode] = ProcessingMode.SERVER
    
    # File summarization
    file_name: Optional[str] = None
    file_content: Optional[str] = None  # Base64 encoded file content (server-side processing)
    file_type: Optional[str] = None
    extracted_text: Optional[str] = None  # Pre-extracted text from client (client-side processing)

class SummarizeResponse(BaseModel):
    """Response model for summarization"""
    summary: str
    sources: List[Union[Source, str]] = []
    summary_type: SummaryType
    temperature: Optional[float] = None
    model: Optional[str] = None
    use_retrieval: Optional[bool] = None

# Router
router = APIRouter(prefix="/outlook", tags=["outlook"])

# Prompt templates for different summary types
SUMMARY_SYSTEM_PROMPTS = {
    SummaryType.CONCISE: """You are an AI assistant that summarizes content concisely. 
{language_instruction}

Content to summarize:
{content}

Create a concise summary (about 2-3 sentences) of the content that captures the most important information. Focus on key points only.
The summary should be:
- Brief and to the point
- Written in {language_name}
- Include only essential information
""",
    
    SummaryType.DETAILED: """You are an AI assistant that creates comprehensive summaries. 
{language_instruction}

Content to summarize:
{content}

Create a detailed summary of the content that captures all important information, context, and nuances. This should be a comprehensive overview.
The summary should be:
- Thorough and detailed (around 5-8 sentences)
- Written in {language_name}
- Include all important information
- Well-structured with logical flow
""",
    
    SummaryType.BULLET_POINTS: """You are an AI assistant that summarizes content in bullet point format. 
{language_instruction}

Content to summarize:
{content}

Create a bullet-point summary of the content that organizes the key information in an easy-to-read list format.
The summary should be:
- Written in {language_name}
- Formatted as bullet points (•)
- Include all important information
- Organized by topic or importance
- Brief but comprehensive
""",
    
    SummaryType.ACTION_ITEMS: """You are an AI assistant that identifies action items from content. 
{language_instruction}

Content to summarize:
{content}

Extract all action items, tasks, requests, and commitments from the content. Format them as a clear action item list.
The summary should be:
- Written in {language_name}
- Focused only on action items and tasks
- Formatted as a numbered list (1., 2., etc.)
- Specify who needs to do what (if mentioned)
- Include any relevant deadlines mentioned
"""
}
# Create API endpoints
router = APIRouter(prefix="/outlook", tags=["outlook"])

@router.get("/summarize/health")
async def health_check():
    """Health check endpoint for Outlook summarization router"""
    return {"status": "healthy", "service": "outlook-summarization"}

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request_data: SummarizeRequest,
    request: Request,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """Summarize email content or file attachment"""
    try:
        # Log the request (excluding sensitive content)
        logger.info(f"Received summarize request for user {request_data.userId}, language: {request_data.language}, summary type: {request_data.summary_type}, processing mode: {request_data.processing_mode}")
        
        # Verify user
        if current_user is None:
            # For development and testing, allow processing without auth
            logger.warning(f"No authenticated user found, proceeding with userId from request: {request_data.userId}")
            current_user = {"uid": request_data.userId}
        elif current_user.get("uid") != request_data.userId:
            logger.warning(f"User ID mismatch: {current_user.get('uid')} vs {request_data.userId}")
        
        # Determine what content we're working with
        is_file_request = request_data.file_name is not None
        is_client_processed = request_data.processing_mode == ProcessingMode.CLIENT and request_data.extracted_text is not None
        is_server_processed = request_data.processing_mode == ProcessingMode.SERVER and request_data.file_content is not None
        is_email_request = request_data.body is not None
        
        content_to_summarize = ""
        
        # Get the content to summarize based on processing mode
        if is_file_request:
            if is_client_processed:
                # Use pre-extracted text from client
                logger.info(f"Using client-extracted text for {request_data.file_name}")
                content_to_summarize = request_data.extracted_text
            elif is_server_processed:
                # Decode base64 file content
                logger.info(f"Processing file server-side for {request_data.file_name}")
                try:
                    content_to_summarize = request_data.file_content
                    # If you need to decode base64 and do server-side processing:
                    # decoded_content = base64.b64decode(request_data.file_content).decode('utf-8', errors='replace')
                    # content_to_summarize = decoded_content
                except Exception as e:
                    logger.error(f"Error decoding file content: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to decode file content: {str(e)}"
                    )
            else:
                # Handle case where file is requested but processing mode is unclear
                if request_data.body:
                    # Use body as fallback if provided
                    logger.info("Using body content as fallback for file summarization")
                    content_to_summarize = request_data.body
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="File request missing required content. Provide either extracted_text or file_content."
                    )
        elif is_email_request:
            # Email summarization
            logger.info("Processing email content")
            content_to_summarize = request_data.body
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request must include either email body or file information"
            )
            
        # Build the prompt based on the request type
        if is_file_request:
            # File summarization
            system_prompt = f"You are a helpful assistant that summarizes document content. Provide a {request_data.summary_type.value} summary of the document content."
            
            user_prompt = f"""Document: {request_data.file_name} ({request_data.file_type})

Content:
{content_to_summarize}

Provide a {request_data.summary_type.value} summary of this document in {request_data.language}."""
        else:
            # Email summarization
            system_prompt = f"You are a helpful assistant that summarizes email content. Provide a {request_data.summary_type.value} summary of the email content."
            
            # Create a prompt with the email content
            from_part = f"From: {request_data.from_email}\n" if request_data.from_email else ""
            subject_part = f"Subject: {request_data.subject}\n" if request_data.subject else ""
            
            user_prompt = f"""{from_part}{subject_part}
Email Content:
{content_to_summarize}

Provide a {request_data.summary_type.value} summary of this email in {request_data.language}."""
        
        # Add summary type specific instructions
        if request_data.summary_type == SummaryType.CONCISE:
            user_prompt += "\n\nKeep the summary brief and to the point, focusing only on the most important information."
        elif request_data.summary_type == SummaryType.DETAILED:
            user_prompt += "\n\nProvide a comprehensive summary including all key points, details, and context."
        elif request_data.summary_type == SummaryType.BULLET_POINTS:
            user_prompt += "\n\nFormat the summary as bullet points, with each point representing a distinct piece of information."
        elif request_data.summary_type == SummaryType.ACTION_ITEMS:
            user_prompt += "\n\nExtract and list all action items, tasks, requests, and deadlines mentioned in the content."
        
        # Call RAG system to generate summary
        response = get_rag_response_modular(
            system_prompt=system_prompt,
            prompt=user_prompt,
            query_embedding=None,
            retrieval_embedding=None,
            use_retrieval=request_data.use_rag,
            include_profile_context=False,
            temperature=0.3,  # Lower temperature for more factual summaries
            user_id=current_user["uid"],
        )
        
        summary = response.get("generated_text", "")
        
        # Return the summarized content
        return SummarizeResponse(
            summary=summary,
            sources=response.get("sources", []),
            summary_type=request_data.summary_type,
            temperature=0.3,
            model=response.get("model", None),
            use_retrieval=request_data.use_rag
        )
        
    except Exception as e:
        logger.error(f"Error generating summary for user {request_data.userId}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}"
        )


