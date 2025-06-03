"""
Centralized config loading for YAML and env vars.
"""
import os
import yaml
from functools import lru_cache

@lru_cache(maxsize=1)
def load_config(config_path: str = None) -> dict:
    """Load YAML config (default: ../config.yaml)."""
    if config_path is None:
        config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def get_env_var(name: str, default=None):
    return os.environ.get(name, default)
