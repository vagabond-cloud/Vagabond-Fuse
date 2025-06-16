import logging
from typing import Dict, Any, Optional, Literal
from datetime import datetime
import os

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
            client = self._get_client()
            if client is None:
                return {
                    "issued": 0,
                    "verified": 0,
                    "revoked": 0
                }
            
            # Query for issued credentials
            issued_result = client.query("""
                SELECT COUNT(*) as count 
                FROM credential_events 
                WHERE event_type = 'issue'
            """)
            issued_count = issued_result.first_row[0] if issued_result.row_count > 0 else 0
            
            # Query for verified credentials
            verified_result = client.query("""
                SELECT COUNT(*) as count 
                FROM credential_events 
                WHERE event_type = 'verify' AND result = 'success'
            """)
            verified_count = verified_result.first_row[0] if verified_result.row_count > 0 else 0
            
            # Query for revoked credentials
            revoked_result = client.query("""
                SELECT COUNT(*) as count 
                FROM credential_events 
                WHERE event_type = 'revoke'
            """)
            revoked_count = revoked_result.first_row[0] if revoked_result.row_count > 0 else 0
            
            return {
                "issued": issued_count,
                "verified": verified_count,
                "revoked": revoked_count
            }
            
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
            logger.info(f"Getting ClickHouse client with config: {self.clickhouse_config}")
            client = self._get_client()
            if client is None:
                logger.error("Failed to get ClickHouse client")
                return False
            
            # Convert metadata to JSON string if provided
            metadata_str = "{}"
            if metadata:
                try:
                    import json
                    metadata_str = json.dumps(metadata)
                except Exception as e:
                    logger.error(f"Failed to serialize metadata: {str(e)}")
            
            # Create event data
            event_data = {
                "event_type": event_type,
                "credential_id": credential_id,
                "subject_id": subject_id,
                "issuer_id": issuer_id,
                "timestamp": datetime.now(),
                "result": result,
                "details": details,
                "metadata": metadata_str
            }
            logger.info(f"Inserting event data: {event_data}")
            
            # Insert the event
            client.insert(
                "credential_events",
                [event_data]
            )
            
            logger.info(f"Successfully recorded {event_type} event for credential {credential_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording event to ClickHouse: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    async def close(self):
        """Close the ClickHouse client connection."""
        if CLICKHOUSE_AVAILABLE and self._client:
            self._client.close()
            self._client = None 