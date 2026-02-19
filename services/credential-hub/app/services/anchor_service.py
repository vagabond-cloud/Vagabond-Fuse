import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings


class AnchorService:
    """Anchors payload hashes and returns chain-style anchor metadata."""

    def __init__(self):
        self.settings = get_settings()

    @staticmethod
    def _utc_now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _hash_payload(payload: Dict[str, Any]) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        return hashlib.sha256(encoded).hexdigest()

    async def _submit_external_anchor(
        self,
        *,
        entity_type: str,
        entity_id: str,
        payload_hash: str,
        wallet_did: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not self.settings.anchor_submit_url:
            return None

        body = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "payload_hash": payload_hash,
            "wallet_did": wallet_did,
            "timestamp": self._utc_now_iso(),
        }
        headers = {}
        if self.settings.anchor_api_key:
            headers["Authorization"] = f"Bearer {self.settings.anchor_api_key}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                self.settings.anchor_submit_url, json=body, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        return {
            "network": data.get("network", "external"),
            "tx_hash": data["tx_hash"],
            "ledger_index": data.get("ledger_index"),
            "payload_hash": payload_hash,
            "anchored_at": data.get("anchored_at", self._utc_now_iso()),
            "wallet_did": wallet_did,
        }

    async def anchor_payload(
        self,
        *,
        entity_type: str,
        entity_id: str,
        payload: Dict[str, Any],
        wallet_did: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload_hash = self._hash_payload(payload)

        # Try external anchoring first when configured.
        external = await self._submit_external_anchor(
            entity_type=entity_type,
            entity_id=entity_id,
            payload_hash=payload_hash,
            wallet_did=wallet_did,
        )
        if external:
            return external

        # Fallback deterministic pseudo on-chain record for local/dev.
        tx_hash = hashlib.sha256(
            f"{entity_type}:{entity_id}:{payload_hash}:{secrets.token_hex(8)}".encode()
        ).hexdigest()
        return {
            "network": "xrpl-dev",
            "tx_hash": tx_hash,
            "ledger_index": None,
            "payload_hash": payload_hash,
            "anchored_at": self._utc_now_iso(),
            "wallet_did": wallet_did,
        }
