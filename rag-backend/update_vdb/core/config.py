"""
Configuration module for update_vdb.
"""
import os
import yaml
from typing import Dict, Any, Optional

# Default configuration
DEFAULT_CONFIG = {
    'retrieval': {
        'vectorstore': {
            'collection': 'rag_documents1536',
            'url': 'http://qdrant:6333',
        },
        'embedding': {
            'model': 'sentence-transformers/all-MiniLM-L6-v2',
            'dimension': 384,
        },
    },
    'ingestion': {
        'supported_types': [
            '.pdf', '.docx', '.doc', '.txt', '.md', '.html', '.htm',
            '.csv', '.xls', '.xlsx', '.ppt', '.pptx', '.json', '.xml',
            '.rtf', '.odt', '.ods', '.odp'
        ],
        'chunk_size': 1000,
        'chunk_overlap': 200,
    }
}

# Path to the config file
CONFIG_PATH = os.environ.get('CONFIG_PATH', 'config.yaml')

def load_config() -> Dict[str, Any]:
    """
    Load configuration from file or return default config.
    
    Returns:
        Dict[str, Any]: Configuration dictionary
    """
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH, 'r') as f:
                config = yaml.safe_load(f)
                # Merge with defaults for any missing keys
                return _deep_merge(DEFAULT_CONFIG, config)
        return DEFAULT_CONFIG
    except Exception as e:
        print(f"Error loading config: {e}")
        return DEFAULT_CONFIG

def _deep_merge(default: Dict[str, Any], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries, with override taking precedence.
    
    Args:
        default: Default dictionary
        override: Override dictionary
        
    Returns:
        Dict[str, Any]: Merged dictionary
    """
    if override is None:
        return default
        
    result = default.copy()
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
            
    return result
