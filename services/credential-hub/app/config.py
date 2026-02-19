import os
from typing import Optional, List
from pydantic import validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application settings
    app_name: str = "Credential Hub"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "production"
    
    # Database settings
    postgres_dsn: str = "postgresql://localhost:5432/credential_hub"
    database_pool_size: int = 20
    database_max_overflow: int = 30
    database_pool_timeout: int = 30
    database_pool_recycle: int = 3600
    
    # Redis settings
    redis_url: str = "redis://localhost:6379"
    redis_max_connections: int = 20
    redis_socket_timeout: int = 5
    redis_socket_connect_timeout: int = 5
    
    # ClickHouse settings
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "credential_hub"
    
    # Proof service settings
    circuits_dir: str = "circuits"
    node_path: str = "node"
    proof_cache_ttl: int = 3600  # 1 hour
    rate_limit_per_minute: int = 60
    max_proof_generation_time: int = 60
    max_verification_time: int = 30
    
    # Security settings
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    proof_nonce_ttl: int = 86400  # 24 hours
    
    # Circuit settings
    max_circuit_attributes: int = 100
    trusted_setup_verification: bool = True
    circuit_integrity_check: bool = True
    circuit_cache_ttl: int = 3600
    
    # Monitoring settings
    metrics_enabled: bool = True
    metrics_port: int = 9090
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Performance settings
    temp_dir: str = "/tmp/zkp_proofs"
    max_concurrent_proofs: int = 10
    cleanup_interval: int = 300  # 5 minutes
    
    # Resource limits
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    max_memory_usage: int = 2 * 1024 * 1024 * 1024  # 2GB
    
    # API settings
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Credential Hub"
    version: str = "0.1.0"
    description: str = "FastAPI service for credential management with SnarkJS integration"

    # Optional anchoring integration settings
    anchor_submit_url: Optional[str] = None
    anchor_api_key: str = ""
    
    # CORS settings
    backend_cors_origins: list = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    @validator("postgres_dsn")
    def validate_postgres_dsn(cls, v):
        if not v.startswith(("postgresql://", "postgres://")):
            raise ValueError("Database URL must be a PostgreSQL connection string")
        return v
    
    @validator("redis_url")
    def validate_redis_url(cls, v):
        if not v.startswith("redis://"):
            raise ValueError("Redis URL must start with redis://")
        return v
    
    @validator("log_level")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v.upper()
    
    @validator("environment")
    def validate_environment(cls, v):
        valid_envs = ["development", "testing", "staging", "production"]
        if v not in valid_envs:
            raise ValueError(f"Environment must be one of {valid_envs}")
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in production"""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development"""
        return self.environment == "development"


class CircuitSettings:
    """Circuit-specific settings"""
    
    DEFAULT_CIRCUITS = {
        "selective-disclosure": {
            "description": "Selective disclosure circuit for credential attributes",
            "max_attributes": 20,
            "security_level": 128,
            "files": {
                "wasm": "circuit.wasm",
                "zkey": "circuit_final.zkey",
                "vkey": "verification_key.json"
            }
        },
        "age-verification": {
            "description": "Age verification circuit",
            "max_attributes": 5,
            "security_level": 128,
            "files": {
                "wasm": "age_circuit.wasm",
                "zkey": "age_circuit_final.zkey",
                "vkey": "age_verification_key.json"
            }
        },
        "identity-proof": {
            "description": "Identity proof circuit",
            "max_attributes": 15,
            "security_level": 256,
            "files": {
                "wasm": "identity_circuit.wasm",
                "zkey": "identity_circuit_final.zkey",
                "vkey": "identity_verification_key.json"
            }
        }
    }


class DatabaseSettings:
    """Database configuration settings"""
    
    @staticmethod
    def get_postgres_config(settings: Settings) -> dict:
        """Get PostgreSQL configuration"""
        return {
            "dsn": settings.postgres_dsn,
            "min_size": 5,
            "max_size": settings.database_pool_size,
            "command_timeout": settings.database_pool_timeout,
            "server_settings": {
                "jit": "off",
                "application_name": "credential_hub_proof_service"
            }
        }
    
    @staticmethod
    def get_redis_config(settings: Settings) -> dict:
        """Get Redis configuration"""
        return {
            "url": settings.redis_url,
            "encoding": "utf-8",
            "decode_responses": True,
            "max_connections": settings.redis_max_connections,
            "socket_timeout": settings.redis_socket_timeout,
            "socket_connect_timeout": settings.redis_socket_connect_timeout,
            "retry_on_timeout": True,
            "health_check_interval": 30
        }


class SecuritySettings:
    """Security-related settings and constants"""
    
    # Field element bounds for BN254 curve
    BN254_FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617
    
    # Maximum allowed values
    MAX_PROOF_SIZE = 10 * 1024  # 10KB
    MAX_PUBLIC_INPUTS = 100
    MAX_CIRCUIT_ATTRIBUTES = 100
    
    # Security parameters
    MIN_SECURITY_LEVEL = 128
    NONCE_LENGTH = 32
    CHALLENGE_LENGTH = 32
    
    # Rate limiting
    DEFAULT_RATE_LIMIT = 60  # requests per minute
    BURST_RATE_LIMIT = 100   # burst allowance
    
    @staticmethod
    def validate_field_element(value: int) -> bool:
        """Validate that a value is a valid field element"""
        return 0 <= value < SecuritySettings.BN254_FIELD_SIZE
    
    @staticmethod
    def is_secure_circuit(security_level: int) -> bool:
        """Check if circuit security level is acceptable"""
        return security_level >= SecuritySettings.MIN_SECURITY_LEVEL


# Global settings instance
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """Get application settings singleton"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def get_circuit_settings() -> CircuitSettings:
    """Get circuit settings"""
    return CircuitSettings()


def get_database_settings() -> DatabaseSettings:
    """Get database settings"""
    return DatabaseSettings()


def get_security_settings() -> SecuritySettings:
    """Get security settings"""
    return SecuritySettings() 
