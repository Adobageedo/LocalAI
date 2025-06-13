"""
Router pour les endpoints compatibles avec l'API OpenAI.
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Dict, Optional, Any
import logging

from backend.core.config import OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL
from backend.core.logger import log

router = APIRouter()

@router.post("/embeddings")
async def create_embeddings(
    request: Dict[str, Any] = Body(...),
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Endpoint compatible avec l'API OpenAI pour créer des embeddings.
    """
    try:
        model = request.get("model", OPENAI_EMBEDDING_MODEL)
        input_texts = request.get("input", [])
        
        if not isinstance(input_texts, list):
            input_texts = [input_texts]
            
        # Vérifier que nous avons du contenu à traiter
        if not input_texts:
            raise HTTPException(status_code=400, detail="Aucun texte à encoder fourni")
            
        # Dans une implémentation réelle, nous utiliserions le service d'embeddings ici
        # Pour l'instant, nous retournons une structure compatible OpenAI sans les embeddings réels
        
        embeddings_response = {
            "object": "list",
            "data": [
                {
                    "object": "embedding",
                    "embedding": [0.0] * 384,  # Taille d'embedding factice
                    "index": i
                } for i in range(len(input_texts))
            ],
            "model": model,
            "usage": {
                "prompt_tokens": sum(len(text.split()) for text in input_texts),
                "total_tokens": sum(len(text.split()) for text in input_texts)
            }
        }
        
        return embeddings_response
    except HTTPException:
        raise
    except Exception as e:
        log.exception(f"Erreur lors de la création d'embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur du service d'embeddings: {str(e)}")

@router.post("/completions")
async def create_completion(
    request: Dict[str, Any] = Body(...),
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Endpoint compatible avec l'API OpenAI pour les completions.
    """
    try:
        prompt = request.get("prompt", "")
        model = request.get("model", "text-davinci-003")
        max_tokens = request.get("max_tokens", 100)
        temperature = request.get("temperature", 0.7)
        
        # Dans une implémentation réelle, nous utiliserions le service de génération de texte ici
        # Pour l'instant, nous retournons une structure compatible OpenAI avec un message factice
        
        completion_response = {
            "id": "cmpl-factice",
            "object": "text_completion",
            "created": 1677858242,
            "model": model,
            "choices": [
                {
                    "text": f"Réponse factice générée pour: {prompt[:20]}...",
                    "index": 0,
                    "logprobs": None,
                    "finish_reason": "length"
                }
            ],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": max_tokens,
                "total_tokens": len(prompt.split()) + max_tokens
            }
        }
        
        return completion_response
    except Exception as e:
        log.exception(f"Erreur lors de la génération de completion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur du service de completion: {str(e)}")

@router.post("/chat/completions")
async def create_chat_completion(
    request: Dict[str, Any] = Body(...),
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Endpoint compatible avec l'API OpenAI pour les chat completions.
    """
    try:
        messages = request.get("messages", [])
        model = request.get("model", "gpt-3.5-turbo")
        max_tokens = request.get("max_tokens", 100)
        temperature = request.get("temperature", 0.7)
        
        if not messages:
            raise HTTPException(status_code=400, detail="Aucun message fourni")
            
        # Dans une implémentation réelle, nous utiliserions le service de génération de texte ici
        # Pour l'instant, nous retournons une structure compatible OpenAI avec une réponse factice
        
        last_message = messages[-1]
        last_content = last_message.get("content", "")
        
        chat_completion_response = {
            "id": "chatcmpl-factice",
            "object": "chat.completion",
            "created": 1677858242,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": f"Réponse factice du chatbot: {last_content[:20]}..."
                    },
                    "finish_reason": "length"
                }
            ],
            "usage": {
                "prompt_tokens": sum(len(msg.get("content", "").split()) for msg in messages),
                "completion_tokens": max_tokens,
                "total_tokens": sum(len(msg.get("content", "").split()) for msg in messages) + max_tokens
            }
        }
        
        return chat_completion_response
    except Exception as e:
        log.exception(f"Erreur lors de la génération de chat completion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur du service de chat: {str(e)}")
