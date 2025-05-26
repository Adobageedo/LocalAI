import os
import yaml

CONFIG_PATH = os.getenv("RAG_CONFIG_PATH", os.path.join(os.path.dirname(__file__), "../config.yaml"))

_config_cache = None

def load_config():
    global _config_cache
    if _config_cache is not None:
        return _config_cache
    with open(CONFIG_PATH, "r") as f:
        _config_cache = yaml.safe_load(f)
    return _config_cache

def get_config(section, default=None):
    config = load_config()
    return config.get(section, default)
