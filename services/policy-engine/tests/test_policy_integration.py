import pytest
import json
from fastapi.testclient import TestClient
from app.main import app
from app.models import PolicyType


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_policy():
    return {
        "name": "Test Access Policy",
        "description": "A test policy for API integration tests",
        "rules": [
            {"var": "value", ">": 0},
            {"var": "value", "<": 100},
        ],
        "version": "1.0.0",
        "type": PolicyType.ACCESS_CONTROL,
        "metadata": {
            "tags": ["test", "integration"],
            "owner": "test-user",
        },
    }


def test_create_policy(client, sample_policy):
    response = client.post("/policies", json=sample_policy)
    assert response.status_code == 201
    data = response.json()
    assert data["policy_id"] is not None
    assert data["policy"]["name"] == sample_policy["name"]
    assert data["policy"]["description"] == sample_policy["description"]
    assert data["message"] == "Policy created successfully"
    return data["policy_id"]


def test_get_policy(client, sample_policy):
    # First create a policy
    policy_id = test_create_policy(client, sample_policy)
    
    # Then retrieve it
    response = client.get(f"/policies/{policy_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["policy_id"] == policy_id
    assert data["policy"]["name"] == sample_policy["name"]
    assert data["policy"]["description"] == sample_policy["description"]
    assert data["message"] == "Policy retrieved successfully"


def test_evaluate_policy_allowed(client, sample_policy):
    # First create a policy
    policy_id = test_create_policy(client, sample_policy)
    
    # Evaluate with valid input
    evaluation_data = {
        "input_data": {"value": 50},
        "context": {"user": "test-user"}
    }
    
    response = client.post(f"/policies/{policy_id}/evaluate", json=evaluation_data)
    assert response.status_code == 200
    data = response.json()
    assert data["policy_id"] == policy_id
    assert data["allowed"] is True
    assert len(data["reasons"]) > 0
    assert len(data["errors"]) == 0


def test_evaluate_policy_denied(client, sample_policy):
    # First create a policy
    policy_id = test_create_policy(client, sample_policy)
    
    # Evaluate with invalid input
    evaluation_data = {
        "input_data": {"value": -10},
        "context": {"user": "test-user"}
    }
    
    response = client.post(f"/policies/{policy_id}/evaluate", json=evaluation_data)
    assert response.status_code == 200
    data = response.json()
    assert data["policy_id"] == policy_id
    assert data["allowed"] is False
    assert len(data["reasons"]) > 0
    assert len(data["errors"]) == 0


def test_update_policy(client, sample_policy):
    # First create a policy
    policy_id = test_create_policy(client, sample_policy)
    
    # Update the policy
    updated_policy = {
        "name": "Updated Test Policy",
        "description": "An updated test policy",
        "rules": [{"var": "value", ">": 10}],
        "version": "1.1.0",
        "type": PolicyType.BUSINESS_RULE,
        "metadata": {"tags": ["updated", "test"], "owner": "test-user"},
    }
    
    response = client.put(f"/policies/{policy_id}", json=updated_policy)
    assert response.status_code == 200
    data = response.json()
    assert data["policy_id"] == policy_id
    assert data["policy"]["name"] == updated_policy["name"]
    assert data["policy"]["description"] == updated_policy["description"]
    assert data["policy"]["version"] == updated_policy["version"]
    assert data["message"] == "Policy updated successfully"


def test_delete_policy(client, sample_policy):
    # First create a policy
    policy_id = test_create_policy(client, sample_policy)
    
    # Delete the policy
    response = client.delete(f"/policies/{policy_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == f"Policy {policy_id} deleted successfully"
    
    # Verify it's deleted
    response = client.get(f"/policies/{policy_id}")
    assert response.status_code == 404


def test_list_policies(client, sample_policy):
    # Clear existing policies by listing and deleting them
    response = client.get("/policies")
    if response.status_code == 200:
        for policy in response.json()["policies"]:
            client.delete(f"/policies/{policy['id']}")
    
    # Create two policies
    policy_id1 = test_create_policy(client, sample_policy)
    
    updated_policy = sample_policy.copy()
    updated_policy["name"] = "Second Test Policy"
    policy_id2 = test_create_policy(client, updated_policy)
    
    # List policies
    response = client.get("/policies")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 2
    policy_ids = [p["id"] for p in data["policies"]]
    assert policy_id1 in policy_ids
    assert policy_id2 in policy_ids 