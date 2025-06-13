"""
Router pour les endpoints de chat et requêtes RAG.
"""

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import List, Dict, Optional, Any
import logging
from pydantic import BaseModel

from backend.core.config import OPENAI_GENERATION_MODEL
from backend.core.logger import log

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = OPENAI_GENERATION_MODEL
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 800
    collection_name: Optional[str] = None
    k: Optional[int] = 5
    similarity_threshold: Optional[float] = 0.7

@router.post("/chat")
async def chat_completion(
    request: ChatRequest,
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Endpoint pour les requêtes de chat avec RAG.
    """
    try:
        messages = request.messages
        model = request.model
        collection_name = request.collection_name or f"default_{user_id}"
        
        if not messages:
            raise HTTPException(status_code=400, detail="Aucun message fourni")
            
        # Dans une implémentation réelle, nous utiliserions le service RAG ici
        # 1. Extraire la dernière question de l'utilisateur
        # 2. Récupérer les documents pertinents depuis Qdrant
        # 3. Construire un prompt augmenté
        # 4. Appeler l'API de génération de texte
        
        last_message = messages[-1]
        query = last_message.content if last_message.role == "user" else "No query provided"
        
        # Simuler une recherche de documents similaires
        context_documents = [
            {"content": "Document 1 content for simulated RAG", "metadata": {"source": "doc1.pdf", "page": 1}},
            {"content": "Document 2 content for simulated RAG", "metadata": {"source": "doc2.txt", "page": None}}
        ]
        
        # Simuler une réponse générée
        response_content = f"Réponse simulée à: {query}\n\nCette réponse est basée sur les documents suivants:\n- doc1.pdf (page 1)\n- doc2.txt"
        
        response = {
            "id": "chatcmpl-rag-factice",
            "object": "chat.completion",
            "created": 1677858242,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_content
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": sum(len(msg.content.split()) for msg in messages),
                "completion_tokens": len(response_content.split()),
                "total_tokens": sum(len(msg.content.split()) for msg in messages) + len(response_content.split())
            },
            "retrieved_documents": [doc["metadata"] for doc in context_documents]
        }
        
        return response
    except Exception as e:
        log.exception(f"Erreur lors de la génération de réponse RAG: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur du service RAG: {str(e)}")

@router.post("/documents/search")
async def search_documents(
    query: str = Body(..., embed=True),
    collection_name: Optional[str] = Body(None, embed=True),
    k: Optional[int] = Body(5, embed=True),
    filter: Optional[Dict[str, Any]] = Body(None, embed=True),
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Recherche des documents similaires à une requête dans la base de vecteurs.
    """
    try:
        # Normaliser le nom de collection
        collection_name = collection_name or f"default_{user_id}"
        
        # Simuler une recherche de documents similaires
        results = [
            {
                "document": {
                    "content": "Contenu du document 1 correspondant à la recherche.",
                    "metadata": {
                        "source": "doc1.pdf",
                        "page": 1,
                        "title": "Document 1",
                        "date": "2023-01-01"
                    }
                },
                "score": 0.92,
                "id": "doc_id_1"
            },
            {
                "document": {
                    "content": "Contenu du document 2 correspondant à la recherche.",
                    "metadata": {
                        "source": "doc2.txt",
                        "title": "Document 2",
                        "date": "2023-01-02"
                    }
                },
                "score": 0.85,
                "id": "doc_id_2"
            }
        ]
        
        return {
            "query": query,
            "collection_name": collection_name,
            "results": results
        }
    except Exception as e:
        log.exception(f"Erreur lors de la recherche de documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de recherche: {str(e)}")

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    collection_name: Optional[str] = None,
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Récupère un document spécifique par son ID.
    """
    try:
        # Normaliser le nom de collection
        collection_name = collection_name or f"default_{user_id}"
        
        # Simuler la récupération d'un document
        document = {
            "id": document_id,
            "content": f"Contenu du document {document_id}.",
            "metadata": {
                "source": f"{document_id}.pdf",
                "title": f"Document {document_id}",
                "date": "2023-01-01",
                "page": 1
            },
            "embedding": [0.0] * 10  # Embedding factice tronqué
        }
        
        return document
    except Exception as e:
        log.exception(f"Erreur lors de la récupération du document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de récupération: {str(e)}")

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    collection_name: Optional[str] = None,
    user_id: str = Query("default", description="Identifiant de l'utilisateur")
):
    """
    Supprime un document spécifique par son ID.
    """
    try:
        # Normaliser le nom de collection
        collection_name = collection_name or f"default_{user_id}"
        
        # Simuler la suppression d'un document
        return {
            "status": "success",
            "message": f"Document {document_id} supprimé avec succès de la collection {collection_name}",
            "document_id": document_id
        }
    except Exception as e:
        log.exception(f"Erreur lors de la suppression du document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de suppression: {str(e)}")
