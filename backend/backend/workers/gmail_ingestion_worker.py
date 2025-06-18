"""
Worker for background Gmail email ingestion tasks.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
import queue

from ..services.gmail.gmail_service import GmailService
from ..services.storage.sync_status_service import SyncStatusService

logger = logging.getLogger(__name__)

class GmailIngestionWorker:
    """Background worker for Gmail email ingestion tasks."""
    
    def __init__(self):
        """Initialize the worker."""
        self.task_queue = asyncio.Queue()
        self.running = False
        self.worker_task = None
        self.sync_status = SyncStatusService()
    
    async def start(self):
        """Start the worker."""
        if self.running:
            logger.info("Gmail ingestion worker already running")
            return
        
        self.running = True
        self.worker_task = asyncio.create_task(self._process_tasks())
        logger.info("Gmail ingestion worker started")
    
    async def stop(self):
        """Stop the worker."""
        if not self.running:
            logger.info("Gmail ingestion worker already stopped")
            return
        
        self.running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                logger.info("Gmail ingestion worker task cancelled")
        
        logger.info("Gmail ingestion worker stopped")
    
    async def add_task(self, task: Dict[str, Any]):
        """
        Add a task to the queue.
        
        Args:
            task: Task details including user_id and ingestion parameters
        """
        await self.task_queue.put(task)
        logger.info(f"Added Gmail ingestion task for user {task.get('user_id')}")
    
    async def _process_tasks(self):
        """Process tasks from the queue."""
        logger.info("Gmail ingestion worker starting task processing")
        
        while self.running:
            try:
                # Get a task from the queue with timeout
                try:
                    task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    # No task available, continue polling
                    await asyncio.sleep(0.1)
                    continue
                
                # Process the task
                try:
                    await self._run_ingestion_task(task)
                except Exception as e:
                    logger.exception(f"Error processing Gmail ingestion task: {e}")
                    user_id = task.get('user_id')
                    if user_id:
                        self.sync_status.fail_sync(user_id, "gmail", str(e))
                finally:
                    # Mark the task as done
                    self.task_queue.task_done()
            
            except Exception as e:
                logger.exception(f"Error in Gmail worker task loop: {e}")
                await asyncio.sleep(1)  # Prevent tight loop in case of recurring errors
    
    async def _run_ingestion_task(self, task: Dict[str, Any]):
        """
        Run a Gmail ingestion task.
        
        Args:
            task: Task details
        """
        start_time = time.time()
        user_id = task.get('user_id')
        
        if not user_id:
            logger.error("Cannot process Gmail ingestion task without user_id")
            return
        
        logger.info(f"Processing Gmail ingestion task for user {user_id}")
        
        # Extract task parameters
        labels = task.get('labels', ["INBOX", "SENT"])
        limit = task.get('limit', 100)
        query = task.get('query')
        force_reingest = task.get('force_reingest', False)
        save_attachments = task.get('save_attachments', True)
        
        # Create Gmail service
        gmail_service = GmailService(user_id=user_id)
        
        try:
            # Run the ingestion in a thread to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: gmail_service.ingest_gmail_emails(
                    labels=labels,
                    limit=limit,
                    query=query,
                    force_reingest=force_reingest,
                    save_attachments=save_attachments,
                    user_id=user_id
                )
            )
            
            duration = time.time() - start_time
            logger.info(f"Gmail ingestion completed for user {user_id} in {duration:.2f}s: "
                       f"Found {result.get('total_emails_found', 0)} emails, "
                       f"Ingested {result.get('ingested_emails', 0)} emails, "
                       f"Ingested {result.get('ingested_attachments', 0)} attachments")
            
        except Exception as e:
            logger.exception(f"Gmail ingestion failed for user {user_id}: {e}")
            self.sync_status.fail_sync(user_id, "gmail", str(e))


# Create global worker instance
gmail_worker = GmailIngestionWorker()
