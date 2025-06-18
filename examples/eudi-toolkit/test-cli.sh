#!/bin/bash

# Test script for the updated CLI

# Set the working directory to the eudi-toolkit directory
cd "$(dirname "$0")"

echo "Testing the updated CLI..."

# Test the zkp verify command with a valid proof ID from proof.json
if [ -f "proof.json" ]; then
  echo -e "\nTesting zkp verify with a valid proof ID from proof.json:"
  PROOF_ID=$(cat proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PROOF_ID" ]; then
    echo "Found proof ID: $PROOF_ID"
    npm run start -- zkp verify -p "$PROOF_ID"
  else
    echo "Error: Could not extract proof ID from proof.json"
  fi
else
  echo "Error: proof.json file not found"
fi

# Test the zkp verify command with a file path
if [ -f "proof.json" ]; then
  echo -e "\nTesting zkp verify with a file path:"
  npm run start -- zkp verify -p "proof.json"
else
  echo "Error: proof.json file not found"
fi

echo -e "\nTesting complete." 