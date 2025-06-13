"""
Service pour le traitement et l'extraction de contenu des documents.
"""

import os
import logging
import hashlib
import tempfile
import uuid
from typing import List, Dict, Any, Optional, Tuple, Iterator
from datetime import datetime
import re
from pathlib import Path

# Extracteurs de texte
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader, 
    Docx2txtLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
    UnstructuredHTMLLoader,
    UnstructuredEPubLoader,
    UnstructuredCSVLoader,
    UnstructuredEmailLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.core.config import (
    SUPPORTED_FILE_TYPES,
    CHUNK_SIZE,
    CHUNK_OVERLAP
)
from backend.core.logger import log

class DocumentProcessor:
    """
    Service pour traiter et extraire le contenu des documents.
    """
    
    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None,
        supported_types: List[str] = None
    ):
        """
        Initialise le processeur de documents.
        
        Args:
            chunk_size (int, optional): Taille des chunks de texte. Par défaut config.CHUNK_SIZE.
            chunk_overlap (int, optional): Chevauchement des chunks. Par défaut config.CHUNK_OVERLAP.
            supported_types (List[str], optional): Liste des extensions supportées. Par défaut config.SUPPORTED_FILE_TYPES.
        """
        self.chunk_size = chunk_size or CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or CHUNK_OVERLAP
        self.supported_types = supported_types or SUPPORTED_FILE_TYPES
        
        # Splitter de texte pour le chunking
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            is_separator_regex=False
        )
        
        log.info(f"DocumentProcessor initialisé (chunk_size={self.chunk_size}, overlap={self.chunk_overlap})")
        log.debug(f"Types de fichiers supportés: {', '.join(self.supported_types)}")
    
    def is_file_supported(self, file_path: str) -> bool:
        """
        Vérifie si un type de fichier est supporté.
        
        Args:
            file_path (str): Chemin du fichier
            
        Returns:
            bool: True si le fichier est supporté, False sinon
        """
        ext = os.path.splitext(file_path)[1].lower().lstrip('.')
        return ext in self.supported_types
    
    def get_appropriate_loader(self, file_path: str) -> Any:
        """
        Détermine le loader approprié pour un fichier.
        
        Args:
            file_path (str): Chemin du fichier
            
        Returns:
            Any: Loader pour le type de fichier ou None si non supporté
        """
        ext = os.path.splitext(file_path)[1].lower()
        
        # Mapper les extensions aux loaders
        if ext == '.pdf':
            return PyPDFLoader(file_path)
        elif ext == '.txt' or ext == '.log' or ext == '.md':
            return TextLoader(file_path, encoding='utf-8')
        elif ext == '.docx':
            return Docx2txtLoader(file_path)
        elif ext == '.md':
            return UnstructuredMarkdownLoader(file_path)
        elif ext in ['.ppt', '.pptx']:
            return UnstructuredPowerPointLoader(file_path)
        elif ext in ['.xls', '.xlsx']:
            return UnstructuredExcelLoader(file_path)
        elif ext == '.html' or ext == '.htm':
            return UnstructuredHTMLLoader(file_path)
        elif ext == '.epub':
            return UnstructuredEPubLoader(file_path)
        elif ext == '.csv':
            return UnstructuredCSVLoader(file_path)
        elif ext == '.eml':
            return UnstructuredEmailLoader(file_path)
        else:
            # Fallback pour les types de fichiers texte inconnus
            try:
                return TextLoader(file_path, encoding='utf-8')
            except Exception:
                log.warning(f"Type de fichier non supporté: {ext}")
                return None
    
    def extract_text_from_file(self, file_path: str) -> Tuple[str, Dict[str, Any]]:
        """
        Extrait le texte d'un fichier.
        
        Args:
            file_path (str): Chemin du fichier
            
        Returns:
            Tuple[str, Dict[str, Any]]: Tuple (texte extrait, métadonnées)
        """
        try:
            loader = self.get_appropriate_loader(file_path)
            if not loader:
                return "", {}
                
            # Charger le document
            docs = loader.load()
            
            # Extraire le texte et les métadonnées
            full_text = ""
            metadata = {}
            
            for doc in docs:
                full_text += doc.page_content + "\n\n"
                # Fusionner les métadonnées
                for key, value in doc.metadata.items():
                    if key not in metadata:
                        metadata[key] = value
            
            # Ajouter des métadonnées de base si elles n'existent pas
            if 'source' not in metadata:
                metadata['source'] = os.path.basename(file_path)
            if 'file_path' not in metadata:
                metadata['file_path'] = file_path
                
            return full_text.strip(), metadata
        except Exception as e:
            log.exception(f"Erreur lors de l'extraction du texte de {file_path}: {str(e)}")
            return "", {}
    
    def chunk_text(self, text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Découpe un texte en chunks.
        
        Args:
            text (str): Texte à découper
            metadata (Dict[str, Any], optional): Métadonnées à inclure dans chaque chunk. Par défaut None.
            
        Returns:
            List[Dict[str, Any]]: Liste des chunks avec contenu et métadonnées
        """
        if not text:
            return []
            
        try:
            # Découper le texte
            chunks = self.text_splitter.split_text(text)
            
            # Préparer les métadonnées
            if metadata is None:
                metadata = {}
                
            # Créer les objets chunks
            result = []
            for i, chunk_text in enumerate(chunks):
                chunk_metadata = metadata.copy()
                chunk_metadata['chunk_id'] = i
                chunk_metadata['chunk_count'] = len(chunks)
                
                chunk_obj = {
                    'content': chunk_text,
                    'metadata': chunk_metadata
                }
                result.append(chunk_obj)
                
            log.debug(f"Texte découpé en {len(result)} chunks")
            return result
        except Exception as e:
            log.exception(f"Erreur lors du découpage du texte: {str(e)}")
            return []
            
    def process_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Traite un fichier complet: extraction de texte, chunking et assignation de métadonnées.
        
        Args:
            file_path (str): Chemin du fichier
            
        Returns:
            List[Dict[str, Any]]: Liste des chunks avec contenu et métadonnées
        """
        try:
            # Vérifier que le fichier est supporté
            if not self.is_file_supported(file_path):
                log.warning(f"Type de fichier non supporté: {file_path}")
                return []
                
            # Extraire le texte et les métadonnées
            text, metadata = self.extract_text_from_file(file_path)
            
            if not text:
                log.warning(f"Aucun texte extrait de {file_path}")
                return []
                
            # Enrichir les métadonnées
            file_stat = os.stat(file_path)
            metadata.update({
                'file_name': os.path.basename(file_path),
                'file_ext': os.path.splitext(file_path)[1].lower(),
                'file_size': file_stat.st_size,
                'last_modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                'created_at': datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                'source_path': file_path
            })
            
            # Calculer le hash SHA-256 du fichier
            try:
                sha256_hash = hashlib.sha256()
                with open(file_path, "rb") as f:
                    for byte_block in iter(lambda: f.read(4096), b""):
                        sha256_hash.update(byte_block)
                metadata['file_hash'] = sha256_hash.hexdigest()
            except Exception as e:
                log.warning(f"Impossible de calculer le hash pour {file_path}: {str(e)}")
                
            # Découper le texte en chunks
            chunks = self.chunk_text(text, metadata)
            
            log.info(f"Fichier traité: {file_path} ({len(chunks)} chunks)")
            return chunks
        except Exception as e:
            log.exception(f"Erreur lors du traitement du fichier {file_path}: {str(e)}")
            return []
    
    def process_email(
        self, 
        email_data: Dict[str, Any], 
        user_id: str = None
    ) -> List[Dict[str, Any]]:
        """
        Traite un email en extrayant le contenu et en le découpant en chunks.
        
        Args:
            email_data (Dict[str, Any]): Données de l'email (from, to, subject, body_text, body_html, etc.)
            user_id (str, optional): Identifiant de l'utilisateur. Par défaut None.
            
        Returns:
            List[Dict[str, Any]]: Liste des chunks avec contenu et métadonnées
        """
        try:
            # Extraire le contenu de l'email
            subject = email_data.get('subject', '')
            body_text = email_data.get('body_text', '')
            from_address = email_data.get('from', '')
            to_address = email_data.get('to', '')
            date = email_data.get('date', '')
            email_id = email_data.get('id', str(uuid.uuid4()))
            
            # Construire le texte complet
            full_text = f"Subject: {subject}\n\n"
            full_text += f"From: {from_address}\n"
            full_text += f"To: {to_address}\n"
            full_text += f"Date: {date}\n\n"
            full_text += body_text
            
            # Créer les métadonnées
            metadata = {
                'source': 'email',
                'email_id': email_id,
                'subject': subject,
                'from': from_address,
                'to': to_address,
                'date': date
            }
            
            if user_id:
                metadata['user_id'] = user_id
                
            # Découpee le texte en chunks
            chunks = self.chunk_text(full_text, metadata)
            
            log.info(f"Email traité: {subject} ({len(chunks)} chunks)")
            return chunks
        except Exception as e:
            log.exception(f"Erreur lors du traitement de l'email: {str(e)}")
            return []
    
    def process_text(
        self, 
        text: str, 
        source: str = "text", 
        metadata: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Traite un texte brut en le découpant en chunks.
        
        Args:
            text (str): Texte à traiter
            source (str, optional): Source du texte. Par défaut "text".
            metadata (Dict[str, Any], optional): Métadonnées à ajouter. Par défaut None.
            
        Returns:
            List[Dict[str, Any]]: Liste des chunks avec contenu et métadonnées
        """
        if not text:
            return []
            
        try:
            # Préparer les métadonnées
            meta = {'source': source}
            if metadata:
                meta.update(metadata)
                
            # Découper le texte en chunks
            chunks = self.chunk_text(text, meta)
            
            log.debug(f"Texte traité depuis {source} ({len(chunks)} chunks)")
            return chunks
        except Exception as e:
            log.exception(f"Erreur lors du traitement du texte: {str(e)}")
            return []


# Instance singleton pour utilisation dans l'application
document_processor = DocumentProcessor()
