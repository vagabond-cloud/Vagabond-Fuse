import pytest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.models import ProofType


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_credential_request():
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


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Welcome to Credential Hub API"


def test_issue_credential(client, sample_credential_request):
    response = client.post("/credentials/issue", json=sample_credential_request)
    assert response.status_code == 200
    data = response.json()
    assert data["credential_id"] is not None
    assert data["credential"]["issuer"] == sample_credential_request["issuer_id"]
    assert data["credential"]["credential_subject"]["id"] == sample_credential_request["subject_id"]
    assert data["credential"]["credential_subject"]["name"] == sample_credential_request["claims"]["name"]
    assert data["credential"]["credential_subject"]["age"] == sample_credential_request["claims"]["age"]
    assert data["credential"]["proof"] is not None
    assert data["message"] == "Credential issued successfully"
    return data["credential_id"], data["credential"]


def test_verify_credential(client, sample_credential_request):
    # First issue a credential
    credential_id, credential = test_issue_credential(client, sample_credential_request)
    
    # Then verify it
    verification_request = {
        "credential_id": credential_id,
        "credential": credential
    }
    
    response = client.post("/credentials/verify", json=verification_request)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert len(data["checks"]) > 0
    assert all(check["status"] for check in data["checks"])
    assert len(data["errors"]) == 0


def test_generate_proof(client, sample_credential_request):
    # First issue a credential
    credential_id, _ = test_issue_credential(client, sample_credential_request)
    
    # Then generate a proof
    proof_request = {
        "credential_id": credential_id,
        "reveal_attributes": ["name", "age"],
        "circuit_id": "test-circuit"
    }
    
    response = client.post("/proofs/generate", json=proof_request)
    assert response.status_code == 200
    data = response.json()
    assert data["proof_id"] is not None
    assert data["proof"] is not None
    assert data["public_inputs"] is not None
    return data["proof_id"], data["proof"], data["public_inputs"]


def test_verify_proof(client, sample_credential_request):
    # First issue a credential and generate a proof
    credential_id, _ = test_issue_credential(client, sample_credential_request)
    proof_id, proof, public_inputs = test_generate_proof(client, sample_credential_request)
    
    # Then verify the proof
    verification_request = {
        "proof_id": proof_id,
        "proof": proof,
        "public_inputs": public_inputs,
        "circuit_id": "test-circuit"
    }
    
    response = client.post("/proofs/verify", json=verification_request)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert len(data["checks"]) > 0
    assert all(check["status"] for check in data["checks"])
    assert len(data["errors"]) == 0


def test_get_credential_status(client, sample_credential_request):
    # First issue a credential
    credential_id, _ = test_issue_credential(client, sample_credential_request)
    
    # Then get its status
    response = client.get(f"/credentials/{credential_id}/status")
    assert response.status_code == 200
    data = response.json()
    assert data["credential_id"] == credential_id
    assert data["status"] == "active"
    assert data["timestamp"] is not None


def test_revoke_credential(client, sample_credential_request):
    # First issue a credential
    credential_id, _ = test_issue_credential(client, sample_credential_request)
    
    # Then revoke it
    response = client.post(f"/credentials/{credential_id}/revoke", params={"reason": "Testing revocation"})
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == f"Credential {credential_id} revoked successfully"
    
    # Verify it's revoked by checking the status
    response = client.get(f"/credentials/{credential_id}/status")
    assert response.status_code == 200
    data = response.json()
    assert data["credential_id"] == credential_id
    assert data["status"] == "revoked"
    assert data["reason"] == "Testing revocation"
    
    # Try to verify the revoked credential
    verification_request = {
        "credential_id": credential_id
    }
    
    response = client.post("/credentials/verify", json=verification_request)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert any(not check["status"] for check in data["checks"])
    assert len(data["errors"]) > 0 