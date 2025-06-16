# Policy Engine WASM Examples

This directory contains examples demonstrating how to use the Policy Engine with OPA WASM integration.

## Prerequisites

1. Install the Open Policy Agent (OPA) CLI:

   - Download from: https://www.openpolicyagent.org/docs/latest/#1-download-opa
   - Make sure `opa` is in your PATH

2. For Python examples:

   - Python 3.8+
   - Install dependencies: `pip install -r requirements.txt`

3. For TypeScript examples:
   - Node.js 16+
   - Install dependencies: `npm install`

## Examples

### 1. Basic WASM Example

#### Python

```
python policy-engine-wasm-example.py
```

This example demonstrates:

- Defining a GDPR policy in Rego
- Compiling the policy to WASM
- Evaluating data against the policy using the OPA WASM SDK
- Understanding policy decisions and reasons

#### TypeScript

```
npx ts-node policy-engine-wasm-example.ts
```

This example demonstrates:

- Defining a GDPR policy in Rego
- Compiling the policy to WASM
- Inspecting the WASM bundle structure
- Simulating policy evaluation (since full OPA WASM integration in TypeScript requires additional libraries)

### 2. Service API Example

#### Python

```
python policy-engine-service-example.py
```

This example demonstrates:

- Using the Policy Engine service API
- Creating and evaluating policies via the service
- Understanding policy decisions and reasons

#### TypeScript

```
npx ts-node policy-engine-service-wasm-example.ts
```

This example demonstrates:

- Using the Policy Engine service API from TypeScript
- Creating and evaluating policies via the service
- Understanding policy decisions and reasons
- Automatic fallback to mock mode if the service is not running

> **Note:** The TypeScript service example includes a mock mode feature that automatically activates if the Policy Engine service is not running. This allows you to run the example and see simulated responses without needing to start the service.

### 3. Real-World Example (Python only)

```
python policy-engine-real-world-example.py
```

This example demonstrates:

- A real-world social network content sharing system
- Using OPA WASM for content access control
- Implementing complex policies with multiple rules

## Implementation Notes

### Handling OPA WASM Bundles

When compiling Rego policies to WASM using the OPA CLI, the output is a gzipped TAR file by default.

#### Python Implementation

The Python implementation uses the `opa-wasm` SDK which handles gzipped bundles automatically. The SDK provides a simple API for loading and evaluating policies.

#### TypeScript Implementation

The TypeScript implementation needs to handle the gzipped TAR format manually:

1. It detects if the file is gzipped by checking the magic bytes (1F 8B)
2. If gzipped, it decompresses the file using zlib
3. It extracts the TAR file to get the actual WASM module
4. It reads the WASM module and verifies the WebAssembly magic bytes (00 61 73 6D)

For a production TypeScript implementation, consider using the `@open-policy-agent/opa-wasm` package which provides a proper integration with OPA WASM modules.

### Service Example Mock Mode

The TypeScript service example includes a mock mode feature that:

1. Automatically checks if the Policy Engine service is running
2. If the service is not available, switches to mock mode
3. Simulates all API responses with realistic data
4. Provides clear feedback about running in mock mode
5. Shows instructions on how to start the actual service

This makes the example more user-friendly and allows you to understand how the API works without needing to set up the full service.

## Further Reading

- OPA Documentation: https://www.openpolicyagent.org/docs/latest/
- OPA WASM: https://www.openpolicyagent.org/docs/latest/wasm/
- Rego Language: https://www.openpolicyagent.org/docs/latest/policy-language/
