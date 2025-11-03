# Adapters Changelog

This file tracks modifications made to adapter files in the `/backend/core/adapters` directory.

## Modifications Log

| Date | provider | user_id | Type |
|------|------|--------|-------------|
| 2025-07-12 | onedrive_files.py | Edoardo | Added date filtering functionality to limit ingestion to files created/modified in last N days |
| 2025-07-12 | google_drive.py | Edoardo | Added date filtering functionality to limit ingestion to files created/modified in last N days |
| 2025-07-12 | microsoft_email.py | Edoardo | Fixed UnboundLocalError by initializing missing_scopes variable before use |
| 2025-07-12 | onedrive_files.py | Edoardo | Enhanced directory structure caching with 24-hour expiration |
| 2025-07-12 | google_drive.py | Edoardo | Enhanced directory structure caching with 24-hour expiration |

## How to Use This Changelog

When making changes to any adapter file, please add a new row to the table above with the following information:

1. **Date**: The date the change was made (YYYY-MM-DD format)
2. **provider**: The name of the provider that was modified gdrive, gmail, outlook, onedrive, personal-storage, google calendar, outlook calendar
3. **user_id**: The user_id of the user that was modified
4. **Type**: The type of change that was made (add, remove, modify etc...)

