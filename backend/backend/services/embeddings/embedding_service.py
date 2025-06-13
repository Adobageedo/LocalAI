"""
Service pour la génération d'embeddings de documents.
"""

import logging
from typing import List, Dict, Any, Optional, Union
import numpy as np
import requests
import os

from backend.core.config import (
    OPENAI_API_KEY, 
    OPENAI_EMBEDDING_MODEL,
    HF_API_KEY,
    HF_EMBEDDING_MODEL
)
from backend.core.logger import log

class EmbeddingService:
    """
    Service pour générer des embeddings à partir de texte.
    Prend en charge différentes sources d'embeddings (OpenAI, Hugging Face, etc.).
    """
    
    def __init__(self, provider: str = "openai"):
        """
        Initialise le service d'embeddings.
        
        Args:
            provider (str, optional): Fournisseur d'embeddings ('openai' ou 'huggingface'). Par défaut 'openai'.
        """
        self.provider = provider.lower()
        
        if self.provider == "openai":
            self.api_key = OPENAI_API_KEY
            self.model = OPENAI_EMBEDDING_MODEL
            if not self.api_key:
                log.warning("Clé API OpenAI non configurée!")
        elif self.provider == "huggingface":
            self.api_key = HF_API_KEY
            self.model = HF_EMBEDDING_MODEL
            if not self.api_key:
                log.warning("Clé API Hugging Face non configurée!")
        else:
            raise ValueError(f"Fournisseur d'embeddings '{provider}' non pris en charge")
            
        log.info(f"Service d'embeddings initialisé avec {self.provider} ({self.model})")
        
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Génère des embeddings pour une liste de textes.
        
        Args:
            texts (List[str]): Liste des textes à encoder
            
        Returns:
            List[List[float]]: Liste des embeddings correspondants
        """
        if not texts:
            return []
            
        if self.provider == "openai":
            return self._get_openai_embeddings(texts)
        elif self.provider == "huggingface":
            return self._get_hf_embeddings(texts)
        else:
            raise ValueError(f"Fournisseur d'embeddings '{self.provider}' non implémenté")
    
    def _get_openai_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Génère des embeddings en utilisant l'API OpenAI.
        
        Args:
            texts (List[str]): Liste des textes à encoder
            
        Returns:
            List[List[float]]: Liste des embeddings correspondants
        """
        try:
            import openai
            
            # Configurer la clé API
            openai.api_key = self.api_key
            
            # Gérer les textes vides
            texts = [t if t else " " for t in texts]
            
            # Appel API avec retries et backoff
            for attempt in range(3):
                try:
                    response = openai.embeddings.create(
                        model=self.model,
                        input=texts
                    )
                    
                    # Extraction des embeddings
                    embeddings = [item.embedding for item in response.data]
                    
                    log.debug(f"Génération réussie de {len(embeddings)} embeddings via OpenAI")
                    return embeddings
                except Exception as e:
                    if attempt < 2:  # Réessayer pour les deux premières tentatives
                        import time
                        log.warning(f"Erreur lors de l'obtention des embeddings (tentative {attempt+1}/3): {str(e)}")
                        time.sleep(2 ** attempt)  # Backoff exponentiel
                    else:
                        raise  # Relancer l'erreur à la dernière tentative
                        
        except Exception as e:
            log.exception(f"Erreur lors de la génération d'embeddings via OpenAI: {str(e)}")
            # Retourner des embeddings vides (devrait être traité par l'appelant)
            return [[0.0] * 1536] * len(texts)
    
    def _get_hf_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Génère des embeddings en utilisant l'API Hugging Face.
        
        Args:
            texts (List[str]): Liste des textes à encoder
            
        Returns:
            List[List[float]]: Liste des embeddings correspondants
        """
        try:
            # Configurer les headers pour l'API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Générer les embeddings par lots pour éviter les limites de l'API
            batch_size = 8
            all_embeddings = []
            
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                
                # Gérer les textes vides
                batch_texts = [t if t else " " for t in batch_texts]
                
                # Préparation des données pour l'API
                payload = {
                    "inputs": batch_texts,
                    "model": self.model,
                }
                
                # Appel API
                api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model}"
                response = requests.post(api_url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    batch_embeddings = response.json()
                    all_embeddings.extend(batch_embeddings)
                else:
                    log.error(f"Erreur d'API Hugging Face: {response.status_code} - {response.text}")
                    # Ajouter des embeddings vides pour ce lot
                    dim = 384  # Dimension typique pour BAAI/bge-small-en-v1.5
                    all_embeddings.extend([[0.0] * dim for _ in batch_texts])
            
            log.debug(f"Génération réussie de {len(all_embeddings)} embeddings via Hugging Face")
            return all_embeddings
            
        except Exception as e:
            log.exception(f"Erreur lors de la génération d'embeddings via Hugging Face: {str(e)}")
            # Retourner des embeddings vides
            dim = 384  # Dimension typique pour BAAI/bge-small-en-v1.5
            return [[0.0] * dim] * len(texts)
            
    def get_embedding(self, text: str) -> List[float]:
        """
        Génère un embedding pour un seul texte.
        
        Args:
            text (str): Texte à encoder
            
        Returns:
            List[float]: Embedding du texte
        """
        embeddings = self.get_embeddings([text])
        return embeddings[0] if embeddings else []


# Instance singleton pour utilisation dans l'application
embedding_service = EmbeddingService()
