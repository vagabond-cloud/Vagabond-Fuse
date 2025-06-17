# EUDI Toolkit

The EU Digital Identity Wallet Toolkit is a comprehensive set of tools for managing digital identities, verifiable credentials, and zero-knowledge proofs on the XRP Ledger.

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
