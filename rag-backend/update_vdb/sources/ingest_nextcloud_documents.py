#!/usr/bin/env python3
"""
Script pour ingérer tous les documents présents dans Nextcloud dans Qdrant.
Ce script parcourt récursivement tous les fichiers dans Nextcloud et les ingère dans la base vectorielle Qdrant.
Il permet également de synchroniser en détectant les fichiers supprimés dans Nextcloud pour les retirer de Qdrant.
"""

import os
import sys
import time
import logging
import tempfile
import hashlib
import argparse
import requests
import traceback
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urljoin
from typing import List, Dict, Set, Tuple, Optional, Any
from datetime import datetime
from tqdm import tqdm

# Import du nouveau module de registre de fichiers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from file_registry import FileRegistry

# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Imports des modules de l'application
from update_vdb.core.ingest_core import ingest_document
from rag_engine.config import load_config
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager

# Déterminer le niveau de log en fonction de la variable d'environnement
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),  # Utiliser DEBUG si LOG_LEVEL=DEBUG dans l'environnement
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Configuration des logs pour supprimer les messages de débogage des bibliothèques HTTP
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)

# Logger principal pour ce module
logger = logging.getLogger(__name__)
logger.info(f"Niveau de log configuré à: {log_level}")

# Configuration Nextcloud depuis les variables d'environnement
NEXTCLOUD_URL = os.getenv("NEXTCLOUD_URL", "http://localhost:8080")
NEXTCLOUD_USERNAME = os.getenv("NEXTCLOUD_USERNAME", "admin")
NEXTCLOUD_PASSWORD = os.getenv("NEXTCLOUD_PASSWORD", "admin_password")

# Extensions de fichiers supportées par défaut
DEFAULT_SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.ppt', '.pptx', '.csv', '.json']

# =============================================
# Fonctions pour l'interaction avec WebDAV/Nextcloud
# =============================================

def parse_webdav_response(xml_content: str, base_path: str) -> List[Dict[str, Any]]:
    """
    Analyse la réponse XML WebDAV pour extraire les informations sur les fichiers et dossiers.
    
    Args:
        xml_content: Contenu XML de la réponse WebDAV
        base_path: Chemin de base utilisé pour la requête, utilisé pour filtrer la réponse
        
    Returns:
        Liste de dictionnaires contenant les informations sur chaque élément
    """
    try:
        root = ET.fromstring(xml_content)
        namespace = {'d': 'DAV:'}
        
        items = []
        for response in root.findall('.//d:response', namespace):
            href = response.find('./d:href', namespace).text
            path = unquote(href.split('/remote.php/dav/files/' + NEXTCLOUD_USERNAME)[1])
            
            # Normaliser le chemin de base pour la comparaison
            normalized_base_path = base_path
            if not normalized_base_path.endswith('/'):
                normalized_base_path += '/'
            if normalized_base_path == '/':
                normalized_base_path = ''
                
            # Ignorer l'élément courant s'il est le dossier demandé
            if path == normalized_base_path or path == base_path:
                logger.debug(f"Ignorer le chemin courant: {path}")
                continue
                
            prop_stat = response.find('./d:propstat', namespace)
            if prop_stat is None:
                continue
                
            prop = prop_stat.find('./d:prop', namespace)
            if prop is None:
                continue
                
            resource_type = prop.find('./d:resourcetype', namespace)
            is_collection = resource_type is not None and resource_type.find('./d:collection', namespace) is not None
            
            content_length_elem = prop.find('./d:getcontentlength', namespace)
            content_length = int(content_length_elem.text) if content_length_elem is not None and content_length_elem.text else 0
            
            last_modified_elem = prop.find('./d:getlastmodified', namespace)
            last_modified = last_modified_elem.text if last_modified_elem is not None else ''
            
            items.append({
                'path': path,
                'name': os.path.basename(path) if path != '/' else '/',
                'is_directory': is_collection,
                'size': content_length,
                'last_modified': last_modified
            })
        
        return items
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse de la réponse WebDAV: {str(e)}")
        return []

def list_files_in_directory(path: str, auth: Tuple[str, str]) -> List[Dict[str, Any]]:
    """
    Liste tous les fichiers et dossiers dans un répertoire Nextcloud.
    
    Args:
        path: Chemin du répertoire à lister
        auth: Tuple (username, password) pour l'authentification
        
    Returns:
        Liste des fichiers et dossiers dans le répertoire
    """
    logger.debug(f"Listage des fichiers dans le répertoire: {path}")
    
    url = f"{NEXTCLOUD_URL}/remote.php/dav/files/{auth[0]}{path}"
    
    # Pour lister les fichiers et dossiers, on utilise PROPFIND avec Depth: 1
    propfind_body = """<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>"""
    
    try:
        response = requests.request(
            method="PROPFIND",
            url=url,
            data=propfind_body,
            headers={"Depth": "1", "Content-Type": "application/xml"},
            auth=auth
        )
        
        if response.status_code == 207:  # 207 Multi-Status est la réponse attendue
            return parse_webdav_response(response.text, path)
        else:
            logger.error(f"Erreur lors de la requête PROPFIND sur {url}: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        logger.error(f"Erreur lors de la requête PROPFIND sur {url}: {str(e)}")
        return []

def download_file(file_path: str, auth: Tuple[str, str]) -> Optional[bytes]:
    """
    Télécharge un fichier depuis Nextcloud.
    
    Args:
        file_path: Chemin du fichier à télécharger
        auth: Tuple (username, password) pour l'authentification
        
    Returns:
        Contenu du fichier en bytes ou None en cas d'erreur
    """
    try:
        url = urljoin(NEXTCLOUD_URL, f"remote.php/dav/files/{auth[0]}/{file_path.lstrip('/')}")
        response = requests.get(url, auth=auth, timeout=60)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de {file_path}: {str(e)}")
        return None


def download_file_with_metadata(file_path: str, auth: Tuple[str, str]) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Télécharge un fichier depuis Nextcloud et récupère ses métadonnées.
    
    Args:
        file_path: Chemin du fichier dans Nextcloud
        auth: Tuple (username, password) pour l'authentification
        
    Returns:
        Tuple[bytes, str]: Contenu du fichier et date de dernière modification (ISO format)
                          ou (None, None) en cas d'erreur
    """
    try:
        url = urljoin(NEXTCLOUD_URL, f"remote.php/dav/files/{auth[0]}/{file_path.lstrip('/')}")
        response = requests.get(url, auth=auth, timeout=60)
        response.raise_for_status()
        
        # Récupérer la date de dernière modification depuis les en-têtes
        last_modified = None
        if 'Last-Modified' in response.headers:
            try:
                from email.utils import parsedate_to_datetime
                last_modified = parsedate_to_datetime(response.headers['Last-Modified']).isoformat()
            except Exception as e:
                logger.warning(f"Impossible de parser la date de dernière modification pour {file_path}: {e}")
        
        return response.content, last_modified
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement de {file_path}: {str(e)}")
        return None, None


def compute_document_id(file_path: str, content_hash: str) -> str:
    """
    Calcule un identifiant unique pour un document.
    
    Args:
        file_path: Chemin du fichier
        content_hash: Hash du contenu du fichier
        
    Returns:
        str: Identifiant unique du document
    """
    # Combine le chemin et le hash pour créer un ID déterministe mais unique
    unique_str = f"{file_path}_{content_hash}"
    return hashlib.md5(unique_str.encode()).hexdigest()


def get_file_hash(file_content: bytes) -> str:
    """
    Calcule un hash SHA-256 du contenu du fichier pour vérifier si le contenu a changé.
    
    Args:
        file_content: Contenu du fichier en bytes
        
    Returns:
        Hash SHA-256 du contenu du fichier
    """
    return hashlib.sha256(file_content).hexdigest()


# =============================================
# Fonctions pour l'interaction avec Qdrant
# =============================================

def check_document_exists(vector_store: VectorStoreManager, file_path: str, file_hash: str) -> Tuple[bool, Optional[List[str]]]:
    """
    Vérifie si un document existe déjà dans Qdrant et si son contenu a changé.
    
    Args:
        vector_store: Instance de VectorStoreManager
        file_path: Chemin du fichier
        file_hash: Hash du contenu du fichier
        
    Returns:
        Tuple[bool, List[str]]: (document existe, liste des IDs des points dans Qdrant)
    """
    client = vector_store.get_qdrant_client()
    collection = vector_store.collection_name
    
    try:
        # Récupérer les documents existants avec le même chemin
        points = []
        offset = None
        filter_selector = {"must": [{"key": "source_path", "match": {"value": file_path}}]}
        
        while True:
            result = client.scroll(
                collection_name=collection,
                scroll_filter=filter_selector,
                limit=100,
                with_payload=True,
                offset=offset
            )
            batch, offset = result
            points.extend(batch)
            if offset is None:
                break
        
        if not points:
            return False, None
        
        # Vérifier si un des documents a le même hash de contenu
        for point in points:
            payload = point.payload or {}
            existing_hash = payload.get("content_hash") or payload.get("metadata", {}).get("content_hash")
            if existing_hash == file_hash:
                return True, [p.id for p in points]
        
            
        logger.debug(f"Nombre de chunks à supprimer pour doc_id={doc_id}: {chunks_to_delete}")
        
        # Supprimer tous les chunks
        client.delete(
            collection_name=collection,
            points_selector=filter_selector
        )
        
        logger.debug(f"Suppression réussie pour doc_id={doc_id} ({chunks_to_delete} chunks)")
        return True
        
    except Exception as e:
        logger.error(f"Erreur lors de la suppression du document {doc_id}: {str(e)}")
        return False


def should_process_file(file_path: str, supported_extensions: List[str]) -> bool:
    """
    Vérifie si le fichier doit être traité en fonction de son extension.
    
    Args:
        file_path: Chemin du fichier
        supported_extensions: Liste des extensions supportées
        
    Returns:
        bool: True si le fichier doit être traité, False sinon
    """
    _, ext = os.path.splitext(file_path)
    return ext.lower() in supported_extensions

def process_document(file_path: str, auth: Tuple[str, str], collection: str, 
                  force_reingest: bool = False, vector_store: Optional[VectorStoreManager] = None,
                  file_registry: Optional[FileRegistry] = None) -> bool:
    """
    Télécharge et ingère un seul document depuis Nextcloud.
    
    Args:
        file_path: Chemin du fichier dans Nextcloud
        auth: Tuple (username, password) pour l'authentification
        collection: Nom de la collection Qdrant
        force_reingest: Force la réingestion même si le document existe déjà
        vector_store: Instance de VectorStoreManager pour vérifier l'existence
        file_registry: Registre de fichiers pour suivre les documents ingérés
        
    Returns:
        bool: True si le document a été ingéré avec succès, False sinon
    """
    try:
        # Télécharger le fichier depuis Nextcloud
        logger.info(f"Téléchargement du fichier: {file_path}")
        file_content, last_modified = download_file_with_metadata(file_path, auth)
        
        if file_content is None:
            logger.error(f"Impossible de télécharger le fichier: {file_path}")
            return False
        
        # Calculer le hash du contenu pour vérifier les modifications
        file_hash = get_file_hash(file_content)
        
        # Vérifier si le document existe déjà et si son contenu a changé
        needs_ingestion = True
        doc_id = None
        
        # Utiliser uniquement le registre pour vérifier si le fichier existe et s'il a changé
        if file_registry and not force_reingest:
            if file_registry.file_exists(file_path):
                if not file_registry.has_changed(file_path, file_hash):
                    logger.info(f"Document déjà présent dans le registre (inchangé): {file_path}")
                    return False
                else:
                    # Le fichier existe mais a été modifié, nous devons le supprimer puis le réingérer
                    logger.info(f"Document modifié, suppression puis réingestion: {file_path}")
                    old_doc_id = file_registry.get_doc_id(file_path)
                    if old_doc_id and vector_store:
                        # Supprimer l'ancien document de Qdrant
                        delete_document_by_id(vector_store, old_doc_id)
        
        # Créer un fichier temporaire pour traiter le contenu
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file_path)[1]) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Préparer les métadonnées
            metadata = {
                "original_path": file_path,
                "nextcloud_path": file_path,
                "file_name": os.path.basename(file_path),
                "content_hash": file_hash,
                "source": "nextcloud",
                "ingestion_date": datetime.now().isoformat(),
                "last_modified": last_modified or datetime.now().isoformat()
            }
            
            # Générer un doc_id cohérent pour le document
            doc_id = compute_document_id(file_path, file_hash)
            
            # Ingérer le document
            logger.info(f"Ingérer le document dans Qdrant: {file_path}")
            ingest_document(
                filepath=temp_file_path,
                user="nextcloud",
                collection=collection,
                metadata=metadata,
                original_filepath=file_path,
                doc_id=doc_id
            )
            
            # Mettre à jour le registre des fichiers
            if file_registry:
                file_registry.add_file(
                    file_path=file_path,
                    doc_id=doc_id,
                    file_hash=file_hash,
                    source_path=file_path,
                    last_modified=last_modified,
                    metadata={
                        "file_name": os.path.basename(file_path),
                        "extension": os.path.splitext(file_path)[1].lower()
                    }
                )
            
            logger.info(f"Document ingéré avec succès: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'ingestion du document {file_path}: {str(e)}")
            return False
        finally:
            # Supprimer le fichier temporaire
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Impossible de supprimer le fichier temporaire {temp_file_path}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Erreur lors du traitement du document {file_path}: {str(e)}")
        return False


def process_directory(path: str, auth: Tuple[str, str], supported_extensions: List[str], 
                      processed_files: Set[str], collection: str, max_files: Optional[int] = None, 
                      depth: int = 0, max_depth: int = 20, force_reingest: bool = False, 
                      vector_store: Optional[VectorStoreManager] = None,
                      file_registry: Optional[FileRegistry] = None) -> int:
    """
    Traite récursivement un répertoire et ingère tous les fichiers compatibles.
    
    Args:
        path: Chemin du répertoire à traiter
        auth: Tuple (username, password) pour l'authentification
        supported_extensions: Liste des extensions de fichiers supportées
        processed_files: Ensemble des fichiers déjà traités (pour éviter les doublons)
        collection: Nom de la collection Qdrant
        max_files: Nombre maximum de fichiers à traiter
        depth: Profondeur actuelle de récursion
        max_depth: Profondeur maximale de récursion pour éviter les boucles infinies
        force_reingest: Force la réingestion même si le document existe déjà dans Qdrant
        vector_store: Instance de VectorStoreManager pour la vérification d'existence
        file_registry: Registre des fichiers déjà ingérés
    
    Returns:
        int: Nombre de fichiers ingérés
    """
    # Vérifier la profondeur maximale pour éviter les boucles infinies
    if depth > max_depth:
        logger.warning(f"Profondeur maximale atteinte ({max_depth}) pour {path}, arrêt de la récursion")
        return 0
    
    # Vérifier le nombre maximal de fichiers traités
    if max_files is not None and len(processed_files) >= max_files:
        logger.info(f"Nombre maximum de fichiers atteint ({max_files}), arrêt du traitement")
        return 0
    
    logger.info(f"Traitement du répertoire: {path} (profondeur: {depth})")
    
    # Lister les fichiers et dossiers dans le répertoire
    items = list_files_in_directory(path, auth)
    
    if not items:
        logger.warning(f"Aucun fichier ou dossier trouvé dans {path}")
        return 0
    
    ingested_count = 0
    
    # Séparer les fichiers et les répertoires
    files = [item for item in items if not item.get('is_directory', False)]
    directories = [item for item in items if item.get('is_directory', False)]
    
    # Traiter d'abord les fichiers
    for item in files:
        # Vérifier le nombre maximal de fichiers traités
        if max_files is not None and len(processed_files) >= max_files:
            logger.info(f"Nombre maximum de fichiers atteint ({max_files}), arrêt du traitement")
            break
        
        file_path = item['path']
        
        # Vérifier si le fichier a déjà été traité
        if file_path in processed_files:
            logger.debug(f"Fichier déjà traité: {file_path}")
            continue
        
        # Vérifier l'extension du fichier
        if not should_process_file(file_path, supported_extensions):
            logger.debug(f"Extension non supportée pour {file_path}, fichier ignoré")
            continue
        
        # Ajouter le fichier à la liste des fichiers traités
        processed_files.add(file_path)
        
        # Traiter le document en passant le registre de fichiers
        if process_document(file_path, auth, collection, force_reingest, vector_store, file_registry):
            ingested_count += 1
    
    # Traiter ensuite les sous-répertoires
    for directory in directories:
        # Vérifier le nombre maximal de fichiers traités
        if max_files is not None and len(processed_files) >= max_files:
            logger.info(f"Nombre maximum de fichiers atteint ({max_files}), arrêt du traitement")
            break
        
        dir_path = directory['path']
        # Traiter récursivement le sous-répertoire
        sub_count = process_directory(
            dir_path, 
            auth, 
            supported_extensions, 
            processed_files,
            collection,
            max_files=max_files,
            depth=depth+1,
            max_depth=max_depth,
            force_reingest=force_reingest,
            vector_store=vector_store,
            file_registry=file_registry
        )
        ingested_count += sub_count
        
    return ingested_count

# =============================================
# Fonctions pour la collecte et la gestion des fichiers
# =============================================

def collect_nextcloud_files(path: str, auth: Tuple[str, str], supported_extensions: List[str], max_depth: int = 20) -> Set[str]:
    """
    Collecte récursivement tous les chemins de fichiers dans Nextcloud à partir d'un chemin donné.
    
    Args:
        path: Chemin de départ dans Nextcloud
        auth: Tuple (username, password) pour l'authentification
        supported_extensions: Liste des extensions de fichiers supportées
        max_depth: Profondeur maximale de récursion
        
    Returns:
        Un ensemble (set) de chemins de fichiers avec les extensions supportées uniquement
    """
    logger.info(f"Début de la collecte des fichiers Nextcloud depuis: {path}")
    all_files = set()
    to_process = [path]
    processed_dirs = set()
    depth_map = {path: 0}
    
    while to_process:
        current_path = to_process.pop(0)
        current_depth = depth_map[current_path]
        
        if current_depth > max_depth:
            logger.warning(f"Profondeur maximale atteinte ({max_depth}) pour {current_path}, arrêt de la récursion")
            continue
            
        if current_path in processed_dirs:
            continue
            
        processed_dirs.add(current_path)
        items = list_files_in_directory(current_path, auth)
        
        for item in items:
            if item['is_directory']:
                dir_path = item['path']
                if dir_path not in processed_dirs and dir_path != current_path:
                    to_process.append(dir_path)
                    depth_map[dir_path] = current_depth + 1
            else:
                file_path = item['path']
                if should_process_file(file_path, supported_extensions):
                    all_files.add(file_path)
    
    logger.info(f"Collecte terminée: {len(all_files)} fichiers trouvés avec les extensions supportées")
    return all_files


def get_qdrant_files_by_prefix(vector_store: VectorStoreManager, path_prefix: str, collection: str) -> Set[str]:
    """
    Récupère tous les chemins de fichiers dans Qdrant qui commencent par un préfixe spécifique.
    
    Args:
        vector_store: Instance de VectorStoreManager pour interroger Qdrant
        path_prefix: Préfixe de chemin pour filtrer les fichiers
        collection: Nom de la collection Qdrant
        
    Returns:
        Un ensemble (set) de chemins de fichiers présents dans Qdrant qui correspondent au préfixe
    """
    logger.info(f"Récupération des fichiers dans Qdrant avec le préfixe: {path_prefix}")
    qdrant_files = set()
    client = vector_store.get_qdrant_client()
    collection_name = vector_store.collection_name
    
    # Normaliser le préfixe de chemin pour la comparaison
    if not path_prefix.endswith('/'):
        path_prefix = path_prefix + '/'
    if path_prefix == '//':
        path_prefix = '/'
    
    offset = None
    total_scanned = 0
    batch_size = 100
    
    while True:
        from qdrant_client.http import models as rest
        results = client.scroll(
            collection_name=collection_name,
            scroll_filter=None,  # Pas de filtre ici, on veut tous les documents
            limit=batch_size,
            with_payload=True,
            offset=offset
        )
        
        points = results[0]
        next_offset = results[1]
        
        total_scanned += len(points)
        logger.debug(f"Traitement de {len(points)} points, total scanné: {total_scanned}")
        
        for point in points:
            payload = point.payload
            original_path = payload.get("metadata", {}).get("original_path")
            
            if original_path and isinstance(original_path, str):
                # Si le chemin commence par le préfixe ou s'il s'agit du répertoire racine
                if path_prefix == '/' or original_path.startswith(path_prefix):
                    qdrant_files.add(original_path)
        
        if next_offset is None:
            break
        offset = next_offset
    
    logger.info(f"Récupération terminée: {len(qdrant_files)} fichiers trouvés dans Qdrant (sur {total_scanned} points scannés)")
    return qdrant_files


def delete_missing_files(nextcloud_files: Set[str], qdrant_files: Set[str], vector_store: VectorStoreManager) -> int:
    """
    Supprime de Qdrant les fichiers qui n'existent plus dans Nextcloud.
    
    Args:
        nextcloud_files: Ensemble des chemins de fichiers présents dans Nextcloud
        qdrant_files: Ensemble des chemins de fichiers présents dans Qdrant
        vector_store: Instance de VectorStoreManager pour la suppression
    
    Returns:
        int: Nombre de fichiers supprimés
    """
    files_to_delete = qdrant_files - nextcloud_files
    deleted_count = 0
    total_chunks_deleted = 0
    
    # Détails des ensembles pour débogage
    logger.info(f"Nombre de fichiers à supprimer: {len(files_to_delete)} (sur {len(qdrant_files)} dans Qdrant)")
    logger.debug(f"Nombre total de fichiers dans Nextcloud: {len(nextcloud_files)}")
    logger.debug(f"Nombre total de fichiers dans Qdrant: {len(qdrant_files)}")
    
    # Liste détaillée des fichiers à supprimer
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug("Liste des fichiers à supprimer:")
        for idx, file_path in enumerate(sorted(list(files_to_delete)), 1):
            logger.debug(f"  {idx}. {file_path}")
    
    # Aucun fichier à supprimer
    if not files_to_delete:
        logger.info("Aucun fichier à supprimer, tous les fichiers existent dans Nextcloud")
        return 0
    
    from qdrant_client.http import models as rest
    client = vector_store.get_qdrant_client()
    collection_name = vector_store.collection_name
    
    for file_path in files_to_delete:
        try:
            logger.info(f"Suppression du fichier qui n'existe plus dans Nextcloud: {file_path}")
            
            # Créer le filtre pour sélectionner tous les points associs à ce fichier
            count_filter = rest.Filter(
                must=[
                    rest.FieldCondition(
                        key="metadata.original_path",
                        match=rest.MatchValue(value=file_path)
                    )
                ]
            )
            
            # Compter le nombre de points avant suppression
            count_result = client.count(
                collection_name=collection_name,
                count_filter=count_filter
            )
            
            chunk_count = count_result.count
            logger.debug(f"Nombre de chunks à supprimer pour {file_path}: {chunk_count}")
            
            if chunk_count == 0:
                logger.warning(f"Aucun chunk trouvé pour {file_path}, rien à supprimer")
                continue
            
            # Suppression effective
            client.delete(
                collection_name=collection_name,
                points_selector=rest.FilterSelector(filter=count_filter)
            )
            
            # Vérification de la suppression
            post_count = client.count(
                collection_name=collection_name,
                count_filter=count_filter
            ).count
            
            if post_count == 0:
                logger.debug(f"Suppression réussie pour {file_path} ({chunk_count} chunks)")
                deleted_count += 1
                total_chunks_deleted += chunk_count
            else:
                logger.warning(f"Suppression partielle pour {file_path}: {post_count}/{chunk_count} chunks restants")
                total_chunks_deleted += (chunk_count - post_count)
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du fichier {file_path} dans Qdrant: {str(e)}")
    
    logger.info(f"Suppression terminée: {deleted_count} fichiers supprimés, {total_chunks_deleted} chunks supprimés au total")
    return deleted_count


def fetch_nextcloud_documents(path: str = "/", 
                           collection: str = None,
                           url: str = NEXTCLOUD_URL,
                           username: str = NEXTCLOUD_USERNAME,
                           password: str = NEXTCLOUD_PASSWORD,
                           max_files: Optional[int] = None,
                           extensions: Optional[List[str]] = None,
                           force_reingest: bool = False,
                           skip_duplicate_check: bool = False,
                           clean_deleted: bool = False,
                           registry_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Synchronise les documents entre Nextcloud et Qdrant, en ingérant les nouveaux fichiers
    et supprimant ceux qui n'existent plus dans Nextcloud.
    
    Args:
        path: Chemin de départ dans Nextcloud (par défaut: /)
        collection: Nom de la collection Qdrant (si None, utilise la valeur de config.yaml)
        url: URL du serveur Nextcloud
        username: Nom d'utilisateur Nextcloud
        password: Mot de passe Nextcloud
        max_files: Nombre maximum de fichiers à traiter
        extensions: Liste d'extensions de fichiers à traiter
        force_reingest: Force la réingestion même si le document existe déjà dans Qdrant
        skip_duplicate_check: Ne pas vérifier si les documents existent déjà dans Qdrant
        clean_deleted: Supprimer dans Qdrant les fichiers qui n'existent plus dans Nextcloud
        
    Returns:
        Dict avec le résumé du processus de synchronisation
    """
    result = {
        "success": False,
        "method": "nextcloud",
        "path": path,
        "collection": collection,
        "ingested": 0,
        "deleted": 0,
        "errors": []
    }
    
    start_time = time.time()
    
    try:
        # Valider les identifiants Nextcloud
        auth = (username, password)
        
        # Tester la connexion Nextcloud
        try:
            test_items = list_files_in_directory("/", auth)
            if not test_items:
                raise Exception("Impossible de lister les fichiers, vérifiez les identifiants Nextcloud")
            logger.info(f"Connexion Nextcloud réussie ({url})")
        except Exception as e:
            error_msg = f"Erreur de connexion à Nextcloud: {str(e)}"
            logger.error(error_msg)
            result["error"] = error_msg
            return result
        
        # Déterminer la collection Qdrant à utiliser
        if collection is None:
            config = load_config()
            collection = config.get('retrieval', {}).get('vectorstore', {}).get('collection', 'rag_documents1536')
        
        result["collection"] = collection
        logger.info(f"Collection Qdrant cible: {collection}")
        
        # Déterminer les extensions supportées
        supported_extensions = DEFAULT_SUPPORTED_EXTENSIONS
        if extensions:
            if isinstance(extensions, str):
                supported_extensions = [ext.strip().lower() for ext in extensions.split(',')]
            else:
                supported_extensions = [ext.strip().lower() for ext in extensions]
        
        logger.info(f"Extensions supportées: {', '.join(supported_extensions)}")
        
        # Initialiser le vectorstore pour vérifier les documents existants
        vector_store = None
        if not skip_duplicate_check or clean_deleted:
            try:
                logger.info("Initialisation de la connexion à Qdrant")
                vector_store = VectorStoreManager(collection_name=collection)
                logger.info(f"Connexion à Qdrant établie, collection: {collection}")
            except Exception as e:
                error_msg = f"Erreur lors de l'initialisation de Qdrant: {str(e)}"
                logger.error(error_msg)
                if clean_deleted:
                    logger.error("Impossible de nettoyer les fichiers supprimés sans connexion à Qdrant")
                if not skip_duplicate_check:
                    logger.warning("Vérification des documents existants désactivée")
                result["warnings"] = [error_msg]
        
        # Initialiser le registre de fichiers pour suivre les fichiers ingérés
        file_registry = None
        if not skip_duplicate_check or clean_deleted:
            try:
                logger.info("Initialisation du registre de fichiers")
                file_registry = FileRegistry(registry_path=registry_path)
                logger.info(f"Registre de fichiers chargé: {len(file_registry.registry)} fichiers")
            except Exception as e:
                error_msg = f"Erreur lors de l'initialisation du registre de fichiers: {str(e)}"
                logger.error(error_msg)
                result["warnings"] = result.get("warnings", []) + [error_msg]
        
        # Collecte des fichiers existants dans Nextcloud (si nécessaire pour nettoyage)
        nextcloud_files = set()
        if clean_deleted:
            logger.info(f"Collecte des fichiers existants dans Nextcloud à partir de: {path}")
            nextcloud_files = collect_nextcloud_files(path, auth, supported_extensions)
            logger.info(f"Nombre de fichiers existants dans Nextcloud: {len(nextcloud_files)}")
            
            # Utiliser exclusivement le registre de fichiers pour identifier les suppressions
            if file_registry:
                logger.info("Utilisation du registre de fichiers pour détecter les suppressions")
                registry_files = file_registry.get_files_by_prefix(path)
                missing_files = set(registry_files) - nextcloud_files
                
                if missing_files:
                    logger.info(f"Suppression des fichiers qui n'existent plus dans Nextcloud ({len(missing_files)} fichiers)")
                    deleted_count = 0
                    for missing_file in missing_files:
                        doc_id = file_registry.get_doc_id(missing_file)
                        if doc_id and vector_store:
                            if delete_document_by_id(vector_store, doc_id):
                                logger.info(f"Suppression du fichier qui n'existe plus dans Nextcloud: {missing_file}")
                                file_registry.remove_file(missing_file)
                                deleted_count += 1
                            else:
                                logger.warning(f"Échec de la suppression du fichier: {missing_file}")
                    result["deleted"] = deleted_count
                else:
                    logger.info("Aucun fichier à supprimer")
            else:
                logger.warning("Pas de registre de fichiers disponible, impossible de détecter les suppressions efficacement")
                # N'utilisons plus cette partie qui interroge directement Qdrant
                # qdrant_files = get_qdrant_files_by_prefix(vector_store, path, collection)
                # if qdrant_files:
                #     logger.info("Suppression des fichiers qui n'existent plus dans Nextcloud...")
                #     deleted_count = delete_missing_files(nextcloud_files, qdrant_files, vector_store)
                #     result["deleted"] = deleted_count
                # else:
                #     logger.info("Aucun fichier trouvé dans Qdrant, rien à supprimer")
        
        # Ingérer les documents
        processed_files = set()
        ingested_count = process_directory(
            path, 
            auth, 
            supported_extensions, 
            processed_files,
            collection,
            max_files=max_files,
            force_reingest=force_reingest,
            vector_store=vector_store if not skip_duplicate_check else None,
            file_registry=file_registry
        )
        
        result["ingested"] = ingested_count
        result["files_processed"] = len(processed_files)
        
        # Supprimer les fichiers qui n'existent plus dans Nextcloud
        deleted_count = 0
        if clean_deleted and vector_store and nextcloud_files:
            logger.info("Récupération des fichiers dans Qdrant pour détecter les suppressions...")
            qdrant_files = get_qdrant_files_by_prefix(vector_store, path, collection)
            
            if qdrant_files:
                logger.info("Suppression des fichiers qui n'existent plus dans Nextcloud...")
                deleted_count = delete_missing_files(nextcloud_files, qdrant_files, vector_store)
                result["deleted"] = deleted_count
            else:
                logger.info("Aucun fichier trouvé dans Qdrant, rien à supprimer")
        
        # Succès
        result["success"] = True
        
    except Exception as e:
        error_msg = f"Erreur lors de la synchronisation Nextcloud-Qdrant: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        result["error"] = error_msg
        result["traceback"] = traceback.format_exc()
    
    # Calculer la durée
    end_time = time.time()
    duration = end_time - start_time
    result["duration"] = f"{duration:.2f} secondes"
    
    # Résumé
    logger.info(f"Synchronisation terminée: {result['ingested']} fichiers ingérés, {result.get('deleted', 0)} fichiers supprimés, en {result['duration']}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Ingérer et synchroniser les documents Nextcloud avec Qdrant")
    parser.add_argument("--path", default="/", help="Chemin de départ dans Nextcloud (par défaut: /)")
    parser.add_argument("--url", default=NEXTCLOUD_URL, help=f"URL du serveur Nextcloud (par défaut: {NEXTCLOUD_URL})")
    parser.add_argument("--username", default=NEXTCLOUD_USERNAME, help=f"Nom d'utilisateur Nextcloud (par défaut: {NEXTCLOUD_USERNAME})")
    parser.add_argument("--password", default=NEXTCLOUD_PASSWORD, help="Mot de passe Nextcloud")
    parser.add_argument("--collection", help="Nom de la collection Qdrant (par défaut: défini dans config.yaml)")
    parser.add_argument("--max-files", type=int, help="Nombre maximum de fichiers à traiter")
    parser.add_argument("--extensions", help="Liste d'extensions de fichiers à traiter, séparées par des virgules (par défaut: .pdf,.docx,.txt,...)")
    parser.add_argument("--force-reingest", action="store_true", help="Force la réingestion même si le document existe déjà dans Qdrant")
    parser.add_argument("--skip-duplicate-check", action="store_true", help="Ne pas vérifier si les documents existent déjà dans Qdrant (plus rapide)")
    parser.add_argument("--clean-deleted", action="store_true", help="Supprimer dans Qdrant les fichiers qui n'existent plus dans Nextcloud")
    parser.add_argument("--registry-path", help="Chemin vers le fichier de registre JSON (par défaut: utilise le dossier data de l'application)")
    parser.add_argument("--no-registry", action="store_true", help="Ne pas utiliser le registre de fichiers JSON (utilisera uniquement Qdrant pour les vérifications)")

    
    args = parser.parse_args()
    
    # Convertir les extensions si spécifiées
    extensions = None
    if args.extensions:
        extensions = [ext.strip().lower() for ext in args.extensions.split(',')]
    
    # Appeler la fonction principale
    registry_path = args.registry_path if not args.no_registry else None
    
    result = fetch_nextcloud_documents(
        path=args.path,
        collection=args.collection,
        url=args.url,
        username=args.username,
        password=args.password,
        max_files=args.max_files,
        extensions=extensions,
        force_reingest=args.force_reingest,
        skip_duplicate_check=args.skip_duplicate_check or args.no_registry,
        clean_deleted=args.clean_deleted,
        registry_path=registry_path
    )
    
    # Afficher le résumé
    print("\n" + "=" * 50)
    print("SYNCHRONISATION NEXTCLOUD-QDRANT")
    print("=" * 50)
    print(f"Chemin Nextcloud: {result['path']}")
    print(f"Collection Qdrant: {result['collection']}")
    print(f"Succès: {result['success']}")
    print(f"Fichiers ingérés: {result['ingested']}")
    print(f"Fichiers supprimés: {result.get('deleted', 0)}")
    print(f"Durée totale: {result.get('duration', 'N/A')}")
    
    if not result['success'] and 'error' in result:
        print(f"\nErreur: {result['error']}")
    
    if 'warnings' in result and result['warnings']:
        print("\nAvertissements:")
        for warning in result['warnings']:
            print(f"- {warning}")
    
    # Code de sortie
    sys.exit(0 if result['success'] else 1)

if __name__ == "__main__":
    main()
