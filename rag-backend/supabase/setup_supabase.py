"""
Setup script for Supabase integration using the official supabase-py client.
This script demonstrates connecting to Supabase and running a migration.
"""
import os
from supabase import create_client, Client
import yaml
from dotenv import load_dotenv

load_dotenv()

# Load config from env or YAML
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
if not (SUPABASE_URL and SUPABASE_KEY):
    try:
        with open('supabase/supabase_config.yaml') as f:
            config = yaml.safe_load(f)
            SUPABASE_URL = SUPABASE_URL or config.get('url')
            SUPABASE_KEY = SUPABASE_KEY or config.get('service_key')
    except Exception:
        pass

if not (SUPABASE_URL and SUPABASE_KEY):
    raise RuntimeError("Supabase URL and service key must be set via .env or supabase_config.yaml")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Supabase client initialized.")
# Example: list tables
try:
    response = supabase.table('documents').select('*').limit(1).execute()
    print("Connection and test query to 'documents' table successful.")
except Exception as e:
    print("Test query failed:", e)

# Migration logic could go here (e.g., via REST API or SQL RPC call)
# See migration.sql for schema to apply manually or via Supabase Studio.
