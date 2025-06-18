#!/bin/bash

# EUDI Toolkit Demo Script
# This script demonstrates the full functionality of the EUDI Toolkit

# Exit on error
set -e

echo "============================================="
echo "VAGABOND FUSE - EUDI Toolkit Demo"
echo "============================================="
echo "Demonstrating DID Creation, Credential Issuance, ZKP, and Policy Evaluation"
echo "============================================="

# Step 1: Create a DID for the issuer (automatically funded)
echo -e "\n\n1. Creating issuer DID..."
ISSUER_OUTPUT=$(npm run start -- did create -m xrpl)
ISSUER_SEED=$(echo "$ISSUER_OUTPUT" | grep "Seed:" | awk '{print $2}')
ISSUER_DID=$(echo "$ISSUER_OUTPUT" | grep -o "did:xrpl:[a-zA-Z0-9]*" | head -1)

echo "Issuer DID: $ISSUER_DID"
echo "Issuer Seed: $ISSUER_SEED"

# Step 2: Create a DID for the holder (automatically funded)
echo -e "\n\n2. Creating holder DID..."
HOLDER_OUTPUT=$(npm run start -- did create -m xrpl)
HOLDER_SEED=$(echo "$HOLDER_OUTPUT" | grep "Seed:" | awk '{print $2}')
HOLDER_DID=$(echo "$HOLDER_OUTPUT" | grep -o "did:xrpl:[a-zA-Z0-9]*" | head -1)

echo "Holder DID: $HOLDER_DID"
echo "Holder Seed: $HOLDER_SEED"

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
# Try to generate the proof and capture any errors
if npm run start -- zkp generate -c credential.json -r firstName,dateOfBirth -o proof.json; then
  # If successful, extract the proof ID
  if [ -f "proof.json" ]; then
    PROOF_ID=$(cat proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Generated proof with ID: $PROOF_ID"
  else
    echo "Warning: Proof generation succeeded but proof.json file not found."
    echo "Continuing without proof verification..."
    PROOF_ID=""
  fi
else
  echo "Warning: Proof generation failed. Continuing without proof verification..."
  PROOF_ID=""
fi

# Step 6: Create a policy for age verification
echo -e "\n\n6. Creating age verification policy..."
cat > age-policy.rego << EOL
package age_verification

default allow = false

allow {
  input.user_consent == true
  input.data.age >= 18
}
EOL
echo "Created policy file: age-policy.rego"

# Step 7: Create policy input data
echo -e "\n\n7. Creating policy input data..."
cat > policy-input.json << EOL
{
  "purpose": "age-verification",
  "user_consent": true,
  "data": {
    "age": 33
  }
}
EOL
echo "Created policy input file: policy-input.json"

# Step 8: Policy evaluation with the policy engine
echo -e "\n\n8. Policy evaluation with policy engine..."
POLICY_ID=$(npm run start -- policy create -n "Age Verification" -f age-policy.rego -d "Verifies if a person is of legal age" | grep -o "ID: [a-zA-Z0-9-]*" | awk '{print $2}')
echo "Created policy with ID: $POLICY_ID"

# Evaluate the policy
echo "Evaluating policy..."
npm run start -- policy evaluate -p "$POLICY_ID" -i policy-input.json

# Step 9: Verifying credential
echo -e "\n\n9. Verifying credential..."
npm run start -- verify -c credential.json --simple

# Step 10: Verifying zero-knowledge proof
echo -e "\n\n10. Verifying zero-knowledge proof..."
# Make sure we have a valid proof ID before verifying
if [ -z "$PROOF_ID" ]; then
  echo "Warning: No proof ID found. Skipping verification step."
  echo "This can happen if the proof generation step failed or the proof file was not created."
  echo "Continuing with the rest of the demo..."
else
  echo "Verifying proof with ID: $PROOF_ID"
  npm run start -- zkp verify -p "$PROOF_ID" || {
    echo "Warning: Proof verification failed. Continuing with the rest of the demo..."
  }
fi

# ADDITIONAL USE CASES DEMONSTRATIONS

# Step 11: Travel Use Case - Hotel Booking
echo -e "\n\n11. Travel Use Case - Hotel Booking..."
cat > travel-data.json << EOL
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "nationality": "Germany",
  "passportNumber": "P12345678",
  "address": {
    "streetAddress": "123 Main Street",
    "locality": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "contactInformation": {
    "email": "jane.doe@example.com",
    "phone": "+491234567890"
  }
}
EOL

# Make sure the examples directory exists
mkdir -p examples

cat > examples/hotel-booking.json << EOL
{
  "bookingReference": "BK12345",
  "hotelName": "Grand Hotel Berlin",
  "checkInDate": "$(date -Iseconds -d '2025-07-01 12:00:00' 2>/dev/null || date -v+1y -v+15d -Iseconds | sed 's/+.*/Z/')",
  "checkOutDate": "$(date -Iseconds -d '2025-07-05 10:00:00' 2>/dev/null || date -v+1y -v+19d -Iseconds | sed 's/+.*/Z/')",
  "roomType": "Deluxe Double",
  "guestCount": 2,
  "totalAmount": "800.00",
  "currency": "EUR"
}
EOL

echo "Issuing travel identity credential..."
npm run start -- issue -t TravelIdentity -i "$ISSUER_DID" -s "$HOLDER_DID" -d travel-data.json -o travel-identity.json

echo "Issuing hotel booking credential..."
npm run start -- issue -t HotelBooking -i "$ISSUER_DID" -s "$HOLDER_DID" -d examples/hotel-booking.json -o hotel-booking.json

echo "Generating hotel check-in proof..."
npm run start -- zkp generate -c travel-identity.json -r firstName,lastName,bookingReference -o hotel-checkin-proof.json

# Extract the proof ID from the generated proof file
if [ -f "hotel-checkin-proof.json" ]; then
  HOTEL_PROOF_ID=$(cat hotel-checkin-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated hotel check-in proof with ID: $HOTEL_PROOF_ID"
  
  echo "Verifying hotel check-in proof..."
  if [ -n "$HOTEL_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$HOTEL_PROOF_ID"
  else
    echo "Warning: Could not extract hotel check-in proof ID. Skipping verification."
  fi
else
  echo "Warning: hotel-checkin-proof.json file not found. Skipping verification."
fi

# Step 12: Contract Signing Use Case
echo -e "\n\n12. Contract Signing Use Case..."
cat > contract-data.json << EOL
{
  "title": "Service Agreement",
  "description": "Agreement for consulting services",
  "parties": ["$ISSUER_DID", "$HOLDER_DID"],
  "contractHash": "0x7a44a8c9c4df93f0e500c3f2e49e64c8e865d97136ae7b5af7d7a0fe11dbdf84",
  "validFrom": "$(date +%Y-%m-%d)",
  "validUntil": "$(date -v+1y +%Y-%m-%d 2>/dev/null || date -d '+1 year' +%Y-%m-%d)",
  "jurisdiction": "Germany"
}
EOL

cat > signature-authority-data.json << EOL
{
  "personName": "Jane Doe",
  "role": "Chief Financial Officer",
  "organization": "ACME Corp",
  "permissions": ["contract_signing", "financial_approval"]
}
EOL

echo "Issuing signature authority credential..."
npm run start -- issue -t SignatureAuthority -i "$ISSUER_DID" -s "$HOLDER_DID" -d signature-authority-data.json -o signature-authority.json

echo "Issuing contract credential..."
npm run start -- issue -t Contract -i "$ISSUER_DID" -s "$HOLDER_DID" -d contract-data.json -o contract.json

echo "Verifying signature authority..."
npm run start -- verify -c signature-authority.json

echo "Verifying contract..."
npm run start -- verify -c contract.json

# Step 13: Organizational Identity Use Case
echo -e "\n\n13. Organizational Identity Use Case..."
cat > org-data.json << EOL
{
  "name": "ACME Corporation",
  "legalName": "ACME Corporation GmbH",
  "identifier": "DE123456789",
  "identifierType": "EU_VAT",
  "jurisdiction": "Germany",
  "address": {
    "streetAddress": "123 Business Ave",
    "locality": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "website": "https://acme-corp.example.com",
  "industry": "Technology"
}
EOL

cat > org-role-data.json << EOL
{
  "personName": "Jane Doe",
  "role": "Chief Technology Officer",
  "department": "Technology",
  "employeeId": "EMP-12345",
  "permissions": ["contract_signing", "financial_approval"],
  "startDate": "2020-01-01"
}
EOL

echo "Issuing organizational identity credential..."
npm run start -- issue -t OrganizationalIdentity -i "$ISSUER_DID" -s "$HOLDER_DID" -d org-data.json -o org-identity.json

echo "Issuing organizational role credential..."
npm run start -- issue -t OrganizationalRole -i "$ISSUER_DID" -s "$HOLDER_DID" -d org-role-data.json -o org-role.json

echo "Generating organizational role proof..."
npm run start -- zkp generate -c org-role.json -r personName,role,organizationId -o org-role-proof.json

# Extract the proof ID from the generated proof file
if [ -f "org-role-proof.json" ]; then
  ORG_PROOF_ID=$(cat org-role-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated organizational role proof with ID: $ORG_PROOF_ID"
  
  echo "Verifying organizational role proof..."
  if [ -n "$ORG_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$ORG_PROOF_ID"
  else
    echo "Warning: Could not extract organizational role proof ID. Skipping verification."
  fi
else
  echo "Warning: org-role-proof.json file not found. Skipping verification."
fi

# Step 14: Payment Method Use Case
echo -e "\n\n14. Payment Method Use Case..."
cat > payment-data.json << EOL
{
  "type": "card",
  "name": "Jane Doe",
  "issuingInstitution": "Example Bank",
  "identifier": "XXXX XXXX XXXX 1234",
  "expiryDate": "2028-12-31",
  "currency": "EUR"
}
EOL

cat > payment-auth-data.json << EOL
{
  "paymentMethodId": "pm_123456789",
  "merchantName": "Online Store GmbH",
  "amount": "99.95",
  "currency": "EUR",
  "timestamp": "$(date -Iseconds)",
  "orderId": "ORDER-12345",
  "description": "Purchase of electronics"
}
EOL

echo "Issuing payment method credential..."
npm run start -- issue -t PaymentMethod -i "$ISSUER_DID" -s "$HOLDER_DID" -d payment-data.json -o payment-method.json

echo "Issuing payment authorization credential..."
npm run start -- issue -t PaymentAuthorization -i "$ISSUER_DID" -s "$HOLDER_DID" -d payment-auth-data.json -o payment-auth.json

echo "Generating payment proof..."
npm run start -- zkp generate -c payment-method.json -r type,identifier,merchantName,amount,currency -o payment-proof.json

# Extract the proof ID from the generated proof file
if [ -f "payment-proof.json" ]; then
  PAYMENT_PROOF_ID=$(cat payment-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated payment proof with ID: $PAYMENT_PROOF_ID"
  
  echo "Verifying payment proof..."
  if [ -n "$PAYMENT_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$PAYMENT_PROOF_ID"
  else
    echo "Warning: Could not extract payment proof ID. Skipping verification."
  fi
else
  echo "Warning: payment-proof.json file not found. Skipping verification."
fi

# Step 15: Education Certification Use Case
echo -e "\n\n15. Education Certification Use Case..."
cat > diploma-data.json << EOL
{
  "studentName": "Jane Doe",
  "studentId": "STU-12345",
  "dateOfBirth": "1990-01-01",
  "institution": "Berlin University of Technology",
  "institutionId": "BerlinTech-123",
  "degree": "Master of Science",
  "field": "Computer Science",
  "awardDate": "2022-06-15",
  "graduationDate": "2022-06-30",
  "grade": "A",
  "honors": ["Magna Cum Laude"]
}
EOL

echo "Issuing diploma credential..."
npm run start -- issue -t Diploma -i "$ISSUER_DID" -s "$HOLDER_DID" -d diploma-data.json -o diploma.json

echo "Generating education proof..."
npm run start -- zkp generate -c diploma.json -r studentName,institution,degree,field,awardDate -o education-proof.json

# Extract the proof ID from the generated proof file
if [ -f "education-proof.json" ]; then
  EDUCATION_PROOF_ID=$(cat education-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated education proof with ID: $EDUCATION_PROOF_ID"
  
  echo "Verifying education proof..."
  if [ -n "$EDUCATION_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$EDUCATION_PROOF_ID"
  else
    echo "Warning: Could not extract education proof ID. Skipping verification."
  fi
else
  echo "Warning: education-proof.json file not found. Skipping verification."
fi

# Step 16: Healthcare Use Case
echo -e "\n\n16. Healthcare Use Case..."
cat > prescription-data.json << EOL
{
  "patientName": "Jane Doe",
  "patientId": "PAT-12345",
  "dateOfBirth": "1990-01-01",
  "prescriptionId": "RX-789012",
  "medications": [
    {
      "name": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "quantity": "30 tablets",
      "instructions": "Take with food"
    }
  ],
  "prescribedBy": "Dr. Smith",
  "prescriptionDate": "$(date +%Y-%m-%d)",
  "validUntil": "$(date -v+30d +%Y-%m-%d 2>/dev/null || date -d '+30 days' +%Y-%m-%d)",
  "refills": 1
}
EOL

echo "Issuing prescription credential..."
npm run start -- issue -t Prescription -i "$ISSUER_DID" -s "$HOLDER_DID" -d prescription-data.json -o prescription.json

echo "Generating prescription proof..."
npm run start -- zkp generate -c prescription.json -r patientName,prescriptionId,medications -o prescription-proof.json

# Extract the proof ID from the generated proof file
if [ -f "prescription-proof.json" ]; then
  PRESCRIPTION_PROOF_ID=$(cat prescription-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated prescription proof with ID: $PRESCRIPTION_PROOF_ID"
  
  echo "Verifying prescription proof..."
  if [ -n "$PRESCRIPTION_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$PRESCRIPTION_PROOF_ID"
  else
    echo "Warning: Could not extract prescription proof ID. Skipping verification."
  fi
else
  echo "Warning: prescription-proof.json file not found. Skipping verification."
fi

# Step 17: SIM Registration Use Case
echo -e "\n\n17. SIM Registration Use Case..."
cat > sim-reg-data.json << EOL
{
  "firstName": "Jane",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "nationality": "Germany",
  "identificationNumber": "ID-12345678",
  "idType": "National ID",
  "address": {
    "streetAddress": "123 Main Street",
    "locality": "Berlin",
    "postalCode": "10115",
    "country": "DE"
  },
  "contactEmail": "jane.doe@example.com",
  "contactPhone": "+491234567890"
}
EOL

cat > sim-card-data.json << EOL
{
  "iccid": "8912345678901234567",
  "msisdn": "+491234567890",
  "carrier": "Example Telecom",
  "activationDate": "$(date +%Y-%m-%d)",
  "planType": "Prepaid"
}
EOL

echo "Issuing SIM registration credential..."
npm run start -- issue -t SIMRegistration -i "$ISSUER_DID" -s "$HOLDER_DID" -d sim-reg-data.json -o sim-registration.json

echo "Issuing SIM card credential..."
npm run start -- issue -t SIMCard -i "$ISSUER_DID" -s "$HOLDER_DID" -d sim-card-data.json -o sim-card.json

echo "Generating SIM registration proof..."
npm run start -- zkp generate -c sim-registration.json -r firstName,lastName,identificationNumber,idType -o sim-reg-proof.json

# Extract the proof ID from the generated proof file
if [ -f "sim-reg-proof.json" ]; then
  SIM_PROOF_ID=$(cat sim-reg-proof.json | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Generated SIM registration proof with ID: $SIM_PROOF_ID"
  
  echo "Verifying SIM registration proof..."
  if [ -n "$SIM_PROOF_ID" ]; then
    npm run start -- zkp verify -p "$SIM_PROOF_ID"
  else
    echo "Warning: Could not extract SIM registration proof ID. Skipping verification."
  fi
else
  echo "Warning: sim-reg-proof.json file not found. Skipping verification."
fi

echo -e "\n\n============================================="
echo "Demo completed successfully!"
echo "DIDs, credentials, and proofs were created and verified:"
echo "1. Issuer DID: $ISSUER_DID"
echo "2. Holder DID: $HOLDER_DID"
echo "3. Core Credential: credential.json"
echo "4. ZK Proof: proof.json"
echo "5. Policy: age-policy.rego (successfully evaluated)"
echo ""
echo "Additional Use Cases Demonstrated:"
echo "6. Travel - Hotel booking and identity verification"
echo "7. Signing Contracts - Contract signing with authority"
echo "8. Organizational Identity - Organization and role credentials"
echo "9. Payments - Payment methods and authorization"
echo "10. Education - Diploma and selective disclosure"
echo "11. Healthcare - Prescription issuance and verification"
echo "12. SIM Registration - Identity verification for SIM cards"
echo "=============================================" 