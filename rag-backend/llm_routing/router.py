"""
llm_routing/router.py

This module provides a basic FastAPI router for LLM routing. It exposes an endpoint to route prompts to different LLMs based on configurable logic (e.g., model selection, user profile, prompt type).
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
from llm_routing.actions import route_action

router = APIRouter()

# Updated request schema: includes 'action' and 'params'
class LLMRouteRequest(BaseModel):
    action: str  # e.g., 'retrieve_information', 'retrieve_document', 'write_email'
    params: Dict[str, Any] = {}
    prompt: Optional[str] = None  # Still allow prompt for LLMs
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    preferred_model: Optional[str] = None

class LLMRouteResponse(BaseModel):
    action: str
    response: str
    meta: Optional[Dict[str, Any]] = None

AVAILABLE_MODELS = ["gpt-4", "gpt-3.5-turbo", "llama-2-70b"]

def select_model(request: LLMRouteRequest) -> str:
    if request.preferred_model in AVAILABLE_MODELS:
        return request.preferred_model
    if request.context and request.context.get("task") == "summarization":
        return "gpt-3.5-turbo"
    return "gpt-4"

@router.post("/route", response_model=LLMRouteResponse)
def route_llm(request: LLMRouteRequest = Body(...)):
    model = select_model(request)
    # Route to the appropriate action
    action_result = route_action(request.action, request.params)
    return LLMRouteResponse(
        action=request.action,
        response=action_result,
        meta={"model_used": model, "routed": True}
    )
