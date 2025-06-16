import pytest
from app.models import PolicyType
from app.services.policy_service import PolicyService


@pytest.fixture
def policy_service():
    return PolicyService()


@pytest.fixture
def sample_policy_data():
    return {
        "name": "Test Policy",
        "description": "A test policy",
        "rules": [
            {"var": "value", ">": 0},
            {"var": "value", "<": 100},
        ],
        "version": "1.0.0",
        "type": PolicyType.ACCESS_CONTROL,
        "metadata": {
            "tags": ["test", "example"],
            "owner": "test-user",
        },
    }


@pytest.mark.asyncio
async def test_create_policy(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Check the policy properties
    assert policy.id is not None
    assert policy.name == sample_policy_data["name"]
    assert policy.description == sample_policy_data["description"]
    assert policy.rules == sample_policy_data["rules"]
    assert policy.version == sample_policy_data["version"]
    assert policy.type == sample_policy_data["type"]
    assert policy.metadata == sample_policy_data["metadata"]


@pytest.mark.asyncio
async def test_get_policy(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Get the policy
    retrieved_policy = await policy_service.get(policy.id)
    
    # Check the retrieved policy
    assert retrieved_policy.id == policy.id
    assert retrieved_policy.name == policy.name
    assert retrieved_policy.description == policy.description
    assert retrieved_policy.rules == policy.rules
    assert retrieved_policy.version == policy.version
    assert retrieved_policy.type == policy.type
    assert retrieved_policy.metadata == policy.metadata


@pytest.mark.asyncio
async def test_update_policy(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Update the policy
    updated_policy = await policy_service.update(
        policy_id=policy.id,
        name="Updated Policy",
        description="An updated test policy",
        rules=[{"var": "value", ">": 10}],
        version="1.1.0",
        type=PolicyType.BUSINESS_RULE,
        metadata={"tags": ["updated", "test"], "owner": "test-user"},
    )
    
    # Check the updated policy
    assert updated_policy.id == policy.id
    assert updated_policy.name == "Updated Policy"
    assert updated_policy.description == "An updated test policy"
    assert updated_policy.rules == [{"var": "value", ">": 10}]
    assert updated_policy.version == "1.1.0"
    assert updated_policy.type == PolicyType.BUSINESS_RULE
    assert updated_policy.metadata == {"tags": ["updated", "test"], "owner": "test-user"}


@pytest.mark.asyncio
async def test_delete_policy(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Delete the policy
    await policy_service.delete(policy.id)
    
    # Try to get the deleted policy
    with pytest.raises(ValueError):
        await policy_service.get(policy.id)


@pytest.mark.asyncio
async def test_list_policies(policy_service, sample_policy_data):
    # Create policies
    policy1 = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    policy2 = await policy_service.create(
        name="Another Policy",
        description="Another test policy",
        rules=[{"var": "value", ">": 20}],
        version="2.0.0",
        type=PolicyType.DATA_VALIDATION,
        metadata={"tags": ["another", "test"]},
    )
    
    # List policies
    policies = await policy_service.list()
    
    # Check the list
    assert len(policies) == 2
    policy_ids = [p.id for p in policies]
    assert policy1.id in policy_ids
    assert policy2.id in policy_ids


@pytest.mark.asyncio
async def test_evaluate_policy_allowed(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Evaluate the policy with valid input
    result = await policy_service.evaluate(
        policy_id=policy.id,
        input_data={"value": 50},
    )
    
    # Check the result
    assert result.allowed
    assert len(result.reasons) > 0
    assert len(result.errors) == 0


@pytest.mark.asyncio
async def test_evaluate_policy_denied(policy_service, sample_policy_data):
    # Create a policy
    policy = await policy_service.create(
        name=sample_policy_data["name"],
        description=sample_policy_data["description"],
        rules=sample_policy_data["rules"],
        version=sample_policy_data["version"],
        type=sample_policy_data["type"],
        metadata=sample_policy_data["metadata"],
    )
    
    # Evaluate the policy with invalid input
    result = await policy_service.evaluate(
        policy_id=policy.id,
        input_data={"value": -10},
    )
    
    # Check the result
    assert not result.allowed
    assert len(result.reasons) > 0
    assert len(result.errors) == 0 