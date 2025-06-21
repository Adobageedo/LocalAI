"""
PostgreSQL Database Manager and Models
This module provides classes to interact with PostgreSQL database tables
defined in the schema: users, conversations, and chat_messages.
"""

import os
import sys
# Ajouter le chemin du projet pour les imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))  
import json
from typing import List, Dict, Any, Optional, Union
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor, DictCursor, register_uuid
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from backend.core.constants import POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
from backend.core.logger import log
# Set up logger
logger = log.bind(name="backend.services.db.postgres_manager")

# Get database configuration from environment variables
DB_NAME = POSTGRES_DB
DB_USER = POSTGRES_USER
DB_PASSWORD = POSTGRES_PASSWORD
DB_HOST = POSTGRES_HOST
DB_PORT = POSTGRES_PORT
# Connection pool size
MIN_CONN = 1
MAX_CONN = 10

class PostgresManager:
    """
    Manager for PostgreSQL database connections and operations.
    Uses a connection pool for efficient database access.
    """
    _instance = None
    _pool = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PostgresManager, cls).__new__(cls)
            cls._setup_connection_pool()
        return cls._instance
    
    @classmethod
    def _setup_connection_pool(cls):
        """Initialize the database connection pool"""
        try:
            # Register UUID type for proper handling
            register_uuid()
            
            # Create connection pool
            cls._pool = SimpleConnectionPool(
                MIN_CONN, MAX_CONN,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                host=DB_HOST,
                port=DB_PORT
            )
            logger.info("PostgreSQL connection pool created successfully")
            return True
        except psycopg2.OperationalError as oe:
            # This typically indicates connection issues (wrong host, port, credentials)
            logger.error(f"PostgreSQL connection failed: {str(oe)}")
            logger.error("Check if PostgreSQL server is running and accessible")
            logger.error(f"Using connection parameters - Host: {DB_HOST}, Port: {DB_PORT}, DB: {DB_NAME}, User: {DB_USER}")
            return False
        except Exception as e:
            logger.error(f"Error creating PostgreSQL connection pool: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            return False
    
    @contextmanager
    def get_connection(self):
        """Get a connection from the pool with context manager support"""
        connection = None
        try:
            connection = self._pool.getconn()
            yield connection
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            raise
        finally:
            if connection:
                self._pool.putconn(connection)
    
    @contextmanager
    def get_cursor(self, cursor_factory=RealDictCursor):
        """Get a database cursor with context manager support"""
        with self.get_connection() as conn:
            cursor = None
            try:
                cursor = conn.cursor(cursor_factory=cursor_factory)
                yield cursor
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Database query error: {str(e)}")
                raise
            finally:
                if cursor:
                    cursor.close()
    
    def execute_query(self, query, params=None, fetch_one=False):
        """Execute a database query and return results"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            
            # For INSERT, UPDATE, DELETE statements (that don't return results),
            # don't try to fetch any results - just return None
            if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                return None
                
            # Only try to fetch results for SELECT-type queries
            if fetch_one:
                return cursor.fetchone()
            return cursor.fetchall()
    
    def execute_many(self, query, params_list):
        """Execute a query with multiple parameter sets"""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(query, params_list)
                conn.commit()
    
    def close_pool(self):
        """Close all connections in the pool"""
        if self._pool:
            self._pool.closeall()
            logger.info("Closed all database connections")
