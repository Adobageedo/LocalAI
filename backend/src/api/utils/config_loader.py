"""
Configuration loader utility for API routes.
Provides easy access to route-specific configurations from config.yaml.
"""

import os
import yaml
from typing import Dict, Any, Optional
from functools import lru_cache

class APIConfigLoader:
    """Utility class to load and access API route configurations."""
    
    def __init__(self):
        self._config = None
        self._config_path = os.path.join(
            os.path.dirname(__file__), 
            '..', '..', 'core', 'config.yaml'
        )
    
    @property
    def config(self) -> Dict[str, Any]:
        """Load and cache the configuration."""
        if self._config is None:
            try:
                with open(self._config_path, 'r', encoding='utf-8') as f:
                    self._config = yaml.safe_load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
                self._config = {}
        return self._config
    
    def get_global_config(self) -> Dict[str, Any]:
        """Get global API configuration."""
        return self.config.get('api_routes', {}).get('global', {})
    
    def get_outlook_config(self, route_name: str = None) -> Dict[str, Any]:
        """Get Outlook-specific configuration."""
        outlook_config = self.config.get('api_routes', {}).get('outlook', {})
        if route_name:
            return outlook_config.get(route_name, {})
        return outlook_config
    
    def get_gmail_config(self, route_name: str = None) -> Dict[str, Any]:
        """Get Gmail-specific configuration."""
        gmail_config = self.config.get('api_routes', {}).get('gmail', {})
        if route_name:
            return gmail_config.get(route_name, {})
        return gmail_config
    
    def get_health_config(self) -> Dict[str, Any]:
        """Get health check configuration."""
        return self.config.get('api_routes', {}).get('health', {})
    
    def get_style_analyzer_config(self) -> Dict[str, Any]:
        """Get style analyzer configuration."""
        return self.config.get('style_analyzer', {})
    
    # Route-specific helper methods
    def get_compose_config(self) -> Dict[str, Any]:
        """Get compose route configuration with defaults."""
        config = self.get_outlook_config('compose')
        global_config = self.get_global_config()
        
        # Merge with global defaults
        return {
            'default_model': config.get('default_model', 'gpt-4'),
            'default_temperature': config.get('default_temperature', 0.7),
            'correction_temperature': config.get('correction_temperature', 0.3),
            'reformulation_temperature': config.get('reformulation_temperature', 0.5),
            'default_use_rag': config.get('default_use_rag', True),
            'max_content_length': config.get('max_content_length', 5000),
            'enable_style_analysis': config.get('enable_style_analysis', 
                                              global_config.get('enable_style_analysis', True)),
            'timeout': config.get('timeout', global_config.get('request_timeout', 300))
        }
    
    def get_email_template_config(self) -> Dict[str, Any]:
        """Get email template route configuration with defaults."""
        config = self.get_outlook_config('email_template')
        global_config = self.get_global_config()
        
        return {
            'default_model': config.get('default_model', 'gpt-4'),
            'default_temperature': config.get('default_temperature', 0.7),
            'default_use_rag': config.get('default_use_rag', True),
            'max_template_length': config.get('max_template_length', 3000),
            'enable_style_analysis': config.get('enable_style_analysis', 
                                              global_config.get('enable_style_analysis', True)),
            'timeout': config.get('timeout', global_config.get('request_timeout', 300)),
            'include_profile_context': config.get('include_profile_context', True)
        }
    
    def get_summarize_config(self) -> Dict[str, Any]:
        """Get summarize route configuration with defaults."""
        config = self.get_outlook_config('summarize')
        global_config = self.get_global_config()
        
        return {
            'default_model': config.get('default_model', 'gpt-4'),
            'default_temperature': config.get('default_temperature', 0.3),
            'supported_types': config.get('supported_types', 
                                        ['concise', 'detailed', 'bullet_points', 'action_items']),
            'max_input_length': config.get('max_input_length', 50000),
            'max_summary_length': config.get('max_summary_length', 2000),
            'enable_style_analysis': config.get('enable_style_analysis', 
                                              global_config.get('enable_style_analysis', True)),
            'timeout': config.get('timeout', global_config.get('request_timeout', 300)),
            'supported_formats': config.get('supported_formats', 
                                           ['text', 'pdf', 'docx', 'xlsx', 'pptx'])
        }
    
    def get_auth_config(self, provider: str = 'outlook') -> Dict[str, Any]:
        """Get authentication configuration for specified provider."""
        if provider.lower() == 'gmail':
            config = self.get_gmail_config('auth')
            default_scopes = ["https://www.googleapis.com/auth/gmail.readonly", 
                            "https://www.googleapis.com/auth/gmail.send"]
        else:
            config = self.get_outlook_config('auth')
            default_scopes = ["https://graph.microsoft.com/Mail.Read", 
                            "https://graph.microsoft.com/Mail.Send"]
        
        return {
            'token_lifetime': config.get('token_lifetime', 3600),
            'auto_refresh': config.get('auto_refresh', True),
            'timeout': config.get('timeout', 30),
            'required_scopes': config.get('required_scopes', default_scopes)
        }


# Global instance for easy access
@lru_cache(maxsize=1)
def get_api_config() -> APIConfigLoader:
    """Get cached instance of APIConfigLoader."""
    return APIConfigLoader()


# Convenience functions for direct access
def get_compose_config() -> Dict[str, Any]:
    """Get compose route configuration."""
    return get_api_config().get_compose_config()

def get_email_template_config() -> Dict[str, Any]:
    """Get email template route configuration."""
    return get_api_config().get_email_template_config()

def get_summarize_config() -> Dict[str, Any]:
    """Get summarize route configuration."""
    return get_api_config().get_summarize_config()

def get_auth_config(provider: str = 'outlook') -> Dict[str, Any]:
    """Get authentication configuration."""
    return get_api_config().get_auth_config(provider)

def get_style_analyzer_config() -> Dict[str, Any]:
    """Get style analyzer configuration."""
    return get_api_config().get_style_analyzer_config()

def is_style_analysis_enabled(route_name: str = None) -> bool:
    """Check if style analysis is enabled for a specific route or globally."""
    config_loader = get_api_config()
    global_config = config_loader.get_global_config()
    
    if route_name:
        if route_name == 'compose':
            route_config = config_loader.get_compose_config()
        elif route_name == 'email_template':
            route_config = config_loader.get_email_template_config()
        elif route_name == 'summarize':
            route_config = config_loader.get_summarize_config()
        else:
            route_config = {}
        
        return route_config.get('enable_style_analysis', 
                               global_config.get('enable_style_analysis', True))
    
    return global_config.get('enable_style_analysis', True)
