#!/usr/bin/env python3
"""
Test PostgreSQL Connection
This script tests the connection to PostgreSQL using the same parameters as the main application.
"""

import os
import sys
import psycopg2
from pathlib import Path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))  

# Load environment variables from .env file
from backend.core.logger import log
logger = log.bind(name="backend.services.db.test_postgres_connection")
logger.info(f"Loaded environment from: {os.path.abspath('.env') if os.path.exists('.env') else 'No .env file found'}")

from backend.core.constants import POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
# Get database configuration from environment variables
DB_NAME = POSTGRES_DB
DB_USER = POSTGRES_USER
DB_PASSWORD = POSTGRES_PASSWORD
DB_HOST = POSTGRES_HOST
DB_PORT = POSTGRES_PORT

# Log connection parameters (masking password)
logger.info("PostgreSQL connection parameters:")
logger.info(f"DB_NAME: {DB_NAME}")
logger.info(f"DB_USER: {DB_USER}")
logger.info(f"DB_HOST: {DB_HOST}")
logger.info(f"DB_PORT: {DB_PORT}")
logger.info(f"Current working directory: {os.getcwd()}")

def test_direct_connection():
    """Test a direct connection to PostgreSQL without connection pool"""
    logger.info("Testing direct connection to PostgreSQL...")
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        logger.info("✅ Connection successful!")
        
        # List all tables in the database
        cursor = conn.cursor()
        logger.info("Listing all tables in the database:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        if tables:
            logger.info(f"Found {len(tables)} tables:")
            for table in tables:
                logger.info(f"  - {table[0]}")
        else:
            logger.info("No tables found in the database.")
        
        # Test query to check if required table exists
        cursor = conn.cursor()
        cursor.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_ingestion_limits')")
        exists = cursor.fetchone()[0]
        if exists:
            logger.info("✅ Table 'user_ingestion_limits' exists")
            
            # Check table structure
            cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_ingestion_limits'")
            columns = cursor.fetchall()
            logger.info("Table structure:")
            for column in columns:
                logger.info(f"  - {column[0]} ({column[1]})")
            
            # Check if any rows exist
            cursor.execute("SELECT COUNT(*) FROM user_ingestion_limits")
            count = cursor.fetchone()[0]
            logger.info(f"Table has {count} rows")
        else:
            logger.error("❌ Table 'user_ingestion_limits' does not exist!")
            logger.info("Creating the table with default schema...")
            try:
                cursor.execute("""
                    CREATE TABLE user_ingestion_limits (
                        user_id VARCHAR(255) PRIMARY KEY,
                        total_credits INTEGER NOT NULL DEFAULT 100,
                        used_credits INTEGER NOT NULL DEFAULT 0,
                        max_document_age_days INTEGER NOT NULL DEFAULT 90,
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                """)
                conn.commit()
                logger.info("✅ Table 'user_ingestion_limits' created successfully")
            except Exception as e:
                logger.error(f"Failed to create table: {e}")
        
        cursor.close()
        conn.close()
        return True
    except psycopg2.OperationalError as e:
        logger.error(f"❌ Connection failed: {e}")
        logger.error("Common solutions:")
        logger.error(" 1. Check if PostgreSQL is running")
        logger.error(" 2. Verify hostname/port are correct")
        logger.error(" 3. Confirm database name exists")
        logger.error(" 4. Check username/password")
        logger.error(" 5. Make sure PostgreSQL allows connections from this host")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_direct_connection()
    sys.exit(0 if success else 1)
