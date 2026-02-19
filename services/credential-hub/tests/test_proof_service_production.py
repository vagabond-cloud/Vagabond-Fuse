import pytest
import asyncio
import json
import uuid
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
import tempfile
import os
from pathlib import Path

from app.services.proof_service import ProofService, CircuitConfig
from app.models import Credential, Proof, ProofType, VerificationResult
from app.config import get_settings
from app.database import DatabaseManager


@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    settings = Mock()
    settings.postgres_dsn = "postgresql://test:test@localhost:5432/test_db"
    settings.redis_url = "redis://localhost:6379/1"
    settings.database_pool_size = 5
    settings.proof_cache_ttl = 300
    settings.rate_limit_per_minute = 10
    settings.circuits_dir = "test_circuits"
    settings.node_path = "node"
    return settings


@pytest.fixture
def mock_db_manager():
    """Mock database manager for testing"""
    db_manager = Mock(spec=DatabaseManager)
    db_manager.initialize = AsyncMock()
    db_manager.close = AsyncMock()
    db_manager.get_postgres_connection = AsyncMock()
    db_manager.redis = Mock()
    db_manager.redis.ping = AsyncMock()
    db_manager.redis.setex = AsyncMock()
    db_manager.redis.get = AsyncMock(return_value=None)
    db_manager.redis.hgetall = AsyncMock(return_value={})
    db_manager.redis.hset = AsyncMock()
    db_manager.redis.expire = AsyncMock()
    db_manager.redis.zremrangebyscore = AsyncMock()
    db_manager.redis.zcard = AsyncMock(return_value=0)
    db_manager.redis.zadd = AsyncMock()
    db_manager.redis.pipeline = Mock()
    
    # Mock pipeline
    pipeline = Mock()
    pipeline.execute = AsyncMock(return_value=[None, 0, None, None])
    db_manager.redis.pipeline.return_value = pipeline
    
    return db_manager


@pytest.fixture
def sample_credential():
    """Sample credential for testing"""
    return Credential(
        id=str(uuid.uuid4()),
        context=["https://www.w3.org/2018/credentials/v1"],
        type=["VerifiableCredential", "IdentityCredential"],
        issuer="did:example:issuer123",
        issuance_date="2023-01-01T00:00:00Z",
        credential_subject={
            "id": "did:example:subject123",
            "name": "John Doe",
            "age": 30,
            "email": "john@example.com",
            "location": "New York"
        }
    )


@pytest.fixture
def sample_circuit_config():
    """Sample circuit configuration for testing"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # Create mock circuit files
        wasm_file = tmpdir / "circuit.wasm"
        zkey_file = tmpdir / "circuit_final.zkey"
        vkey_file = tmpdir / "verification_key.json"
        
        wasm_file.write_bytes(b"mock wasm content")
        zkey_file.write_bytes(b"mock zkey content")
        vkey_file.write_text('{"mock": "verification key"}')
        
        yield CircuitConfig(
            circuit_id="test-circuit",
            wasm_path=str(wasm_file),
            zkey_path=str(zkey_file),
            verification_key_path=str(vkey_file),
            description="Test circuit",
            max_attributes=10,
            security_level=128
        )


@pytest.fixture
async def proof_service(mock_settings, mock_db_manager):
    """Create proof service instance for testing"""
    with patch('app.services.proof_service.get_settings', return_value=mock_settings):
        service = ProofService(
            postgres_dsn=mock_settings.postgres_dsn,
            redis_url=mock_settings.redis_url,
            max_pool_size=mock_settings.database_pool_size,
            proof_cache_ttl=mock_settings.proof_cache_ttl,
            rate_limit_per_minute=mock_settings.rate_limit_per_minute
        )
        
        # Mock the database manager
        service._db_pool = mock_db_manager
        service._redis_pool = mock_db_manager.redis
        service._is_initialized = True
        
        yield service


class TestCircuitConfig:
    """Test circuit configuration functionality"""
    
    def test_circuit_config_validation_success(self, sample_circuit_config):
        """Test successful circuit validation"""
        assert sample_circuit_config.validate() is True
        
    def test_circuit_config_validation_failure(self):
        """Test circuit validation with missing files"""
        config = CircuitConfig(
            circuit_id="invalid-circuit",
            wasm_path="/nonexistent/circuit.wasm",
            zkey_path="/nonexistent/circuit.zkey",
            verification_key_path="/nonexistent/vkey.json"
        )
        assert config.validate() is False
        
    def test_circuit_file_hashes(self, sample_circuit_config):
        """Test circuit file hash generation"""
        hashes = sample_circuit_config.get_file_hashes()
        assert "wasm" in hashes
        assert "zkey" in hashes
        assert "vkey" in hashes
        assert all(hash_val is not None for hash_val in hashes.values())


class TestProofServiceInitialization:
    """Test proof service initialization"""
    
    @pytest.mark.asyncio
    async def test_initialization_success(self, mock_settings):
        """Test successful service initialization"""
        with patch('app.services.proof_service.asyncpg.create_pool') as mock_pool:
            with patch('app.services.proof_service.aioredis.from_url') as mock_redis:
                mock_pool.return_value = Mock()
                mock_redis.return_value = Mock()
                
                service = ProofService(
                    postgres_dsn=mock_settings.postgres_dsn,
                    redis_url=mock_settings.redis_url
                )
                
                # Mock connections
                mock_conn = AsyncMock()
                mock_pool.return_value.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
                mock_pool.return_value.acquire.return_value.__aexit__ = AsyncMock()
                mock_redis.return_value.ping = AsyncMock()
                
                await service.initialize()
                
                assert service._is_initialized is True
                
    @pytest.mark.asyncio
    async def test_initialization_failure(self, mock_settings):
        """Test service initialization failure"""
        with patch('app.services.proof_service.asyncpg.create_pool') as mock_pool:
            mock_pool.side_effect = Exception("Database connection failed")
            
            service = ProofService(
                postgres_dsn=mock_settings.postgres_dsn,
                redis_url=mock_settings.redis_url
            )
            
            with pytest.raises(Exception):
                await service.initialize()


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    @pytest.mark.asyncio
    async def test_rate_limit_within_bounds(self, proof_service):
        """Test rate limiting within allowed bounds"""
        # Mock Redis pipeline to return count under limit
        pipeline = Mock()
        pipeline.execute = AsyncMock(return_value=[None, 5, None, None])  # 5 < 10 (limit)
        proof_service._redis_pool.pipeline.return_value = pipeline
        
        result = await proof_service._check_rate_limit("test_user")
        assert result is True
        
    @pytest.mark.asyncio
    async def test_rate_limit_exceeded(self, proof_service):
        """Test rate limiting when limit is exceeded"""
        # Mock Redis pipeline to return count over limit
        pipeline = Mock()
        pipeline.execute = AsyncMock(return_value=[None, 15, None, None])  # 15 > 10 (limit)
        proof_service._redis_pool.pipeline.return_value = pipeline
        
        result = await proof_service._check_rate_limit("test_user")
        assert result is False


class TestProofGeneration:
    """Test proof generation functionality"""
    
    @pytest.mark.asyncio
    async def test_proof_generation_success(self, proof_service, sample_credential, sample_circuit_config):
        """Test successful proof generation"""
        # Register the circuit
        proof_service._circuits["test-circuit"] = sample_circuit_config
        
        # Mock credential retrieval
        proof_service._get_credential = AsyncMock(return_value=sample_credential)
        
        # Mock SnarkJS proof generation
        with patch.object(proof_service, '_generate_snarkjs_proof') as mock_snarkjs:
            mock_proof = {"pi_a": ["1", "2", "3"], "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]], "pi_c": ["7", "8", "9"], "protocol": "groth16"}
            mock_public = ["123", "456"]
            mock_snarkjs.return_value = (mock_proof, mock_public)
            
            # Mock database operations
            proof_service._store_proof = AsyncMock()
            proof_service._cache_proof = AsyncMock()
            
            result = await proof_service.generate(
                credential_id=sample_credential.id,
                reveal_attributes=["name", "age"],
                circuit_id="test-circuit"
            )
            
            assert isinstance(result, Proof)
            assert result.credential_id == sample_credential.id
            assert result.proof_type == ProofType.ZKP
            assert result.circuit_id == "test-circuit"
            
    @pytest.mark.asyncio
    async def test_proof_generation_rate_limited(self, proof_service, sample_credential):
        """Test proof generation with rate limiting"""
        # Mock rate limit exceeded
        proof_service._check_rate_limit = AsyncMock(return_value=False)
        
        with pytest.raises(ValueError, match="Rate limit exceeded"):
            await proof_service.generate(
                credential_id=sample_credential.id,
                reveal_attributes=["name"],
                requester_id="test_user"
            )
            
    @pytest.mark.asyncio
    async def test_proof_generation_invalid_circuit(self, proof_service, sample_credential):
        """Test proof generation with invalid circuit"""
        with pytest.raises(ValueError, match="Circuit not found"):
            await proof_service.generate(
                credential_id=sample_credential.id,
                reveal_attributes=["name"],
                circuit_id="nonexistent-circuit"
            )
            
    @pytest.mark.asyncio
    async def test_proof_generation_too_many_attributes(self, proof_service, sample_credential, sample_circuit_config):
        """Test proof generation with too many attributes"""
        # Set circuit max attributes to 2
        sample_circuit_config.max_attributes = 2
        proof_service._circuits["test-circuit"] = sample_circuit_config
        proof_service._get_credential = AsyncMock(return_value=sample_credential)
        
        with pytest.raises(ValueError, match="Too many attributes"):
            await proof_service.generate(
                credential_id=sample_credential.id,
                reveal_attributes=["name", "age", "email"],  # 3 attributes > 2 max
                circuit_id="test-circuit"
            )


class TestProofVerification:
    """Test proof verification functionality"""
    
    @pytest.mark.asyncio
    async def test_proof_verification_success(self, proof_service, sample_circuit_config):
        """Test successful proof verification"""
        # Register the circuit
        proof_service._circuits["test-circuit"] = sample_circuit_config
        
        # Mock valid proof structure
        valid_proof = {
            "pi_a": ["1", "2", "3"],
            "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
            "pi_c": ["7", "8", "9"],
            "protocol": "groth16"
        }
        public_inputs = ["123", "456"]
        
        # Mock circuit integrity check
        proof_service._verify_circuit_integrity = AsyncMock()
        
        # Mock SnarkJS verification
        with patch.object(proof_service, '_verify_snarkjs_proof') as mock_verify:
            from app.models import VerificationCheck
            mock_verify.return_value = VerificationCheck(
                check_type="cryptographic_verification",
                status=True,
                message="Verification successful"
            )
            
            # Mock database operations
            proof_service._store_verification_result = AsyncMock()
            
            result = await proof_service.verify(
                proof=valid_proof,
                public_inputs=public_inputs,
                circuit_id="test-circuit"
            )
            
            assert isinstance(result, VerificationResult)
            assert result.is_valid is True
            assert len(result.checks) > 0
            
    @pytest.mark.asyncio
    async def test_proof_verification_invalid_structure(self, proof_service, sample_circuit_config):
        """Test proof verification with invalid structure"""
        # Register the circuit
        proof_service._circuits["test-circuit"] = sample_circuit_config
        
        # Invalid proof structure (missing required fields)
        invalid_proof = {"invalid": "structure"}
        public_inputs = ["123", "456"]
        
        # Mock circuit integrity check
        proof_service._verify_circuit_integrity = AsyncMock()
        
        # Mock database operations
        proof_service._store_verification_result = AsyncMock()
        
        result = await proof_service.verify(
            proof=invalid_proof,
            public_inputs=public_inputs,
            circuit_id="test-circuit"
        )
        
        assert isinstance(result, VerificationResult)
        assert result.is_valid is False
        assert "Invalid proof structure" in result.errors
        
    @pytest.mark.asyncio
    async def test_proof_verification_circuit_not_found(self, proof_service):
        """Test proof verification with nonexistent circuit"""
        valid_proof = {
            "pi_a": ["1", "2", "3"],
            "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
            "pi_c": ["7", "8", "9"],
            "protocol": "groth16"
        }
        public_inputs = ["123", "456"]
        
        result = await proof_service.verify(
            proof=valid_proof,
            public_inputs=public_inputs,
            circuit_id="nonexistent-circuit"
        )
        
        assert isinstance(result, VerificationResult)
        assert result.is_valid is False
        assert "Circuit not found" in result.errors


class TestCircuitIntegrity:
    """Test circuit integrity verification"""
    
    @pytest.mark.asyncio
    async def test_circuit_integrity_success(self, proof_service, sample_circuit_config):
        """Test successful circuit integrity verification"""
        # Mock cached hashes match current hashes
        current_hashes = sample_circuit_config.get_file_hashes()
        proof_service._redis_pool.hgetall = AsyncMock(return_value=current_hashes)
        
        # Should not raise exception
        await proof_service._verify_circuit_integrity(sample_circuit_config)
        
    @pytest.mark.asyncio
    async def test_circuit_integrity_failure(self, proof_service, sample_circuit_config):
        """Test circuit integrity verification failure"""
        # Mock cached hashes don't match current hashes
        cached_hashes = {"wasm": "different_hash", "zkey": "different_hash", "vkey": "different_hash"}
        proof_service._redis_pool.hgetall = AsyncMock(return_value=cached_hashes)
        
        with pytest.raises(ValueError, match="integrity check failed"):
            await proof_service._verify_circuit_integrity(sample_circuit_config)


class TestSecurityValidation:
    """Test security validation features"""
    
    def test_proof_structure_validation(self, proof_service):
        """Test proof structure validation"""
        # Valid Groth16 proof
        valid_proof = {
            "pi_a": ["1", "2", "3"],
            "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
            "pi_c": ["7", "8", "9"],
            "protocol": "groth16"
        }
        
        result = proof_service._validate_proof_structure(valid_proof)
        assert result.status is True
        
        # Invalid proof (missing fields)
        invalid_proof = {"pi_a": ["1", "2", "3"]}
        
        result = proof_service._validate_proof_structure(invalid_proof)
        assert result.status is False
        
    def test_public_inputs_validation(self, proof_service):
        """Test public inputs validation"""
        # Valid public inputs
        valid_inputs = ["123", "456", "789"]
        
        result = proof_service._validate_public_inputs(valid_inputs)
        assert result.status is True
        
        # Invalid public inputs (not numbers)
        invalid_inputs = ["not_a_number", "456"]
        
        result = proof_service._validate_public_inputs(invalid_inputs)
        assert result.status is False
        
        # Empty inputs
        result = proof_service._validate_public_inputs([])
        assert result.status is False
        
        # Non-list input
        result = proof_service._validate_public_inputs("not_a_list")
        assert result.status is False


class TestDatabaseOperations:
    """Test database operations"""
    
    @pytest.mark.asyncio
    async def test_store_proof(self, proof_service):
        """Test proof storage in database"""
        mock_conn = AsyncMock()
        proof_service._db_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        proof_service._db_pool.acquire.return_value.__aexit__ = AsyncMock()
        
        proof = Proof(
            id=str(uuid.uuid4()),
            credential_id=str(uuid.uuid4()),
            proof_type=ProofType.ZKP,
            proof_value={"test": "proof"},
            public_inputs=["123", "456"],
            circuit_id="test-circuit",
            created_at=datetime.now()
        )
        
        await proof_service._store_proof(proof, "challenge", "nonce", "requester")
        
        # Verify the database insert was called
        mock_conn.execute.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_get_proof_cached(self, proof_service):
        """Test proof retrieval from cache"""
        proof_id = str(uuid.uuid4())
        cached_proof_data = {
            "id": proof_id,
            "credential_id": str(uuid.uuid4()),
            "proof_type": "zkp",
            "proof_value": {"test": "proof"},
            "public_inputs": ["123", "456"],
            "circuit_id": "test-circuit",
            "created_at": "2023-01-01T00:00:00"
        }
        
        # Mock cache hit
        proof_service._redis_pool.get = AsyncMock(return_value=json.dumps(cached_proof_data))
        
        result = await proof_service._get_proof(proof_id)
        
        assert result is not None
        assert result.id == proof_id
        
    @pytest.mark.asyncio
    async def test_get_proof_from_database(self, proof_service):
        """Test proof retrieval from database when not cached"""
        proof_id = str(uuid.uuid4())
        
        # Mock cache miss
        proof_service._redis_pool.get = AsyncMock(return_value=None)
        
        # Mock database retrieval
        mock_conn = AsyncMock()
        mock_row = {
            "id": proof_id,
            "credential_id": str(uuid.uuid4()),
            "proof_type": "zkp",
            "proof_value": '{"test": "proof"}',
            "public_inputs": '["123", "456"]',
            "circuit_id": "test-circuit",
            "created_at": datetime.now(),
            "verified_at": None,
            "is_valid": None,
            "metadata": '{}',
            "challenge": None,
            "nonce": None
        }
        mock_conn.fetchrow = AsyncMock(return_value=mock_row)
        
        proof_service._db_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        proof_service._db_pool.acquire.return_value.__aexit__ = AsyncMock()
        
        # Mock cache set
        proof_service._cache_proof = AsyncMock()
        
        result = await proof_service._get_proof(proof_id)
        
        assert result is not None
        assert result.id == proof_id


class TestCircuitManagement:
    """Test circuit management functionality"""
    
    @pytest.mark.asyncio
    async def test_register_circuit(self, proof_service, sample_circuit_config):
        """Test circuit registration"""
        # Mock database operations
        mock_conn = AsyncMock()
        proof_service._db_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        proof_service._db_pool.acquire.return_value.__aexit__ = AsyncMock()
        
        result = await proof_service.register_circuit(sample_circuit_config)
        
        assert result is True
        assert sample_circuit_config.circuit_id in proof_service._circuits
        mock_conn.execute.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_register_invalid_circuit(self, proof_service):
        """Test registration of invalid circuit"""
        invalid_circuit = CircuitConfig(
            circuit_id="invalid",
            wasm_path="/nonexistent/file.wasm",
            zkey_path="/nonexistent/file.zkey",
            verification_key_path="/nonexistent/file.json"
        )
        
        result = await proof_service.register_circuit(invalid_circuit)
        
        assert result is False
        assert invalid_circuit.circuit_id not in proof_service._circuits
        
    @pytest.mark.asyncio
    async def test_list_circuits(self, proof_service):
        """Test circuit listing"""
        # Mock database query
        mock_conn = AsyncMock()
        mock_rows = [
            {
                "circuit_id": "circuit1",
                "description": "Test circuit 1",
                "max_attributes": 10,
                "security_level": 128,
                "is_active": True,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
        ]
        mock_conn.fetch = AsyncMock(return_value=mock_rows)
        
        proof_service._db_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        proof_service._db_pool.acquire.return_value.__aexit__ = AsyncMock()
        
        # Add circuit to in-memory registry
        proof_service._circuits["circuit1"] = Mock()
        proof_service._circuits["circuit1"].validate = Mock(return_value=True)
        
        result = await proof_service.list_circuits()
        
        assert len(result) == 1
        assert result[0]["circuit_id"] == "circuit1"
        assert result[0]["valid"] is True


@pytest.mark.integration
class TestIntegration:
    """Integration tests"""
    
    @pytest.mark.asyncio
    async def test_full_proof_lifecycle(self, proof_service, sample_credential, sample_circuit_config):
        """Test complete proof generation and verification lifecycle"""
        # Setup
        proof_service._circuits["test-circuit"] = sample_circuit_config
        proof_service._get_credential = AsyncMock(return_value=sample_credential)
        
        # Mock all external dependencies
        with patch.object(proof_service, '_generate_snarkjs_proof') as mock_gen:
            with patch.object(proof_service, '_verify_snarkjs_proof') as mock_verify:
                # Mock proof generation
                mock_proof = {
                    "pi_a": ["1", "2", "3"],
                    "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
                    "pi_c": ["7", "8", "9"],
                    "protocol": "groth16"
                }
                mock_public = ["123", "456"]
                mock_gen.return_value = (mock_proof, mock_public)
                
                # Mock proof verification
                from app.models import VerificationCheck
                mock_verify.return_value = VerificationCheck(
                    check_type="cryptographic_verification",
                    status=True,
                    message="Verification successful"
                )
                
                # Mock database operations
                proof_service._store_proof = AsyncMock()
                proof_service._cache_proof = AsyncMock()
                proof_service._store_verification_result = AsyncMock()
                proof_service._update_proof_verification_status = AsyncMock()
                proof_service._verify_circuit_integrity = AsyncMock()
                proof_service._validate_proof_nonce = AsyncMock(return_value=VerificationCheck(
                    check_type="nonce_validation", status=True, message="Nonce valid"
                ))
                
                # Generate proof
                proof = await proof_service.generate(
                    credential_id=sample_credential.id,
                    reveal_attributes=["name", "age"],
                    circuit_id="test-circuit"
                )
                
                assert proof is not None
                assert proof.proof_type == ProofType.ZKP
                
                # Verify proof
                verification_result = await proof_service.verify(
                    proof=proof.proof_value,
                    public_inputs=proof.public_inputs,
                    circuit_id="test-circuit"
                )
                
                assert verification_result.is_valid is True
                assert len(verification_result.checks) > 0


class TestProofService:
    """Test proof service functionality"""
    
    @pytest.mark.asyncio
    async def test_proof_generation_validation(self):
        """Test proof generation input validation"""
        service = ProofService()
        
        # Test empty credential_id
        with pytest.raises(ValueError, match="credential_id is required"):
            await service.generate("", ["name"])
        
        # Test empty reveal_attributes
        with pytest.raises(ValueError, match="reveal_attributes cannot be empty"):
            await service.generate("test-cred", [])
    
    def test_proof_structure_validation(self):
        """Test proof structure validation"""
        service = ProofService()
        
        # Valid Groth16 proof
        valid_proof = {
            "pi_a": ["1", "2", "3"],
            "pi_b": [["1", "2"], ["3", "4"], ["5", "6"]],
            "pi_c": ["7", "8", "9"],
            "protocol": "groth16"
        }
        
        result = service._validate_proof_structure(valid_proof)
        assert result.status is True
        
        # Invalid proof (missing fields)
        invalid_proof = {"pi_a": ["1", "2", "3"]}
        
        result = service._validate_proof_structure(invalid_proof)
        assert result.status is False
        
    def test_public_inputs_validation(self):
        """Test public inputs validation"""
        service = ProofService()
        
        # Valid public inputs
        valid_inputs = ["123", "456", "789"]
        
        result = service._validate_public_inputs(valid_inputs)
        assert result.status is True
        
        # Invalid public inputs (not numbers)
        invalid_inputs = ["not_a_number", "456"]
        
        result = service._validate_public_inputs(invalid_inputs)
        assert result.status is False
        
        # Empty inputs
        result = service._validate_public_inputs([])
        assert result.status is False
        
        # Non-list input
        result = service._validate_public_inputs("not_a_list")
        assert result.status is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 