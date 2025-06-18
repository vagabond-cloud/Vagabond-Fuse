#!/bin/bash

# Test script for verifying zero-knowledge proofs

# Set the working directory to the eudi-toolkit directory
cd "$(dirname "$0")"

echo "Testing zero-knowledge proof verification..."

# Check if proof.json exists
if [ ! -f "proof.json" ]; then
  echo "Error: proof.json file not found"
  exit 1
fi

# Extract the proof ID from the proof.json file
PROOF_ID=$(cat proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROOF_ID" ]; then
  echo "Error: Could not extract proof ID from proof.json"
  exit 1
fi

echo "Found proof ID: $PROOF_ID"
echo "Verifying proof..."

# Run the verification command
npm run start -- zkp verify -p "$PROOF_ID"

echo "Verification complete." 