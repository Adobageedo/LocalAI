import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from src.core.logger import log
from src.services.style_analysis.generate_style_profiles import StyleProfileGenerator

logger = log.bind(name="src.api.utils.get_style_analysis")

# Helper function for style analysis integration
async def get_user_style_context(user_id: str) -> str:
    """Fetch user's style analysis and format it for prompt integration"""
    if not user_id or user_id == "anonymous":
        return ""
    
    try:
        style_generator = StyleProfileGenerator()
        style_result = await style_generator.fetch_style_analysis(user_id)
        
        if style_result.get('success') and style_result.get('existing_profile'):
            style_analysis = style_result['existing_profile'].get('style_analysis')
            if style_analysis:
                return f"\n\nIMPORTANT - USER'S WRITING STYLE CONTEXT:\nPlease adapt your response to match the user's personal writing style described below:\n{style_analysis}\n\nEnsure your generated content reflects this style while maintaining the requested tone and language."
        
        logger.debug(f"No style analysis available for user {user_id}")
        return ""
        
    except Exception as e:
        logger.warning(f"Failed to fetch style analysis for user {user_id}: {str(e)}")
        return ""

