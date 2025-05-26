"""
Module de gestion du registre des fichiers ingérés dans Qdrant.
Permet de suivre les fichiers, leurs hashes, dates de modification et IDs.
"""
import os
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any, Set
from datetime import datetime

logger = logging.getLogger(__name__)

class FileRegistry:
    """
    Classe permettant de gérer un registre des fichiers ingérés dans Qdrant
    sous forme de fichier JSON.
    """
    def __init__(self, registry_path: str = None):
        """
        Initialise le registre des fichiers.
        
        Args:
            registry_path: Chemin vers le fichier JSON de registre.
                           Par défaut, utilise le dossier de l'application.
        """
        if registry_path is None:
            # Par défaut, utiliser un dossier de données dans le répertoire de l'application
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, 'data')
            os.makedirs(data_dir, exist_ok=True)
            self.registry_path = os.path.join(data_dir, 'file_registry.json')
        else:
            self.registry_path = registry_path
            
        self.registry: Dict[str, Dict[str, Any]] = {}
        self._load_registry()
    
    def _load_registry(self) -> None:
        """Charge le registre depuis le fichier JSON s'il existe."""
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, 'r', encoding='utf-8') as f:
                    self.registry = json.load(f)
                logger.info(f"Registre chargé: {len(self.registry)} fichiers trouvés")
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Erreur lors du chargement du registre: {e}")
                # Si le fichier est corrompu, créer un nouveau registre vide
                self.registry = {}
        else:
            logger.info("Aucun registre existant trouvé, création d'un nouveau registre")
            self.registry = {}
    
    def _save_registry(self) -> None:
        """Sauvegarde le registre dans le fichier JSON."""
        try:
            with open(self.registry_path, 'w', encoding='utf-8') as f:
                json.dump(self.registry, f, indent=2, ensure_ascii=False)
            logger.debug(f"Registre sauvegardé: {len(self.registry)} fichiers")
        except IOError as e:
            logger.error(f"Erreur lors de la sauvegarde du registre: {e}")
    
    def compute_file_hash(self, file_content: bytes) -> str:
        """
        Calcule le hash SHA-256 du contenu d'un fichier.
        
        Args:
            file_content: Contenu du fichier en bytes.
            
        Returns:
            Hash SHA-256 du fichier sous forme de chaîne hexadécimale.
        """
        hasher = hashlib.sha256()
        hasher.update(file_content)
        return hasher.hexdigest()
    
    def add_file(self, 
                file_path: str, 
                doc_id: str, 
                file_hash: str, 
                source_path: str = None,
                last_modified: Optional[str] = None,
                metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Ajoute ou met à jour un fichier dans le registre.
        
        Args:
            file_path: Chemin du fichier (clé unique dans le registre).
            doc_id: Identifiant du document dans Qdrant.
            file_hash: Hash SHA-256 du contenu du fichier.
            source_path: Chemin source du document (peut être différent du file_path).
            last_modified: Date de dernière modification (ISO format).
                           Si None, utilise la date actuelle.
            metadata: Métadonnées additionnelles du fichier.
        """
        if last_modified is None:
            last_modified = datetime.now().isoformat()
            
        self.registry[file_path] = {
            "doc_id": doc_id,
            "hash": file_hash,
            "source_path": source_path or file_path,  # Utiliser file_path comme fallback
            "last_modified": last_modified,
            "last_synced": datetime.now().isoformat()
        }
        
        if metadata:
            self.registry[file_path]["metadata"] = metadata
            
        self._save_registry()
        
    def remove_file(self, file_path: str) -> bool:
        """
        Supprime un fichier du registre.
        
        Args:
            file_path: Chemin du fichier à supprimer.
            
        Returns:
            True si le fichier a été supprimé, False sinon.
        """
        if file_path in self.registry:
            del self.registry[file_path]
            self._save_registry()
            return True
        return False
    
    def file_exists(self, file_path: str) -> bool:
        """
        Vérifie si un fichier existe dans le registre.
        
        Args:
            file_path: Chemin du fichier à vérifier.
            
        Returns:
            True si le fichier existe dans le registre, False sinon.
        """
        return file_path in self.registry
    
    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un fichier dans le registre.
        
        Args:
            file_path: Chemin du fichier.
            
        Returns:
            Informations du fichier ou None s'il n'existe pas.
        """
        return self.registry.get(file_path)
    
    def get_doc_id(self, file_path: str) -> Optional[str]:
        """
        Récupère l'ID du document dans Qdrant.
        
        Args:
            file_path: Chemin du fichier.
            
        Returns:
            ID du document ou None s'il n'existe pas.
        """
        file_info = self.get_file_info(file_path)
        return file_info["doc_id"] if file_info else None
    
    def has_changed(self, file_path: str, new_hash: str) -> bool:
        """
        Vérifie si un fichier a changé en comparant son hash.
        
        Args:
            file_path: Chemin du fichier.
            new_hash: Nouveau hash à comparer.
            
        Returns:
            True si le fichier a changé, False sinon ou s'il n'existe pas.
        """
        file_info = self.get_file_info(file_path)
        if not file_info:
            return True  # Considéré comme changé s'il n'existe pas
        return file_info["hash"] != new_hash
    
    def get_all_file_paths(self) -> Set[str]:
        """
        Récupère l'ensemble des chemins de fichiers dans le registre.
        
        Returns:
            Ensemble des chemins de fichiers.
        """
        return set(self.registry.keys())
    
    def get_files_by_prefix(self, prefix: str) -> List[str]:
        """
        Récupère les fichiers dont le chemin commence par un préfixe.
        
        Args:
            prefix: Préfixe à rechercher.
            
        Returns:
            Liste des chemins de fichiers correspondants.
        """
        return [path for path in self.registry.keys() if path.startswith(prefix)]
