"""
MCP router for the MCP server.
Implements the Model Context Protocol endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
import json
from backend.core.logger import log

from .schemas import (
    MCPRequest,
    SendEmailRequest,
    ReplyEmailRequest,
    ForwardEmailRequest,
    MoveEmailRequest,
    RetrieveConversationRequest,
    RAGQueryRequest,
    MCPResponse
)
from .auth import get_current_user
from .tools.email_tools import EmailTools
from .tools.rag_tools import RAGTools

# Setup logger
logger = log.bind(name="backend.mcp.router")

# Initialize router
router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.get("/schema", response_model=Dict[str, Any])
async def get_schema():
    """
    Get the OpenAPI schema for the MCP tools.
    
    Returns:
        OpenAPI schema in JSON format
    """
    schema = {
        "openapi": "3.0.0",
        "info": {
            "title": "LocalAI MCP API",
            "description": "Model Context Protocol API for LocalAI",
            "version": "1.0.0"
        },
        "paths": {},
        "components": {
            "schemas": {},
            "x-mcp-tools": {
                "send_email": {
                    "description": "Send a new email",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "to": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of recipient email addresses"
                            },
                            "subject": {
                                "type": "string",
                                "description": "Subject of the email"
                            },
                            "body": {
                                "type": "string",
                                "description": "Body content of the email"
                            },
                            "provider": {
                                "type": "string",
                                "description": "Email provider (gmail or outlook)",
                                "enum": ["gmail", "outlook"]
                            }
                        },
                        "required": ["to", "subject", "body"]
                    }
                },
                "reply_to_email": {
                    "description": "Reply to an existing email",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "email_id": {
                                "type": "string",
                                "description": "ID of the email to reply to"
                            },
                            "body": {
                                "type": "string",
                                "description": "Body content of the reply"
                            },
                            "provider": {
                                "type": "string",
                                "description": "Email provider (gmail or outlook)",
                                "enum": ["gmail", "outlook"]
                            }
                        },
                        "required": ["email_id", "body"]
                    }
                },
                "forward_email": {
                    "description": "Forward an email to new recipients",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "email_id": {
                                "type": "string",
                                "description": "ID of the email to forward"
                            },
                            "to": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of recipient email addresses"
                            },
                            "additional_comment": {
                                "type": "string",
                                "description": "Optional comment to add to the forwarded email"
                            },
                            "provider": {
                                "type": "string",
                                "description": "Email provider (gmail or outlook)",
                                "enum": ["gmail", "outlook"]
                            }
                        },
                        "required": ["email_id", "to"]
                    }
                },
                "move_email_to_folder": {
                    "description": "Move an email to a specific folder",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "email_id": {
                                "type": "string",
                                "description": "ID of the email to move"
                            },
                            "folder": {
                                "type": "string",
                                "description": "Destination folder name"
                            },
                            "provider": {
                                "type": "string",
                                "description": "Email provider (gmail or outlook)",
                                "enum": ["gmail", "outlook"]
                            }
                        },
                        "required": ["email_id", "folder"]
                    }
                },
                "retrieve_conversation_history": {
                    "description": "Retrieve the history of a conversation thread",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "conversation_id": {
                                "type": "string",
                                "description": "ID of the conversation to retrieve"
                            }
                        },
                        "required": ["conversation_id"]
                    }
                },
                "rag_query": {
                    "description": "Query the RAG system with a question",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "question": {
                                "type": "string",
                                "description": "Question to query the RAG system with"
                            }
                        },
                        "required": ["question"]
                    }
                }
            }
        }
    }
    
    return schema


@router.post("/call", response_model=MCPResponse)
async def call_tool(request: MCPRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Call an MCP tool with the specified parameters.
    
    Args:
        request: MCPRequest containing tool_name and parameters
        user: User information from the authentication token
        
    Returns:
        MCPResponse with the result of the tool call
    """
    tool_name = request.tool_name
    parameters = request.parameters
    user_id = user.get("uid")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token"
        )
    
    logger.info(f"MCP tool call: {tool_name} for user {user_id}")
    
    try:
        # Email tools
        if tool_name == "send_email":
            params = SendEmailRequest(**parameters)
            return EmailTools.send_email(
                user_id=user_id,
                to=params.to,
                subject=params.subject,
                body=params.body,
                provider=params.provider
            )
        
        elif tool_name == "reply_to_email":
            params = ReplyEmailRequest(**parameters)
            return EmailTools.reply_to_email(
                user_id=user_id,
                email_id=params.email_id,
                body=params.body,
                provider=params.provider
            )
        
        elif tool_name == "forward_email":
            params = ForwardEmailRequest(**parameters)
            return EmailTools.forward_email(
                user_id=user_id,
                email_id=params.email_id,
                to=params.to,
                additional_comment=params.additional_comment,
                provider=params.provider
            )
        
        elif tool_name == "move_email_to_folder":
            params = MoveEmailRequest(**parameters)
            return EmailTools.move_email_to_folder(
                user_id=user_id,
                email_id=params.email_id,
                folder=params.folder,
                provider=params.provider
            )
        
        elif tool_name == "retrieve_conversation_history":
            params = RetrieveConversationRequest(**parameters)
            return EmailTools.retrieve_conversation_history(
                user_id=user_id,
                conversation_id=params.conversation_id
            )
        
        # RAG tools
        elif tool_name == "rag_query":
            params = RAGQueryRequest(**parameters)
            return RAGTools.rag_query(
                user_id=user_id,
                question=params.question
            )
        
        else:
            return MCPResponse(
                success=False,
                error=f"Unknown tool: {tool_name}"
            )
    
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return MCPResponse(
            success=False,
            error=f"Error executing tool {tool_name}: {str(e)}"
        )
