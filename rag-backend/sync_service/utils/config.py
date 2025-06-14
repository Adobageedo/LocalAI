"""
Configuration Utilities
======================
Utilities for loading and validating configuration.
"""
import os
import yaml
import logging
from typing import Dict, Any, List, Optional

from sync_service.utils.logger import setup_logger

# Setup logging
logger = setup_logger('sync_service.utils.config')

# Default configuration
DEFAULT_CONFIG = {
    'sync': {
        'gmail': {
            'enabled': True,
            'query': 'is:unread',
            'folders': ['INBOX', 'SENT'],
            'limit_per_folder': 50,
            'no_attachments': False,
            'force_reingest': False
        },
        'outlook': {
            'enabled': True,
            'query': 'isRead eq false',
            'folders': ['inbox', 'sentitems'],
            'limit_per_folder': 50,
            'no_attachments': False,
            'force_reingest': False
        }
    },
    'logging': {
        'level': 'INFO',
        'file': 'sync_service.log',
        'max_size_mb': 10,
        'backup_count': 5
    }
}

def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load configuration from file or use default.
    
    Args:
        config_path: Path to configuration file (YAML)
        
    Returns:
        dict: Configuration dictionary
    """
    config = DEFAULT_CONFIG.copy()
    
    # Check for environment variable with config path
    if not config_path and 'SYNC_CONFIG_PATH' in os.environ:
        config_path = os.environ['SYNC_CONFIG_PATH']
    
    # Try loading from specified path
    if config_path and os.path.exists(config_path):
        try:
            logger.info(f"Loading configuration from {config_path}")
            with open(config_path, 'r') as f:
                user_config = yaml.safe_load(f)
            
            # Merge user config with default
            if user_config:
                _merge_configs(config, user_config)
        except Exception as e:
            logger.error(f"Error loading configuration: {e}", exc_info=True)
    else:
        logger.info("Using default configuration")
    
    # Override with environment variables if present
    _override_from_env(config)
    
    return config

def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validate configuration structure.
    
    Args:
        config: Configuration dictionary
        
    Returns:
        bool: True if configuration is valid
    """
    # Check required sections
    required_sections = ['sync']
    for section in required_sections:
        if section not in config:
            logger.error(f"Missing required configuration section: {section}")
            return False
    
    # Check provider configurations
    for provider in ['gmail', 'outlook']:
        if provider not in config['sync']:
            logger.warning(f"Missing provider configuration for {provider}, using defaults")
            config['sync'][provider] = DEFAULT_CONFIG['sync'][provider]
    
    # All checks passed
    return True

def _merge_configs(base_config: Dict[str, Any], user_config: Dict[str, Any]) -> None:
    """
    Recursively merge user configuration into base configuration.
    
    Args:
        base_config: Base configuration to update
        user_config: User configuration to merge in
    """
    for key, value in user_config.items():
        if isinstance(value, dict) and key in base_config and isinstance(base_config[key], dict):
            # Recursive merge for nested dictionaries
            _merge_configs(base_config[key], value)
        else:
            # Direct override for other values
            base_config[key] = value

def _override_from_env(config: Dict[str, Any]) -> None:
    """
    Override configuration with environment variables.
    
    Args:
        config: Configuration dictionary to update
    """
    # Email limits
    if 'SYNC_GMAIL_LIMIT' in os.environ:
        try:
            limit = int(os.environ['SYNC_GMAIL_LIMIT'])
            config['sync']['gmail']['limit_per_folder'] = limit
            logger.info(f"Overriding Gmail limit from environment: {limit}")
        except ValueError:
            logger.warning(f"Invalid SYNC_GMAIL_LIMIT value: {os.environ['SYNC_GMAIL_LIMIT']}")
    
    if 'SYNC_OUTLOOK_LIMIT' in os.environ:
        try:
            limit = int(os.environ['SYNC_OUTLOOK_LIMIT'])
            config['sync']['outlook']['limit_per_folder'] = limit
            logger.info(f"Overriding Outlook limit from environment: {limit}")
        except ValueError:
            logger.warning(f"Invalid SYNC_OUTLOOK_LIMIT value: {os.environ['SYNC_OUTLOOK_LIMIT']}")
    
    # Provider enablement
    for provider in ['gmail', 'outlook']:
        env_var = f"SYNC_{provider.upper()}_ENABLED"
        if env_var in os.environ:
            enabled = os.environ[env_var].lower() in ('true', '1', 'yes')
            config['sync'][provider]['enabled'] = enabled
            logger.info(f"Overriding {provider} enabled status from environment: {enabled}")
    
    # Log level
    if 'SYNC_LOG_LEVEL' in os.environ:
        log_level = os.environ['SYNC_LOG_LEVEL'].upper()
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if log_level in valid_levels:
            config['logging']['level'] = log_level
            logger.info(f"Overriding log level from environment: {log_level}")
        else:
            logger.warning(f"Invalid SYNC_LOG_LEVEL value: {log_level}")
