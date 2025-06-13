"""
Service pour interagir avec la base de vecteurs Qdrant.
"""

import logging
from typing import List, Dict, Any, Optional, Union
import os
import json
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    VectorParams, 
    Distance, 
    PointStruct, 
    CollectionStatus,
    Filter,
    FieldCondition,
    MatchValue,
    Range
)

from backend.core.config import QDRANT_URL, QDRANT_API_KEY
from backend.core.logger import log

class QdrantManager:
    """
    Gestionnaire pour interagir avec Qdrant Vector DB.
    """
    
    def __init__(self, url: str = None, api_key: str = None):
        """
        Initialise le client Qdrant.
        
        Args:
            url (str, optional): URL du serveur Qdrant. Par défaut, utilise QDRANT_URL de config.
            api_key (str, optional): Clé API pour Qdrant. Par défaut, utilise QDRANT_API_KEY de config.
        """
        self.url = url or QDRANT_URL
        self.api_key = api_key or QDRANT_API_KEY
        self.client = QdrantClient(url=self.url, api_key=self.api_key)
        log.info(f"QdrantManager initialisé avec l'URL: {self.url}")
        
    def check_connection(self) -> bool:
        """
        Vérifie la connexion à Qdrant.
        
        Returns:
            bool: True si la connexion est établie, sinon False.
        """
        try:
            collections = self.client.get_collections()
            return True
        except Exception as e:
            log.error(f"Erreur de connexion à Qdrant: {str(e)}")
            return False
            
    def create_collection(
        self,
        collection_name: str,
        vector_size: int = 384,
        distance: str = "Cosine",
        on_disk_payload: bool = True
    ) -> bool:
        """
        Crée une nouvelle collection dans Qdrant si elle n'existe pas déjà.
        
        Args:
            collection_name (str): Nom de la collection
            vector_size (int, optional): Taille du vecteur d'embedding. Par défaut 384.
            distance (str, optional): Mesure de distance à utiliser. Par défaut "Cosine".
            on_disk_payload (bool, optional): Stocker la charge utile sur disque. Par défaut True.
            
        Returns:
            bool: True si la collection est créée ou existe déjà, sinon False.
        """
        try:
            # Vérifier si la collection existe déjà
            collections = self.client.get_collections()
            if collection_name in [c.name for c in collections.collections]:
                log.info(f"Collection {collection_name} existe déjà")
                return True
                
            # Mapper la chaîne de distance à l'enum Distance
            distance_map = {
                "Cosine": Distance.COSINE,
                "Euclid": Distance.EUCLID,
                "Dot": Distance.DOT
            }
            distance_enum = distance_map.get(distance, Distance.COSINE)
            
            # Créer la collection
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=distance_enum),
                on_disk_payload=on_disk_payload
            )
            
            log.info(f"Collection {collection_name} créée avec succès")
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la création de la collection {collection_name}: {str(e)}")
            return False
            
    def delete_collection(self, collection_name: str) -> bool:
        """
        Supprime une collection de Qdrant.
        
        Args:
            collection_name (str): Nom de la collection à supprimer
            
        Returns:
            bool: True si la suppression est réussie, sinon False
        """
        try:
            self.client.delete_collection(collection_name=collection_name)
            log.info(f"Collection {collection_name} supprimée avec succès")
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la suppression de la collection {collection_name}: {str(e)}")
            return False
            
    def list_collections(self) -> List[str]:
        """
        Liste toutes les collections disponibles dans Qdrant.
        
        Returns:
            List[str]: Liste des noms de collections
        """
        try:
            collections = self.client.get_collections()
            return [collection.name for collection in collections.collections]
        except Exception as e:
            log.exception(f"Erreur lors de la liste des collections: {str(e)}")
            return []
            
    def upsert_point(
        self,
        collection_name: str,
        point_id: str,
        vector: List[float],
        payload: Dict[str, Any]
    ) -> bool:
        """
        Insère ou met à jour un point dans Qdrant.
        
        Args:
            collection_name (str): Nom de la collection
            point_id (str): ID unique du point
            vector (List[float]): Vecteur d'embedding
            payload (Dict[str, Any]): Données associées au vecteur
            
        Returns:
            bool: True si l'opération est réussie, sinon False
        """
        try:
            self.client.upsert(
                collection_name=collection_name,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload=payload
                    )
                ]
            )
            return True
        except Exception as e:
            log.exception(f"Erreur lors de l'insertion du point {point_id} dans {collection_name}: {str(e)}")
            return False
            
    def search_points(
        self,
        collection_name: str,
        query_vector: List[float],
        limit: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None,
        with_payload: bool = True,
        with_vectors: bool = False,
        score_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Recherche les points les plus similaires dans Qdrant.
        
        Args:
            collection_name (str): Nom de la collection à interroger
            query_vector (List[float]): Vecteur de requête
            limit (int, optional): Nombre maximum de résultats. Par défaut 5.
            filter_dict (Dict[str, Any], optional): Filtres à appliquer. Par défaut None.
            with_payload (bool, optional): Inclure la charge utile. Par défaut True.
            with_vectors (bool, optional): Inclure les vecteurs. Par défaut False.
            score_threshold (float, optional): Seuil de score minimal. Par défaut None.
            
        Returns:
            List[Dict[str, Any]]: Liste des résultats de recherche
        """
        try:
            # Construire le filtre s'il est fourni
            filter_obj = None
            if filter_dict:
                # Logique simplifiée pour construire le filtre
                # Dans une implémentation réelle, il faudrait une fonction récursive pour construire des filtres complexes
                conditions = []
                for field, value in filter_dict.items():
                    if isinstance(value, dict):
                        # Gérer les plages (ex: {"year": {"$gte": 2020}})
                        if "$gte" in value and "$lte" in value:
                            conditions.append(
                                FieldCondition(
                                    key=field,
                                    range=Range(
                                        gte=value["$gte"],
                                        lte=value["$lte"]
                                    )
                                )
                            )
                        elif "$gte" in value:
                            conditions.append(
                                FieldCondition(
                                    key=field,
                                    range=Range(gte=value["$gte"])
                                )
                            )
                        elif "$lte" in value:
                            conditions.append(
                                FieldCondition(
                                    key=field,
                                    range=Range(lte=value["$lte"])
                                )
                            )
                    else:
                        # Correspondance exacte
                        conditions.append(
                            FieldCondition(
                                key=field,
                                match=MatchValue(value=value)
                            )
                        )
                
                if conditions:
                    filter_obj = Filter(must=conditions)
            
            # Effectuer la recherche
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=limit,
                query_filter=filter_obj,
                with_payload=with_payload,
                with_vectors=with_vectors,
                score_threshold=score_threshold
            )
            
            # Formater les résultats
            results = []
            for hit in search_result:
                result = {
                    "id": hit.id,
                    "score": hit.score
                }
                if with_payload:
                    result["payload"] = hit.payload
                if with_vectors:
                    result["vector"] = hit.vector
                results.append(result)
                
            return results
        except Exception as e:
            log.exception(f"Erreur lors de la recherche dans {collection_name}: {str(e)}")
            return []
            
    def get_point(
        self,
        collection_name: str,
        point_id: str,
        with_payload: bool = True,
        with_vectors: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Récupère un point spécifique par son ID.
        
        Args:
            collection_name (str): Nom de la collection
            point_id (str): ID du point à récupérer
            with_payload (bool, optional): Inclure la charge utile. Par défaut True.
            with_vectors (bool, optional): Inclure le vecteur. Par défaut False.
            
        Returns:
            Optional[Dict[str, Any]]: Données du point ou None si non trouvé
        """
        try:
            points = self.client.retrieve(
                collection_name=collection_name,
                ids=[point_id],
                with_payload=with_payload,
                with_vectors=with_vectors
            )
            
            if not points:
                return None
                
            point = points[0]
            result = {
                "id": point.id
            }
            if with_payload:
                result["payload"] = point.payload
            if with_vectors:
                result["vector"] = point.vector
                
            return result
        except Exception as e:
            log.exception(f"Erreur lors de la récupération du point {point_id} dans {collection_name}: {str(e)}")
            return None
            
    def delete_point(self, collection_name: str, point_id: str) -> bool:
        """
        Supprime un point spécifique par son ID.
        
        Args:
            collection_name (str): Nom de la collection
            point_id (str): ID du point à supprimer
            
        Returns:
            bool: True si la suppression est réussie, sinon False
        """
        try:
            self.client.delete(
                collection_name=collection_name,
                points_selector=[point_id]
            )
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la suppression du point {point_id} dans {collection_name}: {str(e)}")
            return False
            
    def search_by_metadata(
        self,
        collection_name: str,
        metadata_filter: Dict[str, Any],
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Recherche les points par métadonnées.
        
        Args:
            collection_name (str): Nom de la collection
            metadata_filter (Dict[str, Any]): Filtre de métadonnées
            limit (int, optional): Nombre maximum de résultats. Par défaut 100.
            
        Returns:
            List[Dict[str, Any]]: Liste des résultats correspondants
        """
        try:
            # Construire le filtre
            conditions = []
            for field, value in metadata_filter.items():
                if isinstance(value, dict):
                    # Gérer les plages (ex: {"year": {"$gte": 2020}})
                    if "$gte" in value and "$lte" in value:
                        conditions.append(
                            FieldCondition(
                                key=f"metadata.{field}",
                                range=Range(
                                    gte=value["$gte"],
                                    lte=value["$lte"]
                                )
                            )
                        )
                    elif "$gte" in value:
                        conditions.append(
                            FieldCondition(
                                key=f"metadata.{field}",
                                range=Range(gte=value["$gte"])
                            )
                        )
                    elif "$lte" in value:
                        conditions.append(
                            FieldCondition(
                                key=f"metadata.{field}",
                                range=Range(lte=value["$lte"])
                            )
                        )
                else:
                    # Correspondance exacte
                    conditions.append(
                        FieldCondition(
                            key=f"metadata.{field}",
                            match=MatchValue(value=value)
                        )
                    )
            
            filter_obj = Filter(must=conditions) if conditions else None
            
            # Récupérer les points
            scroll_result = self.client.scroll(
                collection_name=collection_name,
                scroll_filter=filter_obj,
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            
            # Formater les résultats
            results = []
            for point in scroll_result[0]:
                results.append({
                    "id": point.id,
                    "payload": point.payload
                })
                
            return results
        except Exception as e:
            log.exception(f"Erreur lors de la recherche par métadonnées dans {collection_name}: {str(e)}")
            return []


# Instance singleton pour utilisation dans l'application
vectorstore = QdrantManager()
