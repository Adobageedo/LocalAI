"""
MCP router for the MCP server.
Implements the Model Context Protocol endpoints.
Provides direct access to core adapters based on user's connected services.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import Dict, Any, List, Optional
import json
import os
import datetime
from backend.core.logger import log

from .schemas import (
    MCPRequest,
    RAGQueryRequest,
    MCPResponse,
    UserConnectedServices,
    AdapterStatus
)

# Import core adapters
from backend.core.adapters.google_email import GoogleEmail
from backend.core.adapters.microsoft_email import MicrosoftEmail
from backend.core.adapters.google_drive import GoogleDrive
from backend.core.adapters.onedrive_files import OneDrive
from backend.core.adapters.google_calendar import GoogleCalendar
from backend.core.adapters.outlook_calendar import OutlookCalendar
from .tools.rag_tools import RAGTools
from backend.services.auth.google_auth import check_google_auth_services
from backend.services.auth.microsoft_auth import check_microsoft_auth_services

# Setup logger
logger = log.bind(name="backend.mcp.router")

# Initialize router
router = APIRouter(prefix="/mcp", tags=["mcp"])

# Dictionary to store adapter instances by user_id
user_adapters = {}


def get_user_connected_capabilities(user_id: str) -> Dict[str, Any]:
    """
    Get the list of capabilities that the user has access to, along with provider information.
    
    Args:
        user_id: The user ID to check capabilities for
        
    Returns:
        Dictionary with capabilities list, provider mapping, and provider capabilities
    """
    result = {
        "capabilities": [],
        "providers": {},
        "provider_capabilities": {}
    }
    
    # Check Google authentication and services
    google = check_google_auth_services(user_id)
    if google["authenticated"]:
        result["provider_capabilities"]["google"] = []
        
        if "gmail" in google["services"]:
            result["capabilities"].append("email")
            result["providers"]["email"] = "gmail"
            result["provider_capabilities"]["google"].append("email")
        
        if "gdrive" in google["services"]:
            result["capabilities"].append("cloud_storage")
            result["providers"]["cloud_storage"] = "gdrive"
            result["provider_capabilities"]["google"].append("cloud_storage")
        
        if "gcalendar" in google["services"]:
            result["capabilities"].append("calendar")
            result["providers"]["calendar"] = "gcalendar"
            result["provider_capabilities"]["google"].append("calendar")
    else:
        # Check Microsoft authentication and services
        microsoft = check_microsoft_auth_services(user_id)
        if microsoft["authenticated"]:
            result["provider_capabilities"]["microsoft"] = []
            
            if "outlook" in microsoft["services"]:
                result["capabilities"].append("email")
                result["providers"]["email"] = "outlook"
                result["provider_capabilities"]["microsoft"].append("email")
            
            if "onedrive" in microsoft["services"]:
                result["capabilities"].append("cloud_storage")
                result["providers"]["cloud_storage"] = "onedrive"
                result["provider_capabilities"]["microsoft"].append("cloud_storage")
            
            if "outlook_calendar" in microsoft["services"]:
                result["capabilities"].append("calendar")
                result["providers"]["calendar"] = "outlook_calendar"
                result["provider_capabilities"]["microsoft"].append("calendar")
    
    # RAG is always available
    result["capabilities"].append("rag")
    result["providers"]["rag"] = "local"
    
    logger.info(f"User {user_id} has connected capabilities: {result['capabilities']} with providers: {result['providers']}")
    return result


def get_adapter_for_user(user_id: str, adapter_type: str):
    """
    Get or create an adapter instance for the specified user and adapter type.
    Uses provider information from get_user_connected_capabilities.
    
    Args:
        user_id: The user ID to get the adapter for
        adapter_type: The type of adapter to get (gmail, outlook, gdrive, etc.)
        
    Returns:
        An initialized adapter instance or None if not available
    """
    # Create a unique key for this user and adapter type
    adapter_key = f"{user_id}_{adapter_type}"
    
    # Check if we already have an initialized adapter
    if adapter_key in user_adapters:
        return user_adapters[adapter_key]
    
    # Get user capabilities and provider information
    user_info = get_user_connected_capabilities(user_id)
    providers = user_info["providers"]
    
    # Initialize a new adapter based on the type and available provider
    try:
        # Map capability to adapter type
        capability_to_adapter = {
            "gmail": "email",
            "outlook": "email",
            "gdrive": "cloud_storage",
            "onedrive": "cloud_storage",
            "gcalendar": "calendar",
            "outlook_calendar": "calendar"
        }
        
        # Get the capability for this adapter type
        capability = capability_to_adapter.get(adapter_type)
        if not capability:
            logger.error(f"Unknown adapter type: {adapter_type}")
            return None
        
        # Check if this adapter is the preferred provider for this capability
        preferred_provider = providers.get(capability)
        if preferred_provider != adapter_type and preferred_provider is not None:
            logger.debug(f"Adapter {adapter_type} is not the preferred provider for {capability}. Preferred: {preferred_provider}")
            # Only continue if this is the exact adapter type requested
        
        # Initialize the appropriate adapter
        if adapter_type == "gmail":
            adapter = GoogleEmail(user_id)
        elif adapter_type == "outlook":
            adapter = MicrosoftEmail(user_id)
        elif adapter_type == "gdrive":
            adapter = GoogleDrive(user_id)
        elif adapter_type == "onedrive":
            adapter = OneDrive(user_id)
        elif adapter_type == "gcalendar":
            adapter = GoogleCalendar(user_id)
        elif adapter_type == "outlook_calendar":
            adapter = OutlookCalendar(user_id)
        else:
            logger.error(f"Unknown adapter type: {adapter_type}")
            return None
        
        # Authenticate and cache the adapter
        if adapter.authenticate():
            user_adapters[adapter_key] = adapter
            return adapter
    
    except Exception as e:
        logger.error(f"Error initializing {adapter_type} adapter for user {user_id}: {str(e)}")
        return None
    
    return None


@router.get("/schema/{user_id}", response_model=Dict[str, Any])
async def get_schema(user_id: str):
    """
    Get the OpenAPI schema for the MCP tools based on user's connected capabilities.
    
    Args:
        user_id: The user ID to get available tools for
        
    Returns:
        OpenAPI schema in JSON format with available tools
    """
    # Get the user's connected capabilities
    user_info = get_user_connected_capabilities(user_id)
    capabilities = user_info["capabilities"]
    logger.info(f"Generating schema for user {user_id} with capabilities: {capabilities}")
    
    # Initialize schema
    schema = {
        "openapi": "3.0.0",
        "info": {
            "title": "Model Context Protocol",
            "description": "Tools available through the Model Context Protocol",
            "version": "1.0.0"
        },
        "paths": {},
        "components": {
            "schemas": {}
        }
    }
    
    # Add RAG tools (always available)
    schema["components"]["schemas"]["rag_query"] = {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "Question to query the RAG system with"
            }
        },
        "required": ["question"],
        "description": "Query the RAG system with a question"
    }
    
    # Add Email tools if available
    if "email" in capabilities:
        schema["components"]["schemas"]["send_email"] = {
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
                    "description": "Body content of the email (plain text)"
                },
                "cc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of CC recipient email addresses"
                },
                "bcc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of BCC recipient email addresses"
                },
                "html_content": {
                    "type": "string",
                    "description": "Optional HTML version of the email body"
                }
            },
            "required": ["to", "subject", "body"],
            "description": "Send an email"
        }
        
        schema["components"]["schemas"]["reply_to_email"] = {
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
                "cc": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of CC recipient email addresses"
                },
                "include_original": {
                    "type": "boolean",
                    "description": "Whether to include the original email content in the reply"
                }
            },
            "required": ["email_id", "body"],
            "description": "Reply to an email"
        }
        
        schema["components"]["schemas"]["forward_email"] = {
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
                    "description": "Additional comment to include in the forwarded email"
                }
            },
            "required": ["email_id", "to"],
            "description": "Forward an email"
        }
    
    # Add Cloud Storage tools if available
    if "cloud_storage" in capabilities:
        schema["components"]["schemas"]["list_files"] = {
            "type": "object",
            "properties": {
                "folder_id": {
                    "type": "string",
                    "description": "ID of the folder to list files from (default: root)"
                },
                "page_size": {
                    "type": "integer",
                    "description": "Number of files to return per page (default: 100)"
                }
            },
            "required": [],
            "description": "List files from cloud storage"
        }
        
        schema["components"]["schemas"]["get_file_content"] = {
            "type": "object",
            "properties": {
                "file_id": {
                    "type": "string",
                    "description": "ID of the file to get content for"
                }
            },
            "required": ["file_id"],
            "description": "Get content of a file from cloud storage"
        }
    
    # Add Calendar tools if available
    if "calendar" in capabilities:
        schema["components"]["schemas"]["list_events"] = {
            "type": "object",
            "properties": {
                "calendar_id": {
                    "type": "string",
                    "description": "ID of the calendar to list events from (default: primary)"
                },
                "time_min": {
                    "type": "string",
                    "description": "Start time for the events query (ISO format)"
                },
                "time_max": {
                    "type": "string",
                    "description": "End time for the events query (ISO format)"
                }
            },
            "required": [],
            "description": "List events from calendar"
        }
        
        schema["components"]["schemas"]["create_event"] = {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Summary/title of the event"
                },
                "description": {
                    "type": "string",
                    "description": "Description of the event"
                },
                "start_time": {
                    "type": "string",
                    "description": "Start time of the event (ISO format)"
                },
                "end_time": {
                    "type": "string",
                    "description": "End time of the event (ISO format)"
                },
                "location": {
                    "type": "string",
                    "description": "Location of the event"
                },
                "calendar_id": {
                    "type": "string",
                    "description": "ID of the calendar to create the event in (default: primary)"
                }
            },
            "required": ["summary", "start_time", "end_time"],
            "description": "Create a new calendar event"
        }
    
    return schema


@router.get("/services/{user_id}", response_model=UserConnectedServices)
async def get_user_services(user_id: str):
    """
    Get the list of services that the user has connected.
    
    Args:
        user_id: The user ID to check connected services for
        
    Returns:
        UserConnectedServices with the list of connected services and provider information
    """
    result = get_user_connected_capabilities(user_id)
    return UserConnectedServices(
        user_id=user_id,
        services=result["capabilities"],
        providers=result["providers"],
        capabilities=result["provider_capabilities"]
    )


@router.get("/adapter/{user_id}/{adapter_type}", response_model=AdapterStatus)
async def get_adapter_status(user_id: str, adapter_type: str):
    """
    Check if a specific adapter is available for the user.
    
    Args:
        user_id: The user ID to check adapter for
        adapter_type: The type of adapter to check
        
    Returns:
        AdapterStatus with availability information
    """
    adapter = get_adapter_for_user(user_id, adapter_type)
    if adapter:
        return AdapterStatus(
            adapter_type=adapter_type,
            is_available=True,
            error=None
        )
    else:
        return AdapterStatus(
            adapter_type=adapter_type,
            is_available=False,
            error=f"{adapter_type} not available for user {user_id}"
        )


@router.post("/call/{user_id}", response_model=MCPResponse)
async def call_tool(user_id: str, request: MCPRequest):
    """
    Call an MCP tool with the specified parameters.
    
    Args:
        user_id: The user ID to call the tool for
        request: MCPRequest containing tool_name and parameters
        
    Returns:
        MCPResponse with the result of the tool call
    """
    tool_name = request.tool_name
    parameters = request.parameters
    
    logger.info(f"MCP tool call: {tool_name} for user {user_id}")
    
    try:
        # RAG tools (always available)
        if tool_name == "rag_query":
            params = RAGQueryRequest(**parameters)
            return RAGTools.rag_query(
                user_id=user_id,
                question=params.question
            )
        
        # Email tools
        elif tool_name == "send_email":
            # Get the preferred email provider for this user
            user_info = get_user_connected_capabilities(user_id)
            email_provider = user_info["providers"].get("email")
            
            if not email_provider:
                return MCPResponse(
                    success=False,
                    error="Email capability not available for this user"
                )
                
            email_adapter = get_adapter_for_user(user_id, email_provider)
            
            result = email_adapter.send_email(
                recipients=parameters.get("to", []),
                subject=parameters.get("subject", ""),
                body=parameters.get("body", ""),
                cc=parameters.get("cc", None),
                bcc=parameters.get("bcc", None),
                html_content=parameters.get("html_content", None)
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        elif tool_name == "reply_to_email":
            # Get the preferred email provider for this user
            user_info = get_user_connected_capabilities(user_id)
            email_provider = user_info["providers"].get("email")
            
            if not email_provider:
                return MCPResponse(
                    success=False,
                    error="Email capability not available for this user"
                )
                
            email_adapter = get_adapter_for_user(user_id, email_provider)
            
            result = email_adapter.reply_to_email(
                email_id=parameters.get("email_id", ""),
                body=parameters.get("body", ""),
                cc=parameters.get("cc", None),
                include_original=parameters.get("include_original", True)
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        elif tool_name == "forward_email":
            # Get the preferred email provider for this user
            user_info = get_user_connected_capabilities(user_id)
            email_provider = user_info["providers"].get("email")
            
            if not email_provider:
                return MCPResponse(
                    success=False,
                    error="Email capability not available for this user"
                )
                
            email_adapter = get_adapter_for_user(user_id, email_provider)
            
            result = email_adapter.forward_email(
                email_id=parameters.get("email_id", ""),
                recipients=parameters.get("to", []),
                additional_comment=parameters.get("additional_comment")
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        elif tool_name == "create_draft":
            # Get the preferred email provider for this user
            user_info = get_user_connected_capabilities(user_id)
            email_provider = user_info["providers"].get("email")
            
            if not email_provider:
                return MCPResponse(
                    success=False,
                    error="Email capability not available for this user"
                )
                
            email_adapter = get_adapter_for_user(user_id, email_provider)
            
            result = email_adapter.create_draft(
                to=parameters.get("to", []),
                subject=parameters.get("subject", ""),
                body=parameters.get("body", "")
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        # Cloud Storage tools
        elif tool_name == "list_files":
            # Try Google Drive first, then OneDrive
            user_info = get_user_connected_capabilities(user_id)
            storage_provider = user_info["providers"].get("cloud_storage")
            
            if not storage_provider:
                return MCPResponse(
                    success=False,
                    error="Cloud Storage capability not available for this user"
                )
            
            storage_adapter = get_adapter_for_user(user_id, storage_provider)
            
            result = storage_adapter.list_files(
                folder_id=parameters.get("folder_id", "root"),
                max_results=parameters.get("page_size", 100)
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        elif tool_name == "get_file_content":
            # Get the preferred storage provider for this user
            user_info = get_user_connected_capabilities(user_id)
            storage_provider = user_info["providers"].get("cloud_storage")
            
            if not storage_provider:
                return MCPResponse(
                    success=False,
                    error="Cloud Storage capability not available for this user"
                )
                
            storage_adapter = get_adapter_for_user(user_id, storage_provider)
            
            result = storage_adapter.get_file_content(
                file_id=parameters.get("file_id", "")
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        # Calendar tools
        elif tool_name == "list_events":
            # Get the preferred calendar provider for this user
            user_info = get_user_connected_capabilities(user_id)
            calendar_provider = user_info["providers"].get("calendar")
            
            if not calendar_provider:
                return MCPResponse(
                    success=False,
                    error="Calendar capability not available for this user"
                )
                
            calendar_adapter = get_adapter_for_user(user_id, calendar_provider)
            
            # Handle time parameters - convert strings to datetime objects if provided
            time_min = parameters.get("time_min")
            time_max = parameters.get("time_max")
            
            # If time_min is a string, try to parse it as a datetime
            if time_min and isinstance(time_min, str):
                try:
                    time_min = datetime.datetime.fromisoformat(time_min.replace('Z', '+00:00'))
                except ValueError:
                    logger.error(f"Invalid time_min format: {time_min}")
                    time_min = None
            
            # If time_max is a string, try to parse it as a datetime
            if time_max and isinstance(time_max, str):
                try:
                    time_max = datetime.datetime.fromisoformat(time_max.replace('Z', '+00:00'))
                except ValueError:
                    logger.error(f"Invalid time_max format: {time_max}")
                    time_max = None
            
            result = calendar_adapter.list_events(
                calendar_id=parameters.get("calendar_id", "primary"),
                time_min=time_min,
                time_max=time_max
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
            )
        
        elif tool_name == "create_event":
            # Get the preferred calendar provider for this user
            user_info = get_user_connected_capabilities(user_id)
            calendar_provider = user_info["providers"].get("calendar")
            
            if not calendar_provider:
                return MCPResponse(
                    success=False,
                    error="Calendar capability not available for this user"
                )
                
            calendar_adapter = get_adapter_for_user(user_id, calendar_provider)
            
            result = calendar_adapter.create_event(
                summary=parameters.get("summary", ""),
                description=parameters.get("description", ""),
                start_time=parameters.get("start_time"),
                end_time=parameters.get("end_time"),
                location=parameters.get("location", ""),
                calendar_id=parameters.get("calendar_id", "primary")
            )
            
            return MCPResponse(
                success=result.get("success", False),
                data=result,
                error=result.get("error")
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
