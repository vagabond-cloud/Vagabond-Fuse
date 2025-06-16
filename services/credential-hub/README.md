# Credential Hub

FastAPI service for credential management with SnarkJS integration.

## Getting Started

1. Install dependencies:

```bash
poetry install
```

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

## Features

- Verifiable Credential issuance and verification
- ZKP generation and verification via SnarkJS
- Credential status management
- DID resolution integration
- Credential statistics via ClickHouse

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

- `POST /proofs/generate` - Generate a zero-knowledge proof
- `POST /proofs/verify` - Verify a proof

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
