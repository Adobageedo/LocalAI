#!/usr/bin/env python3
"""
Email Synchronization Service
============================
This service automatically synchronizes emails from various providers (Gmail, Outlook)
for all authenticated users at regular intervals.

Main orchestration script that coordinates the scheduling and execution of sync jobs.
"""
import os
import sys
import time
import logging
import signal
import argparse
from pathlib import Path

# Add parent directory to path to allow imports from other modules
sys.path.append(str(Path(__file__).parent.parent))

from sync_service.core.sync_manager import SyncManager
from sync_service.scheduler.scheduler import ScheduledJobManager
from backend.core.config import load_config
from backend.core.logger import log

# Setup logging
logger = log.bind(name="backend.services.sync_service.main")

def handle_sigterm(signum, frame):
    """Handle termination signals gracefully."""
    logger.info("Received termination signal. Shutting down...")
    sys.exit(0)

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Email Synchronization Service')
    parser.add_argument(
        '--interval', 
        type=int, 
        default=5,
        help='Synchronization interval in minutes (default: 5)'
    )
    parser.add_argument(
        '--config', 
        type=str, 
        default=None,
        help='Path to configuration file'
    )
    parser.add_argument(
        '--debug', 
        action='store_true',
        help='Enable debug logging'
    )
    parser.add_argument(
        '--run-once', 
        action='store_true',
        help='Run synchronization once and exit'
    )
    return parser.parse_args()

def main():
    """Main entry point for the synchronization service."""
    args = parse_arguments()
    
    # Set log level based on arguments
    if args.debug:
        logger.setLevel(logging.DEBUG)
    
    logger.info(f"Starting Email Synchronization Service (interval: {args.interval} minutes)")
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)
    
    # Load configuration
    config = load_config(args.config)

    # Initialize sync manager
    sync_manager = SyncManager(config)
    
    if args.run_once:
        # Run synchronization once
        logger.info("Running single synchronization...")
        sync_manager.sync_all_users()
        logger.info("Synchronization complete. Exiting.")
        return
    
    # Initialize scheduler
    scheduler = ScheduledJobManager()
    
    # Schedule regular sync job (interval in minutes)
    interval_seconds = args.interval * 60
    scheduler.schedule_job(
        job_function=sync_manager.sync_all_users,
        interval_seconds=interval_seconds,
        start_immediate=True  # Run immediately at startup
    )
    
    # Start the scheduler
    try:
        scheduler.start()
        
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt. Shutting down...")
    finally:
        scheduler.stop()
        logger.info("Email Synchronization Service stopped.")

if __name__ == "__main__":
    main()
