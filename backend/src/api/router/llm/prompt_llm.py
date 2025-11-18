"""
Prompt LLM API Router
Streaming LLM responses with MCP tool support
"""

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, AsyncGenerator, Union
import json
import asyncio
import os
import sys
import base64
from openai import AsyncOpenAI

# Add the project root so we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))
from src.core.logger import log
from src.utils.file_processors import AttachmentProcessor, ImageProcessor

logger = log.bind(name="api.router.llm.prompt_llm")

router = APIRouter()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ==================== SCHEMAS ====================

class Message(BaseModel):
    role: str
    content: Union[str, List[Dict[str, Any]]]  # Support text or multimodal content


class Attachment(BaseModel):
    filename: str
    content: str  # Base64 encoded
    mime_type: Optional[str] = None


class PromptRequest(BaseModel):
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 4000
    messages: List[Message]
    use_mcp_tools: bool = Field(default=False, alias="useMcpTools")
    attachments: Optional[List[Attachment]] = None
    
    class Config:
        populate_by_name = True


# ==================== MCP TOOLS ====================

MCP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "generate_pdp_document",
            "description": "Generate a PDP document from a template with provided data. Supports both flat format and company/workers structured format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pdpId": {
                        "type": "string",
                        "description": "Unique identifier for the PDP"
                    },
                    "windfarmName": {
                        "type": "string",
                        "description": "Name of the windfarm"
                    },
                    "data": {
                        "type": "object",
                        "description": "Document data including company and workers information"
                    },
                    "surname": {
                        "type": "string",
                        "description": "Surname for file naming (optional)"
                    },
                    "templateName": {
                        "type": "string",
                        "description": "Template file name (optional)"
                    },
                    "mergeWithPDP": {
                        "type": "boolean",
                        "description": "Whether to merge with annual PDF (default: true)"
                    }
                },
                "required": ["pdpId", "windfarmName", "data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_note",
            "description": "Save a note/point to the database with date, windfarm, topic, comment, type, and company",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Date in YYYY-MM-DD format"
                    },
                    "windfarm": {
                        "type": "string",
                        "description": "Windfarm name"
                    },
                    "topic": {
                        "type": "string",
                        "description": "Note topic/title"
                    },
                    "comment": {
                        "type": "string",
                        "description": "Note content/comment"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["O&M", "operational", "invoice", "contract", "meeting", "incident", "maintenance", "other"],
                        "description": "Note type"
                    },
                    "company": {
                        "type": "string",
                        "description": "Company name (optional)"
                    }
                },
                "required": ["date", "windfarm", "topic", "comment", "type"]
            }
        }
    }
]


# ==================== HELPER FUNCTIONS ====================

async def execute_mcp_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute an MCP tool"""
    try:
        logger.info(f"Executing MCP tool: {tool_name}")
        logger.debug(f"Tool arguments: {json.dumps(arguments, indent=2)}")
        
        if tool_name == "generate_pdp_document":
            from src.services.mcp.mcp_document_generator import DocumentGeneratorService
            service = DocumentGeneratorService()
            result = await service.generate_pdp(
                pdp_id=arguments.get("pdpId"),
                windfarm_name=arguments.get("windfarmName"),
                data=arguments.get("data"),
                surname=arguments.get("surname"),
                template_name=arguments.get("templateName"),
                merge_with_pdp=arguments.get("mergeWithPDP", True)
            )
            return result
            
        elif tool_name == "save_note":
            from src.services.mcp.mcp_notes_service import NotesService
            service = NotesService()
            result = service.add_note({
                "date": arguments.get("date"),
                "windfarm": arguments.get("windfarm"),
                "topic": arguments.get("topic"),
                "comment": arguments.get("comment"),
                "type": arguments.get("type"),
                "company": arguments.get("company")
            })
            return result
        
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
            
    except Exception as e:
        logger.error(f"Error executing MCP tool {tool_name}: {str(e)}")
        return {
            "error": f"Tool '{tool_name}' failed: {str(e)}",
            "tool": tool_name,
            "code": "TOOL_ERROR"
        }


async def stream_llm_response(
    messages: List[Dict[str, Any]],
    model: str,
    temperature: float,
    max_tokens: int,
    tools: Optional[List[Dict]] = None
) -> AsyncGenerator[str, None]:
    """Stream LLM response with SSE format"""
    try:
        # First call: check for tool calls
        if tools:
            logger.info("Making LLM call with tools (non-streaming)")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                tools=tools,
                tool_choice="auto"
            )
            
            message = response.choices[0].message
            
            # If tool calls requested
            if message.tool_calls:
                logger.info(f"LLM requested {len(message.tool_calls)} tool call(s)")
                
                # Execute tool calls
                messages.append(message.dict())
                
                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    # Execute tool
                    tool_result = await execute_mcp_tool(tool_name, tool_args)
                    
                    # Add tool response to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": tool_name,
                        "content": json.dumps(tool_result)
                    })
                
                # Second call: stream final response
                logger.info("Streaming final response after tool execution")
        
        # Stream the response
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # SSE format
                yield f"data: {json.dumps({'content': content, 'done': False})}\n\n"
        
        # Send done signal
        yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
        
    except Exception as e:
        logger.error(f"Error in LLM streaming: {str(e)}")
        error_data = json.dumps({
            "error": str(e),
            "done": True
        })
        yield f"data: {error_data}\n\n"


def process_attachments_for_llm(attachments: List[Attachment], messages: List[Dict]) -> List[Dict]:
    """
    Process attachments and integrate them into messages
    For images: Add to message content for GPT Vision
    For text/office/pdf: Add as context to system message
    """
    if not attachments:
        return messages
    
    # Process all attachments
    attachments_data = [{
        'filename': att.filename,
        'content': att.content
    } for att in attachments]
    
    processed = AttachmentProcessor.process_multiple_attachments(attachments_data)
    
    # Build context from text-based files
    text_context_parts = []
    
    # Add text files
    for text_file in processed['text_files']:
        text_context_parts.append(f"\n--- Content from {text_file['filename']} ---\n{text_file['content']}")
    
    # Add office files
    for office_file in processed['office_files']:
        text_context_parts.append(f"\n--- Content from {office_file['filename']} ---\n{office_file['content']}")
    
    # Add PDFs
    for pdf_file in processed['pdfs']:
        text_context_parts.append(f"\n--- Content from {pdf_file['filename']} ---\n{pdf_file['content']}")
    
    # Add text context to first message (usually system message)
    if text_context_parts and messages:
        context_text = "\n\n## Attached Documents:\n" + "\n".join(text_context_parts)
        messages[0]['content'] = messages[0]['content'] + context_text
    
    # Handle images for GPT Vision
    if processed['images']:
        # Find the last user message to add images
        for i in range(len(messages) - 1, -1, -1):
            if messages[i]['role'] == 'user':
                # Convert content to multimodal format
                current_content = messages[i]['content']
                
                # Create multimodal content
                multimodal_content = [{
                    "type": "text",
                    "text": current_content if isinstance(current_content, str) else str(current_content)
                }]
                
                # Add images
                for img in processed['images']:
                    multimodal_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": img['data_url'],
                            "detail": "high"
                        }
                    })
                
                messages[i]['content'] = multimodal_content
                logger.info(f"Added {len(processed['images'])} images to user message for GPT Vision")
                break
    
    # Log errors if any
    if processed['errors']:
        logger.warning(f"Attachment processing errors: {processed['errors']}")
    
    return messages


# ==================== ROUTES ====================

@router.post("/")
async def prompt_llm(request: PromptRequest):
    """
    Stream LLM response with optional MCP tool support
    
    This endpoint supports Server-Sent Events (SSE) for streaming responses
    """
    try:
        logger.info(f"Prompt LLM request: model={request.model}, use_mcp={request.use_mcp_tools}, attachments={len(request.attachments) if request.attachments else 0}")
        
        # Convert messages to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Process attachments if present
        if request.attachments:
            messages = process_attachments_for_llm(request.attachments, messages)
            # Use GPT-4 Vision if images are present
            if any('image_url' in str(msg.get('content', '')) for msg in messages):
                if 'gpt-4' not in request.model:
                    request.model = 'gpt-4o'  # Use GPT-4o for vision
                    logger.info(f"Switched to {request.model} for image processing")
        
        # Prepare tools if requested
        tools = MCP_TOOLS if request.use_mcp_tools else None
        
        # Stream response
        return StreamingResponse(
            stream_llm_response(
                messages=messages,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                tools=tools
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.error(f"Error in prompt LLM: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process LLM request: {str(e)}"
        )
