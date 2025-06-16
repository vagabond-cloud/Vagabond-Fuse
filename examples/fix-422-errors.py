#!/usr/bin/env python3
"""
Examples to fix 422 Unprocessable Entity errors

This script demonstrates the correct way to call the endpoints
that were returning 422 errors.
"""

import requests
import json

BASE_URL = "http://localhost:8001"

# Example 1: Issuing a credential correctly
def issue_credential():
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/issue",
            json={
                "subject_id": "did:example:123",
                "issuer_id": "did:example:issuer",
                "claims": {
                    "name": "Alice",
                    "age": 30,
                    "email": "alice@example.com"
                },
                "proof_type": "jwt"
            }
        )
        response.raise_for_status()
        
        print("Credential issued successfully:")
        print(json.dumps(response.json(), indent=2))
        return response.json().get("credential_id")
    except requests.exceptions.RequestException as e:
        print(f"Error issuing credential:")
        print(e)
        if hasattr(e, "response") and e.response:
            print(e.response.text)

# Example 2: Evaluating a policy correctly
def evaluate_policy():
    try:
        # First, get the list of policies to find the correct ID
        policies_response = requests.get(f"{BASE_URL}/policies")
        policies_response.raise_for_status()
        
        # Find the policy with name "Credential Access Policy"
        policies = policies_response.json().get("policies", [])
        policy = next((p for p in policies if p.get("name") == "Credential Access Policy"), None)
        
        if not policy:
            print('Policy "Credential Access Policy" not found')
            return
        
        policy_id = policy.get("id")
        print(f"Found policy with ID: {policy_id}")
        
        # Now evaluate the policy using the correct ID
        response = requests.post(
            f"{BASE_URL}/policies/{policy_id}/evaluate",
            json={
                "input_data": {
                    "user": {
                        "did": "did:example:123"
                    },
                    "credential": {
                        "subject": "did:example:123",
                        "expirationDate": "2026-06-15",
                        "authorizedVerifiers": ["did:example:verifier1"]
                    },
                    "now": "2025-06-15"
                }
            }
        )
        response.raise_for_status()
        
        print("Policy evaluation successful:")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Error evaluating policy:")
        print(e)
        if hasattr(e, "response") and e.response:
            print(e.response.text)

# Run the examples
def main():
    print("=== Example 1: Issuing a credential ===")
    issue_credential()
    
    print("\n=== Example 2: Evaluating a policy ===")
    evaluate_policy()

if __name__ == "__main__":
    main() 