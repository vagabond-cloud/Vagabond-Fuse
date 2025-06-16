import pytest
from datetime import datetime, timedelta
from app.models import ProofType, CredentialStatus
from app.services.credential_service import CredentialService


@pytest.fixture
def credential_service():
    return CredentialService()


@pytest.fixture
def sample_credential_data():
    return {
        "subject_id": "did:example:123",
        "issuer_id": "did:example:issuer",
        "claims": {
            "name": "John Doe",
            "age": 30,
            "email": "john.doe@example.com"
        },
        "proof_type": ProofType.JWT
    }


@pytest.mark.asyncio
async def test_issue_credential(credential_service, sample_credential_data):
    # Issue a credential
    credential = await credential_service.issue(
        subject_id=sample_credential_data["subject_id"],
        issuer_id=sample_credential_data["issuer_id"],
        claims=sample_credential_data["claims"],
        proof_type=sample_credential_data["proof_type"]
    )
    
    # Check the credential properties
    assert credential.id is not None
    assert credential.issuer == sample_credential_data["issuer_id"]
    assert credential.credential_subject["id"] == sample_credential_data["subject_id"]
    assert credential.credential_subject["name"] == sample_credential_data["claims"]["name"]
    assert credential.credential_subject["age"] == sample_credential_data["claims"]["age"]
    assert credential.proof is not None
    assert credential.proof["type"] == "JwtProof2020"


@pytest.mark.asyncio
async def test_verify_credential(credential_service, sample_credential_data):
    # Issue a credential
    credential = await credential_service.issue(
        subject_id=sample_credential_data["subject_id"],
        issuer_id=sample_credential_data["issuer_id"],
        claims=sample_credential_data["claims"],
        proof_type=sample_credential_data["proof_type"]
    )
    
    # Verify the credential
    verification_result = await credential_service.verify(credential_id=credential.id)
    
    # Check the verification result
    assert verification_result.is_valid
    assert len(verification_result.checks) == 3
    assert all(check.status for check in verification_result.checks)
    assert len(verification_result.errors) == 0


@pytest.mark.asyncio
async def test_verify_expired_credential(credential_service, sample_credential_data):
    # Issue a credential with an expiration date in the past
    expiration_date = (datetime.now() - timedelta(days=1)).isoformat()
    
    credential = await credential_service.issue(
        subject_id=sample_credential_data["subject_id"],
        issuer_id=sample_credential_data["issuer_id"],
        claims=sample_credential_data["claims"],
        proof_type=sample_credential_data["proof_type"],
        expiration_date=expiration_date
    )
    
    # Verify the credential
    verification_result = await credential_service.verify(credential_id=credential.id)
    
    # Check the verification result
    assert not verification_result.is_valid
    assert any(not check.status for check in verification_result.checks)
    assert len(verification_result.errors) > 0


@pytest.mark.asyncio
async def test_revoke_credential(credential_service, sample_credential_data):
    # Issue a credential
    credential = await credential_service.issue(
        subject_id=sample_credential_data["subject_id"],
        issuer_id=sample_credential_data["issuer_id"],
        claims=sample_credential_data["claims"],
        proof_type=sample_credential_data["proof_type"]
    )
    
    # Verify the credential before revocation
    verification_result = await credential_service.verify(credential_id=credential.id)
    assert verification_result.is_valid
    
    # Revoke the credential
    await credential_service.revoke(credential.id, "Testing revocation")
    
    # Get the status
    status = await credential_service.get_status(credential.id)
    assert status.status == CredentialStatus.REVOKED
    assert status.reason == "Testing revocation"
    
    # Verify the credential after revocation
    verification_result = await credential_service.verify(credential_id=credential.id)
    assert not verification_result.is_valid
    assert any(check.check_type == "status" and not check.status for check in verification_result.checks)
    assert any("revoked" in error.lower() for error in verification_result.errors) 