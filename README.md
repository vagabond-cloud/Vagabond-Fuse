# Vagabond-Fuse

A next-generation AI-native social network with dual-feed experience supporting short text and short-form video "Sparks".

## Project Overview

Vagabond-Fuse is building a social platform with:

- Dual-feed experience: Pulse (chronological) & Wave (recommendation)
- Short text + short-form video "Sparks" (≤15s video)
- AI-powered creator toolchain for frictionless content creation
- Real-time engagement and micro-tipping system

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

## Tech Stack

- **Frontend**: Next.js 15 (web), React Native (mobile)
- **Core APIs**: Go 1.22 + gRPC-Gateway
- **AI Services**: Python ≥3.11 / PyTorch 2.3 with Triton Inference Server
- **Data**: PostgreSQL 16 (users, payments) + ScyllaDB (feed cache) + Kafka
- **Real-Time**: WebSocket + Redis Streams
- **DevOps**: Kubernetes (GKE), Helm, Argo CD, Linkerd
- **Observability**: OpenTelemetry, Grafana Cloud, Prometheus

## Development

### Prerequisites

- Node.js (v18+)
- pnpm (v8+)
- Python (v3.11+)
- Poetry (v1.5+)
- Go 1.22+

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

### Standalone Example (No Dependencies required)

```bash
# Run the standalone example (mocked implementation for demonstration)
npx ts-node --transpile-only examples/xrpl-did-example-standalone.ts
```

This standalone example demonstrates:

- Using Xumm mobile wallet adapter with XRPL DIDs
- Using Ledger hardware wallet adapter with XRPL DIDs
- Switching between different wallet adapters
- Fallback from wallet adapter to private key

For detailed documentation, see [DOCS.md](./DOCS.md) and [START.md](./START.md).

### Full Implementation Example

For a complete implementation with all features, see the [wallet-adapter-example.ts](./wallet-adapter-example.ts) file in the root directory.

## Features

### MVP Feature Set (Phase I)

- Create Spark (text + ≤15s video)
- Auto-captions
- Quote-reply functionality
- Duet/stitch capability
- Pulse (chronological) & Wave (recommendation) feeds with swipe toggle
- Content Genie (draft ideas, trim, caption)
- LLM Concierge (summaries)
- Guardian Shield (pre-publish scan, watermark)
- Block/report functionality
- Invite codes
- TikTok import wizard
- Referral analytics

## Documentation

See [DOCS.md](./DOCS.md) and [START.md](./START.md) for detailed documentation.

## License

MIT
