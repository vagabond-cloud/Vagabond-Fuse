# EUDI Toolkit CLI Examples

This directory contains examples for using the EUDI Toolkit CLI.

## CLI Usage

The CLI provides a command-line interface for common operations with the EUDI Toolkit.

### Basic Usage

```bash
npm run start -- [command] [options]
```

## Available Commands

### DID Operations

#### Create a DID

```bash
# Create a new DID with automatic wallet funding (XRPL testnet)
npm run start -- did create -m xrpl

# Create a DID with an existing wallet seed
npm run start -- did create -m xrpl -s <seed>

# Create a DID without automatic funding
npm run start -- did create -m xrpl -n
```

When creating a new DID without providing a seed, the CLI will:

1. Generate a new XRPL wallet
2. Automatically fund it from the XRPL testnet faucet (unless `-n` flag is used)
3. Create a DID associated with that wallet

### Credential Operations

#### Issue a Credential

```bash
# Issue a driving license credential
npm run start -- credential issue -t driving-license -s <issuer-seed> -r <recipient-did>
```

#### Verify a Credential

```bash
# Verify a credential
npm run start -- credential verify -c <credential-jwt>
```

### Zero-Knowledge Proof Operations

#### Generate a Proof

```bash
# Generate a ZKP for a driving license credential
npm run start -- zkp generate -c <credential-jwt> -a age -v 25 -p "age >= 18"
```

#### Verify a Proof

```bash
# Verify a ZKP
npm run start -- zkp verify -p <proof-jwt>
```

### Policy Operations

#### Create a Policy

```bash
# Create a GDPR policy
npm run start -- policy create -t gdpr -n "Data Minimization" -d "Ensure only necessary data is collected"
```

#### Evaluate a Policy

```bash
# Evaluate a policy against input data
npm run start -- policy evaluate -i <policy-id> -d <input-data-json>
```

## Demo Script

For a demonstration of the automatic wallet funding and DID creation functionality, see the [demo.sh](demo.sh) script.

Run it with:

```bash
./demo.sh
```

This script will:

1. Create an issuer DID with automatic wallet funding
2. Create a holder DID with automatic wallet funding
3. Display the generated DIDs and their seeds
