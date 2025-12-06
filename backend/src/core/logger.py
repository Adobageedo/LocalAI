"""
Configuration de logging pour le src.
"""

import logging
import sys
from loguru import logger
import json

from .constants import BASE_DIR

# Configuration
LOG_LEVEL = logging.DEBUG
LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"

# Répertoire pour les logs
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "src.log"


class InterceptHandler(logging.Handler):
    """
    Intercepteur pour rediriger les logs de la bibliothèque logging vers loguru
    """
    
    def emit(self, record):
        # Récupérer le message original
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
            
        # Trouver l'appelant
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
            
        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging():
    """
    Configure le système de logging
    """
    # Supprimer tous les handlers par défaut
    logging.root.handlers = []
    
    # Configurer loguru
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout, 
                "format": LOG_FORMAT,
                "level": LOG_LEVEL,
                "colorize": True,
            },
            {
                "sink": LOG_FILE,
                "format": LOG_FORMAT,
                "level": LOG_LEVEL,
                "rotation": "10 MB",
                "retention": "1 week",
                "compression": "zip",
            }
        ],
        levels=[{"name": "DEBUG"}]
    )
    
    # Intercepter les logs de logging standard
    logging.basicConfig(handlers=[InterceptHandler()], level=LOG_LEVEL, force=True)
    
    # Configurer les loggers spécifiques
    for logger_name in ("uvicorn", "uvicorn.error", "fastapi"):
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False
    
    # Configuration des logs pour supprimer les messages de débogage des bibliothèques HTTP
    noisy_loggers = [
        "httpx", "httpcore", "httpcore.http11", "httpcore.connection",
        "urllib3.connectionpool", "urllib3", "openai._base_client", 
        "unstructured.trace", "chardet.universaldetector",
        "chardet.charsetprober", "chardet", "cachecontrol.controller",
        "python_multipart.multipart", "msal", "google.auth", "googleapiclient",
        "pdfminer", "pytesseract"
    ]
    
    for logger_name in noisy_loggers:
        logging.getLogger(logger_name).setLevel(logging.WARNING)
        
    return logger


# Exporter le logger configuré
log = setup_logging()


class JSONLogFormatter:
    """
    Formateur pour logs au format JSON
    """
    def __init__(self):
        self.fmt = {
            "timestamp": "{time:YYYY-MM-DD HH:mm:ss.SSS}",
            "level": "{level}",
            "message": "{message}",
            "module": "{name}",
            "function": "{function}",
            "line": "{line}"
        }
        
    def format(self, record):
        log_dict = {k: getattr(record, v) for k, v in self.fmt.items() if hasattr(record, v)}
        return json.dumps(log_dict)
