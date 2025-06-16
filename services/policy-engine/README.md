# Policy Engine

A FastAPI service for policy execution with OPA WASM.

## Overview

The Policy Engine service provides a way to define, manage, and evaluate policies against input data. It uses Open Policy Agent (OPA) WASM modules to evaluate policies, providing a secure and efficient way to enforce policies.

## Features

- Create, read, update, and delete policies
- Evaluate policies against input data
- Support for OPA WASM modules
- GDPR policy example included

## OPA WASM Integration

The service now includes OPA WASM integration through the `PolicyEvaluator` class. This allows policies to be compiled to WASM and evaluated efficiently. The evaluator supports:

- Loading WASM modules from the filesystem
- Evaluating input data against policies
- Providing detailed reasons for policy decisions

## GDPR Policy Example

A sample GDPR policy is included in the `opa` directory. This policy checks:

- If the user has consented to data processing
- If the purpose of data processing is specified
- If the purpose is allowed for the user

## Development

### Prerequisites

- Python 3.11 or higher
- Poetry (for dependency management)
- OPA CLI (for compiling Rego policies to WASM)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd services/policy-engine

# Install dependencies
poetry install

# Compile the GDPR policy to WASM
opa build -t wasm -e gdpr/allow opa/gdpr.rego -o opa/gdpr.wasm
opa build -t wasm -e gdpr/reasons opa/gdpr.rego -o opa/gdpr_reasons.wasm
```

### Running the Service

```bash
poetry run uvicorn app.main:app --reload
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run tests with coverage
poetry run pytest --cov=app

# Run specific tests
poetry run pytest tests/test_evaluator.py
```

## API Endpoints

- `GET /policies`: List all policies
- `POST /policies`: Create a new policy
- `GET /policies/{policy_id}`: Get a policy by ID
- `PUT /policies/{policy_id}`: Update a policy
- `DELETE /policies/{policy_id}`: Delete a policy
- `POST /policies/{policy_id}/evaluate`: Evaluate a policy against input data

## License

MIT
