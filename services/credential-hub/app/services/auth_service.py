import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

from eth_account import Account
from eth_account.messages import encode_defunct
from jose import JWTError, jwt

from app.config import get_settings
from app.models import WalletChallengeResponse, AuthTokenResponse


class AuthService:
    """Wallet-based challenge authentication and JWT issuance."""

    def __init__(self):
        self.settings = get_settings()
        self._challenges: Dict[str, Dict[str, Any]] = {}
        self.challenge_ttl_seconds = 300

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _normalize_wallet_address(wallet_address: str) -> str:
        return wallet_address.strip().lower()

    def _build_message(
        self, challenge_id: str, wallet_address: str, chain: str, nonce: str
    ) -> str:
        issued_at = self._now().isoformat()
        return (
            "Vagabond Credential Hub Authentication\n"
            f"Challenge ID: {challenge_id}\n"
            f"Wallet: {wallet_address}\n"
            f"Chain: {chain}\n"
            f"Nonce: {nonce}\n"
            f"Issued At: {issued_at}\n"
            "Sign this message to authenticate."
        )

    def _cleanup_expired_challenges(self) -> None:
        now = self._now()
        expired = [
            cid
            for cid, data in self._challenges.items()
            if data["expires_at"] < now
        ]
        for cid in expired:
            self._challenges.pop(cid, None)

    def create_challenge(
        self, wallet_address: str, chain: str
    ) -> WalletChallengeResponse:
        self._cleanup_expired_challenges()

        challenge_id = secrets.token_urlsafe(24)
        nonce = secrets.token_hex(16)
        normalized_wallet = self._normalize_wallet_address(wallet_address)
        expires_at = self._now() + timedelta(seconds=self.challenge_ttl_seconds)
        message = self._build_message(challenge_id, normalized_wallet, chain, nonce)

        self._challenges[challenge_id] = {
            "wallet_address": normalized_wallet,
            "chain": chain,
            "nonce": nonce,
            "message": message,
            "expires_at": expires_at,
        }

        return WalletChallengeResponse(
            challenge_id=challenge_id,
            wallet_address=normalized_wallet,
            chain=chain,
            message=message,
            expires_at=expires_at,
        )

    @staticmethod
    def _verify_evm_signature(message: str, signature: str, wallet_address: str) -> bool:
        recovered = Account.recover_message(
            encode_defunct(text=message), signature=signature
        )
        return recovered.lower() == wallet_address.lower()

    def verify_challenge_and_issue_token(
        self, challenge_id: str, wallet_address: str, chain: str, signature: str
    ) -> AuthTokenResponse:
        self._cleanup_expired_challenges()
        challenge = self._challenges.get(challenge_id)
        if not challenge:
            raise ValueError("Invalid or expired challenge")

        normalized_wallet = self._normalize_wallet_address(wallet_address)
        if challenge["wallet_address"] != normalized_wallet:
            raise ValueError("Wallet address does not match challenge")

        if challenge["chain"] != chain:
            raise ValueError("Chain does not match challenge")

        if chain.startswith("eip155") or chain.lower() in {"evm", "ethereum"}:
            is_valid = self._verify_evm_signature(
                challenge["message"], signature, normalized_wallet
            )
        else:
            raise ValueError(f"Unsupported chain for signature verification: {chain}")

        if not is_valid:
            raise ValueError("Invalid signature")

        # One-time challenge
        self._challenges.pop(challenge_id, None)

        expires_at = self._now() + timedelta(
            minutes=self.settings.access_token_expire_minutes
        )
        did = f"did:pkh:{chain}:{normalized_wallet}"
        payload = {
            "sub": did,
            "wallet_address": normalized_wallet,
            "chain": chain,
            "exp": int(expires_at.timestamp()),
            "iat": int(self._now().timestamp()),
        }
        token = jwt.encode(
            payload, self.settings.secret_key, algorithm=self.settings.algorithm
        )
        return AuthTokenResponse(
            access_token=token,
            expires_at=expires_at,
            did=did,
        )

    def verify_token(self, token: str) -> Dict[str, Any]:
        try:
            return jwt.decode(
                token, self.settings.secret_key, algorithms=[self.settings.algorithm]
            )
        except JWTError as exc:
            raise ValueError("Invalid token") from exc
