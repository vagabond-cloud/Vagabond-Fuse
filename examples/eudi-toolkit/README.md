# EUDI Toolkit: Secure Digital Identity for the European Digital Identity Ecosystem

## Empowering Digital Identity Management

The EUDI Toolkit is a comprehensive solution for organizations implementing the European Digital Identity framework. This powerful toolkit enables seamless issuance, verification, and management of digital credentials with advanced privacy features.

## Key Features

### 🔐 Secure Identity Management

Create and manage decentralized identifiers (DIDs) on the XRPL blockchain with enterprise-grade security. Our toolkit ensures your digital identity infrastructure meets the highest standards of trust and integrity.

### 📝 Verifiable Credentials

Issue tamper-proof digital credentials that can be instantly verified by any authorized party. Support for multiple credential types makes the toolkit adaptable to any organizational need.

### 🛡️ Privacy by Design

Implement selective disclosure with zero-knowledge proofs, allowing users to share only the necessary information while keeping sensitive data private. Empower your users with control over their personal data.

### ⚖️ Policy-Based Governance

Define and enforce organizational policies using the integrated policy engine. Ensure compliance with regulations while maintaining flexibility for your specific requirements.

## Industry Solutions

### 🚗 Transportation & Travel

Issue digital driving licenses and travel credentials that can be securely stored in digital wallets. Enable seamless hotel check-ins and travel authorizations with privacy-preserving verification.

### 📋 Business & Contracts

Streamline contract signing processes with digital signature authorities. Manage organizational roles and permissions through verifiable digital credentials.

### 💳 Financial Services

Secure payment authorizations and methods with cryptographic proofs. Reduce fraud while improving customer experience through streamlined verification.

### 🎓 Education

Issue tamper-proof diplomas and certificates that can be instantly verified by employers. Eliminate credential fraud while simplifying the verification process.

### 🏥 Healthcare

Manage prescriptions and medical credentials securely with privacy-preserving features. Ensure patient data remains protected while enabling efficient verification.

### 📱 Telecommunications

Simplify SIM registration processes while meeting regulatory requirements. Enhance customer onboarding while maintaining strong identity verification.

## Why Choose EUDI Toolkit?

- **EU Compliance**: Built specifically for the European Digital Identity framework
- **Future-Proof**: Based on W3C standards for long-term interoperability
- **Flexible Integration**: Comprehensive API and command-line interface for seamless integration
- **Privacy-Focused**: Advanced cryptographic techniques protect sensitive user data
- **Comprehensive Solution**: All-in-one toolkit for the complete credential lifecycle

## Get Started Today

The EUDI Toolkit provides everything organizations need to implement secure, privacy-preserving digital identity solutions. Whether you're a government agency, financial institution, healthcare provider, or educational organization, our toolkit offers the tools you need to thrive in the digital identity ecosystem.

_Transform your digital identity infrastructure with EUDI Toolkit – where security meets simplicity._

## Features

- DID (Decentralized Identity) management
- Verifiable Credentials issuance and verification
- Zero-Knowledge Proofs generation and verification
- Credential status management
- Policy enforcement
- Multiple storage adapters (XRPL, ClickHouse)
- CLI interface for common operations

## Installation

```bash
npm install
npm run build
```

## CLI Usage

The toolkit includes a command-line interface for common operations:

```bash
# Run the CLI
npm run start -- [command] [options]
```

### Creating a DID on XRPL

```bash
# Create a new DID with automatic wallet funding
npm run start -- did create -m xrpl

# Create a DID with an existing wallet seed
npm run start -- did create -m xrpl -s <seed>

# Create a DID without automatic funding
npm run start -- did create -m xrpl -n
```

When creating a new DID without providing a seed, the CLI will:

1. Generate a new XRPL wallet
2. Automatically fund it from the XRPL testnet faucet
3. Create a DID associated with that wallet

The automatic wallet funding feature has been fully implemented and tested to work reliably with the XRPL testnet.

For more CLI commands and examples, see the [CLI documentation](examples/README.md).

### Demo Script

To see the automatic wallet funding and DID creation in action, run the demo script:

```bash
./examples/demo.sh
```

This script will:

1. Create an issuer DID with automatic wallet funding
2. Create a holder DID with automatic wallet funding
3. Display the generated DIDs and their seeds

## Web Demo

The toolkit also includes a web demo that showcases the features of the toolkit:

```bash
npm run web-demo
```

Then open your browser to http://localhost:3000

## Examples

Check out the [examples](examples/) directory for more usage examples:

- [CLI Examples](examples/README.md)
- [Demo Script](examples/demo.sh)

## Development

```bash
# Run tests
npm test

# Lint the code
npm run lint
```

## License

MIT

## Documentation

Comprehensive documentation is available in the `docs` directory.

## CLI Tool

The toolkit includes a command-line interface (CLI) for interacting with the various components. The CLI provides commands for:

- Creating and resolving DIDs
- Issuing and verifying credentials
- Generating and verifying zero-knowledge proofs
- Creating and evaluating policies

For detailed usage instructions, see the [CLI README](examples/README.md)

## Demo Script

A demo script is provided to demonstrate the full workflow of the toolkit:

```bash
# Make the script executable
chmod +x examples/demo.sh

# Run the demo with a funded XRPL testnet wallet seed
./examples/demo.sh <funded-wallet-seed>
```

The demo script will:

1. Create issuer and subject DIDs
2. Issue a driving license credential
3. Verify the credential
4. Generate a zero-knowledge proof with selective disclosure
5. Verify the proof
6. Create and evaluate a GDPR data minimization policy

All output files will be saved in the `demo-output` directory.
