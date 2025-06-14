"""
Logging Utilities
================
Centralized logging configuration for the synchronization service.
"""
import os
import sys
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

# Default log directory
LOG_DIR = Path(__file__).parent.parent.parent / 'logs'
DEFAULT_LOG_FILE = LOG_DIR / 'sync_service.log'

def setup_logger(name, log_file=None, level=logging.INFO):
    """
    Setup a logger with consistent formatting and handlers.
    
    Args:
        name: Logger name
        log_file: Log file path (default: logs/sync_service.log)
        level: Logging level
        
    Returns:
        logging.Logger: Configured logger
    """
    # Ensure log directory exists
    if not LOG_DIR.exists():
        LOG_DIR.mkdir(parents=True, exist_ok=True)
    
    # Use default log file if not specified
    if log_file is None:
        log_file = DEFAULT_LOG_FILE
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent adding handlers multiple times
    if logger.handlers:
        return logger
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # Create file handler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s', 
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Add formatter to handlers
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger
