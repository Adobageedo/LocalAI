"""
Router pour gérer le téléchargement des sources depuis Nextcloud.
"""

import os
import logging
import requests
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

# Configuration
from dotenv import load_dotenv
load_dotenv()

# Configuration Nextcloud
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")

# Initialisation du router et du logger
router = APIRouter(prefix="/api/sources", tags=["sources"])
logger = logging.getLogger(__name__)

@router.get("/download")
async def download_source(path: str):
    """
    Télécharge un fichier source directement depuis Nextcloud.
    Le chemin doit être un chemin complet tel que retourné par l'API de prompt.
    """
    logger.info(f"Téléchargement de la source: {path}")
    
    try:
        # Vérifier si le chemin est un chemin Nextcloud
        if "original_path" in path:
            # Extraire le chemin original depuis les métadonnées
            import json
            metadata = json.loads(path)
            if "original_path" in metadata:
                path = metadata["original_path"]
            else:
                logger.error(f"Métadonnées invalides: {metadata}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Format de métadonnées invalide"
                )
        
        # Normaliser le chemin
        if not path.startswith("/"):
            path = "/" + path
        
        # Utiliser les identifiants admin par défaut
        username = NEXTCLOUD_USERNAME
        password = NEXTCLOUD_PASSWORD
        
        # Récupérer le fichier depuis Nextcloud
        response = requests.get(
            f"{NEXTCLOUD_URL}/remote.php/dav/files/{username}{path}",
            auth=(username, password),
            stream=True
        )
        
        if response.status_code != 200:
            logger.error(f"Erreur Nextcloud: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors du téléchargement du fichier depuis Nextcloud: {response.status_code}"
            )
        
        # Déterminer le type de contenu
        content_type = response.headers.get("Content-Type", "application/octet-stream")
        
        # Créer une réponse en streaming
        return StreamingResponse(
            response.iter_content(chunk_size=8192),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={os.path.basename(path)}"
            }
        )
    
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de la source: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du téléchargement de la source: {str(e)}"
        )
