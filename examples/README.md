# Fuse Examples

This directory contains example code demonstrating how to use the various components of the Fuse project.

## Getting Started

### Prerequisites

Before running these examples, make sure you have:

1. For TypeScript examples:

   - Node.js (v18+)
   - pnpm (v8+) or npm (v9+)
   - The project dependencies installed

2. For Python examples:
   - Python 3.9+ installed
   - Required Python packages installed

### Installation

#### TypeScript Examples

1. Install the dependencies for the examples:

   ```bash
   cd examples
   pnpm install
   # or with npm
   npm install
   ```

2. This will install:
   - Local package dependencies (`@cs-sif/wallet-kit`, `@cs-sif/did-gateway`, `@cs-sif/policy-utils`)
   - External dependencies like `axios`
   - Development dependencies (`ts-node`, `typescript`)

#### Python Examples

1. Install the required Python packages:
   ```bash
   cd examples
   pip install -r requirements.txt
   ```

## Mock Implementations

To make the examples runnable without requiring the actual packages to be built and linked, we've created mock implementations of all the packages:

- `mocks/wallet-kit.ts` - Mock implementation of the WalletKit package
- `mocks/did-gateway.ts` - Mock implementation of the DID Gateway package
- `mocks/policy-utils.ts` - Mock implementation of the Policy Utils package

These mocks provide the same interfaces as the real packages but with simplified implementations that don't require external dependencies. This allows you to run the examples without setting up the entire development environment.

## Running the Examples

### Running All Examples

To run all examples at once, use the provided shell script:

```bash
./run-all-examples.sh
```

This will run all TypeScript and Python examples in sequence, with clear separation between them.

### TypeScript Examples

You can run the TypeScript examples using the scripts in `package.json` or directly with `ts-node`:

```bash
# Using package scripts
pnpm run wallet
pnpm run did
pnpm run did:xrpl
pnpm run did:xrpl:hooks
pnpm run policy
pnpm run integration
pnpm run credential-hub:stats:ts
pnpm run policy-engine:wasm:ts
pnpm run policy-engine:service:ts

# Or directly with ts-node
npx ts-node wallet-example.ts
npx ts-node did-gateway-example.ts
npx ts-node did-gateway-xrpl-example.ts
npx ts-node did-gateway-xrpl-hooks-example.ts
npx ts-node policy-utils-example.ts
npx ts-node integration-example.ts
npx ts-node credential-hub-stats-example.ts
npx ts-node policy-engine-wasm-example.ts
npx ts-node policy-engine-service-wasm-example.ts
```

### Python Examples

Run the Python examples directly:

```bash
python credential-hub-example.py
python credential-hub-stats-example.py
python policy-engine-example.py
python policy-engine-wasm-example.py
python policy-engine-service-wasm-example.py
python policy-engine-real-world-example.py
```

## Example Descriptions

### Credential Hub Examples

The Credential Hub examples demonstrate how to use the Credential Hub service:

1. **Basic Credential Operations** (`credential-hub-example.py`):

   - Issues verifiable credentials
   - Verifies credentials
   - Generates and verifies zero-knowledge proofs
   - Checks credential status
   - Revokes credentials

2. **Credential Statistics** (`credential-hub-stats-example.py`):
   - Retrieves credential statistics (issued, verified, revoked counts)
   - Issues, verifies, and revokes credentials to see stats change
   - Generates visualizations of credential statistics
   - Demonstrates proper error handling

For more details on the stats example, see the `README-credential-hub-stats.md` file.

### Policy Engine WASM Examples

The Policy Engine WASM examples demonstrate how to use OPA WASM integration with the Policy Engine:

1. **Basic WASM Integration** (`policy-engine-wasm-example.py` / `policy-engine-wasm-example.ts`):

   - Defines a GDPR policy in Rego
   - Compiles the policy to WASM using the OPA CLI
   - Evaluates data against the policy using the PolicyEvaluator
   - Shows detailed policy decisions and reasons

2. **Service API Integration** (`policy-engine-service-wasm-example.py` / `policy-engine-service-wasm-example.ts`):

   - Creates policies with GDPR rules using the service API
   - Evaluates data against policies using the service API
   - Updates policies with new rules
   - Demonstrates policy management workflows

3. **Real-World Application** (`policy-engine-real-world-example.py`):
   - Implements a social network content sharing system (FuseStream)
   - Uses policies for privacy controls, age restrictions, and permissions
   - Shows how to integrate policy evaluation in a real application
   - Tests various access scenarios with different users and content types

Both Python and TypeScript implementations are provided for the basic examples, demonstrating how to integrate OPA WASM in both languages.

For more details on these examples, see the `README-policy-engine-wasm.md` file.

### Integration Example

The `integration-example.ts` file demonstrates a complete workflow using all Vagabond-Fuse components:

1. **Wallet Creation and Key Generation**:

   - Creates a wallet using the WalletKit
   - Generates a SECP256K1 key pair

2. **DID Creation**:

   - Uses the generated keys to create a DID document
   - Creates a DID using the ION method

3. **Policy Definition and Compilation**:

   - Defines an access control policy using JSON Logic
   - Compiles the policy to Rego code

4. **Credential Issuance**:

   - Issues a verifiable credential with the created DID as issuer
   - Includes claims and authorized verifiers

5. **Verification Against Policy**:
   - Verifies the credential signature
   - Evaluates the credential against the policy

This example shows how all components work together in a real-world scenario.

### Wallet Kit Example

The `wallet-example.ts` file demonstrates:

1. **Wallet Creation**:

   - Creates a wallet with secure storage options

2. **Key Management**:

   - Generates cryptographic key pairs
   - Lists keys stored in the wallet
   - Exports keys in different formats (HEX, BASE64)
   - Imports keys from external sources

3. **Signing and Verification**:
   - Signs data using stored keys
   - Verifies signatures with public keys

### DID Gateway Example

The `did-gateway-example.ts` file demonstrates:

1. **DID Creation**:

   - Creates DIDs using different methods (ION, Polygon)
   - Configures verification methods in the DID document

2. **DID Resolution**:

   - Resolves a DID to retrieve its DID document

3. **DID Document Management**:
   - Updates a DID document with new services
   - Deactivates a DID when no longer needed

### DID Gateway XRPL Example

The `did-gateway-xrpl-example.ts` file demonstrates:

1. **XRPL DID Creation**:

   - Creates DIDs using the XRPL method
   - Uses Ed25519 verification keys with the XRPL accounts

2. **XRPL DID Resolution**:

   - Resolves an XRPL DID to retrieve its DID document

3. **XRPL DID Document Management**:

   - Updates an XRPL DID document with service endpoints
   - Deactivates an XRPL DID

4. **XRPL DID Format and Implementation**:
   - Shows the format of XRPL DIDs
   - Explains how XRPL DIDs work with the Domain field
   - Highlights benefits of XRPL DIDs

### DID Gateway XRPL Hooks Example

The `did-gateway-xrpl-hooks-example.ts` file demonstrates advanced usage:

1. **XRPL Hooks Integration**:

   - Deploys a DID management Hook to an XRPL account
   - Shows how to use XRPL Hooks v3 with DIDs

2. **Large DID Document Storage**:

   - Stores DID documents that exceed the Domain field size limit
   - Implements chunking for large documents

3. **Advanced DID Operations**:

   - Sets up authorization rules for DIDs
   - Verifies authorization proofs

4. **Benefits of XRPL Hooks with DIDs**:
   - Explains advantages of using Hooks for DID management
   - Shows how to implement complex DID operations

### Policy Utils Example

The `policy-utils-example.ts` file demonstrates:

1. **Policy Definition**:

   - Defines simple and complex policies using JSON Logic
   - Configures rules with logical operators (AND, OR, etc.)

2. **Policy Compilation**:

   - Compiles JSON Logic policies to Rego code
   - Handles compilation errors

3. **Policy Evaluation**:
   - Evaluates policies against different data scenarios
   - Analyzes evaluation results and reasons

### Credential Hub Example

The `credential-hub-example.py` file demonstrates:

1. **Credential Issuance**:

   - Creates credential requests with claims
   - Issues verifiable credentials

2. **Credential Verification**:

   - Verifies credential signatures and validity

3. **Zero-Knowledge Proofs**:

   - Generates selective disclosure proofs
   - Verifies proofs without revealing all attributes

4. **Credential Status Management**:
   - Checks credential status
   - Revokes credentials when necessary

### Policy Engine Example

The `policy-engine-example.py` file demonstrates:

1. **Policy Registration**:

   - Creates and registered policies with the Policy Engine

2. **Policy Evaluation**:

   - Evaluates policies against different input scenarios
   - Tests access control decisions

3. **Policy Management**:
   - Lists available policies
   - Retrieves policy details
   - Updates existing policies
   - Deletes policies when no longer needed

## XRPL DID with Wallet Adapters Example

This example demonstrates how to use different wallet adapters with the XRPL DID driver.

### Standalone Example (No Dependencies) - Recommended

```bash
# Run the standalone example (mocked implementation for demonstration)
npx ts-node --transpile-only xrpl-did-example-standalone.ts
```

This standalone example demonstrates:

- Using Xumm mobile wallet adapter with XRPL DIDs
- Using Ledger hardware wallet adapter with XRPL DIDs
- Switching between different wallet adapters
- Fallback from wallet adapter to private key

See [xrpl-did-example-standalone.md](./xrpl-did-example-standalone.md) for detailed documentation.

### Full Implementation Example

> **⚠️ Important:** The full implementation example has compatibility issues and is difficult to run directly. We **strongly recommend** using the standalone example above for learning purposes.
>
> The full implementation example requires:
>
> 1. Installing specific dependencies
> 2. Configuring API keys
> 3. Resolving module path issues
> 4. Handling TypeScript compatibility issues
>
> If you still want to explore the full implementation, please refer to the source code at `packages/wallet-kit/examples/xrpl-did-example.ts`.

## Troubleshooting

### Common Issues

1. **Module Not Found Errors**:

   - Ensure you've installed all dependencies with `pnpm install` or `npm install`
   - Check that you're running the examples from the `examples` directory

2. **TypeScript Compilation Errors**:

   - Make sure you're using a compatible TypeScript version (5.x+)
   - Check that the tsconfig.json is properly configured

3. **Service Connection Errors**:
   - The examples include fallback mock data for when services aren't running
   - To test with actual services, start the credential-hub and policy-engine services

### Starting the Services

To run the services for full integration testing:

1. **Credential Hub**:

   ```bash
   cd services/credential-hub
   poetry install
   poetry run uvicorn app.main:app --reload --port 8000
   ```

2. **Policy Engine**:
   ```bash
   cd services/policy-engine
   poetry install
   poetry run uvicorn app.main:app --reload --port 8001
   ```

## Next Steps

After exploring these examples, you can:

1. Integrate these components into your own applications
2. Extend the functionality with additional features
3. Contribute to the Vagabond-Fuse project by improving existing components

## License

MIT
