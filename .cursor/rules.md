# Vagabond-Fuse Cursor Rules (Hybrid Edition)

## 0. Golden Principles

1. **Spec first** – Every DID or VC feature must link to W3C test-suite ID.
2. **Typed edge-to-edge**
   - TypeScript: `strict`, `exactOptionalPropertyTypes`.
   - Python: `pyright --strict` passes.
3. **Side-effect isolation** – Pure helpers in `/lib` (TS) or `/core` (Py).
4. **Polyglot boundary** – Unidirectional JSON (or gRPC) between TS ↔ Py.

## 1. Folder layout

packages/ # TypeScript workspaces
wallet-kit/
did-gateway/
…
services/ # Python FastAPI / worker services
credential-hub/
policy-engine/
apps/ # Example clients / demos
tools/ # Dev scripts, CI helpers

_Never_ create other top-level dirs without updating these rules.

## 2. Coding conventions

| Area    | TypeScript            | Python                                         |
| ------- | --------------------- | ---------------------------------------------- |
| Imports | `@/*` alias           | absolute (`from services.cred_hub import api`) |
| Errors  | `SdkError` subclasses | `SdkError` (shared pydantic model)             |
| Docs    | JSDoc on exports      | doctring w/ example                            |
| Tests   | Jest @ 90 %+          | Pytest + coverage @ 90 %+                      |

## 3. Commit etiquette

feat(wallet-kit): add passkey support
feat(credential-hub): ZK revoke endpoint
fix(did-gateway): resolve uri bug

## 4. Prohibited

- Direct env-var reads outside `config.[ts|py]`.
- Non-deterministic tests (network, random w/o seed).
- `console.log` / `print` in prod code.

## 5. Pull-request checklist

- [ ] Updated `/docs/*` for new DID/VC features
- [ ] Coverage ≥ 90 % both TS & Py
- [ ] `pnpm lint` & `ruff check .` clean

@@ 2. Coding conventions
| Tests | Jest @ 90 %+ | Pytest + coverage @ 90 %+ |

+## 2a. Wallet-adapter interface
+- All external XRPL wallets implement `WalletAdapter` (connect, getPublicKey, sign, submit).
+- New adapters live in `packages/wallet-kit/adapters/<provider>/`.
+- No private keys stored if adapter is active; signing happens inside the wallet.
