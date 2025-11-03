"""
Worker pour l'ingestion de fichiers Nextcloud en arrière-plan.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set
import time
import uuid
import json
from datetime import datetime
import os
from pathlib import Path

from backend.core.logger import log
from backend.adapters.nextcloud_adapter import NextcloudAdapter
from backend.services.rag.rag_service import rag_service
from backend.services.storage.file_registry import FileRegistry


class NextcloudIngestionTask:
    """Représente une tâche d'ingestion de fichiers Nextcloud."""
    
    def __init__(
        self,
        task_id: str,
        user_id: str,
        params: Dict[str, Any]
    ):
        self.task_id = task_id
        self.user_id = user_id
        self.params = params
        self.status = "pending"  # pending, running, completed, failed
        self.progress = 0
        self.total = 0
        self.result = {}
        self.error = None
        self.start_time = None
        self.end_time = None
        
    def to_dict(self) -> Dict[str, Any]:
        """Convertit la tâche en dictionnaire."""
        return {
            "task_id": self.task_id,
            "user_id": self.user_id,
            "status": self.status,
            "progress": self.progress,
            "total": self.total,
            "result": self.result,
            "error": self.error,
            "start_time": self.start_time,
            "end_time": self.end_time
        }


class NextcloudIngestionWorker:
    """Worker pour l'ingestion de fichiers Nextcloud en arrière-plan."""
    
    def __init__(self):
        self.tasks = {}  # task_id -> NextcloudIngestionTask
        self.running = False
        log.info("NextcloudIngestionWorker initialisé")
        
    async def start(self):
        """Démarre le worker."""
        if self.running:
            return
            
        self.running = True
        asyncio.create_task(self._process_tasks())
        log.info("NextcloudIngestionWorker démarré")
        
    async def stop(self):
        """Arrête le worker."""
        self.running = False
        log.info("NextcloudIngestionWorker arrêté")
        
    async def _process_tasks(self):
        """Traite les tâches en attente."""
        while self.running:
            # Trouver les tâches en attente
            pending_tasks = [
                task for task in self.tasks.values()
                if task.status == "pending"
            ]
            
            # Traiter une tâche à la fois
            if pending_tasks:
                task = pending_tasks[0]
                await self._process_task(task)
                
            # Attendre avant de vérifier à nouveau
            await asyncio.sleep(1)
            
    async def _process_task(self, task: NextcloudIngestionTask):
        """Traite une tâche d'ingestion Nextcloud."""
        task.status = "running"
        task.start_time = datetime.now().isoformat()
        
        try:
            log.info(f"Traitement de la tâche Nextcloud {task.task_id} pour {task.user_id}")
            
            # Extraire les paramètres
            path = task.params.get("path", "/")
            recursive = task.params.get("recursive", True)
            extensions = task.params.get("extensions", [])
            force_reingest = task.params.get("force_reingest", False)
            skip_duplicate_check = task.params.get("skip_duplicate_check", False)
            
            # Vérifier si nous avons des extensions valides
            if not extensions:
                from backend.core.config import SUPPORTED_FILE_TYPES
                extensions = SUPPORTED_FILE_TYPES
            
            # Créer l'adaptateur Nextcloud
            nextcloud = NextcloudAdapter(user_id=task.user_id)
            
            # Initialiser le registre de fichiers
            registry = FileRegistry(task.user_id, "nextcloud")
            
            # Lister les fichiers dans Nextcloud
            files = await asyncio.to_thread(
                nextcloud.list_files,
                path=path,
                recursive=recursive
            )
            
            # Filtrer par extension
            supported_files = []
            for file in files:
                if file["type"] == "file":
                    file_ext = os.path.splitext(file["name"])[1].lstrip('.').lower()
                    if file_ext in extensions:
                        supported_files.append(file)
            
            task.total = len(supported_files)
            log.info(f"Trouvé {task.total} fichiers à traiter pour la tâche {task.task_id}")
            
            # Variables pour le suivi
            processed_files = 0
            ingested_files = 0
            skipped_files = 0
            updated_files = 0
            failed_files = 0
            
            # Traiter chaque fichier
            for file in supported_files:
                try:
                    source_path = file["path"]
                    file_name = file["name"]
                    modified = file["modified"] or datetime.now().isoformat()
                    
                    # Vérifier si le fichier est déjà dans le registre
                    file_info = registry.get_file(source_path)
                    
                    # Décider si nous devons ingérer ce fichier
                    should_ingest = True
                    
                    if not skip_duplicate_check and file_info:
                        # Vérifier si le fichier a été modifié
                        if not force_reingest:
                            # Calculer le hash pour vérifier les changements
                            file_hash = await asyncio.to_thread(
                                nextcloud.calculate_file_hash,
                                source_path
                            )
                            
                            if file_hash and file_hash == file_info.get("hash"):
                                should_ingest = False
                                skipped_files += 1
                                log.debug(f"Fichier non modifié, ignoré: {source_path}")
                    
                    # Ingérer le fichier si nécessaire
                    if should_ingest:
                        # Télécharger le fichier
                        local_path = await asyncio.to_thread(
                            nextcloud.download_file,
                            source_path
                        )
                        
                        if local_path:
                            try:
                                # Ingérer le fichier
                                result = await asyncio.to_thread(
                                    rag_service.ingest_file,
                                    local_path,
                                    task.user_id,
                                    {"source": "nextcloud", "source_path": source_path}
                                )
                                
                                if result.get("success"):
                                    # Calculer le hash du fichier
                                    file_hash = await asyncio.to_thread(
                                        FileRegistry.calculate_file_hash,
                                        local_path
                                    )
                                    
                                    # Mettre à jour le registre
                                    doc_id = result.get("doc_id")
                                    
                                    if file_info:
                                        registry.update_file(
                                            source_path=source_path,
                                            doc_id=doc_id,
                                            file_hash=file_hash,
                                            last_modified=modified
                                        )
                                        updated_files += 1
                                        log.debug(f"Fichier mis à jour: {source_path}")
                                    else:
                                        metadata = {
                                            "file_name": file_name,
                                            "file_ext": os.path.splitext(file_name)[1].lower(),
                                            "size": file.get("size", 0)
                                        }
                                        
                                        registry.add_file(
                                            doc_id=doc_id,
                                            source_path=source_path,
                                            file_hash=file_hash,
                                            last_modified=modified,
                                            metadata=metadata
                                        )
                                        ingested_files += 1
                                        log.debug(f"Fichier ingéré: {source_path}")
                                else:
                                    failed_files += 1
                                    log.warning(f"Échec de l'ingestion: {source_path} - {result.get('error')}")
                                
                                # Supprimer le fichier local temporaire
                                try:
                                    os.remove(local_path)
                                except:
                                    pass
                            except Exception as e:
                                failed_files += 1
                                log.exception(f"Erreur lors de l'ingestion de {source_path}: {str(e)}")
                        else:
                            failed_files += 1
                            log.warning(f"Impossible de télécharger le fichier: {source_path}")
                
                except Exception as e:
                    failed_files += 1
                    log.exception(f"Erreur lors du traitement du fichier {file.get('path')}: {str(e)}")
                
                # Mettre à jour la progression
                processed_files += 1
                task.progress = processed_files
                
                # Pour éviter de surcharger le système
                await asyncio.sleep(0.2)
            
            # Identifier les fichiers supprimés
            if not task.params.get("skip_deletion_check", False):
                try:
                    # Récupérer tous les chemins de fichiers dans le registre
                    registry_paths = set(registry.get_file_paths())
                    
                    # Récupérer tous les chemins de fichiers actuels dans Nextcloud
                    current_paths = {f["path"] for f in supported_files}
                    
                    # Trouver les fichiers supprimés
                    deleted_paths = registry_paths - current_paths
                    
                    # Supprimer les fichiers du registre et de Qdrant
                    for path in deleted_paths:
                        file_info = registry.get_file(path)
                        if file_info:
                            doc_id = file_info.get("doc_id")
                            if doc_id:
                                # Supprimer de Qdrant
                                await asyncio.to_thread(
                                    rag_service.delete_document,
                                    doc_id,
                                    task.user_id
                                )
                                
                            # Supprimer du registre
                            registry.remove_file(path)
                            log.debug(f"Fichier supprimé du registre: {path}")
                            
                    log.info(f"{len(deleted_paths)} fichiers supprimés identifiés")
                    
                except Exception as e:
                    log.exception(f"Erreur lors de la vérification des fichiers supprimés: {str(e)}")
            
            # Nettoyer les fichiers temporaires
            nextcloud.clean_temp_files()
            
            # Mettre à jour le résultat
            task.result = {
                "processed_files": processed_files,
                "ingested_files": ingested_files,
                "updated_files": updated_files,
                "skipped_files": skipped_files,
                "failed_files": failed_files,
                "total_files": task.total
            }
            
            task.status = "completed"
            log.info(f"Tâche {task.task_id} terminée avec succès: {ingested_files} ingérés, {updated_files} mis à jour, {skipped_files} ignorés, {failed_files} échoués")
            
        except Exception as e:
            log.exception(f"Erreur lors du traitement de la tâche {task.task_id}: {str(e)}")
            task.status = "failed"
            task.error = str(e)
            
        task.end_time = datetime.now().isoformat()
        
    def create_task(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> str:
        """
        Crée une nouvelle tâche d'ingestion Nextcloud.
        
        Args:
            user_id (str): Identifiant de l'utilisateur
            params (Dict[str, Any]): Paramètres de la tâche
            
        Returns:
            str: ID de la tâche créée
        """
        task_id = str(uuid.uuid4())
        task = NextcloudIngestionTask(task_id, user_id, params)
        self.tasks[task_id] = task
        log.info(f"Tâche d'ingestion Nextcloud créée: {task_id} pour {user_id}")
        return task_id
        
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Récupère le statut d'une tâche.
        
        Args:
            task_id (str): ID de la tâche
            
        Returns:
            Dict[str, Any]: Statut de la tâche
        """
        task = self.tasks.get(task_id)
        if task:
            return task.to_dict()
        return {"error": "Tâche non trouvée"}
        
    def get_user_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Récupère les tâches d'un utilisateur.
        
        Args:
            user_id (str): Identifiant de l'utilisateur
            
        Returns:
            List[Dict[str, Any]]: Liste des tâches
        """
        return [
            task.to_dict()
            for task in self.tasks.values()
            if task.user_id == user_id
        ]
        
    def clear_completed_tasks(self, max_age_hours: int = 24) -> int:
        """
        Supprime les tâches terminées anciennes.
        
        Args:
            max_age_hours (int, optional): Âge maximum en heures. Par défaut 24.
            
        Returns:
            int: Nombre de tâches supprimées
        """
        cutoff = datetime.now().timestamp() - (max_age_hours * 3600)
        to_remove = []
        
        for task_id, task in self.tasks.items():
            if task.status in ["completed", "failed"] and task.end_time:
                try:
                    end_time = datetime.fromisoformat(task.end_time).timestamp()
                    if end_time < cutoff:
                        to_remove.append(task_id)
                except:
                    pass
                    
        for task_id in to_remove:
            del self.tasks[task_id]
            
        log.info(f"{len(to_remove)} tâches anciennes supprimées")
        return len(to_remove)


# Instance singleton pour utilisation dans l'application
nextcloud_worker = NextcloudIngestionWorker()
