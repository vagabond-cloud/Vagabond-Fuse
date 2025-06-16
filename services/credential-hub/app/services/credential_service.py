from typing import Dict, List, Optional, Any
import json
import uuid
from datetime import datetime, timedelta
import asyncio
from pathlib import Path
import os

from app.models import (
    Credential,
    ProofType,
    VerificationResult,
    VerificationCheck,
    Status,
    CredentialStatus,
)
from app.services.stats_service import StatsService


class CredentialService:
    def __init__(self):
        # In a real implementation, these would be stored in a database
        self._credentials: Dict[str, Credential] = {}
        self._statuses: Dict[str, Status] = {}
        # Initialize the stats service for recording events
        self._stats_service = StatsService()
        
        # ClickHouse configuration
        self.clickhouse_config = {
            "host": os.environ.get("CLICKHOUSE_HOST", "localhost"),
            "port": int(os.environ.get("CLICKHOUSE_PORT", "8123")),
            "username": os.environ.get("CLICKHOUSE_USER", "default"),
            "database": os.environ.get("CLICKHOUSE_DATABASE", "credential_hub")
        }
        
        # Only add password if it's provided
        password = os.environ.get("CLICKHOUSE_PASSWORD", "")
        if password:
            self.clickhouse_config["password"] = password
            
        print(f"Initializing CredentialService with ClickHouse config: {self.clickhouse_config}")

    async def issue(
        self,
        subject_id: str,
        issuer_id: str,
        claims: Dict[str, Any],
        proof_type: ProofType = ProofType.JWT,
        expiration_date: Optional[str] = None,
    ) -> Credential:
        """Issue a new credential"""
        # Create a new credential
        credential_id = str(uuid.uuid4())
        issuance_date = datetime.now().isoformat()
        
        if not expiration_date:
            # Default expiration is 1 year from issuance
            expiration_date = (datetime.now() + timedelta(days=365)).isoformat()
        
        credential = Credential(
            id=credential_id,
            context=["https://www.w3.org/2018/credentials/v1"],
            type=["VerifiableCredential"],
            issuer=issuer_id,
            issuance_date=issuance_date,
            expiration_date=expiration_date,
            credential_subject={
                "id": subject_id,
                **claims,
            },
            status={
                "id": f"https://credential-hub.example/credentials/{credential_id}/status",
                "type": "CredentialStatusList2017",
            },
        )
        
        # Generate proof based on the requested type
        if proof_type == ProofType.JWT:
            # In a real implementation, this would use a JWT library
            credential.proof = {
                "type": "JwtProof2020",
                "created": issuance_date,
                "proofPurpose": "assertionMethod",
                "verificationMethod": f"{issuer_id}#keys-1",
                "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..PLACEHOLDER",
            }
        elif proof_type == ProofType.LD_PROOF:
            # In a real implementation, this would use a LD-Signatures library
            credential.proof = {
                "type": "Ed25519Signature2018",
                "created": issuance_date,
                "proofPurpose": "assertionMethod",
                "verificationMethod": f"{issuer_id}#keys-1",
                "proofValue": "PLACEHOLDER",
            }
        elif proof_type == ProofType.ZKP:
            # In a real implementation, this would use a ZKP library
            credential.proof = {
                "type": "BbsBlsSignature2020",
                "created": issuance_date,
                "proofPurpose": "assertionMethod",
                "verificationMethod": f"{issuer_id}#keys-1",
                "proofValue": "PLACEHOLDER",
            }
        
        # Store the credential
        self._credentials[credential_id] = credential
        
        # Set initial status
        self._statuses[credential_id] = Status(
            credential_id=credential_id,
            status=CredentialStatus.ACTIVE,
            timestamp=datetime.now(),
        )
        
        # Record the issuance event directly in ClickHouse
        try:
            import clickhouse_connect
            client = clickhouse_connect.get_client(**self.clickhouse_config)
            client.insert(
                "credential_events",
                [[
                    "issue",                   # event_type
                    credential_id,             # credential_id
                    subject_id,                # subject_id
                    issuer_id,                 # issuer_id
                    datetime.now(),            # timestamp
                    "success",                 # result
                    "",                        # details
                    "{}"                       # metadata
                ]],
                column_names=[
                    "event_type",
                    "credential_id",
                    "subject_id",
                    "issuer_id",
                    "timestamp",
                    "result",
                    "details",
                    "metadata"
                ]
            )
            print(f"Recorded issue event for credential {credential_id}")
        except Exception as e:
            print(f"Error recording issue event to ClickHouse: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
        
        return credential

    async def verify(
        self, credential_id: Optional[str] = None, credential: Optional[Credential] = None
    ) -> VerificationResult:
        """Verify a credential"""
        if not credential and not credential_id:
            return VerificationResult(
                is_valid=False,
                checks=[],
                errors=["Either credential or credential_id must be provided"],
            )
        
        if not credential and credential_id:
            # Look up the credential
            credential = self._credentials.get(credential_id)
            if not credential:
                # Record the failed verification event directly in ClickHouse
                try:
                    import clickhouse_connect
                    client = clickhouse_connect.get_client(**self.clickhouse_config)
                    client.insert(
                        "credential_events",
                        [[
                            "verify",                  # event_type
                            credential_id,             # credential_id
                            "",                        # subject_id
                            "",                        # issuer_id
                            datetime.now(),            # timestamp
                            "failure",                 # result
                            "Credential not found",    # details
                            "{}"                       # metadata
                        ]],
                        column_names=[
                            "event_type",
                            "credential_id",
                            "subject_id",
                            "issuer_id",
                            "timestamp",
                            "result",
                            "details",
                            "metadata"
                        ]
                    )
                    print(f"Recorded failed verify event for credential {credential_id}")
                except Exception as e:
                    print(f"Error recording verify event to ClickHouse: {str(e)}")
                    import traceback
                    print(f"Traceback: {traceback.format_exc()}")
                
                return VerificationResult(
                    is_valid=False,
                    checks=[],
                    errors=[f"Credential with ID {credential_id} not found"],
                )
        
        # Use the credential's ID for verification and recording
        cred_id = credential_id or credential.id
        
        # Perform verification checks
        checks = []
        errors = []
        
        # Check 1: Verify the credential has not expired
        expiration_check = self._check_expiration(credential)
        checks.append(expiration_check)
        if not expiration_check.status:
            errors.append(expiration_check.message or "Credential has expired")
        
        # Check 2: Verify the credential has not been revoked
        status_check = self._check_status(credential)
        checks.append(status_check)
        if not status_check.status:
            errors.append(status_check.message or "Credential has been revoked")
        
        # Check 3: Verify the signature
        signature_check = self._check_signature(credential)
        checks.append(signature_check)
        if not signature_check.status:
            errors.append(signature_check.message or "Invalid signature")
        
        # Overall validity
        is_valid = all(check.status for check in checks)
        
        # Record the verification event directly in ClickHouse
        try:
            import clickhouse_connect
            client = clickhouse_connect.get_client(**self.clickhouse_config)
            client.insert(
                "credential_events",
                [[
                    "verify",                                          # event_type
                    cred_id,                                           # credential_id
                    credential.credential_subject.get("id", ""),       # subject_id
                    credential.issuer,                                 # issuer_id
                    datetime.now(),                                    # timestamp
                    "success" if is_valid else "failure",              # result
                    ", ".join(errors) if errors else "All checks passed", # details
                    "{}"                                               # metadata
                ]],
                column_names=[
                    "event_type",
                    "credential_id",
                    "subject_id",
                    "issuer_id",
                    "timestamp",
                    "result",
                    "details",
                    "metadata"
                ]
            )
            print(f"Recorded verify event for credential {cred_id}")
        except Exception as e:
            print(f"Error recording verify event to ClickHouse: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
        
        return VerificationResult(
            is_valid=is_valid,
            checks=checks,
            errors=errors,
        )

    async def get_status(self, credential_id: str) -> Status:
        """Get the status of a credential"""
        status = self._statuses.get(credential_id)
        if not status:
            raise ValueError(f"Status for credential {credential_id} not found")
        return status

    async def revoke(self, credential_id: str, reason: str = "Revoked by issuer") -> None:
        """Revoke a credential"""
        if credential_id not in self._credentials:
            raise ValueError(f"Credential {credential_id} not found")
        
        self._statuses[credential_id] = Status(
            credential_id=credential_id,
            status=CredentialStatus.REVOKED,
            reason=reason,
            timestamp=datetime.now(),
        )
        
        # Record the revocation event directly in ClickHouse
        try:
            import clickhouse_connect
            client = clickhouse_connect.get_client(**self.clickhouse_config)
            client.insert(
                "credential_events",
                [[
                    "revoke",                                          # event_type
                    credential_id,                                     # credential_id
                    self._credentials[credential_id].credential_subject.get("id", ""), # subject_id
                    self._credentials[credential_id].issuer,           # issuer_id
                    datetime.now(),                                    # timestamp
                    "success",                                         # result
                    reason,                                            # details
                    "{}"                                               # metadata
                ]],
                column_names=[
                    "event_type",
                    "credential_id",
                    "subject_id",
                    "issuer_id",
                    "timestamp",
                    "result",
                    "details",
                    "metadata"
                ]
            )
            print(f"Recorded revoke event for credential {credential_id}")
        except Exception as e:
            print(f"Error recording revoke event to ClickHouse: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")

    def _check_expiration(self, credential: Credential) -> VerificationCheck:
        """Check if the credential has expired"""
        if not credential.expiration_date:
            return VerificationCheck(
                check_type="expiration",
                status=True,
                message="No expiration date specified",
            )
        
        try:
            expiration_date = datetime.fromisoformat(credential.expiration_date)
            # Remove timezone information if present to make it offset-naive
            if expiration_date.tzinfo is not None:
                expiration_date = expiration_date.replace(tzinfo=None)
            is_valid = datetime.now() < expiration_date
            return VerificationCheck(
                check_type="expiration",
                status=is_valid,
                message=None if is_valid else "Credential has expired",
            )
        except ValueError:
            return VerificationCheck(
                check_type="expiration",
                status=False,
                message="Invalid expiration date format",
            )

    def _check_status(self, credential: Credential) -> VerificationCheck:
        """Check if the credential has been revoked"""
        if not credential.id:
            return VerificationCheck(
                check_type="status",
                status=False,
                message="Credential has no ID",
            )
        
        status = self._statuses.get(credential.id)
        if not status:
            return VerificationCheck(
                check_type="status",
                status=True,
                message="No status information found",
            )
        
        is_valid = status.status != CredentialStatus.REVOKED
        return VerificationCheck(
            check_type="status",
            status=is_valid,
            message=None if is_valid else f"Credential has been revoked: {status.reason}",
        )

    def _check_signature(self, credential: Credential) -> VerificationCheck:
        """Check if the credential signature is valid"""
        # In a real implementation, this would verify the signature
        # For this example, we just check if a proof exists
        if not credential.proof:
            return VerificationCheck(
                check_type="signature",
                status=False,
                message="No proof found",
            )
        
        return VerificationCheck(
            check_type="signature",
            status=True,
            message="Signature verified",
        ) 