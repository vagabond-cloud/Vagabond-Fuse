import pytest
from datetime import datetime
from app.models import ProofType
from app.services.proof_service import ProofService


@pytest.fixture
def proof_service():
    return ProofService()


@pytest.fixture
def sample_proof_data():
    return {
        "credential_id": "test-credential-id",
        "reveal_attributes": ["name", "age"],
        "circuit_id": "test-circuit"
    }


@pytest.mark.asyncio
async def test_generate_proof(proof_service, sample_proof_data):
    # Generate a proof
    proof = await proof_service.generate(
        credential_id=sample_proof_data["credential_id"],
        reveal_attributes=sample_proof_data["reveal_attributes"],
        circuit_id=sample_proof_data["circuit_id"]
    )
    
    # Check the proof properties
    assert proof.id is not None
    assert proof.credential_id == sample_proof_data["credential_id"]
    assert proof.proof_type == ProofType.ZKP
    assert proof.proof_value is not None
    assert proof.public_inputs is not None
    assert len(proof.public_inputs) > 0
    assert isinstance(proof.created_at, datetime)


@pytest.mark.asyncio
async def test_verify_proof_by_id(proof_service, sample_proof_data):
    # Generate a proof
    proof = await proof_service.generate(
        credential_id=sample_proof_data["credential_id"],
        reveal_attributes=sample_proof_data["reveal_attributes"],
        circuit_id=sample_proof_data["circuit_id"]
    )
    
    # Verify the proof by ID
    verification_result = await proof_service.verify(
        proof_id=proof.id,
        circuit_id=sample_proof_data["circuit_id"]
    )
    
    # Check the verification result
    assert verification_result.is_valid
    assert len(verification_result.checks) > 0
    assert all(check.status for check in verification_result.checks)
    assert len(verification_result.errors) == 0


@pytest.mark.asyncio
async def test_verify_proof_by_value(proof_service, sample_proof_data):
    # Generate a proof
    proof = await proof_service.generate(
        credential_id=sample_proof_data["credential_id"],
        reveal_attributes=sample_proof_data["reveal_attributes"],
        circuit_id=sample_proof_data["circuit_id"]
    )
    
    # Verify the proof by value
    verification_result = await proof_service.verify(
        proof=proof.proof_value,
        public_inputs=proof.public_inputs,
        circuit_id=sample_proof_data["circuit_id"]
    )
    
    # Check the verification result
    assert verification_result.is_valid
    assert len(verification_result.checks) > 0
    assert all(check.status for check in verification_result.checks)
    assert len(verification_result.errors) == 0


@pytest.mark.asyncio
async def test_verify_proof_missing_parameters(proof_service):
    # Verify with no parameters
    verification_result = await proof_service.verify()
    
    # Check the verification result
    assert not verification_result.is_valid
    assert len(verification_result.checks) == 0
    assert len(verification_result.errors) > 0
    assert "Either proof or proof_id must be provided" in verification_result.errors[0]


@pytest.mark.asyncio
async def test_verify_nonexistent_proof(proof_service):
    # Verify with non-existent proof ID
    verification_result = await proof_service.verify(proof_id="non-existent-id")
    
    # Check the verification result
    assert not verification_result.is_valid
    assert len(verification_result.checks) == 0
    assert len(verification_result.errors) > 0
    assert "not found" in verification_result.errors[0] 