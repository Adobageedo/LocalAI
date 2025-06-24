# /backend/backend/services/sync_service/scheduled_sync_service.py

import time
import signal
import threading
from datetime import datetime
import json
import os

from backend.services.sync_service.scheduler.scheduler import ScheduledJobManager
from backend.services.sync_service.core.sync_manager import SyncManager
from backend.services.db.models import SyncStatus
from backend.core.logger import log

logger = log.bind(name="backend.services.sync_service.scheduled")

# Global metrics storage
metrics = {
    "total_jobs_run": 0,
    "successful_jobs": 0,
    "failed_jobs": 0,
    "last_run_time": None,
    "last_run_duration": 0,
    "avg_duration": 0,
    "total_documents_processed": 0,
    "sync_history": [],
    "active_sync": None
}

metrics_lock = threading.RLock()
METRICS_FILE = os.environ.get("METRICS_FILE", "/app/data/sync_metrics.json")


def save_metrics():
    """Save metrics to file for persistence"""
    with metrics_lock:
        with open(METRICS_FILE, 'w') as f:
            json.dump(metrics, f, default=str)


def load_metrics():
    """Load metrics from file if exists"""
    global metrics
    try:
        if os.path.exists(METRICS_FILE):
            with open(METRICS_FILE, 'r') as f:
                loaded_metrics = json.load(f)
                metrics.update(loaded_metrics)
                logger.info(f"Loaded metrics from {METRICS_FILE}")
    except Exception as e:
        logger.error(f"Error loading metrics: {e}")


def run_sync_with_metrics():
    """Run sync job with metrics collection"""
    global metrics
    
    # Update metrics
    with metrics_lock:
        metrics["total_jobs_run"] += 1
        metrics["last_run_time"] = datetime.now()
        metrics["active_sync"] = {
            "start_time": datetime.now(),
            "status": "running"
        }
        save_metrics()
    
    start_time = time.time()
    sync_manager = SyncManager()
    
    try:
        # Run the sync job
        logger.info("Starting scheduled sync job")
        result = sync_manager.run_all_sync_jobs()
        
        # Update metrics on success
        with metrics_lock:
            duration = time.time() - start_time
            metrics["successful_jobs"] += 1
            metrics["last_run_duration"] = duration
            
            # Update average duration
            total_successful = metrics["successful_jobs"]
            if total_successful == 1:
                metrics["avg_duration"] = duration
            else:
                metrics["avg_duration"] = (metrics["avg_duration"] * (total_successful - 1) + duration) / total_successful
            
            # Get counts from result if available
            if isinstance(result, dict) and "documents_processed" in result:
                metrics["total_documents_processed"] += result["documents_processed"]
            
            # Add to history (keep last 20 entries)
            metrics["sync_history"].append({
                "time": datetime.now(),
                "duration": duration,
                "success": True,
                "documents": result.get("documents_processed", 0) if isinstance(result, dict) else 0
            })
            
            if len(metrics["sync_history"]) > 20:
                metrics["sync_history"] = metrics["sync_history"][-20:]
            
            metrics["active_sync"] = None
            save_metrics()
        
        logger.info(f"Scheduled sync completed successfully in {duration:.2f}s")
        return result
        
    except Exception as e:
        # Update metrics on failure
        with metrics_lock:
            duration = time.time() - start_time
            metrics["failed_jobs"] += 1
            metrics["last_run_duration"] = duration
            
            # Add to history
            metrics["sync_history"].append({
                "time": datetime.now(),
                "duration": duration,
                "success": False,
                "error": str(e)
            })
            
            if len(metrics["sync_history"]) > 20:
                metrics["sync_history"] = metrics["sync_history"][-20:]
            
            metrics["active_sync"] = None
            save_metrics()
        
        logger.error(f"Scheduled sync failed: {e}", exc_info=True)
        raise


def get_sync_metrics():
    """Return current metrics - can be used by API endpoints"""
    with metrics_lock:
        # Add active sync operations from database
        active_syncs = SyncStatus.get_active_syncs()
        
        # Return a copy to avoid threading issues
        result = metrics.copy()
        result["active_db_syncs"] = [sync.to_dict() for sync in active_syncs]
        
        return result


def start_scheduled_sync():
    """Start the scheduled sync service with monitoring"""
    # Load previous metrics if available
    load_metrics()
    
    # Create scheduler
    job_manager = ScheduledJobManager()
    
    # Start scheduler
    job_manager.start()
    
    # Schedule sync job to run every 30 minutes (1800 seconds)
    job_manager.schedule_job(
        job_function=run_sync_with_metrics,
        interval_seconds=1800,
        job_id="regular_sync_job",
        start_immediate=True  # Run immediately on startup
    )
    
    # Schedule metrics saving every 5 minutes
    job_manager.schedule_job(
        job_function=save_metrics,
        interval_seconds=300,
        job_id="metrics_save_job",
        start_immediate=False
    )
    
    logger.info("Scheduled sync service started with metrics collection")
    return job_manager


if __name__ == "__main__":
    scheduler = start_scheduled_sync()
    
    # Handle shutdown gracefully
    def signal_handler(sig, frame):
        logger.info("Shutting down scheduled sync service...")
        scheduler.stop()
        save_metrics()
        exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Keep the script running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)