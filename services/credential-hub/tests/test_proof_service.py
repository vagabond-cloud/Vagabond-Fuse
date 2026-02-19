import pytest
from datetime import datetime
from app.models import ProofType, Credential
from app.services.proof_service import ProofService, CircuitConfig


@pytest.fixture
def proof_service():
    # Initialize with test circuits directory
    service = ProofService(circuits_dir="test_circuits", node_path="node")
    
    # Register a test circuit for unit testing (without requiring actual files)
    test_circuit = CircuitConfig(
        circuit_id="test-circuit",
        wasm_path="/tmp/test_circuit.wasm",
        zkey_path="/tmp/test_circuit.zkey",
        verification_key_path="/tmp/test_verification_key.json",
        description="Test circuit for unit testing",
        max_attributes=5,
    )
    
    # Override the validate method for testing
    test_circuit.validate = lambda: True
    service._circuits["test-circuit"] = test_circuit
    
    return service


@pytest.fixture
def sample_credential():
    return Credential(
        id="test-credential-id",
        context=["https://www.w3.org/2018/credentials/v1"],
        type=["VerifiableCredential", "IdentityCredential"],
        issuer="did:example:issuer123",
        issuance_date="2023-01-01T00:00:00Z",
        expiration_date="2024-01-01T00:00:00Z",
        credential_subject={
            "id": "did:example:holder456",
            "name": "John Doe",
            "age": 30,
            "email": "john.doe@example.com",
            "address": {
                "street": "123 Main St",
                "city": "Anytown",
                "country": "US"
            }
        },
        proof={
            "type": "Ed25519Signature2018",
            "created": "2023-01-01T00:00:00Z",
            "proofPurpose": "assertionMethod",
            "verificationMethod": "did:example:issuer123#keys-1",
            "proofValue": "test-signature"
        }
    )


@pytest.fixture
def sample_proof_data():
    return {
        "credential_id": "test-credential-id",
        "reveal_attributes": ["name", "age"],
        "circuit_id": "test-circuit"
    }


class TestProofService:
    
    def test_circuit_registration(self, proof_service):
        """Test circuit registration and listing"""
        circuits = proof_service.list_circuits()
        assert len(circuits) >= 1
        
        # Check that test circuit is registered
        test_circuit = next((c for c in circuits if c["id"] == "test-circuit"), None)
        assert test_circuit is not None
        assert test_circuit["description"] == "Test circuit for unit testing"
        assert test_circuit["max_attributes"] == 5

    def test_extract_attributes(self, proof_service, sample_credential):
        """Test attribute extraction from credentials"""
        # Test simple attributes
        revealed = proof_service._extract_attributes(sample_credential, ["name", "age"])
        assert revealed["name"] == "John Doe"
        assert revealed["age"] == 30
        
        # Test nested attributes
        revealed = proof_service._extract_attributes(sample_credential, ["address.city", "address.country"])
        assert revealed["address.city"] == "Anytown"
        assert revealed["address.country"] == "US"
        
        # Test missing attributes
        revealed = proof_service._extract_attributes(sample_credential, ["nonexistent"])
        assert "nonexistent" not in revealed

    def test_prepare_circuit_inputs(self, proof_service, sample_credential):
        """Test circuit input preparation"""
        revealed_data = {"name": "John Doe", "age": 30}
        inputs = proof_service._prepare_circuit_inputs(sample_credential, revealed_data)
        
        assert "credentialHash" in inputs
        assert "attributesHash" in inputs
        assert isinstance(inputs["credentialHash"], str)
        assert isinstance(inputs["attributesHash"], str)
        
        # Test with challenge
        inputs_with_challenge = proof_service._prepare_circuit_inputs(
            sample_credential, revealed_data, "test-challenge"
        )
        assert "challenge" in inputs_with_challenge

    def test_validate_proof_structure(self, proof_service):
        """Test proof structure validation"""
        # Valid proof structure
        valid_proof = {
            "pi_a": ["123", "456", "1"],
            "pi_b": [["789", "012"], ["345", "678"], ["1", "0"]],
            "pi_c": ["901", "234", "1"],
            "protocol": "groth16"
        }
        
        check = proof_service._validate_proof_structure(valid_proof)
        assert check.status is True
        assert check.check_type == "structure_validation"
        
        # Invalid proof - missing field
        invalid_proof = {
            "pi_a": ["123", "456", "1"],
            "pi_b": [["789", "012"], ["345", "678"], ["1", "0"]],
            # Missing pi_c
            "protocol": "groth16"
        }
        
        check = proof_service._validate_proof_structure(invalid_proof)
        assert check.status is False
        assert "pi_c" in check.message

    def test_validate_public_inputs(self, proof_service):
        """Test public inputs validation"""
        # Valid inputs
        valid_inputs = ["123456789", "987654321"]
        check = proof_service._validate_public_inputs(valid_inputs)
        assert check.status is True
        
        # Invalid inputs - not a list
        check = proof_service._validate_public_inputs("not-a-list")
        assert check.status is False
        
        # Invalid inputs - non-numeric string
        invalid_inputs = ["123456789", "not-a-number"]
        check = proof_service._validate_public_inputs(invalid_inputs)
        assert check.status is False

    @pytest.mark.asyncio
    async def test_generate_proof_validation(self, proof_service, sample_credential):
        """Test proof generation input validation"""
        # Store credential for testing
        proof_service._store_credential(sample_credential)
        
        # Test missing credential_id
        with pytest.raises(ValueError, match="credential_id is required"):
            await proof_service.generate("", ["name"])
        
        # Test empty reveal_attributes
        with pytest.raises(ValueError, match="reveal_attributes cannot be empty"):
            await proof_service.generate("test-credential-id", [])
        
        # Test unknown circuit
        with pytest.raises(ValueError, match="Circuit not found"):
            await proof_service.generate("test-credential-id", ["name"], "unknown-circuit")
        
        # Test too many attributes
        with pytest.raises(ValueError, match="Too many attributes"):
            await proof_service.generate(
                "test-credential-id", 
                ["attr1", "attr2", "attr3", "attr4", "attr5", "attr6"],  # 6 > max of 5
                "test-circuit"
            )

    @pytest.mark.asyncio
    async def test_verify_proof_validation(self, proof_service):
        """Test proof verification input validation"""
        # Test missing proof and proof_id
        result = await proof_service.verify()
        assert result.is_valid is False
        assert "Either proof or proof_id must be provided" in result.errors[0]
        
        # Test non-existent proof_id
        result = await proof_service.verify(proof_id="non-existent")
        assert result.is_valid is False
        assert "not found" in result.errors[0]
        
        # Test unknown circuit
        valid_proof = {
            "pi_a": ["123", "456", "1"],
            "pi_b": [["789", "012"], ["345", "678"], ["1", "0"]],
            "pi_c": ["901", "234", "1"],
            "protocol": "groth16"
        }
        result = await proof_service.verify(
            proof=valid_proof, 
            public_inputs=["123", "456"], 
            circuit_id="unknown-circuit"
        )
        assert result.is_valid is False
        assert "Circuit not found" in result.errors[0]

    def test_list_circuits(self, proof_service):
        """Test circuit listing functionality"""
        circuits = proof_service.list_circuits()
        assert isinstance(circuits, list)
        assert len(circuits) >= 1
        
        for circuit in circuits:
            assert "id" in circuit
            assert "description" in circuit
            assert "max_attributes" in circuit
            assert "valid" in circuit

    def test_register_circuit(self, proof_service):
        """Test circuit registration"""
        new_circuit = CircuitConfig(
            circuit_id="new-test-circuit",
            wasm_path="/tmp/new_test.wasm",
            zkey_path="/tmp/new_test.zkey",
            verification_key_path="/tmp/new_test_vkey.json",
            description="New test circuit",
            max_attributes=10,
        )
        
        # Override validate for testing
        new_circuit.validate = lambda: True
        
        result = proof_service.register_circuit(new_circuit)
        assert result is True
        
        circuits = proof_service.list_circuits()
        new_circuit_info = next((c for c in circuits if c["id"] == "new-test-circuit"), None)
        assert new_circuit_info is not None
        assert new_circuit_info["max_attributes"] == 10

    @pytest.mark.asyncio
    async def test_full_proof_workflow_mock(self, proof_service, sample_credential):
        """Test the full proof workflow with mocked SnarkJS calls"""
        # Store credential for testing
        proof_service._store_credential(sample_credential)
        
        # Mock the SnarkJS proof generation to avoid external dependencies
        async def mock_generate_snarkjs_proof(circuit, inputs):
            return {
                "pi_a": ["123456789", "987654321", "1"],
                "pi_b": [["111111111", "222222222"], ["333333333", "444444444"], ["1", "0"]],
                "pi_c": ["555555555", "666666666", "1"],
                "protocol": "groth16"
            }, ["777777777", "888888888"]
        
        # Mock the SnarkJS verification
        async def mock_verify_snarkjs_proof(circuit, proof, public_inputs):
            from app.models import VerificationCheck
            return VerificationCheck(
                check_type="cryptographic_verification",
                status=True,
                message="Cryptographic verification successful (mocked)"
            )
        
        # Replace the methods temporarily
        original_generate = proof_service._generate_snarkjs_proof
        original_verify = proof_service._verify_snarkjs_proof
        
        proof_service._generate_snarkjs_proof = mock_generate_snarkjs_proof
        proof_service._verify_snarkjs_proof = mock_verify_snarkjs_proof
        
        try:
            # Generate proof
            proof = await proof_service.generate(
                credential_id=sample_credential.id,
                reveal_attributes=["name", "age"],
                circuit_id="test-circuit"
            )
            
            assert proof.id is not None
            assert proof.credential_id == sample_credential.id
            assert proof.proof_type == ProofType.ZKP
            assert proof.proof_value is not None
            assert proof.public_inputs is not None
            assert len(proof.public_inputs) > 0
            
            # Verify proof by ID
            verification_result = await proof_service.verify(proof_id=proof.id)
            assert verification_result.is_valid is True
            assert len(verification_result.checks) >= 3  # structure, crypto, inputs
            assert all(check.status for check in verification_result.checks)
            
            # Verify proof by value
            verification_result = await proof_service.verify(
                proof=proof.proof_value,
                public_inputs=proof.public_inputs,
                circuit_id="test-circuit"
            )
            assert verification_result.is_valid is True
            
        finally:
            # Restore original methods
            proof_service._generate_snarkjs_proof = original_generate
            proof_service._verify_snarkjs_proof = original_verify 