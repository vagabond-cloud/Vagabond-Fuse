# Vagabond-Fuse: Cross-Chain Self-Sovereign Identity Fabric

Vagabond-Fuse is a monorepo for decentralized identity systems. It provides DID, credential, proof, policy, wallet, and anchoring capabilities across TypeScript packages and Python services.

## Overview

Vagabond-Fuse enables developers to build applications that leverage decentralized identifiers (DIDs) and verifiable credentials on the XRP Ledger. The framework is designed to be modular, extensible, and compliant with W3C standards for DIDs and Verifiable Credentials.

### Key Components

- **DID Gateway**: Method-agnostic DID operations (`did:ion`, `did:polygon`, `did:xrpl`)
- **Credential Hub**: Credential issuance/verification, ZK proofs, stats, policy routes, wallet auth, and anchoring metadata
- **Policy Engine**: Standalone policy CRUD/evaluation service with OPA WASM support
- **Wallet Kit**: Wallet adapters and transaction-signing abstractions

## Getting Started

### Prerequisites

- Node.js 18+
- `pnpm`
- Python 3.11+
- Poetry
- Optional: Docker (for local ClickHouse/Redis/Postgres workflows)

### Installation

```bash
# Clone the repository
git clone https://github.com/vagabond-cloud/Vagabond-Fuse.git
cd Vagabond-Fuse

# Install dependencies
pnpm install
```

### Running the Services

```bash
# Install workspace dependencies
pnpm install

# Credential Hub (FastAPI)
cd services/credential-hub
poetry install
poetry run uvicorn app.main:app --port 8001 --reload

# Policy Engine (FastAPI)
cd services/policy-engine
poetry install
poetry run uvicorn app.main:app --port 8002 --reload
```

Credential Hub OpenAPI docs: `http://localhost:8001/api/docs`

## Example Applications

### Identity Verifier

A production-ready implementation of a decentralized identity verification tool. It demonstrates the integration of all Vagabond-Fuse components.

```bash
# Run the Identity Verifier
cd examples/identity-verifier
npx serve
```

For more details, see the [Identity Verifier README](examples/identity-verifier/README.md).

## Architecture

Vagabond-Fuse follows a modular architecture:

1. **Identity layer**: DID methods and DID gateway drivers
2. **Wallet layer**: signing adapters and payment/trustline helpers
3. **Service layer**: Credential Hub + Policy Engine APIs
4. **Data layer**: PostgreSQL, Redis, ClickHouse, and optional external anchor endpoint
5. **Application layer**: examples and integration scripts

## Development

### Project Structure

```
Vagabond-Fuse/
├── docs/               # Documentation
├── examples/           # Example applications
├── packages/           # Core packages
│   ├── did-gateway/    # DID management
│   ├── policy-utils/   # Policy utilities
│   └── wallet-kit/     # Wallet integration
└── services/           # Microservices
    ├── credential-hub/ # Credential management
    └── policy-engine/  # Policy enforcement
```

### Building from Source

```bash
# Build all packages
pnpm build

# Build a specific package
pnpm --filter @vagabond-fuse/did-gateway build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @vagabond-fuse/did-gateway test
```

Service tests:

```bash
cd services/credential-hub && poetry run pytest
cd services/policy-engine && poetry run pytest
```

## Web3 Auth and Anchoring

Credential Hub includes:

- `POST /auth/challenge`: create wallet-signature challenge
- `POST /auth/verify`: verify signature and issue JWT
- Protected routes for issue/revoke/generate-proof/verify-proof
- Payload anchoring metadata for issued credentials and generated proofs

For complete endpoint and flow documentation, see `FULL_CODEBASE_DOCUMENTATION.md`.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Documentation

- High-level docs: [DOCS.md](DOCS.md)
- Full technical map: [FULL_CODEBASE_DOCUMENTATION.md](FULL_CODEBASE_DOCUMENTATION.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)

## Support

For support, please open an issue on GitHub or contact the maintainers.
