# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-02-19

### Added
- Wallet-based authentication flow in Credential Hub:
  - `POST /auth/challenge`
  - `POST /auth/verify`
- JWT bearer-token validation for protected operations in Credential Hub.
- Payload anchoring support for credential issuance and proof generation.
- Anchor metadata support in API models (`Credential`, `Proof`, `ProofResponse`).
- New auth service: `services/credential-hub/app/services/auth_service.py`.
- New anchor service: `services/credential-hub/app/services/anchor_service.py`.
- New configuration keys for external anchoring:
  - `anchor_submit_url`
  - `anchor_api_key`
- Full monorepo documentation file:
  - `FULL_CODEBASE_DOCUMENTATION.md`

### Changed
- Credential and proof generation flows now attach anchor metadata in responses.
- Proof service now persists proof anchor metadata in PostgreSQL proof `metadata` JSONB and cache.
- Credential service now records events through shared `StatsService` event path (instead of creating ClickHouse client per operation).
- Stats service now runs ClickHouse operations off the async event loop and uses a consolidated aggregate stats query.

### Fixed
- Removed duplicate FastAPI routes in Credential Hub (`/health`, `/circuits`) and corrected route behavior.
- Corrected invalid PostgreSQL DDL in proof schema setup by replacing inline `INDEX (...)` with valid `CREATE INDEX IF NOT EXISTS ...` statements.
- Added `pgcrypto` extension setup to support `gen_random_uuid()` in proof schema setup.
- Replaced request-path `print(...)` calls with logger-based logging in updated Credential Hub paths.

### Security
- Added signed challenge-response authentication using wallet signatures (EVM-compatible signature verification path).
- Enforced auth checks on credential issuance, credential revocation, proof generation, and proof verification endpoints.

