import os
import yaml

def load_yaml_config(path):
    """Load a YAML config file from the given path."""
    with open(path, "r") as f:
        return yaml.safe_load(f)


def get_env_var(name, default=None, required=False):
    """Get an environment variable, with optional default and required flag."""
    value = os.getenv(name, default)
    if required and value is None:
        raise EnvironmentError(f"Required environment variable '{name}' is not set.")
    return value


def get_config_value(config, section, key=None, default=None):
    """Get a value from a config dict, optionally nested by section/key."""
    section_data = config.get(section, {})
    if key is None:
        return section_data
    return section_data.get(key, default)


def ensure_directory(path):
    """Create a directory if it doesn't exist."""
    os.makedirs(path, exist_ok=True)


def chunk_text(text, chunk_size=500, overlap=100):
    """Split text into chunks of chunk_size with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks
