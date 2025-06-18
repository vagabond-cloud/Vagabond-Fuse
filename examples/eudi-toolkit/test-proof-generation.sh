#!/bin/bash

# Test script to understand where proof.json is created

# Set the working directory to the eudi-toolkit directory
cd "$(dirname "$0")"

echo "Current directory: $(pwd)"
echo "Listing files in current directory:"
ls -la

echo -e "\n\nGenerating a zero-knowledge proof..."
npm run start -- zkp generate -c credential.json -r firstName,dateOfBirth -o proof.json

echo -e "\nAfter generating proof, listing files in current directory:"
ls -la

echo -e "\nContent of proof.json:"
cat proof.json

echo -e "\nExtracting proof ID from proof.json:"
PROOF_ID=$(cat proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "Proof ID: $PROOF_ID"

echo -e "\nVerifying proof with ID: $PROOF_ID"
npm run start -- zkp verify -p "$PROOF_ID" 