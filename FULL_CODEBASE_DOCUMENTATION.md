# Vagabond-Fuse Full Codebase Documentation

## 1. Purpose
Vagabond-Fuse is a monorepo for decentralized identity workflows:
- DID lifecycle management
- Verifiable credential issuance and verification
- Zero-knowledge proof generation/verification
- Policy management and evaluation
- Wallet-driven auth and anchoring metadata

The implementation spans TypeScript packages and Python FastAPI services.

## 2. Monorepo Layout
```
Vagabond-Fuse/
├── packages/
│   ├── did-gateway/        # DID drivers and DID gateway interfaces
│   ├── wallet-kit/         # wallet adapters and payment helpers
│   └── policy-utils/       # policy compilation/utilities
├── services/
│   ├── credential-hub/     # credential, proof, policy, stats API
│   └── policy-engine/      # standalone policy CRUD/evaluation API
├── examples/               # sample integrations and demos
├── docs/                   # conceptual documentation
├── package.json            # root scripts for recursive build/test/lint
└── pnpm-workspace.yaml     # workspace includes packages/* and services/*
```

## 3. Build and Tooling

### Root
- Package manager: `pnpm`
- Workspace: `packages/*`, `services/*`
- Root scripts:
  - `pnpm build`
  - `pnpm test`
  - `pnpm lint`

### TypeScript packages
- Bundling: `tsup`
- Testing: `jest`

### Python services
- Runtime: `FastAPI`
- Dependency manager: `poetry`
- Typical run command:
  - `poetry run uvicorn app.main:app --reload`

## 4. Package Documentation

### 4.1 `packages/did-gateway`
- Name: `@fuse/did-gateway`
- Goal: method-agnostic DID operations (`did:ion`, `did:polygon`, `did:xrpl`)
- Core areas:
  - DID method drivers
  - XRPL DID driver implementation in `src/methods/xrpl.ts`
  - Fee handling via `src/lib/fee-service.ts`
- Notable behavior:
  - XRPL driver stores DID payload in XRPL Account `Domain` field (size-constrained)
  - Supports wallet adapter path for transaction signing

### 4.2 `packages/wallet-kit`
- Name: `@fuse/wallet-kit`
- Goal: wallet abstraction for signing/submitting and key operations
- Core areas:
  - `src/lib/wallet-adapter.ts` (wallet interface)
  - `src/lib/payment-service.ts` (token fee/trustline helpers)
  - adapters under `adapters/` (e.g., xumm, ledger)

### 4.3 `packages/policy-utils`
- Name: `@fuse/policy-utils`
- Goal: policy conversion/compilation helpers, including JSON-Logic style workflows

## 5. Service Documentation

## 5.1 `services/credential-hub`
Primary API that currently includes credentials, proofs, policy endpoints, health/metrics, wallet auth, and anchoring metadata.

### Runtime components
- `app/main.py`: FastAPI routes and lifecycle
- `app/services/credential_service.py`: issue/verify/revoke and in-memory state
- `app/services/proof_service.py`: ZK proof generation/verification, DB + Redis access
- `app/services/stats_service.py`: ClickHouse-backed stats/event recording
- `app/services/auth_service.py`: wallet challenge, signature verification, JWT
- `app/services/anchor_service.py`: payload hashing + anchor metadata generation/submission
- `app/database.py`: PostgreSQL/Redis init and migrations
- `app/config.py`: service settings
- `app/models.py`: API schemas

### Data stores
- PostgreSQL: credentials/proofs/circuits/verifications/rate-limit tables
- Redis: proof cache, nonce replay checks, rate-limit sorted sets
- ClickHouse: credential event analytics (`issue`, `verify`, `revoke`)

### Endpoint groups

#### Auth
- `POST /auth/challenge`
  - input: wallet address + chain
  - output: one-time challenge message + challenge id
- `POST /auth/verify`
  - verifies wallet signature and returns bearer token (JWT)

#### Credentials
- `POST /credentials/issue` (protected)
- `POST /credentials/verify` (currently public)
- `GET /credentials/{credential_id}/status`
- `POST /credentials/{credential_id}/revoke` (protected)

#### Proofs
- `POST /proofs/generate` (protected)
- `POST /proofs/verify` (protected)
- `GET /circuits`

#### Policies (in this service)
- `POST /policies`
- `GET /policies`
- `GET /policies/{policy_id}`
- `PUT /policies/{policy_id}`
- `DELETE /policies/{policy_id}`
- `POST /policies/{policy_id}/evaluate`

#### Stats/Health
- `GET /stats`
- `GET /health`
- `GET /metrics/proofs`

### Auth flow (implemented)
1. Client calls `POST /auth/challenge`.
2. Server stores challenge in memory with TTL.
3. Client signs returned message (EVM `personal_sign`-style).
4. Client calls `POST /auth/verify` with signature.
5. Server verifies signature and issues JWT containing DID subject (`did:pkh:<chain>:<address>`).
6. Protected routes validate JWT via bearer auth.

### Anchoring flow (implemented)
1. On credential issue / proof generation, server hashes the payload.
2. If `anchor_submit_url` is configured, payload hash is submitted externally.
3. Otherwise a local fallback anchor record is generated (`network`, `tx_hash`, `payload_hash`, timestamp).
4. Anchor metadata is attached to returned credential/proof and persisted (proof metadata DB path implemented; credential in-memory path implemented).

### Important environment/config keys
From `app/config.py`:
- `postgres_dsn`
- `redis_url`
- `clickhouse_host`, `clickhouse_port`, etc.
- `secret_key`, `algorithm`, `access_token_expire_minutes`
- `anchor_submit_url`, `anchor_api_key`

## 5.2 `services/policy-engine`
Standalone FastAPI policy service.
- CRUD + evaluate endpoints for policies
- Uses `PolicyEvaluator` with WASM policy support (`wasmtime`)
- Main file: `app/main.py`
- Intended for policy-focused deployments independent of credential-hub

## 6. End-to-End Request Paths

### 6.1 Issue credential (protected)
1. Authenticate wallet and obtain JWT.
2. Call `POST /credentials/issue` with bearer token.
3. Service creates credential object + status.
4. Service records issue event (ClickHouse via stats service).
5. Service computes/creates anchor metadata.
6. Response returns credential including `anchor` field.

### 6.2 Generate proof (protected)
1. Call `POST /proofs/generate` with bearer token.
2. Proof service validates request + circuit + integrity.
3. SnarkJS generates proof/public inputs.
4. Proof is stored/cached.
5. Anchor metadata is generated and persisted.
6. Response includes proof, public inputs, and `anchor`.

### 6.3 Verify proof (protected)
1. Call `POST /proofs/verify` with bearer token.
2. Service optionally loads proof by ID.
3. Runs structure, input, cryptographic, and nonce checks.
4. Stores verification outcome.

## 7. Tests and Quality Gates

### TypeScript packages
- Run all package tests:
  - `pnpm test`
- Run package-specific:
  - `pnpm --filter @fuse/did-gateway test`

### Credential hub
- `cd services/credential-hub`
- `poetry run pytest`

### Policy engine
- `cd services/policy-engine`
- `poetry run pytest`

## 8. Operational Notes and Caveats
- Several modules remain scaffold-level in parts of the codebase (especially policy compilation and some wallet/payment paths).
- Credential storage is currently in-memory in `CredentialService`; this is non-durable.
- Auth service challenge store is in-memory; restart clears pending challenges.
- Signature verification currently supports EVM-style signatures in the auth service.
- Anchoring currently supports external adapter mode plus local fallback metadata mode.

## 9. Suggested Production Hardening
1. Move credential/status state to PostgreSQL.
2. Move challenge/session state to Redis.
3. Add XRPL-native signature verification path in auth service.
4. Enforce auth consistently for any route that mutates state.
5. Add integration tests for auth+anchor flows.
6. Add migration for explicit credential anchor column usage in write path.

## 10. Quick Start Commands

### Root
```bash
pnpm install
pnpm build
pnpm test
```

### Credential Hub
```bash
cd services/credential-hub
poetry install
poetry run uvicorn app.main:app --port 8001 --reload
```

### Policy Engine
```bash
cd services/policy-engine
poetry install
poetry run uvicorn app.main:app --port 8001 --reload
```

---
If you want, I can also generate a second document that is purely API reference (request/response JSON examples per endpoint) and keep this one architecture-focused.
