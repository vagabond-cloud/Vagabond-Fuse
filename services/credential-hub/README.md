# Credential Hub

FastAPI service for credential management with SnarkJS integration.

## Getting Started

### Quick Setup

1. Run the automated setup script:

```bash
./setup.sh
```

This will check prerequisites, install dependencies, and prepare the environment.

2. Set up ClickHouse for statistics:

```bash
# Start ClickHouse server
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server

# Initialize the database and tables
cat setup_clickhouse.sql | docker exec -i clickhouse-server clickhouse-client
```

3. Run the service:

```bash
poetry run uvicorn app.main:app --port 8001 --reload
```

4. Access the API documentation:

```
http://localhost:8001/api/docs
```

### Manual Setup

1. Install Node.js dependencies (for SnarkJS):

```bash
npm install
```

2. Install Python dependencies:

```bash
poetry install
```

3. Continue with steps 2-4 above.

## Features

- Verifiable Credential issuance and verification
- **Production-ready ZKP generation and verification via SnarkJS**
- Credential status management
- DID resolution integration
- Credential statistics via ClickHouse
- Circuit discovery and management
- Comprehensive validation and error handling

**🆕 Production-Ready Proof Service**: The proof logic has been upgraded from placeholder implementation to a fully functional, cryptographically secure service using SnarkJS with Groth16 protocol. See [PROOF_SERVICE.md](./PROOF_SERVICE.md) for detailed documentation.

## Development

### Prerequisites

- Python 3.11+
- Poetry
- Docker (for ClickHouse)

### Setup

```bash
# Install dependencies
poetry install

# Set up ClickHouse (if not already running)
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 clickhouse/clickhouse-server
cat setup_clickhouse.sql | docker exec -i clickhouse-server clickhouse-client

# Run development server
poetry run uvicorn app.main:app --port 8001 --reload
```

### Testing

```bash
# Run tests
poetry run pytest
```

## API Endpoints

### Credentials

- `POST /credentials/issue` - Issue a new verifiable credential
- `POST /credentials/verify` - Verify a credential
- `GET /credentials/{credential_id}/status` - Get credential status
- `POST /credentials/{credential_id}/revoke` - Revoke a credential

### Proofs

- `POST /proofs/generate` - Generate a zero-knowledge proof for selective disclosure
- `POST /proofs/verify` - Verify a zero-knowledge proof cryptographically
- `GET /circuits` - List available ZK circuits

**Production Features:**

- Real SnarkJS integration with Groth16 protocol
- Dynamic circuit discovery and registration
- Comprehensive input validation and error handling
- Asynchronous operations with timeout protection
- Detailed verification checks (structure, cryptographic, inputs)
- Automatic cleanup of temporary files

### Policies

- `POST /policies` - Create a new policy
- `GET /policies/{policy_id}` - Get a policy
- `PUT /policies/{policy_id}` - Update a policy
- `DELETE /policies/{policy_id}` - Delete a policy
- `GET /policies` - List all policies
- `POST /policies/{policy_id}/evaluate` - Evaluate a policy

### Statistics

- `GET /stats` - Get credential statistics

### Other

- `GET /health` - Health check endpoint

## Example: Issuing a Credential

```bash
curl -X POST "http://localhost:8001/credentials/issue" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "did:example:123",
    "issuer_id": "did:example:issuer",
    "claims": {
      "name": "Alice",
      "age": 30,
      "email": "alice@example.com"
    },
    "proof_type": "jwt"
  }'
```

## Example: Creating a Policy

```bash
curl -X POST "http://localhost:8001/policies" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Age Verification",
    "description": "Verify that the user is over 18 years old",
    "rules": [
      {
        "field": "age",
        "operator": ">=",
        "value": 18
      }
    ]
  }'
```

## Troubleshooting

If you encounter ClickHouse connection issues:

1. Make sure the ClickHouse server is running:

   ```bash
   docker ps | grep clickhouse
   ```

2. The service is configured to use no password for the default user, which matches the default Docker container configuration.
