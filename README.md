# Vagabond-Fuse: Cross-Chain Self-Sovereign Identity Fabric

Vagabond-Fuse is a comprehensive framework for building decentralized identity solutions using the XRP Ledger. It provides a suite of components for managing DIDs, verifiable credentials, and access policies in a secure and interoperable manner.

## Overview

Vagabond-Fuse enables developers to build applications that leverage decentralized identifiers (DIDs) and verifiable credentials on the XRP Ledger. The framework is designed to be modular, extensible, and compliant with W3C standards for DIDs and Verifiable Credentials.

### Key Components

- **DID Gateway**: Manages DIDs on the XRP Ledger
- **Credential Hub**: Issues and verifies credentials
- **Policy Engine**: Enforces access control policies
- **Wallet Kit**: Connects to XRPL wallets

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or pnpm
- Access to XRPL (Testnet, Devnet, or Mainnet)

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
# Start the DID Gateway
cd packages/did-gateway
pnpm start

# Start the Credential Hub
cd services/credential-hub
pnpm start

# Start the Policy Engine
cd services/policy-engine
pnpm start
```

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

Vagabond-Fuse follows a modular architecture with the following layers:

1. **Storage Layer**: XRPL for DID operations and credential anchoring
2. **Protocol Layer**: Implementation of W3C DID and VC standards
3. **Service Layer**: DID Gateway, Credential Hub, and Policy Engine
4. **Application Layer**: Example applications and integration points

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

For detailed documentation, see the [DOCS.md](DOCS.md) file or visit the [documentation site](https://docs.vagabond-fuse.example).

## Support

For support, please open an issue on GitHub or contact the maintainers.
