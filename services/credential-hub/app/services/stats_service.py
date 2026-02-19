import logging
from typing import Dict, Any, Optional, Literal
from datetime import datetime
import os
import asyncio
import json
import threading

logger = logging.getLogger(__name__)

# Try to import clickhouse-connect, but provide a fallback if not available
try:
    import clickhouse_connect
    CLICKHOUSE_AVAILABLE = True
except ImportError:
    logger.warning("clickhouse-connect not available, using fallback mode")
    CLICKHOUSE_AVAILABLE = False

class StatsService:
    def __init__(self, 
                 clickhouse_host: str = None, 
                 clickhouse_port: int = None, 
                 clickhouse_user: str = None, 
                 clickhouse_password: str = None,
                 clickhouse_database: str = None):
        """Initialize the StatsService with ClickHouse connection parameters."""
        # Use environment variables if parameters are not provided
        self.clickhouse_config = {
            "host": clickhouse_host or os.environ.get("CLICKHOUSE_HOST", "localhost"),
            "port": clickhouse_port or int(os.environ.get("CLICKHOUSE_PORT", "8123")),
            "username": clickhouse_user or os.environ.get("CLICKHOUSE_USER", "default"),
            "database": clickhouse_database or os.environ.get("CLICKHOUSE_DATABASE", "credential_hub")
        }
        
        # Only add password if it's provided
        password = clickhouse_password or os.environ.get("CLICKHOUSE_PASSWORD", "")
        if password:
            self.clickhouse_config["password"] = password
            
        logger.info(f"Initializing StatsService with ClickHouse config: {self.clickhouse_config}")
        self._client = None
        self._client_lock = threading.Lock()
        
    def _get_client(self):
        """Get or create a ClickHouse client."""
        if not CLICKHOUSE_AVAILABLE:
            logger.warning("ClickHouse client requested but clickhouse-connect is not available")
            return None
            
        if self._client is None:
            try:
                self._client = clickhouse_connect.get_client(**self.clickhouse_config)
            except Exception as e:
                logger.error(f"Failed to connect to ClickHouse: {str(e)}")
                raise
        return self._client

    def _query_stats_sync(self) -> Dict[str, int]:
        """Run credential stats query in a blocking context."""
        with self._client_lock:
            client = self._get_client()
            if client is None:
                return {"issued": 0, "verified": 0, "revoked": 0}

            result = client.query(
                """
                SELECT
                    countIf(event_type = 'issue') AS issued,
                    countIf(event_type = 'verify' AND result = 'success') AS verified,
                    countIf(event_type = 'revoke') AS revoked
                FROM credential_events
                """
            )
            if result.row_count == 0 or not result.first_row:
                return {"issued": 0, "verified": 0, "revoked": 0}

            issued, verified, revoked = result.first_row
            return {
                "issued": int(issued),
                "verified": int(verified),
                "revoked": int(revoked),
            }

    def _record_event_sync(
        self,
        event_type: Literal["issue", "verify", "revoke"],
        credential_id: str,
        subject_id: str,
        issuer_id: str,
        result: Literal["success", "failure"],
        details: str,
        metadata_str: str,
    ) -> bool:
        """Insert a credential event in a blocking context."""
        with self._client_lock:
            client = self._get_client()
            if client is None:
                return False

            client.insert(
                "credential_events",
                [[
                    event_type,
                    credential_id,
                    subject_id,
                    issuer_id,
                    datetime.now(),
                    result,
                    details,
                    metadata_str,
                ]],
                column_names=[
                    "event_type",
                    "credential_id",
                    "subject_id",
                    "issuer_id",
                    "timestamp",
                    "result",
                    "details",
                    "metadata",
                ],
            )
            return True
        
    async def get_credential_stats(self) -> Dict[str, int]:
        """
        Get statistics about credentials from ClickHouse.
        
        Returns:
            Dict with counts of issued, verified, and revoked credentials.
        """
        if not CLICKHOUSE_AVAILABLE:
            logger.warning("ClickHouse not available, returning fallback values")
            return {
                "issued": 0,
                "verified": 0,
                "revoked": 0
            }
            
        try:
            return await asyncio.to_thread(self._query_stats_sync)
        except Exception as e:
            logger.error(f"Error fetching credential stats from ClickHouse: {str(e)}")
            # Fallback to default values when ClickHouse is unavailable
            return {
                "issued": 0,
                "verified": 0,
                "revoked": 0
            }
    
    async def record_event(
        self, 
        event_type: Literal["issue", "verify", "revoke"], 
        credential_id: str, 
        subject_id: str = "", 
        issuer_id: str = "",
        result: Literal["success", "failure"] = "success",
        details: str = "",
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Record a credential event to ClickHouse.
        
        Args:
            event_type: Type of event (issue, verify, revoke)
            credential_id: ID of the credential
            subject_id: ID of the subject (for issue events)
            issuer_id: ID of the issuer (for issue events)
            result: Result of the event (success or failure)
            details: Additional details about the event
            metadata: Additional metadata as a dictionary
            
        Returns:
            True if the event was recorded successfully, False otherwise
        """
        logger.info(f"Attempting to record {event_type} event for credential {credential_id}")
        
        if not CLICKHOUSE_AVAILABLE:
            logger.warning(f"ClickHouse not available, skipping event recording: {event_type} for {credential_id}")
            return False
            
        try:
            # Convert metadata to JSON string if provided
            metadata_str = "{}"
            if metadata:
                try:
                    metadata_str = json.dumps(metadata)
                except Exception as e:
                    logger.error(f"Failed to serialize metadata: {str(e)}")

            return await asyncio.to_thread(
                self._record_event_sync,
                event_type,
                credential_id,
                subject_id,
                issuer_id,
                result,
                details,
                metadata_str,
            )
        except Exception as e:
            logger.error(f"Error recording event to ClickHouse: {str(e)}")
            return False
    
    async def close(self):
        """Close the ClickHouse client connection."""
        if CLICKHOUSE_AVAILABLE and self._client:
            self._client.close()
            self._client = None 
