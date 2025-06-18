#!/bin/bash

# Simple test script to verify that our fix works

# Set the working directory to the eudi-toolkit directory
cd "$(dirname "$0")"

echo "Testing the fix for zkp verify command..."

# Step 1: Generate a credential
echo "Generating a credential..."
ISSUER_DID="did:example:issuer123"
HOLDER_DID="did:example:holder456"

# Create credential data file
echo "Creating credential data file..."
cat > test-credential-data.json << EOL
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "placeOfBirth": "Berlin"
}
EOL

# Issue a credential
echo "Issuing a credential..."
npm run start -- issue -t DrivingLicense -i "$ISSUER_DID" -s "$HOLDER_DID" -d test-credential-data.json -o test-credential.json

# Step 2: Generate a proof
echo "Generating a proof..."
npm run start -- zkp generate -c test-credential.json -r firstName,dateOfBirth -o test-proof.json

# Step 3: Extract the proof ID
echo "Extracting proof ID..."
if [ -f "test-proof.json" ]; then
  PROOF_ID=$(cat test-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$PROOF_ID" ]; then
    echo "Found proof ID: $PROOF_ID"
    
    # Step 4: Verify the proof
    echo "Verifying proof..."
    npm run start -- zkp verify -p "$PROOF_ID"
  else
    echo "Error: Could not extract proof ID from test-proof.json"
  fi
else
  echo "Error: test-proof.json file not found"
fi

echo "Test completed." 