#!/usr/bin/env python3
"""
Compatibility module for email ingestion.
This module re-exports the fetch_and_sync_emails function from email_ingest_new.py
to maintain compatibility with existing code.
"""

import sys
import os
import logging

# Configure logging
logger = logging.getLogger("rag-backend.email_ingest")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

try:
    # Import from the new module using the full path
    from update_vdb.sources.email_ingest_new import fetch_and_sync_emails
    logger.info("Successfully imported fetch_and_sync_emails from email_ingest_new")
except ImportError as e:
    logger.error(f"Failed to import from email_ingest_new: {str(e)}")
    
    # Try a relative import as fallback
    try:
        # Try to import from the same directory
        import os
        import sys
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if current_dir not in sys.path:
            sys.path.append(current_dir)
        from email_ingest_new import fetch_and_sync_emails
        logger.info("Successfully imported fetch_and_sync_emails using relative path")
    except ImportError as e2:
        logger.error(f"Failed to import using relative path: {str(e2)}")
    
    # Define a fallback function in case the import fails
    def fetch_and_sync_emails(method, **kwargs):
        """
        Fallback function when email_ingest_new.py is not available.
        """
        logger.error("fetch_and_sync_emails is not available because email_ingest_new.py could not be imported")
        return {
            "method": method,
            "collection": kwargs.get('collection_name', 'unknown'),
            "user": kwargs.get('user', 'unknown'),
            "success": False,
            "emails_processed": 0,
            "emails_ingested": 0,
            "bodies_ingested": 0,
            "attachments_processed": 0,
            "attachments_ingested": 0,
            "error": "Module email_ingest_new.py not found"
        }

# Re-export the function
__all__ = ['fetch_and_sync_emails']

if __name__ == "__main__":
    print("This module is for compatibility only. Please use email_ingest_new.py directly.")
