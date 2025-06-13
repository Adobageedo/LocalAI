"""
Worker pour l'ingestion d'emails en arrière-plan.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
import time
import uuid
import json
from datetime import datetime

from backend.core.logger import log
from backend.services.auth.google_auth import get_gmail_service
from backend.services.auth.microsoft_auth import get_outlook_token
from backend.adapters.imap_adapter import IMAPAdapter
from backend.services.rag.rag_service import rag_service


class EmailIngestionTask:
    """Représente une tâche d'ingestion d'emails."""
    
    def __init__(
        self,
        task_id: str,
        user_id: str,
        source: str,  # "gmail", "outlook", "imap"
        params: Dict[str, Any]
    ):
        self.task_id = task_id
        self.user_id = user_id
        self.source = source
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
            "source": self.source,
            "status": self.status,
            "progress": self.progress,
            "total": self.total,
            "result": self.result,
            "error": self.error,
            "start_time": self.start_time,
            "end_time": self.end_time
        }


class EmailIngestionWorker:
    """Worker pour l'ingestion d'emails en arrière-plan."""
    
    def __init__(self):
        self.tasks = {}  # task_id -> EmailIngestionTask
        self.running = False
        log.info("EmailIngestionWorker initialisé")
        
    async def start(self):
        """Démarre le worker."""
        if self.running:
            return
            
        self.running = True
        asyncio.create_task(self._process_tasks())
        log.info("EmailIngestionWorker démarré")
        
    async def stop(self):
        """Arrête le worker."""
        self.running = False
        log.info("EmailIngestionWorker arrêté")
        
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
            
    async def _process_task(self, task: EmailIngestionTask):
        """Traite une tâche d'ingestion d'emails."""
        task.status = "running"
        task.start_time = datetime.now().isoformat()
        
        try:
            log.info(f"Traitement de la tâche {task.task_id} pour {task.user_id} (source: {task.source})")
            
            # Traiter selon la source
            if task.source == "gmail":
                result = await self._process_gmail_task(task)
            elif task.source == "outlook":
                result = await self._process_outlook_task(task)
            elif task.source == "imap":
                result = await self._process_imap_task(task)
            else:
                raise ValueError(f"Source non supportée: {task.source}")
                
            # Mettre à jour le résultat
            task.result = result
            task.status = "completed"
            log.info(f"Tâche {task.task_id} terminée avec succès")
            
        except Exception as e:
            log.exception(f"Erreur lors du traitement de la tâche {task.task_id}: {str(e)}")
            task.status = "failed"
            task.error = str(e)
            
        task.end_time = datetime.now().isoformat()
        
    async def _process_gmail_task(self, task: EmailIngestionTask) -> Dict[str, Any]:
        """Traite une tâche d'ingestion d'emails Gmail."""
        user_id = task.user_id
        max_emails = task.params.get("max_emails", 50)
        
        # Obtenir le service Gmail
        gmail_service = await asyncio.to_thread(
            get_gmail_service,
            user_id
        )
        
        if not gmail_service:
            raise ValueError(f"Impossible d'obtenir le service Gmail pour {user_id}")
            
        # Récupérer les emails récents
        result = await asyncio.to_thread(
            gmail_service.users().messages().list(
                userId="me",
                maxResults=max_emails
            ).execute
        )
        
        messages = result.get("messages", [])
        task.total = len(messages)
        
        processed_emails = 0
        successful_emails = 0
        
        for i, message in enumerate(messages):
            try:
                # Récupérer les détails de l'email
                msg = await asyncio.to_thread(
                    gmail_service.users().messages().get(
                        userId="me",
                        id=message["id"],
                        format="full"
                    ).execute
                )
                
                # Extraire les informations de l'email
                headers = {h["name"]: h["value"] for h in msg["payload"]["headers"]}
                
                # Extraire le corps du message
                body_text = ""
                body_html = ""
                
                if "parts" in msg["payload"]:
                    for part in msg["payload"]["parts"]:
                        if part["mimeType"] == "text/plain":
                            body_data = part.get("body", {}).get("data", "")
                            if body_data:
                                import base64
                                body_text = base64.urlsafe_b64decode(body_data).decode("utf-8")
                        elif part["mimeType"] == "text/html":
                            body_data = part.get("body", {}).get("data", "")
                            if body_data:
                                import base64
                                body_html = base64.urlsafe_b64decode(body_data).decode("utf-8")
                
                # Construire l'objet email
                email_obj = {
                    "id": message["id"],
                    "thread_id": msg["threadId"],
                    "subject": headers.get("Subject", ""),
                    "from": headers.get("From", ""),
                    "to": headers.get("To", ""),
                    "date": headers.get("Date", ""),
                    "body_text": body_text,
                    "body_html": body_html
                }
                
                # Ingérer l'email
                ingestion_result = await asyncio.to_thread(
                    rag_service.ingest_email,
                    email_obj,
                    user_id,
                    {"email_source": "gmail"}
                )
                
                if ingestion_result.get("success"):
                    successful_emails += 1
                    
            except Exception as e:
                log.error(f"Erreur lors du traitement de l'email {message['id']}: {str(e)}")
                
            # Mettre à jour la progression
            processed_emails += 1
            task.progress = processed_emails
            
            # Pour éviter de surcharger l'API
            await asyncio.sleep(0.2)
            
        # Retourner les résultats
        return {
            "processed_emails": processed_emails,
            "successful_emails": successful_emails,
            "total_emails": task.total
        }
        
    async def _process_outlook_task(self, task: EmailIngestionTask) -> Dict[str, Any]:
        """Traite une tâche d'ingestion d'emails Outlook."""
        user_id = task.user_id
        max_emails = task.params.get("max_emails", 50)
        
        # Obtenir le token Outlook
        token = await asyncio.to_thread(get_outlook_token, user_id)
        
        if not token:
            raise ValueError(f"Impossible d'obtenir le token Outlook pour {user_id}")
            
        # Utiliser MS Graph pour récupérer les emails
        import requests
        
        headers = {
            "Authorization": f"Bearer {token.get('access_token')}",
            "Content-Type": "application/json"
        }
        
        # Récupérer les emails récents
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/me/messages?$top={max_emails}&$select=id,subject,from,toRecipients,body,receivedDateTime",
            headers=headers
        )
        
        if response.status_code != 200:
            raise ValueError(f"Erreur lors de la récupération des emails Outlook: {response.status_code} - {response.text}")
            
        messages = response.json().get("value", [])
        task.total = len(messages)
        
        processed_emails = 0
        successful_emails = 0
        
        for i, msg in enumerate(messages):
            try:
                # Extraire les informations de l'email
                email_obj = {
                    "id": msg["id"],
                    "subject": msg.get("subject", ""),
                    "from": msg.get("from", {}).get("emailAddress", {}).get("address", ""),
                    "to": ", ".join([r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])]),
                    "date": msg.get("receivedDateTime", ""),
                    "body_text": msg.get("body", {}).get("content", ""),
                    "body_html": msg.get("body", {}).get("content", "") if msg.get("body", {}).get("contentType", "") == "html" else ""
                }
                
                # Ingérer l'email
                ingestion_result = await asyncio.to_thread(
                    rag_service.ingest_email,
                    email_obj,
                    user_id,
                    {"email_source": "outlook"}
                )
                
                if ingestion_result.get("success"):
                    successful_emails += 1
                    
            except Exception as e:
                log.error(f"Erreur lors du traitement de l'email {msg.get('id')}: {str(e)}")
                
            # Mettre à jour la progression
            processed_emails += 1
            task.progress = processed_emails
            
            # Pour éviter de surcharger l'API
            await asyncio.sleep(0.2)
            
        # Retourner les résultats
        return {
            "processed_emails": processed_emails,
            "successful_emails": successful_emails,
            "total_emails": task.total
        }
        
    async def _process_imap_task(self, task: EmailIngestionTask) -> Dict[str, Any]:
        """Traite une tâche d'ingestion d'emails IMAP."""
        user_id = task.user_id
        max_emails = task.params.get("max_emails", 50)
        days = task.params.get("days", 7)
        
        server = task.params.get("server")
        port = task.params.get("port")
        username = task.params.get("username")
        password = task.params.get("password")
        use_ssl = task.params.get("use_ssl", True)
        
        # Connecter à IMAP
        imap = IMAPAdapter(
            server=server,
            port=port,
            username=username,
            password=password,
            use_ssl=use_ssl
        )
        
        success = await asyncio.to_thread(imap.connect)
        if not success:
            raise ValueError(f"Impossible de se connecter au serveur IMAP {server}")
            
        try:
            # Récupérer les emails récents
            emails = await asyncio.to_thread(
                imap.get_emails_since,
                days=days,
                max_emails=max_emails
            )
            
            task.total = len(emails)
            
            processed_emails = 0
            successful_emails = 0
            
            for email in emails:
                try:
                    # Ingérer l'email
                    ingestion_result = await asyncio.to_thread(
                        rag_service.ingest_email,
                        email,
                        user_id,
                        {"email_source": "imap", "imap_server": server}
                    )
                    
                    if ingestion_result.get("success"):
                        successful_emails += 1
                        
                except Exception as e:
                    log.error(f"Erreur lors de l'ingestion de l'email {email.get('id')}: {str(e)}")
                    
                # Mettre à jour la progression
                processed_emails += 1
                task.progress = processed_emails
                
            # Retourner les résultats
            return {
                "processed_emails": processed_emails,
                "successful_emails": successful_emails,
                "total_emails": task.total
            }
        
        finally:
            # Fermer la connexion IMAP
            await asyncio.to_thread(imap.disconnect)
            
    def create_task(
        self,
        user_id: str,
        source: str,
        params: Dict[str, Any]
    ) -> str:
        """
        Crée une nouvelle tâche d'ingestion d'emails.
        
        Args:
            user_id (str): Identifiant de l'utilisateur
            source (str): Source des emails (gmail, outlook, imap)
            params (Dict[str, Any]): Paramètres de la tâche
            
        Returns:
            str: ID de la tâche créée
        """
        task_id = str(uuid.uuid4())
        task = EmailIngestionTask(task_id, user_id, source, params)
        self.tasks[task_id] = task
        log.info(f"Tâche d'ingestion créée: {task_id} ({source}) pour {user_id}")
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
email_worker = EmailIngestionWorker()
