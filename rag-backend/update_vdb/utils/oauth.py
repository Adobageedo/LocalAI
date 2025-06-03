"""
OAuth utilities for Gmail and Outlook.
- Token loading/saving
- Service/client creation
- Device code flow (Outlook)
"""
import os
import pickle
from typing import Any, Optional

# Gmail example (Google API client required)
def load_gmail_token(token_path: str) -> Optional[Any]:
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            return pickle.load(token)
    return None

def save_gmail_token(token_path: str, creds: Any):
    with open(token_path, 'wb') as token:
        pickle.dump(creds, token)

# Outlook example (MSAL required)
def load_outlook_token(token_path: str) -> Optional[Any]:
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            return pickle.load(token)
    return None

def save_outlook_token(token_path: str, token_obj: Any):
    with open(token_path, 'wb') as token:
        pickle.dump(token_obj, token)
