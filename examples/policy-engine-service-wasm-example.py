#!/usr/bin/env python3
"""
Example demonstrating how to use the Policy Engine service with OPA WASM integration

This example shows how to:
1. Create a policy with GDPR rules
2. Evaluate data against the policy using the service API
3. Understand policy decisions and reasons
4. Update and manage policies
"""

import os
import sys
import json
import requests
import uuid
from pathlib import Path

# Define the base URL for the Policy Engine service
BASE_URL = "http://localhost:8001"

def main():
    print("Policy Engine Service WASM Example")
    print("--------------------------------")
    
    # 1. Create a GDPR policy
    print("\n1. Creating a GDPR policy...")
    
    # Define a GDPR policy using JSON Logic
    # These rules will be converted to Rego and compiled to WASM by the service
    policy_request = {
        "name": "GDPR Data Processing Policy",
        "description": "Controls data processing based on user consent and purpose",
        "version": "1.0.0",
        "type": "compliance",
        "rules": [
            # Rule 1: User must have provided consent
            {
                "==": [{"var": "user.consent"}, True]
            },
            # Rule 2: Purpose must be specified
            {
                "!=": [{"var": "purpose"}, None]
            },
            # Rule 3: Purpose must be in the list of allowed purposes
            {
                "in": [{"var": "purpose"}, {"var": "user.allowed_purposes"}]
            }
        ],
        "metadata": {
            "category": "GDPR",
            "owner": "data-protection-officer",
            "tags": ["gdpr", "consent", "data-processing"]
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/policies",
            json=policy_request
        )
        response.raise_for_status()
        policy = response.json()
        
        print("Policy created successfully:")
        print(f"  ID: {policy['policy_id']}")
        print(f"  Name: {policy['policy']['name']}")
        print(f"  Version: {policy['policy']['version']}")
        
        # Store policy ID for later use
        policy_id = policy["policy_id"]
        
    except requests.RequestException as e:
        print(f"Error creating policy: {e}")
        # For demo purposes, use a mock ID
        policy_id = str(uuid.uuid4())
        print(f"Using mock policy ID: {policy_id}")
    
    # 2. Evaluate the policy against input data
    print("\n2. Evaluating policy against different scenarios...")
    
    # Test cases
    test_cases = [
        {
            "name": "Valid consent and purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics", "service-improvement"]
                },
                "purpose": "marketing"
            },
            "expected_result": True
        },
        {
            "name": "No consent",
            "data": {
                "user": {
                    "consent": False,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing"
            },
            "expected_result": False
        },
        {
            "name": "Missing purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": None
            },
            "expected_result": False
        },
        {
            "name": "Disallowed purpose",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "profiling"
            },
            "expected_result": False
        }
    ]
    
    for test_case in test_cases:
        print(f"\nScenario: {test_case['name']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/policies/{policy_id}/evaluate",
                json={"input_data": test_case["data"]}
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"Access allowed: {result['allowed']}")
            print(f"Reasons: {', '.join(result['reasons'])}")
            
            # Verify the result matches the expected outcome
            if result["allowed"] == test_case["expected_result"]:
                print("✅ Result matches expected outcome")
            else:
                print(f"❌ Result does not match expected outcome ({test_case['expected_result']})")
            
        except requests.RequestException as e:
            print(f"Error evaluating policy: {e}")
            # For demo purposes, show mock results
            print(f"Using mock evaluation result: {test_case['expected_result']}")
            
            # Generate mock reasons based on the test case
            if test_case["name"] == "No consent":
                print("Mock reasons: User has not provided consent")
            elif test_case["name"] == "Missing purpose":
                print("Mock reasons: Purpose is not specified")
            elif test_case["name"] == "Disallowed purpose":
                print("Mock reasons: Purpose is not allowed")
    
    # 3. Update the policy to add context-based restrictions
    print("\n3. Updating the policy to add context-based restrictions...")
    
    # Add a new rule for time-based restrictions
    updated_policy = policy_request.copy()
    updated_policy["rules"].append({
        "<=": [{"var": "context.sensitivityLevel"}, 3]
    })
    updated_policy["version"] = "1.1.0"
    updated_policy["description"] += " and sensitivity level"
    
    try:
        response = requests.put(
            f"{BASE_URL}/policies/{policy_id}",
            json=updated_policy
        )
        response.raise_for_status()
        updated = response.json()
        
        print("Policy updated successfully:")
        print(f"  New version: {updated['version']}")
        print(f"  Rules count: {len(updated['rules'])}")
        
    except requests.RequestException as e:
        print(f"Error updating policy: {e}")
        print("Using mock update result for demonstration")
        print("  New version: 1.1.0")
        print("  Rules count: 4")
    
    # 4. Evaluate with context-based restrictions
    print("\n4. Evaluating updated policy with context-based restrictions...")
    
    context_test_cases = [
        {
            "name": "Low sensitivity data",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing",
                "context": {
                    "sensitivityLevel": 2
                }
            },
            "expected_result": True
        },
        {
            "name": "High sensitivity data",
            "data": {
                "user": {
                    "consent": True,
                    "allowed_purposes": ["marketing", "analytics"]
                },
                "purpose": "marketing",
                "context": {
                    "sensitivityLevel": 5
                }
            },
            "expected_result": False
        }
    ]
    
    for test_case in context_test_cases:
        print(f"\nScenario: {test_case['name']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/policies/{policy_id}/evaluate",
                json={"input_data": test_case["data"]}
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"Access allowed: {result['allowed']}")
            print(f"Reasons: {', '.join(result['reasons'])}")
            
        except requests.RequestException as e:
            print(f"Error evaluating policy: {e}")
            print(f"Using mock evaluation result: {test_case['expected_result']}")
            
            if not test_case["expected_result"]:
                print("Mock reasons: Sensitivity level exceeds allowed threshold")
    
    # 5. Clean up - delete the policy
    print(f"\n5. Cleaning up - deleting policy {policy_id}...")
    
    try:
        response = requests.delete(f"{BASE_URL}/policies/{policy_id}")
        response.raise_for_status()
        
        print("Policy deleted successfully")
        
    except requests.RequestException as e:
        print(f"Error deleting policy: {e}")
        print("Using mock deletion result for demonstration")
        print("Policy deleted successfully (mock)")

if __name__ == "__main__":
    main() 