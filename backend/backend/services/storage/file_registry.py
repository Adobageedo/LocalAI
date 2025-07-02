"""
Module de gestion du registre des fichiers ingérés dans Qdrant.
Permet de suivre les fichiers, leurs hashes, dates de modification et IDs.
"""
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any, Set
from datetime import datetime

from backend.core.logger import log
logger = log.bind(name="backend.services.storage.file_registry")
backend_dir = os.path.abspath(os.path.join(__file__, '..', '..', '..', '..'))
data_dir = os.path.join(backend_dir, 'data', 'file_registry')
print(data_dir)
class FileRegistry:
    """
    Classe permettant de gérer un registre des fichiers ingérés dans Qdrant
    sous forme de fichier JSON.
    """
    def __init__(self,user_id):
        """
        Initialise le registre des fichiers.
        
        Args:
            user_id: Identifiant de l'utilisateur.
        """
        backend_dir = os.path.abspath(os.path.join(__file__, '..', '..', '..', '..'))
        data_dir = os.path.join(backend_dir, 'data', 'file_registry')
        os.makedirs(data_dir, exist_ok=True)
        self.registry_path = os.path.join(data_dir, f'file_registry_{user_id}.json')
        self.registry: Dict[str, Dict[str, Any]] = {}
        self._load_registry()
    
    def _load_registry(self) -> None:
        """Charge le registre depuis le fichier JSON s'il existe."""
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, 'r', encoding='utf-8') as f:
                    self.registry = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Erreur lors du chargement du registre: {e}")
                # Si le fichier est corrompu, créer un nouveau registre vide
                self.registry = {}
        else:
            logger.info("Aucun registre existant trouvé, création d'un nouveau registre")
            self.registry = {}
            self._save_registry()
    
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
        self.registry[source_path] = {
            "doc_id": doc_id,
            "hash": file_hash,
            "source_path": source_path,  # Utiliser file_path comme fallback
            "last_modified": last_modified,
            "last_synced": datetime.now().isoformat()
        }
        
        if metadata:
            self.registry[source_path]["metadata"] = metadata
            
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
        
    def get_user_documents(self, document_type: Optional[str] = None, include_metadata: bool = True) -> List[Dict[str, Any]]:
        """
        Récupère les documents/emails uniques d'un utilisateur avec leurs métadonnées.
        
        Args:
            document_type: Type de document à filtrer ("email", "email_attachment", etc.)
                         Si None, retourne tous les types de documents.
            include_metadata: Si True, inclut les métadonnées complètes pour chaque document.
            
        Returns:
            Liste de dictionnaires contenant les informations sur chaque document.
        """
        results = []
        
        # Parcourir tous les fichiers dans le registre
        for file_path, file_info in self.registry.items():
            # Si un type de document est spécifié, vérifier dans les métadonnées
            if document_type and "metadata" in file_info:
                if file_info["metadata"].get("document_type") != document_type:
                    continue
            
            # Construire les informations de base du document
            doc_info = {
                "path": file_path,
                "doc_id": file_info["doc_id"],
                "last_modified": file_info["last_modified"],
                "last_synced": file_info.get("last_synced")
            }
            
            # Ajouter la source si disponible
            if "source_path" in file_info:
                doc_info["source_path"] = file_info["source_path"]
            
            # Ajouter les métadonnées si demandé
            if include_metadata and "metadata" in file_info:
                doc_info["metadata"] = file_info["metadata"]
            
            results.append(doc_info)
        
        # Trier par date de modification (du plus récent au plus ancien)
        results.sort(key=lambda x: x.get("last_modified", ""), reverse=True)
        
        return results
        
    def count_user_documents(self, document_type: Optional[str] = None, prefix: Optional[str] = None) -> int:
        """
        Compte le nombre de documents/emails d'un utilisateur, avec filtrage optionnel.
        
        Args:
            document_type: Type de document à filtrer ("email", "email_attachment", etc.)
                         Si None, compte tous les types de documents.
            prefix: Préfixe de chemin pour filtrer les documents (ex: "gmail/", "outlook/")
                  Si None, compte tous les documents sans filtrage par préfixe.
            
        Returns:
            Nombre de documents correspondants aux critères.
        """
        count = 0
        
        # Si un préfixe est spécifié, filtrer d'abord par préfixe
        if prefix:
            file_paths = self.get_files_by_prefix(prefix)
        else:
            file_paths = list(self.registry.keys())
            
        # Si aucun type de document n'est spécifié, retourner simplement le nombre de fichiers
        if not document_type:
            return len(file_paths)
            
        # Compter les fichiers correspondant au type spécifié
        for path in file_paths:
            file_info = self.registry.get(path, {})
            if "metadata" in file_info and file_info["metadata"].get("document_type") == document_type:
                count += 1
                
        return count

    def update_email_classification(self, email_id: str, user_id: str, classified_action: str = 'not classified') -> bool:
        """
        Met à jour le statut de classification d'un email dans le registre.
        
        Args:
            email_id: Identifiant unique de l'email
            user_id: Identifiant de l'utilisateur propriétaire de l'email
            classified_action: Action de classification (reply, forward, no_action, etc.)
            
        Returns:
            bool: True si la mise à jour a réussi, False sinon
        """
        updated = False
        
        # Parcourir tous les fichiers dans le registre pour trouver l'email correspondant
        for file_path, file_info in self.registry.items():
            # Vérifier si c'est un email et s'il correspond à l'ID recherché
            if "metadata" in file_info and file_info["metadata"].get("doc_id") == email_id:
                # Mettre à jour le statut de classification dans les métadonnées
                if "metadata" not in file_info:
                    file_info["metadata"] = {}
                
                file_info["metadata"]["is_classified"] = classified_action
                file_info["last_modified"] = datetime.now().isoformat()
                updated = True
                logger.info(f"Classification de l'email {email_id} mise à jour: {classified_action}")
        
        # Sauvegarder les modifications si au moins un email a été mis à jour
        if updated:
            self._save_registry()
            return True
        else:
            logger.warning(f"Aucun email avec l'ID {email_id} trouvé dans le registre pour l'utilisateur {user_id}")
            return False
