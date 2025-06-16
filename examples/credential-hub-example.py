#!/usr/bin/env python3
"""
Example demonstrating how to use the Credential Hub service

This example shows how to:
1. Issue a verifiable credential
2. Verify a credential
3. Generate a zero-knowledge proof
4. Verify a proof
5. Check credential status
6. Revoke a credential
"""

import asyncio
import json
import requests
import uuid
from datetime import datetime, timedelta

# Define the base URL for the Credential Hub service
BASE_URL = "http://localhost:8000"

async def main():
    print("Credential Hub Example")
    print("---------------------")

    # 1. Issue a credential
    print("\n1. Issuing a credential...")
    
    # Create a credential request
    credential_request = {
        "subject_id": "did:ion:test:subject456",
        "issuer_id": "did:ion:test:issuer123",
        "claims": {
            "name": "Alice Smith",
            "email": "alice@example.com",
            "dateOfBirth": "1990-01-01",
            "nationality": "Canadian"
        },
        "proof_type": "jwt",
        "expiration_date": (datetime.now() + timedelta(days=365)).isoformat()
    }
    
    # Issue the credential
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/issue",
            json=credential_request
        )
        response.raise_for_status()
        credential = response.json()
        
        print("Credential issued successfully:")
        print(json.dumps(credential, indent=2))
        
        # Store credential ID for later use
        credential_id = credential["credential_id"]
        
    except requests.RequestException as e:
        print(f"Error issuing credential: {e}")
        # For demo purposes, create a mock credential ID
        credential_id = f"urn:uuid:{uuid.uuid4()}"
        credential = credential_request
        credential["id"] = credential_id
        credential["issuanceDate"] = datetime.now().isoformat()
        print("Using mock credential for demonstration")
    
    # 2. Verify the credential
    print("\n2. Verifying the credential...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/verify",
            json={"credential_id": credential_id}
        )
        response.raise_for_status()
        verification_result = response.json()
        
        # Handle different response formats
        if 'verified' in verification_result:
            print(f"Verification result: {verification_result['verified']}")
            verification_method = verification_result.get('verificationMethod', 'unknown')
        else:
            # Alternative format
            print(f"Verification result: {verification_result.get('is_valid', False)}")
            verification_method = "unknown"
            if verification_result.get('checks'):
                for check in verification_result['checks']:
                    if check.get('check_type') == 'signature':
                        verification_method = check.get('message', 'unknown')
                        break
        
        print(f"Verification method: {verification_method}")
        
    except requests.RequestException as e:
        print(f"Error verifying credential: {e}")
        print("Using mock verification result for demonstration")
        print("Verification result: True")
        print("Verification method: did:ion:test:issuer123#keys-1")
    
    # 3. Generate a zero-knowledge proof
    print("\n3. Generating a zero-knowledge proof...")
    
    # Create a proof request
    proof_request = {
        "credential_id": credential_id,
        "reveal_attributes": ["name", "nationality"],
        "circuit_id": None
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/proofs/generate",
            json=proof_request
        )
        response.raise_for_status()
        proof = response.json()
        
        print("Proof generated successfully:")
        print(json.dumps(proof, indent=2))
        
        # Store proof ID for later use
        proof_id = proof["proof_id"]
        
    except requests.RequestException as e:
        print(f"Error generating proof: {e}")
        # For demo purposes, create a mock proof ID
        proof_id = f"urn:uuid:{uuid.uuid4()}"
        print(f"Using mock proof ID: {proof_id}")
    
    # 4. Verify the proof
    print("\n4. Verifying the proof...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/proofs/verify",
            json={"proof_id": proof_id}
        )
        response.raise_for_status()
        proof_verification = response.json()
        
        # Handle different response formats
        if 'verified' in proof_verification:
            print(f"Proof verification result: {proof_verification['verified']}")
            revealed_attrs = proof_verification.get("revealedAttributes", {})
        else:
            # Alternative format
            print(f"Proof verification result: {proof_verification.get('is_valid', False)}")
            revealed_attrs = proof_verification.get("attributes", {})
        
        if revealed_attrs:
            print("Revealed attributes:")
            for attr, value in revealed_attrs.items():
                print(f"  {attr}: {value}")
        
    except requests.RequestException as e:
        print(f"Error verifying proof: {e}")
        print("Using mock proof verification result for demonstration")
        print("Proof verification result: True")
        print("Revealed attributes:")
        print("  name: Alice Smith")
        print("  nationality: Canadian")
    
    # 5. Check credential status
    print("\n5. Checking credential status...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/credentials/{credential_id}/status"
        )
        response.raise_for_status()
        status = response.json()
        
        print(f"Credential status: {status['status']}")
        print(f"Last updated: {status['timestamp']}")
        
    except requests.RequestException as e:
        print(f"Error checking credential status: {e}")
        print("Using mock status for demonstration")
        print("Credential status: active")
        print(f"Last updated: {datetime.now().isoformat()}")
    
    # 6. Revoke the credential
    print("\n6. Revoking the credential...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/{credential_id}/revoke",
            json={"reason": "Credential no longer valid"}
        )
        response.raise_for_status()
        revocation_result = response.json()
        
        print(f"Revocation successful: {revocation_result.get('message', 'Unknown')}")
        
        # Check the status again
        response = requests.get(
            f"{BASE_URL}/credentials/{credential_id}/status"
        )
        response.raise_for_status()
        status = response.json()
        
        print(f"Updated credential status: {status['status']}")
        
    except requests.RequestException as e:
        print(f"Error revoking credential: {e}")
        print("Using mock revocation result for demonstration")
        print("Revocation successful: True")
        print("Updated credential status: revoked")

if __name__ == "__main__":
    asyncio.run(main()) 