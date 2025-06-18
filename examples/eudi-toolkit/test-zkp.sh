#!/bin/bash

# Test script focusing only on ZKP generation and verification

# Set the working directory to the eudi-toolkit directory
cd "$(dirname "$0")"

echo "Current directory: $(pwd)"

# Create a simple credential data file
echo "Creating credential data file..."
cat > credential-data.json << EOL
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "placeOfBirth": "Berlin",
  "issueDate": "$(date +%Y-%m-%d)",
  "expiryDate": "$(date -v+5y +%Y-%m-%d 2>/dev/null || date -d '+5 years' +%Y-%m-%d)",
  "issuingAuthority": "EU Driving Authority",
  "licenseNumber": "DL-123456789",
  "categories": ["B", "AM"],
  "restrictions": ["Requires glasses"],
  "address": {
    "streetAddress": "123 Main Street",
    "locality": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  }
}
EOL

# Create DIDs for issuer and holder
echo "Creating DIDs..."
ISSUER_DID="did:example:issuer123"
HOLDER_DID="did:example:holder456"

# Issue a driving license credential
echo "Issuing driving license credential..."
npm run start -- issue -t DrivingLicense -i "$ISSUER_DID" -s "$HOLDER_DID" -d credential-data.json -o credential.json

# Generate a zero-knowledge proof
echo "Generating zero-knowledge proof..."
npm run start -- zkp generate -c credential.json -r firstName,dateOfBirth -o ./proof.json

# Check if proof.json was created
echo "Checking for proof.json..."
if [ -f "./proof.json" ]; then
  echo "Found proof.json in ./proof.json"
  PROOF_FILE="./proof.json"
elif [ -f "proof.json" ]; then
  echo "Found proof.json in proof.json"
  PROOF_FILE="proof.json"
else
  echo "Error: proof.json file not found"
  exit 1
fi

# Extract the proof ID
echo "Extracting proof ID..."
PROOF_ID=$(cat "$PROOF_FILE" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$PROOF_ID" ]; then
  echo "Error: Could not extract proof ID from $PROOF_FILE"
  exit 1
fi
echo "Found proof ID: $PROOF_ID"

# Verify the proof
echo "Verifying proof..."
npm run start -- zkp verify -p "$PROOF_ID"

echo "Test completed." 