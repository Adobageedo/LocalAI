"""
Service de registre de fichiers JSON pour suivre les documents ingérés.
"""

import json
import os
import logging
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import shutil

from backend.core.config import DATA_DIR
from backend.core.logger import log

class FileRegistry:
    """
    Gestionnaire de registre de fichiers JSON qui suit les fichiers ingérés.
    Sert de source de vérité pour les documents synchronisés entre Personal Storage et Qdrant.
    """
    
    def __init__(self, user_id: str, source_name: str = "personal_storage"):
        """
        Initialise le registre de fichiers.
        
        Args:
            user_id (str): Identifiant de l'utilisateur
            source_name (str, optional): Nom de la source (personal_storage, gmail, etc.). Par défaut "personal_storage".
        """
        self.user_id = user_id
        self.source_name = source_name
        
        # Chemin du registre JSON
        self.registry_dir = DATA_DIR / "file_registry"
        self.registry_dir.mkdir(exist_ok=True, parents=True)
        self.registry_file = self.registry_dir / f"{source_name}_{user_id}_registry.json"
        
        # Structure du registre
        self.registry = {
            "files": {},
            "last_update": None,
            "user_id": user_id,
            "source": source_name
        }
        
        # Charger le registre existant s'il existe
        self._load_registry()
        
        log.info(f"Registre de fichiers initialisé depuis {self.registry_file} pour {user_id} - source: {source_name}")
        
    def _load_registry(self) -> None:
        """
        Charge le registre de fichiers depuis le disque.
        """
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, 'r') as f:
                    self.registry = json.load(f)
                log.debug(f"Registre chargé: {len(self.registry.get('files', {}))} fichiers trouvés")
            except Exception as e:
                log.error(f"Erreur lors du chargement du registre: {str(e)}")
                # Créer une sauvegarde du fichier corrompu
                if os.path.exists(self.registry_file):
                    backup_file = f"{self.registry_file}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    shutil.copy(self.registry_file, backup_file)
                    log.warning(f"Sauvegarde du registre corrompu créée: {backup_file}")
        else:
            log.debug(f"Aucun registre existant trouvé, création d'un nouveau registre")
            self._save_registry()
    
    def _save_registry(self) -> None:
        """
        Sauvegarde le registre de fichiers sur le disque.
        """
        try:
            # Mettre à jour la date de dernière mise à jour
            self.registry["last_update"] = datetime.now().isoformat()
            
            with open(self.registry_file, 'w') as f:
                json.dump(self.registry, f, indent=2)
            log.debug(f"Registre sauvegardé: {len(self.registry.get('files', {}))} fichiers")
        except Exception as e:
            log.error(f"Erreur lors de la sauvegarde du registre: {str(e)}")
    
    def add_file(
        self,
        doc_id: str,
        source_path: str,
        file_hash: str,
        last_modified: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Ajoute un fichier au registre.
        
        Args:
            doc_id (str): Identifiant unique du document dans Qdrant
            source_path (str): Chemin source du document
            file_hash (str): Hash SHA-256 du contenu
            last_modified (str): Date de dernière modification au format ISO
            metadata (Dict[str, Any]): Métadonnées additionnelles (nom, extension, etc.)
        """
        if "files" not in self.registry:
            self.registry["files"] = {}
            
        self.registry["files"][source_path] = {
            "doc_id": doc_id,
            "hash": file_hash,
            "source_path": source_path,
            "last_modified": last_modified,
            "metadata": metadata
        }
        
        self._save_registry()
        log.debug(f"Fichier ajouté au registre: {source_path}")
    
    def update_file(
        self,
        source_path: str,
        doc_id: Optional[str] = None,
        file_hash: Optional[str] = None,
        last_modified: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Met à jour les informations d'un fichier existant.
        
        Args:
            source_path (str): Chemin source du document
            doc_id (Optional[str]): Nouvel identifiant du document
            file_hash (Optional[str]): Nouveau hash SHA-256
            last_modified (Optional[str]): Nouvelle date de modification
            metadata (Optional[Dict[str, Any]]): Nouvelles métadonnées
        """
        if "files" not in self.registry or source_path not in self.registry["files"]:
            log.warning(f"Tentative de mise à jour d'un fichier non existant: {source_path}")
            return
            
        if doc_id:
            self.registry["files"][source_path]["doc_id"] = doc_id
        if file_hash:
            self.registry["files"][source_path]["hash"] = file_hash
        if last_modified:
            self.registry["files"][source_path]["last_modified"] = last_modified
        if metadata:
            self.registry["files"][source_path]["metadata"] = metadata
            
        self._save_registry()
        log.debug(f"Fichier mis à jour dans le registre: {source_path}")
    
    def remove_file(self, source_path: str) -> bool:
        """
        Supprime un fichier du registre.
        
        Args:
            source_path (str): Chemin source du document à supprimer
            
        Returns:
            bool: True si le fichier a été supprimé, False sinon
        """
        if "files" not in self.registry or source_path not in self.registry["files"]:
            log.warning(f"Tentative de suppression d'un fichier non existant: {source_path}")
            return False
            
        del self.registry["files"][source_path]
        self._save_registry()
        log.debug(f"Fichier supprimé du registre: {source_path}")
        return True
    
    def get_file(self, source_path: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un fichier du registre.
        
        Args:
            source_path (str): Chemin source du document
            
        Returns:
            Optional[Dict[str, Any]]: Informations du fichier ou None si non trouvé
        """
        if "files" not in self.registry or source_path not in self.registry["files"]:
            return None
            
        return self.registry["files"][source_path]
    
    def get_file_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un fichier par son ID de document.
        
        Args:
            doc_id (str): ID du document à rechercher
            
        Returns:
            Optional[Dict[str, Any]]: Informations du fichier ou None si non trouvé
        """
        if "files" not in self.registry:
            return None
            
        for file_info in self.registry["files"].values():
            if file_info.get("doc_id") == doc_id:
                return file_info
                
        return None
    
    def file_exists(self, source_path: str) -> bool:
        """
        Vérifie si un fichier existe dans le registre.
        
        Args:
            source_path (str): Chemin source du document
            
        Returns:
            bool: True si le fichier existe, False sinon
        """
        return "files" in self.registry and source_path in self.registry["files"]
    
    def get_all_files(self) -> Dict[str, Dict[str, Any]]:
        """
        Récupère tous les fichiers du registre.
        
        Returns:
            Dict[str, Dict[str, Any]]: Dictionnaire de tous les fichiers
        """
        return self.registry.get("files", {})
    
    def get_file_paths(self) -> List[str]:
        """
        Récupère tous les chemins de fichiers du registre.
        
        Returns:
            List[str]: Liste des chemins de fichiers
        """
        return list(self.registry.get("files", {}).keys())
    
    def get_doc_ids(self) -> List[str]:
        """
        Récupère tous les IDs de documents du registre.
        
        Returns:
            List[str]: Liste des IDs de documents
        """
        return [file_info.get("doc_id") for file_info in self.registry.get("files", {}).values()]
    
    def clear_registry(self) -> None:
        """
        Vide complètement le registre.
        """
        self.registry["files"] = {}
        self._save_registry()
        log.warning(f"Registre vidé pour {self.user_id} - source: {self.source_name}")
    
    def backup_registry(self) -> str:
        """
        Crée une sauvegarde du registre.
        
        Returns:
            str: Chemin du fichier de sauvegarde
        """
        backup_file = f"{self.registry_file}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        try:
            shutil.copy(self.registry_file, backup_file)
            log.info(f"Sauvegarde du registre créée: {backup_file}")
            return backup_file
        except Exception as e:
            log.error(f"Erreur lors de la création de la sauvegarde: {str(e)}")
            return ""
    
    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """
        Calcule le hash SHA-256 d'un fichier.
        
        Args:
            file_path (str): Chemin du fichier
            
        Returns:
            str: Hash SHA-256 du contenu du fichier
        """
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                # Lire le fichier par blocs pour éviter de charger des fichiers volumineux en mémoire
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except Exception as e:
            log.error(f"Erreur lors du calcul du hash pour {file_path}: {str(e)}")
            return ""
    
    def has_file_changed(self, source_path: str, file_path: str) -> bool:
        """
        Vérifie si un fichier a été modifié en comparant son hash actuel avec celui du registre.
        
        Args:
            source_path (str): Chemin source du document dans le registre
            file_path (str): Chemin réel du fichier à vérifier
            
        Returns:
            bool: True si le fichier a été modifié ou n'existe pas dans le registre, False sinon
        """
        file_info = self.get_file(source_path)
        if not file_info:
            return True  # Le fichier n'existe pas dans le registre
            
        current_hash = self.calculate_file_hash(file_path)
        if not current_hash:
            return True  # Erreur lors du calcul du hash, considérer comme modifié
            
        return current_hash != file_info.get("hash", "")
