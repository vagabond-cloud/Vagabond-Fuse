# Fuse Monorepo

This repository contains the core components for the Fuse project.

## Repository Structure

- `packages/`: TypeScript packages

  - `wallet-kit/`: React-Native + WASM key store
  - `did-gateway/`: Method-agnostic CRUD for DIDs (did:ion & did:polygon)
  - `policy-utils/`: JSON-Logic helpers that compile to Rego WASM

- `services/`: Python services

  - `credential-hub/`: FastAPI service for credential management with SnarkJS
  - `policy-engine/`: FastAPI service for policy execution with OPA WASM

- `examples/`: Sample code demonstrating usage of all components
  - TypeScript examples for each package
  - Python examples for each service
  - Integration example showing complete workflow

## Development

### Prerequisites

- Node.js (v18+)
- pnpm (v8+)
- Python (v3.11+)
- Poetry (v1.5+)

### Setup

```bash
# Install dependencies
pnpm install

# Install Python dependencies
cd services/credential-hub && poetry install && cd ../..
cd services/policy-engine && poetry install && cd ../..
```

### Commands

```bash
# Run tests across all packages and services
pnpm test

# Run linting across all packages and services
pnpm lint

# Build all packages and services
pnpm build

# Clean build artifacts
pnpm clean
```

### Examples

See the [examples](./examples) directory for usage examples:

- [DID Gateway Example](./examples/did-gateway-example.ts)
- [XRPL DID Example](./examples/did-gateway-xrpl-example.ts)
- [XRPL DID with Hooks Example](./examples/did-gateway-xrpl-hooks-example.ts)
- [XRPL DID with Wallet Adapters Example](./examples/xrpl-did-example-standalone.ts) - Demonstrates using Xumm and Ledger wallet adapters
- [Policy Utils Example](./examples/policy-utils-example.ts)
- [Wallet Example](./examples/wallet-example.ts)
- [Integration Example](./examples/integration-example.ts)
- [Credential Hub Example](./examples/credential-hub-example.py)
- [Policy Engine Example](./examples/policy-engine-example.py)
- [Policy Engine Real-World Example](./examples/policy-engine-real-world-example.py)
- [Policy Engine Service Example](./examples/policy-engine-service-example.py)
- [Policy Engine WebAssembly Example](./examples/policy-engine-wasm-example.py)
- [Policy Engine WebAssembly TypeScript Example](./examples/policy-engine-wasm-example.ts)
- [Policy Engine Service WebAssembly Example](./examples/policy-engine-service-wasm-example.py)
- [Policy Engine Service WebAssembly TypeScript Example](./examples/policy-engine-service-wasm-example.ts)
- [Credential Hub Stats Example (Python)](./examples/credential-hub-stats-example.py)
- [Credential Hub Stats Example (TypeScript)](./examples/credential-hub-stats-example.ts)

## XRPL DID with Wallet Adapters Example

This example demonstrates how to use different wallet adapters with the XRPL DID driver.

### Standalone Example (No Dependencies)

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

## License

MIT
