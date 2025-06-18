#!/bin/bash

# Simple EUDI Toolkit Demo Script
# This script demonstrates the core functionality of the EUDI Toolkit

# Exit on error
set -e

echo "============================================="
echo "VAGABOND FUSE - EUDI Toolkit Simple Demo"
echo "============================================="
echo "Demonstrating DID Creation, Credential Issuance, and ZKP"
echo "============================================="

# Step 1: Create a DID for the issuer (using mock data for simplicity)
echo -e "\n\n1. Creating issuer DID..."
ISSUER_DID="did:example:issuer123"
echo "Issuer DID: $ISSUER_DID"

# Step 2: Create a DID for the holder (using mock data for simplicity)
echo -e "\n\n2. Creating holder DID..."
HOLDER_DID="did:example:holder456"
echo "Holder DID: $HOLDER_DID"

# Step 3: Create credential data file
echo -e "\n\n3. Creating credential data file..."
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
echo "Created credential data file: credential-data.json"

# Step 4: Issue a driving license credential
echo -e "\n\n4. Issuing driving license credential..."
npm run start -- issue -t DrivingLicense -i "$ISSUER_DID" -s "$HOLDER_DID" -d credential-data.json -o credential.json

# Step 5: Generate a zero-knowledge proof
echo -e "\n\n5. Generating zero-knowledge proof..."
npm run start -- zkp generate -c credential.json -r firstName,dateOfBirth -o proof.json

# Extract the proof ID from the generated proof file
if [ -f "proof.json" ]; then
  PROOF_ID=$(cat proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated proof with ID: $PROOF_ID"
  
  # Step 6: Verify the zero-knowledge proof
  echo -e "\n\n6. Verifying zero-knowledge proof..."
  npm run start -- zkp verify -p "$PROOF_ID"
else
  echo "Error: proof.json file not found after generation"
fi

echo -e "\n\nDemo completed!" 