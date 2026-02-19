from typing import Dict, List, Optional, Any, Tuple
import json
import uuid
import asyncio
import subprocess
import tempfile
import os
import hashlib
import time
from pathlib import Path
from datetime import datetime, timedelta
import logging
from contextlib import asynccontextmanager
import redis.asyncio as redis
from dataclasses import dataclass, asdict
import asyncpg
from asyncpg import Pool
import secrets

from app.models import (
    Credential,
    Proof,
    ProofType,
    VerificationResult,
    VerificationCheck,
)

logger = logging.getLogger(__name__)


@dataclass
class CircuitConfig:
    """Configuration for a ZK circuit"""
    circuit_id: str
    wasm_path: str
    zkey_path: str
    verification_key_path: str
    description: str = ""
    max_attributes: int = 10
    security_level: int = 128
    trusted_setup_hash: Optional[str] = None

    def validate(self) -> bool:
        """Validate that all required files exist and are accessible"""
        paths = [self.wasm_path, self.zkey_path, self.verification_key_path]
        return all(os.path.exists(path) and os.access(path, os.R_OK) for path in paths)

    def get_file_hashes(self) -> Dict[str, str]:
        """Get SHA256 hashes of circuit files for integrity verification"""
        hashes = {}
        for file_key, file_path in [
            ("wasm", self.wasm_path),
            ("zkey", self.zkey_path),
            ("vkey", self.verification_key_path)
        ]:
            try:
                with open(file_path, 'rb') as f:
                    hashes[file_key] = hashlib.sha256(f.read()).hexdigest()
            except Exception as e:
                logger.error(f"Failed to hash {file_key} file: {e}")
                hashes[file_key] = None
        return hashes


class ProofService:
    def __init__(
        self, 
        circuits_dir: str = "circuits", 
        node_path: str = "node",
        postgres_dsn: Optional[str] = None,
        redis_url: Optional[str] = None,
        max_pool_size: int = 20,
        proof_cache_ttl: int = 3600,
        rate_limit_per_minute: int = 60
    ):
        self.circuits_dir = Path(circuits_dir)
        self.node_path = node_path
        self.temp_dir = Path("/tmp/zkp_proofs")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Database configuration
        self.postgres_dsn = postgres_dsn or os.getenv(
            "DATABASE_URL", 
            "postgresql://localhost:5432/credential_hub"
        )
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.max_pool_size = max_pool_size
        self.proof_cache_ttl = proof_cache_ttl
        self.rate_limit_per_minute = rate_limit_per_minute
        
        # Connection pools
        self._db_pool: Optional[Pool] = None
        self._redis_pool: Optional[redis.Redis] = None
        
        # Circuit registry
        self._circuits: Dict[str, CircuitConfig] = {}
        self._circuit_integrity_cache: Dict[str, Dict[str, str]] = {}
        
        # Security
        self._proof_nonces: Dict[str, str] = {}
        self._rate_limits: Dict[str, List[float]] = {}
        
        # Initialize circuits
        self._register_default_circuits()

    async def initialize(self) -> None:
        """Initialize database connections and setup required tables"""
        try:
            # Initialize PostgreSQL connection pool
            self._db_pool = await asyncpg.create_pool(
                self.postgres_dsn,
                min_size=5,
                max_size=self.max_pool_size,
                command_timeout=30,
                server_settings={
                    'jit': 'off',
                    'application_name': 'credential_hub_proof_service'
                }
            )
            
            # Initialize Redis connection
            self._redis_pool = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            
            # Test connections
            async with self._db_pool.acquire() as conn:
                await conn.execute("SELECT 1")
            
            await self._redis_pool.ping()
            
            # Setup database schema
            await self._setup_database_schema()
            
            logger.info("ProofService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize ProofService: {e}")
            raise

    async def close(self) -> None:
        """Close all connections and cleanup resources"""
        try:
            if self._db_pool:
                await self._db_pool.close()
            
            if self._redis_pool:
                await self._redis_pool.close()
                
            # Cleanup temporary files
            for temp_file in self.temp_dir.glob("*"):
                try:
                    temp_file.unlink()
                except Exception:
                    pass
                    
            logger.info("ProofService closed successfully")
            
        except Exception as e:
            logger.error(f"Error closing ProofService: {e}")

    async def _setup_database_schema(self) -> None:
        """Setup required database tables"""
        schema_sql = """
        -- Required for gen_random_uuid()
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        -- Proofs table
        CREATE TABLE IF NOT EXISTS proofs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            credential_id TEXT NOT NULL,
            proof_type TEXT NOT NULL,
            proof_value JSONB NOT NULL,
            public_inputs JSONB NOT NULL,
            circuit_id TEXT,
            challenge TEXT,
            nonce TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            verified_at TIMESTAMP WITH TIME ZONE,
            is_valid BOOLEAN,
            metadata JSONB DEFAULT '{}'::jsonb
        );

        CREATE INDEX IF NOT EXISTS idx_proofs_credential_id ON proofs (credential_id);
        CREATE INDEX IF NOT EXISTS idx_proofs_circuit_id ON proofs (circuit_id);
        CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON proofs (created_at);
        
        -- Circuit configurations table
        CREATE TABLE IF NOT EXISTS circuits (
            circuit_id TEXT PRIMARY KEY,
            wasm_path TEXT NOT NULL,
            zkey_path TEXT NOT NULL,
            verification_key_path TEXT NOT NULL,
            description TEXT DEFAULT '',
            max_attributes INTEGER DEFAULT 10,
            security_level INTEGER DEFAULT 128,
            trusted_setup_hash TEXT,
            file_hashes JSONB DEFAULT '{}'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Proof verification results table
        CREATE TABLE IF NOT EXISTS proof_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            proof_id UUID REFERENCES proofs(id),
            verification_checks JSONB NOT NULL,
            is_valid BOOLEAN NOT NULL,
            verifier_id TEXT,
            verification_time_ms INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_proof_verifications_proof_id ON proof_verifications (proof_id);
        CREATE INDEX IF NOT EXISTS idx_proof_verifications_created_at ON proof_verifications (created_at);
        
        -- Rate limiting table
        CREATE TABLE IF NOT EXISTS rate_limits (
            identifier TEXT PRIMARY KEY,
            request_count INTEGER DEFAULT 0,
            window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        async with self._db_pool.acquire() as conn:
            await conn.execute(schema_sql)

    def _register_default_circuits(self):
        """Register default circuits from the examples directory"""
        # Look for circuits in the examples directory
        examples_circuits_dir = Path("../../../examples/eudi-toolkit/circuits")
        if examples_circuits_dir.exists():
            selective_disclosure_dir = examples_circuits_dir / "selective-disclosure"
            if selective_disclosure_dir.exists():
                circuit = CircuitConfig(
                    circuit_id="selective-disclosure",
                    wasm_path=str(selective_disclosure_dir / "circuit.wasm"),
                    zkey_path=str(selective_disclosure_dir / "circuit_final.zkey"),
                    verification_key_path=str(selective_disclosure_dir / "verification_key.json"),
                    description="Selective disclosure circuit for credential attributes",
                    max_attributes=20,
                    security_level=128
                )
                if circuit.validate():
                    self._circuits["selective-disclosure"] = circuit
                    logger.info(f"Registered circuit: {circuit.circuit_id}")
                else:
                    logger.warning(f"Circuit files not found for {circuit.circuit_id}")

        # Register additional circuits from local circuits directory
        if self.circuits_dir.exists():
            self._load_circuits_from_directory(self.circuits_dir)

    def _load_circuits_from_directory(self, circuits_dir: Path):
        """Load circuit configurations from directory"""
        for circuit_dir in circuits_dir.iterdir():
            if circuit_dir.is_dir():
                config_file = circuit_dir / "config.json"
                if config_file.exists():
                    try:
                        with open(config_file, 'r') as f:
                            config_data = json.load(f)
                        
                        circuit = CircuitConfig(
                            circuit_id=config_data.get("id", circuit_dir.name),
                            wasm_path=str(circuit_dir / config_data.get("wasm_file", "circuit.wasm")),
                            zkey_path=str(circuit_dir / config_data.get("zkey_file", "circuit_final.zkey")),
                            verification_key_path=str(circuit_dir / config_data.get("vkey_file", "verification_key.json")),
                            description=config_data.get("description", ""),
                            max_attributes=config_data.get("max_attributes", 10),
                            security_level=config_data.get("security_level", 128),
                            trusted_setup_hash=config_data.get("trusted_setup_hash")
                        )
                        
                        if circuit.validate():
                            self._circuits[circuit.circuit_id] = circuit
                            logger.info(f"Registered circuit: {circuit.circuit_id}")
                        else:
                            logger.warning(f"Invalid circuit configuration: {circuit.circuit_id}")
                    
                    except Exception as e:
                        logger.error(f"Error loading circuit config from {config_file}: {e}")

    async def _check_rate_limit(self, identifier: str) -> bool:
        """Check if request is within rate limits"""
        try:
            current_time = time.time()
            key = f"rate_limit:{identifier}"
            
            # Get current requests for this identifier
            pipe = self._redis_pool.pipeline()
            pipe.zremrangebyscore(key, 0, current_time - 60)  # Remove old entries
            pipe.zcard(key)  # Count current entries
            pipe.zadd(key, {str(uuid.uuid4()): current_time})  # Add current request
            pipe.expire(key, 60)  # Set expiration
            
            results = await pipe.execute()
            current_count = results[1]
            
            return current_count < self.rate_limit_per_minute
            
        except Exception as e:
            logger.error(f"Rate limiting check failed: {e}")
            return True  # Allow on error

    async def generate(
        self, 
        credential_id: str, 
        reveal_attributes: List[str], 
        circuit_id: Optional[str] = None,
        challenge: Optional[str] = None,
        requester_id: Optional[str] = None
    ) -> Proof:
        """Generate a zero-knowledge proof for selective disclosure"""
        start_time = time.time()
        
        try:
            # Rate limiting
            if requester_id and not await self._check_rate_limit(requester_id):
                raise ValueError("Rate limit exceeded")
            
            # Input validation
            if not credential_id or not reveal_attributes:
                raise ValueError("credential_id and reveal_attributes are required")

            # Get circuit configuration
            circuit_id = circuit_id or "selective-disclosure"
            circuit = self._circuits.get(circuit_id)
            if not circuit:
                raise ValueError(f"Circuit not found: {circuit_id}")

            if not circuit.validate():
                raise ValueError(f"Circuit files missing or inaccessible: {circuit_id}")

            # Validate circuit integrity
            await self._verify_circuit_integrity(circuit)

            # Validate attribute count
            if len(reveal_attributes) > circuit.max_attributes:
                raise ValueError(f"Too many attributes. Maximum: {circuit.max_attributes}")

            # Retrieve credential from database
            credential = await self._get_credential(credential_id)
            if not credential:
                raise ValueError(f"Credential not found: {credential_id}")

            # Generate unique nonce for this proof
            nonce = secrets.token_hex(32)
            
            # Extract revealed attributes from credential
            revealed_data = self._extract_attributes(credential, reveal_attributes)
            
            # Generate cryptographic inputs
            circuit_inputs = await self._prepare_circuit_inputs(
                credential, revealed_data, challenge, nonce
            )

            # Generate the proof using SnarkJS
            proof_value, public_signals = await self._generate_snarkjs_proof(
                circuit, circuit_inputs
            )

            # Create proof record
            proof_id = str(uuid.uuid4())
            proof = Proof(
                id=proof_id,
                credential_id=credential_id,
                proof_type=ProofType.ZKP,
                proof_value=proof_value,
                public_inputs=public_signals,
                circuit_id=circuit_id,
                created_at=datetime.now(),
            )

            # Store proof in database
            await self._store_proof(proof, challenge, nonce, requester_id)
            
            # Cache proof for quick access
            await self._cache_proof(proof)
            
            generation_time = int((time.time() - start_time) * 1000)
            logger.info(f"Generated proof {proof_id} in {generation_time}ms for credential {credential_id}")
            
            return proof

        except Exception as e:
            logger.error(f"Error generating proof: {e}")
            raise

    async def verify(
        self,
        proof_id: Optional[str] = None,
        proof: Optional[Dict[str, Any]] = None,
        public_inputs: Optional[List[str]] = None,
        circuit_id: Optional[str] = None,
        verifier_id: Optional[str] = None
    ) -> VerificationResult:
        """Verify a zero-knowledge proof"""
        start_time = time.time()
        
        try:
            # Rate limiting
            if verifier_id and not await self._check_rate_limit(verifier_id):
                return VerificationResult(
                    is_valid=False,
                    checks=[],
                    errors=["Rate limit exceeded"],
                )

            # Input validation
            if not proof and not proof_id:
                return VerificationResult(
                    is_valid=False,
                    checks=[],
                    errors=["Either proof or proof_id must be provided"],
                )

            # Retrieve proof if only ID provided
            stored_proof = None
            if proof_id:
                stored_proof = await self._get_proof(proof_id)
                if not stored_proof:
                    return VerificationResult(
                        is_valid=False,
                        checks=[],
                        errors=[f"Proof with ID {proof_id} not found"],
                    )
                proof = stored_proof.proof_value
                public_inputs = stored_proof.public_inputs
                circuit_id = circuit_id or stored_proof.circuit_id or "selective-disclosure"

            # Get circuit configuration
            circuit_id = circuit_id or "selective-disclosure"
            circuit = self._circuits.get(circuit_id)
            if not circuit:
                return VerificationResult(
                    is_valid=False,
                    checks=[],
                    errors=[f"Circuit not found: {circuit_id}"],
                )

            # Verify circuit integrity
            try:
                await self._verify_circuit_integrity(circuit)
            except Exception as e:
                return VerificationResult(
                    is_valid=False,
                    checks=[],
                    errors=[f"Circuit integrity check failed: {str(e)}"],
                )

            # Perform verification checks
            checks = []
            
            # 1. Proof structure validation
            structure_check = self._validate_proof_structure(proof)
            checks.append(structure_check)
            
            if not structure_check.status:
                verification_result = VerificationResult(
                    is_valid=False,
                    checks=checks,
                    errors=["Invalid proof structure"],
                )
                await self._store_verification_result(proof_id, verification_result, verifier_id, int((time.time() - start_time) * 1000))
                return verification_result

            # 2. Public inputs validation
            inputs_check = self._validate_public_inputs(public_inputs)
            checks.append(inputs_check)

            # 3. Cryptographic verification using SnarkJS
            crypto_check = await self._verify_snarkjs_proof(
                circuit, proof, public_inputs
            )
            checks.append(crypto_check)

            # 4. Nonce validation (replay attack prevention)
            if stored_proof:
                nonce_check = await self._validate_proof_nonce(stored_proof.id)
                checks.append(nonce_check)

            # Overall verification result
            is_valid = all(check.status for check in checks)
            
            verification_time = int((time.time() - start_time) * 1000)
            verification_result = VerificationResult(
                is_valid=is_valid,
                checks=checks,
                errors=[],
            )
            
            # Store verification result
            await self._store_verification_result(proof_id, verification_result, verifier_id, verification_time)
            
            # Update proof verification status
            if stored_proof:
                await self._update_proof_verification_status(proof_id, is_valid)
            
            logger.info(f"Verification completed in {verification_time}ms: {is_valid} for circuit {circuit_id}")
            
            return verification_result

        except Exception as e:
            logger.error(f"Error verifying proof: {e}")
            return VerificationResult(
                is_valid=False,
                checks=[],
                errors=[f"Verification error: {str(e)}"],
            )

    async def _verify_circuit_integrity(self, circuit: CircuitConfig) -> None:
        """Verify the integrity of circuit files"""
        cache_key = f"circuit_integrity:{circuit.circuit_id}"
        
        # Check cache first
        cached_hashes = await self._redis_pool.hgetall(cache_key)
        current_hashes = circuit.get_file_hashes()
        
        if cached_hashes:
            # Compare with cached hashes
            for file_key, current_hash in current_hashes.items():
                if cached_hashes.get(file_key) != current_hash:
                    raise ValueError(f"Circuit file {file_key} integrity check failed")
        else:
            # Store current hashes in cache
            if all(current_hashes.values()):
                await self._redis_pool.hset(cache_key, mapping=current_hashes)
                await self._redis_pool.expire(cache_key, 3600)  # Cache for 1 hour

    async def _get_credential(self, credential_id: str) -> Optional[Credential]:
        """Retrieve credential from database"""
        try:
            async with self._db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM credentials WHERE id = $1",
                    credential_id
                )
                if row:
                    return Credential(**dict(row))
                return None
        except Exception as e:
            logger.error(f"Error retrieving credential {credential_id}: {e}")
            return None

    async def _store_proof(self, proof: Proof, challenge: Optional[str], nonce: str, requester_id: Optional[str]) -> None:
        """Store proof in database"""
        try:
            metadata = {
                "requester_id": requester_id,
                "challenge": challenge,
                "generation_timestamp": proof.created_at.isoformat()
            }
            
            async with self._db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO proofs (id, credential_id, proof_type, proof_value, public_inputs, 
                                      circuit_id, challenge, nonce, created_at, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, 
                proof.id, proof.credential_id, proof.proof_type.value, 
                json.dumps(proof.proof_value), json.dumps(proof.public_inputs),
                proof.circuit_id, challenge, nonce, proof.created_at, json.dumps(metadata))
                
        except Exception as e:
            logger.error(f"Error storing proof {proof.id}: {e}")
            raise

    async def _get_proof(self, proof_id: str) -> Optional[Proof]:
        """Retrieve proof from database"""
        try:
            # Try cache first
            cached_proof = await self._redis_pool.get(f"proof:{proof_id}")
            if cached_proof:
                proof_data = json.loads(cached_proof)
                return Proof(**proof_data)
            
            # Get from database
            async with self._db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM proofs WHERE id = $1",
                    proof_id
                )
                if row:
                    proof_data = dict(row)
                    proof_data['proof_value'] = json.loads(proof_data['proof_value'])
                    proof_data['public_inputs'] = json.loads(proof_data['public_inputs'])
                    metadata = proof_data.get("metadata") or {}
                    if isinstance(metadata, str):
                        try:
                            metadata = json.loads(metadata)
                        except Exception:
                            metadata = {}
                    if isinstance(metadata, dict) and metadata.get("anchor"):
                        proof_data["anchor"] = metadata["anchor"]
                    proof = Proof(**proof_data)
                    
                    # Cache for future use
                    await self._cache_proof(proof)
                    return proof
                    
                return None
        except Exception as e:
            logger.error(f"Error retrieving proof {proof_id}: {e}")
            return None

    async def _cache_proof(self, proof: Proof) -> None:
        """Cache proof in Redis"""
        try:
            proof_data = {
                "id": proof.id,
                "credential_id": proof.credential_id,
                "proof_type": proof.proof_type.value,
                "proof_value": proof.proof_value,
                "public_inputs": proof.public_inputs,
                "circuit_id": proof.circuit_id,
                "created_at": proof.created_at.isoformat(),
                "anchor": proof.anchor,
            }
            
            await self._redis_pool.setex(
                f"proof:{proof.id}",
                self.proof_cache_ttl,
                json.dumps(proof_data, default=str)
            )
        except Exception as e:
            logger.error(f"Error caching proof {proof.id}: {e}")

    async def set_proof_anchor(self, proof_id: str, anchor: Dict[str, Any]) -> bool:
        """Persist anchor metadata for a proof and update cache."""
        try:
            async with self._db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE proofs
                    SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
                    WHERE id = $1
                    """,
                    proof_id,
                    json.dumps({"anchor": anchor}),
                )

            cached_proof = await self._get_proof(proof_id)
            if cached_proof:
                cached_proof.anchor = anchor
                await self._cache_proof(cached_proof)
            return True
        except Exception as e:
            logger.error(f"Error setting anchor for proof {proof_id}: {e}")
            return False

    async def _store_verification_result(
        self, 
        proof_id: Optional[str], 
        result: VerificationResult, 
        verifier_id: Optional[str],
        verification_time_ms: int
    ) -> None:
        """Store verification result in database"""
        try:
            if not proof_id:
                return
                
            checks_data = [
                {
                    "check_type": check.check_type,
                    "status": check.status,
                    "message": check.message
                }
                for check in result.checks
            ]
            
            async with self._db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO proof_verifications (proof_id, verification_checks, is_valid, 
                                                   verifier_id, verification_time_ms)
                    VALUES ($1, $2, $3, $4, $5)
                """, 
                proof_id, json.dumps(checks_data), result.is_valid, 
                verifier_id, verification_time_ms)
                
        except Exception as e:
            logger.error(f"Error storing verification result for proof {proof_id}: {e}")

    async def _update_proof_verification_status(self, proof_id: str, is_valid: bool) -> None:
        """Update proof verification status"""
        try:
            async with self._db_pool.acquire() as conn:
                await conn.execute("""
                    UPDATE proofs 
                    SET verified_at = NOW(), is_valid = $2
                    WHERE id = $1
                """, proof_id, is_valid)
        except Exception as e:
            logger.error(f"Error updating proof verification status {proof_id}: {e}")

    async def _validate_proof_nonce(self, proof_id: str) -> VerificationCheck:
        """Validate proof nonce to prevent replay attacks"""
        try:
            nonce_key = f"proof_nonce:{proof_id}"
            
            # Check if this proof has already been verified
            already_used = await self._redis_pool.get(nonce_key)
            if already_used:
                return VerificationCheck(
                    check_type="nonce_validation",
                    status=False,
                    message="Proof has already been used (replay attack detected)",
                )
            
            # Mark nonce as used
            await self._redis_pool.setex(nonce_key, 86400, "used")  # 24 hour expiry
            
            return VerificationCheck(
                check_type="nonce_validation",
                status=True,
                message="Nonce validation successful",
            )
            
        except Exception as e:
            return VerificationCheck(
                check_type="nonce_validation",
                status=False,
                message=f"Nonce validation error: {str(e)}",
            )

    def _extract_attributes(self, credential: Credential, reveal_attributes: List[str]) -> Dict[str, Any]:
        """Extract specified attributes from credential"""
        revealed_data = {}
        
        for attr in reveal_attributes:
            if "." in attr:
                # Handle nested attributes
                value = credential.credential_subject
                for part in attr.split("."):
                    if isinstance(value, dict) and part in value:
                        value = value[part]
                    else:
                        value = None
                        break
                
                if value is not None:
                    revealed_data[attr] = value
            else:
                # Handle top-level attributes
                if attr in credential.credential_subject:
                    revealed_data[attr] = credential.credential_subject[attr]
        
        return revealed_data

    async def _prepare_circuit_inputs(
        self, 
        credential: Credential, 
        revealed_data: Dict[str, Any], 
        challenge: Optional[str] = None,
        nonce: str = None
    ) -> Dict[str, Any]:
        """Prepare inputs for the ZK circuit with enhanced security"""
        # Create a hash of the credential for integrity
        credential_hash = hashlib.sha256(
            json.dumps(credential.credential_subject, sort_keys=True).encode()
        ).hexdigest()

        # Convert revealed attributes to circuit-compatible format
        attributes_hash = hashlib.sha256(
            json.dumps(revealed_data, sort_keys=True).encode()
        ).hexdigest()

        # Add nonce for uniqueness
        nonce_hash = hashlib.sha256(nonce.encode()).hexdigest()

        # Prepare circuit inputs
        inputs = {
            "credentialHash": str(int(credential_hash[:16], 16)),
            "attributesHash": str(int(attributes_hash[:16], 16)),
            "nonce": str(int(nonce_hash[:16], 16)),
        }

        # Add challenge if provided
        if challenge:
            challenge_hash = hashlib.sha256(challenge.encode()).hexdigest()
            inputs["challenge"] = str(int(challenge_hash[:16], 16))

        return inputs

    async def _generate_snarkjs_proof(
        self, 
        circuit: CircuitConfig, 
        inputs: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], List[str]]:
        """Generate proof using SnarkJS with enhanced security and error handling"""
        # Create temporary files with secure permissions
        input_file = self.temp_dir / f"input_{uuid.uuid4().hex}.json"
        proof_file = self.temp_dir / f"proof_{uuid.uuid4().hex}.json"
        public_file = self.temp_dir / f"public_{uuid.uuid4().hex}.json"

        try:
            # Write input file with secure permissions
            with open(input_file, 'w') as f:
                json.dump(inputs, f)
            os.chmod(input_file, 0o600)  # Read/write for owner only

            # Enhanced SnarkJS command with security checks
            cmd = [
                self.node_path,
                "-e",
                f"""
                const snarkjs = require('snarkjs');
                const fs = require('fs');

                async function generateProof() {{
                    try {{
                        const input = JSON.parse(fs.readFileSync('{input_file}', 'utf8'));
                        
                        // Validate circuit files exist and are readable
                        if (!fs.existsSync('{circuit.wasm_path}')) {{
                            throw new Error('WASM file not found');
                        }}
                        if (!fs.existsSync('{circuit.zkey_path}')) {{
                            throw new Error('ZKEY file not found');
                        }}
                        
                        const {{ proof, publicSignals }} = await snarkjs.groth16.fullProve(
                            input,
                            '{circuit.wasm_path}',
                            '{circuit.zkey_path}'
                        );
                        
                        // Validate proof structure
                        if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {{
                            throw new Error('Invalid proof structure generated');
                        }}
                        
                        fs.writeFileSync('{proof_file}', JSON.stringify(proof, null, 2));
                        fs.writeFileSync('{public_file}', JSON.stringify(publicSignals, null, 2));
                        
                        console.log('SUCCESS');
                    }} catch (error) {{
                        console.error('ERROR:', error.message);
                        process.exit(1);
                    }}
                }}

                generateProof();
                """
            ]

            # Execute SnarkJS command with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.getcwd()
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=60.0)
            except asyncio.TimeoutError:
                process.kill()
                raise RuntimeError("Proof generation timed out after 60 seconds")

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                raise RuntimeError(f"SnarkJS proof generation failed: {error_msg}")

            # Read and validate generated files
            if not proof_file.exists() or not public_file.exists():
                raise RuntimeError("Proof generation failed: output files not created")

            with open(proof_file, 'r') as f:
                proof_value = json.load(f)
            
            with open(public_file, 'r') as f:
                public_signals = json.load(f)

            # Additional validation
            if not isinstance(proof_value, dict) or not isinstance(public_signals, list):
                raise RuntimeError("Invalid proof format generated")

            return proof_value, public_signals

        except Exception as e:
            logger.error(f"Proof generation failed: {str(e)}")
            raise RuntimeError(f"Proof generation failed: {str(e)}")
        finally:
            # Secure cleanup of temporary files
            for temp_file in [input_file, proof_file, public_file]:
                if temp_file.exists():
                    try:
                        # Overwrite with random data before deletion
                        with open(temp_file, 'wb') as f:
                            f.write(os.urandom(temp_file.stat().st_size))
                        temp_file.unlink()
                    except Exception:
                        pass

    async def _verify_snarkjs_proof(
        self, 
        circuit: CircuitConfig, 
        proof: Dict[str, Any], 
        public_inputs: List[str]
    ) -> VerificationCheck:
        """Verify proof using SnarkJS with enhanced security"""
        # Create temporary files
        proof_file = self.temp_dir / f"verify_proof_{uuid.uuid4().hex}.json"
        public_file = self.temp_dir / f"verify_public_{uuid.uuid4().hex}.json"

        try:
            # Write proof and public inputs to files with secure permissions
            with open(proof_file, 'w') as f:
                json.dump(proof, f)
            with open(public_file, 'w') as f:
                json.dump(public_inputs, f)
            
            os.chmod(proof_file, 0o600)
            os.chmod(public_file, 0o600)

            # Enhanced SnarkJS verification command
            cmd = [
                self.node_path,
                "-e",
                f"""
                const snarkjs = require('snarkjs');
                const fs = require('fs');

                async function verifyProof() {{
                    try {{
                        // Validate files exist
                        if (!fs.existsSync('{circuit.verification_key_path}')) {{
                            throw new Error('Verification key file not found');
                        }}
                        
                        const vKey = JSON.parse(fs.readFileSync('{circuit.verification_key_path}', 'utf8'));
                        const proof = JSON.parse(fs.readFileSync('{proof_file}', 'utf8'));
                        const publicSignals = JSON.parse(fs.readFileSync('{public_file}', 'utf8'));
                        
                        // Validate input structures
                        if (!vKey || !proof || !publicSignals) {{
                            throw new Error('Invalid input structures');
                        }}
                        
                        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
                        
                        console.log(isValid ? 'VALID' : 'INVALID');
                    }} catch (error) {{
                        console.error('ERROR:', error.message);
                        process.exit(1);
                    }}
                }}

                verifyProof();
                """
            ]

            # Execute verification command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.getcwd()
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                process.kill()
                return VerificationCheck(
                    check_type="cryptographic_verification",
                    status=False,
                    message="Verification timed out after 30 seconds",
                )

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown verification error"
                return VerificationCheck(
                    check_type="cryptographic_verification",
                    status=False,
                    message=f"Verification failed: {error_msg}",
                )

            is_valid = stdout.decode('utf-8').strip() == 'VALID'
            
            return VerificationCheck(
                check_type="cryptographic_verification",
                status=is_valid,
                message="Cryptographic verification successful" if is_valid else "Proof is cryptographically invalid",
            )

        except Exception as e:
            return VerificationCheck(
                check_type="cryptographic_verification",
                status=False,
                message=f"Verification error: {str(e)}",
            )
        finally:
            # Secure cleanup
            for temp_file in [proof_file, public_file]:
                if temp_file.exists():
                    try:
                        with open(temp_file, 'wb') as f:
                            f.write(os.urandom(temp_file.stat().st_size))
                        temp_file.unlink()
                    except Exception:
                        pass

    def _validate_proof_structure(self, proof: Dict[str, Any]) -> VerificationCheck:
        """Validate the structure of a Groth16 proof with enhanced checks"""
        required_fields = ["pi_a", "pi_b", "pi_c", "protocol"]
        
        try:
            # Check required fields
            for field in required_fields:
                if field not in proof:
                    return VerificationCheck(
                        check_type="structure_validation",
                        status=False,
                        message=f"Missing required field: {field}",
                    )

            # Validate protocol
            if proof.get("protocol") != "groth16":
                return VerificationCheck(
                    check_type="structure_validation",
                    status=False,
                    message=f"Unsupported protocol: {proof.get('protocol')}",
                )

            # Validate proof elements structure with enhanced checks
            for element, expected_len in [("pi_a", 3), ("pi_b", 3), ("pi_c", 3)]:
                if not isinstance(proof[element], list) or len(proof[element]) != expected_len:
                    return VerificationCheck(
                        check_type="structure_validation",
                        status=False,
                        message=f"Invalid {element} structure",
                    )
                
                # Validate that elements are properly formatted field elements
                for i, coord in enumerate(proof[element]):
                    if element == "pi_b" and i < 2:  # pi_b has nested structure
                        if not isinstance(coord, list) or len(coord) != 2:
                            return VerificationCheck(
                                check_type="structure_validation",
                                status=False,
                                message=f"Invalid {element}[{i}] structure",
                            )
                    elif not isinstance(coord, str):
                        return VerificationCheck(
                            check_type="structure_validation",
                            status=False,
                            message=f"Invalid {element}[{i}] format",
                        )

            return VerificationCheck(
                check_type="structure_validation",
                status=True,
                message="Proof structure is valid",
            )

        except Exception as e:
            return VerificationCheck(
                check_type="structure_validation",
                status=False,
                message=f"Structure validation error: {str(e)}",
            )

    def _validate_public_inputs(self, public_inputs: Optional[List[str]]) -> VerificationCheck:
        """Validate public inputs with enhanced security checks"""
        try:
            if not public_inputs:
                return VerificationCheck(
                    check_type="public_inputs_validation",
                    status=False,
                    message="Public inputs are required",
                )

            if not isinstance(public_inputs, list):
                return VerificationCheck(
                    check_type="public_inputs_validation",
                    status=False,
                    message="Public inputs must be a list",
                )

            # Validate each input is a valid number string and within bounds
            for i, inp in enumerate(public_inputs):
                try:
                    value = int(inp)
                    # Check if value is within valid field element range (simplified check)
                    if value < 0 or value >= 2**254:  # Approximate field size for BN254
                        return VerificationCheck(
                            check_type="public_inputs_validation",
                            status=False,
                            message=f"Public input at index {i} out of field range: {inp}",
                        )
                except ValueError:
                    return VerificationCheck(
                        check_type="public_inputs_validation",
                        status=False,
                        message=f"Invalid public input at index {i}: {inp}",
                    )

            # Check reasonable input count
            if len(public_inputs) > 100:  # Reasonable upper bound
                return VerificationCheck(
                    check_type="public_inputs_validation",
                    status=False,
                    message=f"Too many public inputs: {len(public_inputs)}",
                )

            return VerificationCheck(
                check_type="public_inputs_validation",
                status=True,
                message="Public inputs are valid",
            )

        except Exception as e:
            return VerificationCheck(
                check_type="public_inputs_validation",
                status=False,
                message=f"Public inputs validation error: {str(e)}",
            )

    async def register_circuit(self, circuit: CircuitConfig) -> bool:
        """Register a new circuit configuration with database persistence"""
        try:
            if not circuit.validate():
                logger.error(f"Circuit validation failed for {circuit.circuit_id}")
                return False
            
            # Store circuit configuration in database
            file_hashes = circuit.get_file_hashes()
            
            async with self._db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO circuits (circuit_id, wasm_path, zkey_path, verification_key_path,
                                        description, max_attributes, security_level, trusted_setup_hash,
                                        file_hashes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (circuit_id) DO UPDATE SET
                        wasm_path = EXCLUDED.wasm_path,
                        zkey_path = EXCLUDED.zkey_path,
                        verification_key_path = EXCLUDED.verification_key_path,
                        description = EXCLUDED.description,
                        max_attributes = EXCLUDED.max_attributes,
                        security_level = EXCLUDED.security_level,
                        trusted_setup_hash = EXCLUDED.trusted_setup_hash,
                        file_hashes = EXCLUDED.file_hashes,
                        updated_at = NOW()
                """, 
                circuit.circuit_id, circuit.wasm_path, circuit.zkey_path,
                circuit.verification_key_path, circuit.description, circuit.max_attributes,
                circuit.security_level, circuit.trusted_setup_hash, json.dumps(file_hashes))
            
            self._circuits[circuit.circuit_id] = circuit
            logger.info(f"Registered circuit: {circuit.circuit_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering circuit {circuit.circuit_id}: {e}")
            return False

    async def list_circuits(self) -> List[Dict[str, Any]]:
        """List all available circuits from database"""
        try:
            async with self._db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT circuit_id, description, max_attributes, security_level,
                           is_active, created_at, updated_at
                    FROM circuits
                    WHERE is_active = TRUE
                    ORDER BY created_at DESC
                """)
                
                circuits = []
                for row in rows:
                    circuit_dict = dict(row)
                    circuit = self._circuits.get(circuit_dict['circuit_id'])
                    circuit_dict['valid'] = circuit.validate() if circuit else False
                    circuits.append(circuit_dict)
                
                return circuits
                
        except Exception as e:
            logger.error(f"Error listing circuits: {e}")
            return []

    # Helper method for testing - allows injecting credentials
    def _store_credential(self, credential: Credential):
        """Store a credential for testing purposes"""
        # This would be replaced with proper database storage in production
        pass

    async def get_proof_statistics(self) -> Dict[str, Any]:
        """Get proof generation and verification statistics"""
        try:
            async with self._db_pool.acquire() as conn:
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_proofs,
                        COUNT(CASE WHEN verified_at IS NOT NULL THEN 1 END) as verified_proofs,
                        COUNT(CASE WHEN is_valid = TRUE THEN 1 END) as valid_proofs,
                        AVG(EXTRACT(EPOCH FROM (verified_at - created_at)) * 1000) as avg_verification_time_ms
                    FROM proofs
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                """)
                
                verification_stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_verifications,
                        AVG(verification_time_ms) as avg_verification_time_ms,
                        COUNT(CASE WHEN is_valid = TRUE THEN 1 END) as successful_verifications
                    FROM proof_verifications
                    WHERE created_at >= NOW() - INTERVAL '24 hours'
                """)
                
                return {
                    "proofs": dict(stats) if stats else {},
                    "verifications": dict(verification_stats) if verification_stats else {},
                    "circuits": len(self._circuits),
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting proof statistics: {e}")
            return {} 
