import asyncio
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
import asyncpg
from asyncpg import Pool, Connection
import redis.asyncio as redis
from datetime import datetime
import json

from app.config import get_settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self._pg_pool: Optional[Pool] = None
        self._redis_pool: Optional[redis.Redis] = None
        self._is_initialized = False

    async def initialize(self) -> None:
        """Initialize database connections"""
        if self._is_initialized:
            return
            
        try:
            # Initialize PostgreSQL connection pool
            self._pg_pool = await asyncpg.create_pool(
                self.settings.postgres_dsn,
                min_size=5,
                max_size=self.settings.database_pool_size,
                command_timeout=30,
                server_settings={
                    'jit': 'off',
                    'application_name': 'credential_hub'
                }
            )
            
            # Test PostgreSQL connection
            async with self._pg_pool.acquire() as conn:
                await conn.execute("SELECT 1")
                logger.info("PostgreSQL connection established")
            
            # Initialize Redis connection
            self._redis_pool = redis.from_url(
                self.settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            
            # Test Redis connection
            await self._redis_pool.ping()
            logger.info("Redis connection established")
            
            # Run database migrations
            await self._run_migrations()
            
            self._is_initialized = True
            logger.info("Database manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database manager: {e}")
            await self.close()
            raise

    async def close(self) -> None:
        """Close all database connections"""
        try:
            if self._pg_pool:
                await self._pg_pool.close()
                logger.info("PostgreSQL pool closed")
                
            if self._redis_pool:
                await self._redis_pool.close()
                logger.info("Redis connection closed")
                
            self._is_initialized = False
            
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")

    @asynccontextmanager
    async def get_postgres_connection(self):
        """Get a PostgreSQL connection from the pool"""
        if not self._is_initialized:
            raise RuntimeError("Database manager not initialized")
            
        async with self._pg_pool.acquire() as conn:
            yield conn

    @property
    def redis(self) -> redis.Redis:
        """Get Redis connection"""
        if not self._is_initialized:
            raise RuntimeError("Database manager not initialized")
        return self._redis_pool

    async def _run_migrations(self) -> None:
        """Run database migrations"""
        try:
            async with self._pg_pool.acquire() as conn:
                # Create migrations table if it doesn't exist
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS migrations (
                        id SERIAL PRIMARY KEY,
                        version VARCHAR(255) UNIQUE NOT NULL,
                        description TEXT,
                        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                # Get list of applied migrations
                applied = await conn.fetch("SELECT version FROM migrations ORDER BY id")
                applied_versions = {row['version'] for row in applied}
                
                # Run pending migrations
                for migration in self._get_migrations():
                    if migration['version'] not in applied_versions:
                        logger.info(f"Running migration {migration['version']}: {migration['description']}")
                        
                        async with conn.transaction():
                            # Execute migration
                            await conn.execute(migration['sql'])
                            
                            # Record migration
                            await conn.execute(
                                "INSERT INTO migrations (version, description) VALUES ($1, $2)",
                                migration['version'], migration['description']
                            )
                        
                        logger.info(f"Migration {migration['version']} completed successfully")
                
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise

    def _get_migrations(self) -> List[Dict[str, str]]:
        """Get list of database migrations"""
        return [
            {
                'version': '001_initial_schema',
                'description': 'Create initial schema for proofs and circuits',
                'sql': '''
                    -- Enable UUID extension
                    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
                    
                    -- Credentials table
                    CREATE TABLE IF NOT EXISTS credentials (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        context JSONB NOT NULL,
                        type JSONB NOT NULL,
                        issuer TEXT NOT NULL,
                        issuance_date TIMESTAMP WITH TIME ZONE NOT NULL,
                        expiration_date TIMESTAMP WITH TIME ZONE,
                        credential_subject JSONB NOT NULL,
                        proof JSONB,
                        status JSONB,
                        anchor_metadata JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    
                    -- Proofs table
                    CREATE TABLE IF NOT EXISTS proofs (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        credential_id UUID NOT NULL,
                        proof_type VARCHAR(50) NOT NULL,
                        proof_value JSONB NOT NULL,
                        public_inputs JSONB NOT NULL,
                        circuit_id VARCHAR(255),
                        challenge TEXT,
                        nonce TEXT,
                        anchor_metadata JSONB DEFAULT '{}'::jsonb,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        verified_at TIMESTAMP WITH TIME ZONE,
                        is_valid BOOLEAN,
                        metadata JSONB DEFAULT '{}'::jsonb
                    );
                    
                    -- Circuit configurations table
                    CREATE TABLE IF NOT EXISTS circuits (
                        circuit_id VARCHAR(255) PRIMARY KEY,
                        wasm_path TEXT NOT NULL,
                        zkey_path TEXT NOT NULL,
                        verification_key_path TEXT NOT NULL,
                        description TEXT DEFAULT '',
                        max_attributes INTEGER DEFAULT 10,
                        security_level INTEGER DEFAULT 128,
                        trusted_setup_hash TEXT,
                        file_hashes JSONB DEFAULT '{}'::jsonb,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    
                    -- Proof verification results table
                    CREATE TABLE IF NOT EXISTS proof_verifications (
                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                        proof_id UUID REFERENCES proofs(id) ON DELETE CASCADE,
                        verification_checks JSONB NOT NULL,
                        is_valid BOOLEAN NOT NULL,
                        verifier_id TEXT,
                        verification_time_ms INTEGER,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    
                    -- Rate limiting table
                    CREATE TABLE IF NOT EXISTS rate_limits (
                        identifier TEXT PRIMARY KEY,
                        request_count INTEGER DEFAULT 0,
                        window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                '''
            }
        ]


# Global database manager instance
db_manager = DatabaseManager()


async def init_database() -> DatabaseManager:
    """Initialize the global database manager"""
    await db_manager.initialize()
    return db_manager


async def close_database() -> None:
    """Close the global database manager"""
    await db_manager.close()


def get_db_manager() -> DatabaseManager:
    """Get the global database manager"""
    return db_manager 
