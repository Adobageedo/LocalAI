"""
Service pour la génération d'embeddings de documents.
"""
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import logging
from typing import List, Dict, Any, Optional, Union
import numpy as np
import requests
import os

from backend.core.config import (
    OPENAI_API_KEY, 
    HF_API_KEY,
    CONFIG
)
from backend.core.logger import log
from langchain_openai import OpenAIEmbeddings
try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_huggingface import HuggingFaceEmbeddings

from abc import ABC, abstractmethod
from typing import List

class BaseEmbedder(ABC):
    @abstractmethod
    def embed(self, text: str) -> List[float]:
        """
        Return the embedding vector for the given text.
        """
        pass

class EmbeddingService(BaseEmbedder):
    """
    Service pour générer des embeddings à partir de texte.
    Prend en charge différentes sources d'embeddings (OpenAI, Hugging Face, etc.).
    """
    
    def __init__(self, provider: str = None, model: str = None):
        """
        Initialise le service d'embeddings.
        
        Args:
            provider (str, optional): Fournisseur d'embeddings ('openai' ou 'huggingface'). Par défaut 'openai'.
        """
        if provider is None:
            provider = CONFIG.get("embedder", {}).get("provider", "openai")
        
        if model is None:
            model = CONFIG.get("embedder", {}).get("model", "text-embedding-3-small")
        
        self.provider = provider.lower()
        self.model = model.lower()
        
        if self.provider == "openai":
            self.api_key = OPENAI_API_KEY
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set.")
            self._embedder = OpenAIEmbeddings(model=self.model)

        elif self.provider == "huggingface":
            self.api_key = HF_API_KEY
            if not self.api_key:
                raise ValueError("HF_API_KEY environment variable not set.")
            self._embedder = HuggingFaceEmbeddings(model_name=self.model, model_kwargs={"device": "cpu"})
        else:
            raise ValueError(f"Fournisseur d'embeddings '{provider}' non pris en charge")
                    
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
                    response = self._embedder.embed_query(texts)
                    
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
        
    def embed(self, text: str) -> List[float]:
        """
        Implémente la méthode abstraite de BaseEmbedder.
        Génère un embedding pour un texte donné.
        
        Args:
            text (str): Texte à encoder
            
        Returns:
            List[float]: Embedding du texte
        """
        return self.get_embedding(text)