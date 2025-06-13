"""
Service d'intégration RAG (Retrieval Augmented Generation).
Combine le traitement de documents, les embeddings et la recherche vectorielle.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
import uuid
from datetime import datetime

from backend.core.config import (
    COLLECTION_NAME,
    VECTOR_SIZE,
    SIMILARITY_METRIC
)
from backend.core.logger import log
from backend.services.vectorstore.qdrant_manager import QdrantManager
from backend.services.embeddings.embedding_service import EmbeddingService
from backend.services.documents.document_processor import DocumentProcessor


class RAGService:
    """
    Service d'intégration RAG combinant traitement de documents, embeddings et recherche vectorielle.
    """
    
    def __init__(
        self,
        collection_name: str = None,
        embedding_provider: str = "openai"
    ):
        """
        Initialise le service RAG.
        
        Args:
            collection_name (str, optional): Nom de la collection Qdrant. Par défaut config.COLLECTION_NAME.
            embedding_provider (str, optional): Fournisseur d'embeddings. Par défaut "openai".
        """
        self.collection_name = collection_name or COLLECTION_NAME
        
        # Initialiser les composants
        self.vectorstore = QdrantManager()
        self.embedding_service = EmbeddingService(provider=embedding_provider)
        self.doc_processor = DocumentProcessor()
        
        # S'assurer que la collection existe
        if not self.vectorstore.collection_exists(self.collection_name):
            self.vectorstore.create_collection(
                collection_name=self.collection_name,
                vector_size=VECTOR_SIZE,
                metric=SIMILARITY_METRIC
            )
            
        log.info(f"RAGService initialisé avec collection '{self.collection_name}' et embeddings '{embedding_provider}'")
    
    def ingest_file(
        self,
        file_path: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        force_reingest: bool = False
    ) -> Dict[str, Any]:
        """
        Ingère un fichier dans le système RAG.
        
        Args:
            file_path (str): Chemin du fichier à ingérer
            user_id (str): Identifiant de l'utilisateur
            metadata (Optional[Dict[str, Any]], optional): Métadonnées supplémentaires. Par défaut None.
            force_reingest (bool, optional): Forcer la réingestion même si existant. Par défaut False.
            
        Returns:
            Dict[str, Any]: Résultat de l'ingestion
        """
        try:
            # Vérifier que le fichier existe
            if not os.path.exists(file_path):
                log.error(f"Fichier non trouvé: {file_path}")
                return {"success": False, "error": "Fichier non trouvé"}
                
            # Vérifier le type de fichier
            if not self.doc_processor.is_file_supported(file_path):
                log.warning(f"Type de fichier non supporté: {file_path}")
                return {"success": False, "error": "Type de fichier non supporté"}
            
            # Métadonnées de base
            base_metadata = {
                "user_id": user_id,
                "source_type": "file",
                "ingestion_timestamp": datetime.now().isoformat()
            }
            
            # Ajouter les métadonnées supplémentaires
            if metadata:
                base_metadata.update(metadata)
            
            # Traiter le fichier et générer les chunks
            chunks = self.doc_processor.process_file(file_path)
            if not chunks:
                log.warning(f"Aucun contenu extrait de {file_path}")
                return {"success": False, "error": "Aucun contenu extrait"}
                
            # Créer un ID unique pour le document
            doc_id = str(uuid.uuid4())
            
            # Générer les embeddings pour chaque chunk
            total_chunks = len(chunks)
            ingested_chunks = 0
            
            for i, chunk in enumerate(chunks):
                # Ajouter des métadonnées spécifiques au chunk
                chunk_metadata = chunk['metadata']
                chunk_metadata.update({
                    "doc_id": doc_id,
                    "chunk_index": i,
                    "total_chunks": total_chunks,
                })
                chunk_metadata.update(base_metadata)
                
                # Générer l'embedding
                embedding = self.embedding_service.get_embedding(chunk['content'])
                
                # Générer un ID unique pour le point
                point_id = f"{doc_id}_chunk_{i}"
                
                # Insérer dans Qdrant
                self.vectorstore.upsert_point(
                    collection_name=self.collection_name,
                    point_id=point_id,
                    vector=embedding,
                    metadata=chunk_metadata,
                    payload={"text": chunk['content']}
                )
                
                ingested_chunks += 1
                
            log.info(f"Fichier ingéré: {file_path} ({ingested_chunks}/{total_chunks} chunks)")
            
            return {
                "success": True,
                "doc_id": doc_id,
                "chunks": ingested_chunks,
                "file_path": file_path
            }
            
        except Exception as e:
            log.exception(f"Erreur lors de l'ingestion du fichier {file_path}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def ingest_email(
        self,
        email_data: Dict[str, Any],
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ingère un email dans le système RAG.
        
        Args:
            email_data (Dict[str, Any]): Données de l'email
            user_id (str): Identifiant de l'utilisateur
            metadata (Optional[Dict[str, Any]], optional): Métadonnées supplémentaires. Par défaut None.
            
        Returns:
            Dict[str, Any]: Résultat de l'ingestion
        """
        try:
            # Métadonnées de base
            base_metadata = {
                "user_id": user_id,
                "source_type": "email",
                "ingestion_timestamp": datetime.now().isoformat()
            }
            
            # Ajouter les métadonnées supplémentaires
            if metadata:
                base_metadata.update(metadata)
                
            # Traiter l'email
            chunks = self.doc_processor.process_email(email_data, user_id)
            if not chunks:
                log.warning(f"Aucun contenu extrait de l'email: {email_data.get('subject', 'Sans sujet')}")
                return {"success": False, "error": "Aucun contenu extrait"}
                
            # Créer un ID unique pour le document
            doc_id = email_data.get('id', str(uuid.uuid4()))
            
            # Générer les embeddings pour chaque chunk
            total_chunks = len(chunks)
            ingested_chunks = 0
            
            for i, chunk in enumerate(chunks):
                # Ajouter des métadonnées spécifiques au chunk
                chunk_metadata = chunk['metadata']
                chunk_metadata.update({
                    "doc_id": doc_id,
                    "chunk_index": i,
                    "total_chunks": total_chunks,
                })
                chunk_metadata.update(base_metadata)
                
                # Générer l'embedding
                embedding = self.embedding_service.get_embedding(chunk['content'])
                
                # Générer un ID unique pour le point
                point_id = f"{doc_id}_chunk_{i}"
                
                # Insérer dans Qdrant
                self.vectorstore.upsert_point(
                    collection_name=self.collection_name,
                    point_id=point_id,
                    vector=embedding,
                    metadata=chunk_metadata,
                    payload={"text": chunk['content']}
                )
                
                ingested_chunks += 1
                
            log.info(f"Email ingéré: {email_data.get('subject', 'Sans sujet')} ({ingested_chunks}/{total_chunks} chunks)")
            
            return {
                "success": True,
                "doc_id": doc_id,
                "chunks": ingested_chunks,
                "email_subject": email_data.get('subject', 'Sans sujet')
            }
            
        except Exception as e:
            log.exception(f"Erreur lors de l'ingestion de l'email: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def search(
        self,
        query: str,
        user_id: str,
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        search_type: str = "semantic"
    ) -> List[Dict[str, Any]]:
        """
        Recherche des documents pertinents.
        
        Args:
            query (str): Requête de recherche
            user_id (str): Identifiant de l'utilisateur
            limit (int, optional): Nombre de résultats à retourner. Par défaut 5.
            filters (Optional[Dict[str, Any]], optional): Filtres de métadonnées. Par défaut None.
            search_type (str, optional): Type de recherche ("semantic" ou "keyword"). Par défaut "semantic".
            
        Returns:
            List[Dict[str, Any]]: Résultats de la recherche
        """
        try:
            # Ajouter le filtre utilisateur
            if filters is None:
                filters = {}
            filters["user_id"] = user_id
            
            # Recherche sémantique (par défaut)
            if search_type == "semantic":
                # Générer l'embedding de la requête
                query_embedding = self.embedding_service.get_embedding(query)
                
                # Effectuer la recherche vectorielle
                search_results = self.vectorstore.search_points(
                    collection_name=self.collection_name,
                    query_vector=query_embedding,
                    limit=limit,
                    filters=filters
                )
            # Recherche par mots-clés
            elif search_type == "keyword":
                search_results = self.vectorstore.search_by_metadata(
                    collection_name=self.collection_name,
                    query=query,
                    limit=limit,
                    filters=filters
                )
            else:
                log.error(f"Type de recherche non supporté: {search_type}")
                return []
                
            log.debug(f"Recherche '{query}' pour {user_id}: {len(search_results)} résultats")
            return search_results
            
        except Exception as e:
            log.exception(f"Erreur lors de la recherche '{query}': {str(e)}")
            return []
    
    def delete_document(self, doc_id: str, user_id: str) -> bool:
        """
        Supprime un document et tous ses chunks.
        
        Args:
            doc_id (str): Identifiant du document
            user_id (str): Identifiant de l'utilisateur
            
        Returns:
            bool: True si supprimé avec succès, False sinon
        """
        try:
            # Filtres pour ne supprimer que les documents de l'utilisateur
            filters = {
                "user_id": user_id,
                "doc_id": doc_id
            }
            
            # Supprimer les points
            deleted = self.vectorstore.delete_points_by_filter(
                collection_name=self.collection_name,
                filters=filters
            )
            
            if deleted > 0:
                log.info(f"Document supprimé: {doc_id} ({deleted} chunks)")
                return True
            else:
                log.warning(f"Aucun document trouvé pour suppression: {doc_id}")
                return False
                
        except Exception as e:
            log.exception(f"Erreur lors de la suppression du document {doc_id}: {str(e)}")
            return False
    
    def get_document_by_id(self, doc_id: str, user_id: str) -> Dict[str, Any]:
        """
        Récupère un document par son ID.
        
        Args:
            doc_id (str): Identifiant du document
            user_id (str): Identifiant de l'utilisateur
            
        Returns:
            Dict[str, Any]: Document et ses chunks
        """
        try:
            # Filtres pour ne récupérer que les documents de l'utilisateur
            filters = {
                "user_id": user_id,
                "doc_id": doc_id
            }
            
            # Récupérer les points
            points = self.vectorstore.get_points_by_filter(
                collection_name=self.collection_name,
                filters=filters
            )
            
            if not points:
                log.warning(f"Document non trouvé: {doc_id}")
                return {}
                
            # Reconstruire le document
            chunks = []
            metadata = {}
            
            for point in points:
                chunks.append({
                    "text": point.get("payload", {}).get("text", ""),
                    "metadata": point.get("metadata", {})
                })
                
                # Utiliser les métadonnées du premier chunk comme métadonnées du document
                if not metadata:
                    metadata = point.get("metadata", {})
                    
            # Trier les chunks par index
            chunks.sort(key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
            
            document = {
                "doc_id": doc_id,
                "metadata": metadata,
                "chunks": chunks,
                "chunk_count": len(chunks)
            }
            
            return document
            
        except Exception as e:
            log.exception(f"Erreur lors de la récupération du document {doc_id}: {str(e)}")
            return {}
            
    def list_user_documents(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Liste les documents d'un utilisateur.
        
        Args:
            user_id (str): Identifiant de l'utilisateur
            limit (int, optional): Nombre de résultats à retourner. Par défaut 100.
            offset (int, optional): Décalage pour la pagination. Par défaut 0.
            
        Returns:
            List[Dict[str, Any]]: Liste des documents
        """
        try:
            # Filtres pour ne récupérer que les documents de l'utilisateur
            # et seulement les premiers chunks de chaque document
            filters = {
                "user_id": user_id,
                "chunk_index": 0  # Uniquement les premiers chunks pour éviter les doublons
            }
            
            # Récupérer les points
            points = self.vectorstore.get_points_by_filter(
                collection_name=self.collection_name,
                filters=filters,
                limit=limit,
                offset=offset
            )
            
            # Convertir en liste de documents
            documents = []
            for point in points:
                metadata = point.get("metadata", {})
                doc = {
                    "doc_id": metadata.get("doc_id", ""),
                    "title": metadata.get("file_name", metadata.get("subject", "Document sans titre")),
                    "source_type": metadata.get("source_type", "unknown"),
                    "ingestion_timestamp": metadata.get("ingestion_timestamp", ""),
                    "total_chunks": metadata.get("total_chunks", 1),
                    "metadata": metadata
                }
                documents.append(doc)
                
            return documents
            
        except Exception as e:
            log.exception(f"Erreur lors de la liste des documents pour {user_id}: {str(e)}")
            return []
            

# Instance singleton pour utilisation dans l'application
rag_service = RAGService()
