"""
Scheduled Job Manager
====================
Component responsible for scheduling and executing recurring tasks.
"""
import time
import threading
import logging
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Any

from sync_service.utils.logger import setup_logger

# Setup logging
logger = setup_logger('sync_service.scheduler')

class ScheduledJob:
    """Represents a single scheduled job."""
    
    def __init__(self, job_id: str, function: Callable, interval_seconds: int):
        """
        Initialize a scheduled job.
        
        Args:
            job_id: Unique identifier for the job
            function: Function to execute
            interval_seconds: Interval between executions in seconds
        """
        self.job_id = job_id
        self.function = function
        self.interval_seconds = interval_seconds
        self.last_run = None
        self.next_run = datetime.now()
        self.running = False
        self.thread = None
    
    def calculate_next_run(self):
        """Calculate the next run time based on the interval."""
        self.next_run = datetime.now() + timedelta(seconds=self.interval_seconds)
    
    def __str__(self):
        return f"Job {self.job_id} (interval: {self.interval_seconds}s, next run: {self.next_run})"

class ScheduledJobManager:
    """
    Manages scheduled jobs and ensures they run at the specified intervals.
    
    This class provides a simple scheduler that runs jobs at regular intervals 
    without relying on external libraries like APScheduler.
    """
    
    def __init__(self):
        """Initialize the job manager."""
        self.jobs = {}  # Dictionary of jobs by ID
        self.running = False
        self.scheduler_thread = None
        self.job_counter = 0
        self.lock = threading.RLock()
    
    def schedule_job(self, job_function: Callable, interval_seconds: int, job_id: str = None, 
                    start_immediate: bool = False) -> str:
        """
        Schedule a new job.
        
        Args:
            job_function: Function to execute
            interval_seconds: Interval between executions in seconds
            job_id: Optional job identifier (auto-generated if not provided)
            start_immediate: If True, run the job immediately after scheduling
            
        Returns:
            str: Job identifier
        """
        with self.lock:
            # Generate job ID if not provided
            if job_id is None:
                self.job_counter += 1
                job_id = f"job_{self.job_counter}"
            
            # Create job
            job = ScheduledJob(job_id, job_function, interval_seconds)
            
            # Set next run time
            if not start_immediate:
                job.calculate_next_run()
            
            # Add to jobs dictionary
            self.jobs[job_id] = job
            logger.info(f"Scheduled {job}")
            
            # Run immediately if requested
            if start_immediate and self.running:
                self._run_job(job)
                
            return job_id
    
    def unschedule_job(self, job_id: str) -> bool:
        """
        Remove a scheduled job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            bool: True if job was removed, False if not found
        """
        with self.lock:
            if job_id in self.jobs:
                job = self.jobs[job_id]
                # Wait for job to finish if running
                if job.running and job.thread and job.thread.is_alive():
                    logger.info(f"Waiting for job {job_id} to complete before removing")
                    job.thread.join(timeout=30)  # Wait up to 30 seconds
                
                # Remove job
                del self.jobs[job_id]
                logger.info(f"Unscheduled job {job_id}")
                return True
            
            return False
    
    def start(self):
        """Start the scheduler."""
        if self.running:
            logger.warning("Scheduler is already running")
            return
        
        self.running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        logger.info("Scheduler started")
    
    def stop(self):
        """Stop the scheduler."""
        if not self.running:
            logger.warning("Scheduler is not running")
            return
        
        self.running = False
        
        # Wait for scheduler thread to terminate
        if self.scheduler_thread and self.scheduler_thread.is_alive():
            logger.info("Waiting for scheduler thread to terminate")
            self.scheduler_thread.join(timeout=5)
        
        logger.info("Scheduler stopped")
    
    def _scheduler_loop(self):
        """Main scheduler loop that checks and executes jobs."""
        logger.info("Scheduler loop started")
        
        while self.running:
            # Check all jobs
            self._check_jobs()
            
            # Sleep for a short time to avoid high CPU usage
            time.sleep(1)
    
    def _check_jobs(self):
        """Check if any jobs are due to run."""
        now = datetime.now()
        
        with self.lock:
            for job_id, job in list(self.jobs.items()):
                # Skip jobs that are currently running
                if job.running:
                    continue
                
                # Check if job is due to run
                if job.next_run <= now:
                    # Run job in a separate thread
                    self._run_job(job)
    
    def _run_job(self, job):
        """Run a job in a separate thread."""
        job.running = True
        job.last_run = datetime.now()
        job.thread = threading.Thread(target=self._execute_job, args=(job,))
        job.thread.daemon = True
        job.thread.start()
    
    def _execute_job(self, job):
        """Execute a job and handle any exceptions."""
        job_id = job.job_id
        try:
            logger.info(f"Starting job {job_id}")
            start_time = time.time()
            
            # Execute the job
            job.function()
            
            # Log completion time
            elapsed = time.time() - start_time
            logger.info(f"Job {job_id} completed successfully in {elapsed:.2f} seconds")
        except Exception as e:
            logger.error(f"Error in job {job_id}: {e}", exc_info=True)
        finally:
            # Calculate next run time and reset running flag
            with self.lock:
                if job_id in self.jobs:  # Check if job wasn't unscheduled during execution
                    job.calculate_next_run()
                    job.running = False
                    logger.info(f"Next run for job {job_id}: {job.next_run}")
