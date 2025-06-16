#!/bin/bash

# Run all examples script for Fuse

echo "====================================="
echo "Running Fuse Examples"
echo "====================================="

# Function to run an example with a header
run_example() {
  echo
  echo "====================================="
  echo "Running $1 Example"
  echo "====================================="
  echo
  $2
  echo
  echo "Example completed."
  echo "====================================="
  echo
}

# TypeScript Examples
run_example "Wallet Kit" "npx tsx wallet-example.ts"
run_example "DID Gateway" "npx tsx did-gateway-example.ts"
run_example "DID Gateway XRPL" "npx tsx did-gateway-xrpl-example.ts"
run_example "DID Gateway XRPL Hooks" "npx tsx did-gateway-xrpl-hooks-example.ts"
run_example "Policy Utils" "npx tsx policy-utils-example.ts"
run_example "Integration" "npx tsx integration-example.ts"
run_example "Credential Hub Stats (TypeScript)" "npx tsx credential-hub-stats-example.ts"
run_example "FuseStream Simulation" "npx tsx simulation/fusestream-simulation.ts"
run_example "EU Digital Identity Simulation" "npx tsx simulation/eu-digital-identity-simulation.ts"

# Check if OPA is installed for TypeScript WASM examples
if command -v opa &> /dev/null; then
  run_example "Policy Engine WASM (TypeScript)" "npx tsx policy-engine-wasm-example.ts"
  run_example "Policy Engine Service WASM (TypeScript)" "npx tsx policy-engine-service-wasm-example.ts"
else
  echo "OPA CLI not found. Skipping TypeScript Policy Engine WASM examples."
fi

# Python Examples
if command -v python &> /dev/null; then
  run_example "Credential Hub" "python credential-hub-example.py"
  run_example "Credential Hub Stats" "python credential-hub-stats-example.py"
  run_example "Policy Engine" "python policy-engine-example.py"
  
  # Check if OPA is installed for Python WASM examples
  if command -v opa &> /dev/null; then
    run_example "Policy Engine WASM (Python)" "python policy-engine-wasm-example.py"
    run_example "Policy Engine Service WASM (Python)" "python policy-engine-service-example.py"
    run_example "Policy Engine Real-World" "python policy-engine-real-world-example.py"
  else
    echo "OPA CLI not found. Skipping Python Policy Engine WASM examples."
    echo "To run these examples, install OPA from https://www.openpolicyagent.org/docs/latest/#1-download-opa"
  fi
else
  echo "Python not found. Skipping Python examples."
fi

echo "All examples completed!" 