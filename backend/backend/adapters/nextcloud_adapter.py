"""
Adaptateur pour l'interaction avec Nextcloud via WebDAV.
"""

import requests
import webdav3.client as wc
import tempfile
import os
import hashlib
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import mimetypes
import logging
import shutil
from pathlib import Path

from backend.core.config import (
    NEXTCLOUD_URL,
    NEXTCLOUD_USERNAME,
    NEXTCLOUD_PASSWORD,
    SUPPORTED_FILE_TYPES,
    DATA_DIR
)
from backend.core.logger import log

class NextcloudAdapter:
    """
    Adaptateur pour interagir avec Nextcloud via WebDAV.
    """
    
    def __init__(
        self,
        url: str = None,
        username: str = None,
        password: str = None,
        user_id: str = "default"
    ):
        """
        Initialise l'adaptateur Nextcloud.
        
        Args:
            url (str, optional): URL du serveur Nextcloud. Par défaut utilise la config.
            username (str, optional): Nom d'utilisateur. Par défaut utilise la config.
            password (str, optional): Mot de passe. Par défaut utilise la config.
            user_id (str, optional): Identifiant de l'utilisateur dans l'application. Par défaut "default".
        """
        self.url = url or NEXTCLOUD_URL
        self.username = username or NEXTCLOUD_USERNAME
        self.password = password or NEXTCLOUD_PASSWORD
        self.user_id = user_id
        
        # URL WebDAV
        if self.url.endswith('/'):
            self.webdav_url = f"{self.url}remote.php/dav/files/{self.username}/"
        else:
            self.webdav_url = f"{self.url}/remote.php/dav/files/{self.username}/"
            
        # Configuration WebDAV
        self.webdav_options = {
            'webdav_hostname': self.webdav_url,
            'webdav_login': self.username,
            'webdav_password': self.password
        }
        
        # Client WebDAV
        self.client = wc.Client(self.webdav_options)
        
        # Répertoire temporaire pour les téléchargements
        self.temp_dir = DATA_DIR / "temp" / f"nextcloud_{user_id}"
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        log.info(f"NextcloudAdapter initialisé pour {self.url}")
        
    def test_connection(self) -> bool:
        """
        Teste la connexion au serveur Nextcloud.
        
        Returns:
            bool: True si la connexion est réussie, False sinon
        """
        try:
            response = requests.get(
                self.webdav_url,
                auth=(self.username, self.password),
                timeout=10
            )
            if response.status_code == 401:
                log.error(f"Erreur d'authentification Nextcloud: identifiants invalides")
                return False
            return response.status_code < 400
        except Exception as e:
            log.exception(f"Erreur de connexion Nextcloud: {str(e)}")
            return False
            
    def list_files(self, path: str = "/", recursive: bool = False) -> List[Dict[str, Any]]:
        """
        Liste les fichiers et dossiers dans un répertoire Nextcloud.
        
        Args:
            path (str, optional): Chemin du répertoire. Par défaut "/".
            recursive (bool, optional): Recherche récursive. Par défaut False.
            
        Returns:
            List[Dict[str, Any]]: Liste des fichiers et dossiers
        """
        try:
            # Normaliser le chemin
            if not path.startswith('/'):
                path = f"/{path}"
            if not path.endswith('/') and path != '/':
                path = f"{path}/"
                
            # Récupérer la liste des fichiers
            files_list = self.client.list(path, get_info=True)
            
            # Traiter la liste
            result = []
            
            for f in files_list:
                # Ignorer l'entrée courante
                if f == path:
                    continue
                    
                # Extraire le nom du fichier ou dossier
                name = os.path.basename(f.rstrip('/'))
                
                # Déterminer le type
                file_type = "directory" if f.endswith('/') else "file"
                
                # Récupérer des informations supplémentaires
                try:
                    info = self.client.info(f)
                    size = int(info.get('size', 0))
                    modified = info.get('modified', None)
                    # Convertir la date en format ISO
                    if modified:
                        try:
                            modified = datetime.strptime(modified, "%a, %d %b %Y %H:%M:%S %Z").isoformat()
                        except ValueError:
                            pass
                except:
                    size = 0
                    modified = None
                
                # Construire l'entrée
                entry = {
                    "path": f,
                    "name": name,
                    "type": file_type,
                    "size": size,
                    "modified": modified
                }
                
                # Déterminer le type MIME pour les fichiers
                if file_type == "file":
                    mime_type, _ = mimetypes.guess_type(name)
                    entry["mime"] = mime_type or "application/octet-stream"
                    
                # Ajouter à la liste de résultats
                result.append(entry)
                
            # Récursion si demandée
            if recursive:
                for entry in list(result):  # Copier la liste pour pouvoir la modifier
                    if entry["type"] == "directory":
                        sub_files = self.list_files(entry["path"], recursive=True)
                        result.extend(sub_files)
                        
            return result
        except Exception as e:
            log.exception(f"Erreur lors de la liste des fichiers Nextcloud {path}: {str(e)}")
            return []
            
    def download_file(self, remote_path: str, local_path: Optional[str] = None) -> Optional[str]:
        """
        Télécharge un fichier depuis Nextcloud.
        
        Args:
            remote_path (str): Chemin du fichier sur Nextcloud
            local_path (str, optional): Chemin local où télécharger le fichier. 
                                        Par défaut utilise un fichier temporaire.
            
        Returns:
            Optional[str]: Chemin du fichier local téléchargé, None en cas d'erreur
        """
        try:
            # Générer un nom de fichier temporaire si non spécifié
            if local_path is None:
                file_name = os.path.basename(remote_path)
                local_path = os.path.join(self.temp_dir, file_name)
                
            # S'assurer que le répertoire parent existe
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
            # Télécharger le fichier
            self.client.download_sync(remote_path=remote_path, local_path=local_path)
            
            log.debug(f"Fichier téléchargé: {remote_path} -> {local_path}")
            return local_path
        except Exception as e:
            log.exception(f"Erreur lors du téléchargement du fichier {remote_path}: {str(e)}")
            return None
            
    def download_files_by_extension(
        self,
        extensions: List[str],
        path: str = "/",
        recursive: bool = True
    ) -> Dict[str, str]:
        """
        Télécharge tous les fichiers d'extensions spécifiées depuis un répertoire Nextcloud.
        
        Args:
            extensions (List[str]): Liste des extensions à télécharger (sans le point)
            path (str, optional): Répertoire à explorer. Par défaut "/".
            recursive (bool, optional): Recherche récursive. Par défaut True.
            
        Returns:
            Dict[str, str]: Dictionnaire {chemin_distant: chemin_local} des fichiers téléchargés
        """
        try:
            # Normaliser les extensions
            extensions = [ext.lower().lstrip('.') for ext in extensions]
            
            # Lister les fichiers
            files = self.list_files(path, recursive=recursive)
            
            # Filtrer par extension
            supported_files = []
            for file in files:
                if file["type"] == "file":
                    file_ext = os.path.splitext(file["name"])[1].lstrip('.').lower()
                    if file_ext in extensions:
                        supported_files.append(file)
            
            # Télécharger les fichiers
            downloaded = {}
            for file in supported_files:
                remote_path = file["path"]
                file_name = file["name"]
                
                # Conserver la structure des répertoires
                rel_path = os.path.relpath(os.path.dirname(remote_path), path) if path != "/" else ""
                if rel_path == ".":
                    rel_path = ""
                    
                local_dir = os.path.join(self.temp_dir, rel_path)
                os.makedirs(local_dir, exist_ok=True)
                
                local_path = os.path.join(local_dir, file_name)
                
                # Télécharger le fichier
                result = self.download_file(remote_path, local_path)
                if result:
                    downloaded[remote_path] = result
            
            log.info(f"{len(downloaded)} fichiers téléchargés depuis {path}")
            return downloaded
        except Exception as e:
            log.exception(f"Erreur lors du téléchargement des fichiers par extension: {str(e)}")
            return {}
            
    def upload_file(self, local_path: str, remote_path: str) -> bool:
        """
        Téléverse un fichier vers Nextcloud.
        
        Args:
            local_path (str): Chemin du fichier local
            remote_path (str): Chemin de destination sur Nextcloud
            
        Returns:
            bool: True si le téléversement est réussi, False sinon
        """
        try:
            # Vérifier que le fichier local existe
            if not os.path.exists(local_path):
                log.error(f"Fichier local non trouvé: {local_path}")
                return False
                
            # Normaliser le chemin distant
            if not remote_path.startswith('/'):
                remote_path = f"/{remote_path}"
                
            # Créer les répertoires parents si nécessaire
            remote_dir = os.path.dirname(remote_path)
            if remote_dir and remote_dir != '/':
                try:
                    self.client.mkdir(remote_dir)
                except:
                    pass  # Ignorer l'erreur si le répertoire existe déjà
                    
            # Téléverser le fichier
            self.client.upload_sync(local_path=local_path, remote_path=remote_path)
            
            log.debug(f"Fichier téléversé: {local_path} -> {remote_path}")
            return True
        except Exception as e:
            log.exception(f"Erreur lors du téléversement du fichier {local_path}: {str(e)}")
            return False
            
    def delete_file(self, path: str) -> bool:
        """
        Supprime un fichier ou dossier de Nextcloud.
        
        Args:
            path (str): Chemin du fichier ou dossier à supprimer
            
        Returns:
            bool: True si la suppression est réussie, False sinon
        """
        try:
            # Normaliser le chemin
            if not path.startswith('/'):
                path = f"/{path}"
                
            # Supprimer le fichier ou dossier
            self.client.clean(path)
            
            log.debug(f"Fichier ou dossier supprimé: {path}")
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la suppression de {path}: {str(e)}")
            return False
            
    def get_file_info(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations d'un fichier ou dossier.
        
        Args:
            path (str): Chemin du fichier ou dossier
            
        Returns:
            Optional[Dict[str, Any]]: Informations sur le fichier ou None en cas d'erreur
        """
        try:
            # Normaliser le chemin
            if not path.startswith('/'):
                path = f"/{path}"
                
            # Récupérer les infos
            info = self.client.info(path)
            
            # Déterminer le type
            is_dir = path.endswith('/') or info.get('resourcetype') == 'collection'
            file_type = "directory" if is_dir else "file"
            
            # Construire l'objet d'informations
            result = {
                "path": path,
                "name": os.path.basename(path.rstrip('/')),
                "type": file_type,
                "size": int(info.get('size', 0)),
                "modified": info.get('modified', None),
                "created": info.get('created', None)
            }
            
            # Ajouter le type MIME pour les fichiers
            if file_type == "file":
                mime_type, _ = mimetypes.guess_type(path)
                result["mime"] = mime_type or "application/octet-stream"
                
            return result
        except Exception as e:
            log.exception(f"Erreur lors de la récupération des infos de {path}: {str(e)}")
            return None
            
    def create_directory(self, path: str) -> bool:
        """
        Crée un répertoire sur Nextcloud.
        
        Args:
            path (str): Chemin du répertoire à créer
            
        Returns:
            bool: True si la création est réussie, False sinon
        """
        try:
            # Normaliser le chemin
            if not path.startswith('/'):
                path = f"/{path}"
            if not path.endswith('/'):
                path = f"{path}/"
                
            # Créer le répertoire
            self.client.mkdir(path)
            
            log.debug(f"Répertoire créé: {path}")
            return True
        except Exception as e:
            log.exception(f"Erreur lors de la création du répertoire {path}: {str(e)}")
            return False
            
    def check_file_exists(self, path: str) -> bool:
        """
        Vérifie si un fichier ou dossier existe sur Nextcloud.
        
        Args:
            path (str): Chemin du fichier ou dossier
            
        Returns:
            bool: True si le fichier ou dossier existe, False sinon
        """
        try:
            # Normaliser le chemin
            if not path.startswith('/'):
                path = f"/{path}"
                
            return self.client.check(path)
        except Exception as e:
            log.exception(f"Erreur lors de la vérification de l'existence de {path}: {str(e)}")
            return False
            
    def calculate_file_hash(self, path: str) -> Optional[str]:
        """
        Calcule le hash SHA-256 d'un fichier Nextcloud.
        
        Args:
            path (str): Chemin du fichier
            
        Returns:
            Optional[str]: Hash SHA-256 du fichier ou None en cas d'erreur
        """
        try:
            # Télécharger temporairement le fichier
            local_path = self.download_file(path)
            if not local_path:
                return None
                
            # Calculer le hash
            sha256_hash = hashlib.sha256()
            with open(local_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
                    
            # Supprimer le fichier temporaire
            try:
                os.remove(local_path)
            except:
                pass
                
            return sha256_hash.hexdigest()
        except Exception as e:
            log.exception(f"Erreur lors du calcul du hash pour {path}: {str(e)}")
            return None
            
    def clean_temp_files(self) -> None:
        """
        Nettoie les fichiers temporaires téléchargés.
        """
        try:
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            os.makedirs(self.temp_dir, exist_ok=True)
            log.debug(f"Fichiers temporaires nettoyés dans {self.temp_dir}")
        except Exception as e:
            log.error(f"Erreur lors du nettoyage des fichiers temporaires: {str(e)}")
            
    def __enter__(self):
        """
        Support pour le gestionnaire de contexte (with).
        """
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Nettoie les ressources en sortant du gestionnaire de contexte.
        """
        self.clean_temp_files()
