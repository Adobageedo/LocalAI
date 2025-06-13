"""
Router pour les endpoints d'ingestion de documents et e-mails.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import JSONResponse, RedirectResponse
from typing import List, Dict, Optional, Any
from pathlib import Path
import os
import json
import logging
from urllib.parse import quote, urlencode

from backend.core.config import (
    GMAIL_CLIENT_ID, 
    GMAIL_CLIENT_SECRET, 
    GMAIL_REDIRECT_URI,
    GMAIL_AUTH_URI,
    GMAIL_TOKEN_URI
)
from backend.services.auth.credentials_manager import (
    check_google_credentials, 
    check_microsoft_credentials,
    save_google_token
)
from backend.services.auth.google_auth import get_gmail_service
from backend.core.logger import log

router = APIRouter()

# === Endpoints d'authentification et vérification ===

@router.get("/gmail/auth-status")
async def gmail_auth_status(user_id: str = "default"):
    """
    Vérifie le statut d'authentification Google pour l'utilisateur.
    """
    try:
        status = check_google_credentials(user_id)
        return status
    except Exception as e:
        log.exception(f"Erreur lors de la vérification de l'authentification Gmail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de vérification d'authentification: {str(e)}")

@router.get("/gmail/auth")
async def gmail_auth(user_id: str = "default"):
    """
    Génère l'URL d'authentification pour l'API Google.
    """
    try:
        # Définir les scopes requis
        scopes = [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.labels",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send"
        ]
        
        # Construire l'URL d'authentification
        auth_url = (
            f"{GMAIL_AUTH_URI}?"
            + urlencode({
                "client_id": GMAIL_CLIENT_ID,
                "redirect_uri": f"{GMAIL_REDIRECT_URI}/api/sources/gmail/oauth2callback",
                "response_type": "code",
                "scope": " ".join(scopes),
                "access_type": "offline",
                "state": user_id,  # Utiliser state pour transmettre l'user_id
                "prompt": "consent"
            })
        )
        
        return {"auth_url": auth_url}
    except Exception as e:
        log.exception(f"Erreur lors de la génération de l'URL d'authentification Gmail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'authentification: {str(e)}")

@router.get("/gmail/oauth2callback")
async def gmail_oauth2callback(code: str, state: Optional[str] = "default"):
    """
    Callback pour l'authentification OAuth2 Google.
    """
    try:
        user_id = state  # Récupérer l'user_id depuis le paramètre state
        
        # Échanger le code contre un token
        from google_auth_oauthlib.flow import Flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GMAIL_CLIENT_ID,
                    "client_secret": GMAIL_CLIENT_SECRET,
                    "redirect_uris": [f"{GMAIL_REDIRECT_URI}/api/sources/gmail/oauth2callback"],
                    "auth_uri": GMAIL_AUTH_URI,
                    "token_uri": GMAIL_TOKEN_URI,
                }
            },
            scopes=[
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.labels",
                "https://www.googleapis.com/auth/gmail.compose",
                "https://www.googleapis.com/auth/gmail.send"
            ]
        )
        
        # Set the redirect_uri to match the one used in the authorization request
        flow.redirect_uri = f"{GMAIL_REDIRECT_URI}/api/sources/gmail/oauth2callback"
        
        # Exchange the authorization code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Save the credentials using our centralized function
        save_google_token(user_id, credentials)
        
        # Redirect to frontend with success message
        return RedirectResponse(
            url=f"{GMAIL_REDIRECT_URI}/success?provider=gmail&user_id={user_id}"
        )
    except Exception as e:
        log.exception(f"Erreur lors de l'échange du code d'autorisation Gmail: {str(e)}")
        return RedirectResponse(
            url=f"{GMAIL_REDIRECT_URI}/error?provider=gmail&error={quote(str(e))}"
        )

@router.get("/outlook/auth-status")
async def outlook_auth_status(user_id: str = "default"):
    """
    Vérifie le statut d'authentification Microsoft pour l'utilisateur.
    """
    try:
        status = check_microsoft_credentials(user_id)
        return status
    except Exception as e:
        log.exception(f"Erreur lors de la vérification de l'authentification Outlook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de vérification d'authentification: {str(e)}")

# === Endpoints d'ingestion et récupération d'emails ===

@router.get("/gmail/recent")
async def get_recent_gmail_emails(user_id: str = "default", count: int = 10):
    """
    Récupère les emails récents depuis Gmail pour un utilisateur.
    """
    try:
        # Vérifier l'authentification
        auth_status = check_google_credentials(user_id)
        if not auth_status["valid"]:
            raise HTTPException(
                status_code=401, 
                detail=f"Authentification Gmail requise: {auth_status.get('error', 'Invalid token')}"
            )
        
        # Obtenir le service Gmail
        gmail = get_gmail_service(user_id)
        
        # Récupérer les messages récents
        results = gmail.users().messages().list(
            userId="me", 
            maxResults=count,
            labelIds=["INBOX"]
        ).execute()
        
        messages = results.get("messages", [])
        emails = []
        
        # Récupérer les détails de chaque message
        for message in messages:
            msg = gmail.users().messages().get(userId="me", id=message["id"]).execute()
            
            # Extraire les en-têtes pertinents
            headers = msg["payload"]["headers"]
            subject = next((h["value"] for h in headers if h["name"].lower() == "subject"), "No Subject")
            from_email = next((h["value"] for h in headers if h["name"].lower() == "from"), "Unknown Sender")
            date = next((h["value"] for h in headers if h["name"].lower() == "date"), "Unknown Date")
            
            # Extraire un aperçu du contenu
            snippet = msg.get("snippet", "")
            
            emails.append({
                "id": msg["id"],
                "threadId": msg["threadId"],
                "subject": subject,
                "from": from_email,
                "date": date,
                "snippet": snippet
            })
        
        return {"emails": emails}
    except HTTPException:
        raise
    except Exception as e:
        log.exception(f"Erreur lors de la récupération des emails Gmail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur de récupération des emails: {str(e)}")

# === Endpoints d'ingestion ===

@router.post("/gmail/ingest")
async def ingest_gmail_emails(
    user_id: str = "default",
    max_emails: int = 100,
    query: str = "is:unread",
    collection_name: Optional[str] = None
):
    """
    Déclenche l'ingestion des emails Gmail dans Qdrant.
    """
    try:
        # Vérifier l'authentification
        auth_status = check_google_credentials(user_id)
        if not auth_status["valid"]:
            raise HTTPException(
                status_code=401, 
                detail=f"Authentification Gmail requise: {auth_status.get('error', 'Invalid token')}"
            )
        
        # Lancer l'ingestion asynchrone (simulé)
        # Dans une implémentation réelle, cela déclencherait une tâche Celery/Worker
        
        # Utiliser le nom de collection basé sur l'user_id si non spécifié
        if not collection_name:
            collection_name = f"emails_{user_id}"
        
        return {
            "status": "ingestion_started", 
            "message": f"Démarrage de l'ingestion de {max_emails} emails pour l'utilisateur {user_id}",
            "collection_name": collection_name,
            "query": query
        }
    except HTTPException:
        raise
    except Exception as e:
        log.exception(f"Erreur lors de l'ingestion des emails Gmail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'ingestion des emails: {str(e)}")

# === Endpoints pour les autres sources de données ===

@router.post("/nextcloud/ingest")
async def ingest_nextcloud(
    user_id: str = "default",
    path: str = "/",
    collection_name: Optional[str] = None,
    recursive: bool = True
):
    """
    Déclenche l'ingestion des documents Nextcloud dans Qdrant.
    """
    try:
        # Vérifier si le service Nextcloud est configuré
        
        # Utiliser le nom de collection basé sur l'user_id si non spécifié
        if not collection_name:
            collection_name = f"nextcloud_{user_id}"
        
        return {
            "status": "ingestion_started", 
            "message": f"Démarrage de l'ingestion des documents Nextcloud depuis {path} pour l'utilisateur {user_id}",
            "collection_name": collection_name,
            "recursive": recursive
        }
    except Exception as e:
        log.exception(f"Erreur lors de l'ingestion des documents Nextcloud: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur d'ingestion des documents: {str(e)}")
