# Production-Ready Proof Service

This document describes the production-ready zero-knowledge proof service implementation for the Credential Hub. The service provides cryptographically secure proof generation and verification using SnarkJS with Groth16 protocol.

## Overview

The proof service enables **selective disclosure** of credential attributes through zero-knowledge proofs, allowing users to prove possession of certain attributes without revealing the entire credential or other sensitive information.

### Key Features

- 🔐 **Cryptographic Security**: Uses Groth16 zk-SNARKs for secure proof generation
- ⚡ **High Performance**: Asynchronous proof operations with timeout protection
- 🔧 **Circuit Management**: Dynamic circuit registration and validation
- 🛡️ **Input Validation**: Comprehensive validation of proofs, inputs, and structures
- 📊 **Error Handling**: Detailed error reporting and logging
- 🧪 **Testing Support**: Comprehensive test suite with mocking capabilities
- 🔄 **Integration Ready**: Seamless integration with existing SnarkJS circuits

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   ProofService   │    │   SnarkJS       │
│   Endpoints     │───▶│   (Python)       │───▶│   (Node.js)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │   Circuit        │
                       │   Management     │
                       └──────────────────┘
                               │
                               ▼
                       ┌──────────────────┐
                       │   File System    │
                       │   (.wasm, .zkey, │
                       │    vkey.json)    │
                       └──────────────────┘
```

## Circuit Configuration

### Automatic Discovery

The service automatically discovers and registers circuits from:

1. **Examples Directory**: `../../../examples/eudi-toolkit/circuits/`
2. **Local Circuits Directory**: `./circuits/` (configurable)

### Circuit Files Required

For each circuit, the following files are needed:

- **`circuit.wasm`**: WebAssembly compiled circuit
- **`circuit_final.zkey`**: Proving key for Groth16
- **`verification_key.json`**: Verification key for proof validation

### Circuit Configuration Format

```json
{
  "id": "selective-disclosure",
  "wasm_file": "circuit.wasm",
  "zkey_file": "circuit_final.zkey",
  "vkey_file": "verification_key.json",
  "description": "Selective disclosure circuit for credential attributes",
  "max_attributes": 20
}
```

## API Endpoints

### 1. Generate Proof

**POST** `/proofs/generate`

Generate a zero-knowledge proof for selective disclosure of credential attributes.

```json
{
  "credential_id": "urn:uuid:credential-123",
  "reveal_attributes": ["name", "age", "address.city"],
  "circuit_id": "selective-disclosure",
  "challenge": "optional-challenge-string"
}
```

**Response:**

```json
{
  "proof_id": "proof-456",
  "proof": {
    "pi_a": ["...", "...", "1"],
    "pi_b": [
      ["...", "..."],
      ["...", "..."],
      ["1", "0"]
    ],
    "pi_c": ["...", "...", "1"],
    "protocol": "groth16"
  },
  "public_inputs": ["123...", "456..."]
}
```

### 2. Verify Proof

**POST** `/proofs/verify`

Verify a zero-knowledge proof cryptographically.

```json
{
  "proof_id": "proof-456",
  "proof": {
    /* proof object */
  },
  "public_inputs": ["123...", "456..."],
  "circuit_id": "selective-disclosure"
}
```

**Response:**

```json
{
  "is_valid": true,
  "checks": [
    {
      "check_type": "structure_validation",
      "status": true,
      "message": "Proof structure is valid"
    },
    {
      "check_type": "cryptographic_verification",
      "status": true,
      "message": "Cryptographic verification successful"
    },
    {
      "check_type": "public_inputs_validation",
      "status": true,
      "message": "Public inputs are valid"
    }
  ],
  "errors": []
}
```

### 3. List Circuits

**GET** `/circuits`

List all available zero-knowledge proof circuits.

**Response:**

```json
[
  {
    "id": "selective-disclosure",
    "description": "Selective disclosure circuit for credential attributes",
    "max_attributes": 20,
    "valid": true
  }
]
```

## Implementation Details

### ProofService Class

```python
class ProofService:
    def __init__(self, circuits_dir: str = "circuits", node_path: str = "node"):
        """Initialize proof service with circuit discovery."""

    async def generate(self, credential_id: str, reveal_attributes: List[str],
                      circuit_id: Optional[str] = None,
                      challenge: Optional[str] = None) -> Proof:
        """Generate a zero-knowledge proof."""

    async def verify(self, proof_id: Optional[str] = None,
                    proof: Optional[Dict[str, Any]] = None,
                    public_inputs: Optional[List[str]] = None,
                    circuit_id: Optional[str] = None) -> VerificationResult:
        """Verify a zero-knowledge proof."""
```

### Key Methods

#### Circuit Management

- `register_circuit()`: Register new circuits dynamically
- `list_circuits()`: Get available circuits and their status
- `_load_circuits_from_directory()`: Auto-discover circuits

#### Proof Operations

- `_generate_snarkjs_proof()`: Interface with SnarkJS for proof generation
- `_verify_snarkjs_proof()`: Interface with SnarkJS for verification
- `_prepare_circuit_inputs()`: Convert credential data to circuit inputs

#### Validation

- `_validate_proof_structure()`: Validate Groth16 proof format
- `_validate_public_inputs()`: Validate public input format
- `_extract_attributes()`: Extract selective attributes from credentials

## Security Features

### 1. Input Validation

- Credential existence validation
- Attribute count limits per circuit
- Proof structure validation (Groth16 format)
- Public inputs format validation

### 2. Cryptographic Verification

- Uses SnarkJS for actual cryptographic verification
- Validates against circuit verification keys
- Supports challenge-response protocols

### 3. Error Handling

- Comprehensive error messages
- Timeout protection for long operations
- Proper cleanup of temporary files
- Detailed logging for debugging

### 4. Resource Management

- Temporary file cleanup
- Process timeout handling
- Memory-efficient operations
- Concurrent operation support

## Setup and Installation

### Prerequisites

1. **Node.js 16+** with npm
2. **Python 3.11+** with Poetry
3. **Circuit files** (wasm, zkey, verification key)

### Installation

```bash
# Run the setup script
./setup.sh

# Or manually:
npm install          # Install SnarkJS
poetry install       # Install Python dependencies
mkdir -p circuits    # Create circuits directory
```

### Environment Configuration

```bash
# Optional environment variables
export CIRCUITS_DIR="./circuits"
export NODE_PATH="node"
export ZKP_TEMP_DIR="/tmp/zkp_proofs"
```

## Testing

### Unit Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=app --cov-report=html

# Run specific test
poetry run pytest tests/test_proof_service.py::TestProofService::test_full_proof_workflow_mock
```

### Test Features

- **Mocked SnarkJS**: Tests run without requiring actual circuit files
- **Comprehensive Coverage**: Tests all major functionality
- **Error Scenarios**: Tests validation and error handling
- **Integration Tests**: Tests full proof workflow

## Production Deployment

### Performance Considerations

1. **Circuit Caching**: Circuits are loaded once at startup
2. **Async Operations**: All proof operations are asynchronous
3. **Timeout Protection**: 30s for generation, 15s for verification
4. **Resource Cleanup**: Automatic cleanup of temporary files

### Monitoring

1. **Logging**: Comprehensive logging with structured messages
2. **Metrics**: Track proof generation/verification success rates
3. **Health Checks**: Circuit availability validation
4. **Error Tracking**: Detailed error reporting

### Scaling

1. **Horizontal Scaling**: Stateless service design
2. **Circuit Distribution**: Shared circuit file storage
3. **Database Integration**: Replace in-memory storage
4. **Load Balancing**: Support for multiple instances

## Error Codes and Troubleshooting

### Common Errors

| Error                     | Cause                        | Solution                                   |
| ------------------------- | ---------------------------- | ------------------------------------------ |
| `Circuit not found`       | Invalid circuit_id           | Check available circuits via `/circuits`   |
| `Circuit files missing`   | Missing wasm/zkey/vkey files | Ensure all circuit files are present       |
| `Too many attributes`     | Exceeds circuit limit        | Reduce attributes or use different circuit |
| `Credential not found`    | Invalid credential_id        | Verify credential exists                   |
| `Proof generation failed` | SnarkJS error                | Check circuit inputs and files             |
| `Verification timed out`  | Network/performance issue    | Retry or check system resources            |

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger("app.services.proof_service").setLevel(logging.DEBUG)
```

## Integration Examples

### Basic Proof Generation

```python
from app.services.proof_service import ProofService

# Initialize service
proof_service = ProofService()

# Store a test credential
proof_service._store_credential(credential)

# Generate proof
proof = await proof_service.generate(
    credential_id="credential-123",
    reveal_attributes=["name", "age"],
    circuit_id="selective-disclosure"
)

# Verify proof
result = await proof_service.verify(proof_id=proof.id)
print(f"Proof valid: {result.is_valid}")
```

### Custom Circuit Registration

```python
from app.services.proof_service import CircuitConfig

# Create circuit config
custom_circuit = CircuitConfig(
    circuit_id="custom-disclosure",
    wasm_path="./circuits/custom/circuit.wasm",
    zkey_path="./circuits/custom/circuit.zkey",
    verification_key_path="./circuits/custom/vkey.json",
    description="Custom selective disclosure circuit",
    max_attributes=15
)

# Register circuit
proof_service.register_circuit(custom_circuit)
```

## Future Enhancements

### Planned Features

1. **Circuit Versioning**: Support multiple versions of the same circuit
2. **Batch Operations**: Generate/verify multiple proofs in parallel
3. **Circuit Hot-Reload**: Dynamic circuit updates without restart
4. **Advanced Caching**: Redis-based proof caching
5. **Metrics Dashboard**: Real-time monitoring and analytics
6. **Circuit Marketplace**: Discovery and sharing of circuits

### Performance Optimizations

1. **Circuit Precompilation**: Pre-load frequently used circuits
2. **GPU Acceleration**: Support for GPU-based proof generation
3. **Edge Computing**: Distribute proof generation closer to users
4. **WebAssembly Optimization**: Optimize circuit execution

## Support and Contribution

For issues, feature requests, or contributions, please refer to the main repository documentation and contribution guidelines.

---

**Note**: This implementation provides a production-ready foundation for zero-knowledge proof operations. For specific use cases or advanced requirements, additional customization may be needed.
