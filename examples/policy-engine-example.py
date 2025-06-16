#!/usr/bin/env python3
"""
Example demonstrating how to use the Policy Engine service

This example shows how to:
1. Create a policy
2. Evaluate a policy against input data
3. List policies
4. Get policy details
5. Update a policy
6. Delete a policy
"""

import asyncio
import json
import requests
import uuid
from datetime import datetime

# Define the base URL for the Policy Engine service
BASE_URL = "http://localhost:8001"

async def main():
    print("Policy Engine Example")
    print("--------------------")

    # 1. Create a policy
    print("\n1. Creating a policy...")
    
    # Define a simple access control policy using JSON Logic
    policy_request = {
        "id": f"policy-{uuid.uuid4()}",
        "name": "Resource Access Policy",
        "description": "Controls access to resources based on user role and resource type",
        "version": "1.0.0",
        "rules": [
            # Rule 1: User must be admin OR manager
            {
                "or": [
                    {"==": [{"var": "user.role"}, "admin"]},
                    {"==": [{"var": "user.role"}, "manager"]}
                ]
            },
            # Rule 2: Resource must be public OR user must be the owner
            {
                "or": [
                    {"==": [{"var": "resource.visibility"}, "public"]},
                    {"==": [{"var": "resource.owner"}, {"var": "user.id"}]}
                ]
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/policies",
            json=policy_request
        )
        response.raise_for_status()
        policy = response.json()
        
        print("Policy created successfully:")
        print(json.dumps(policy, indent=2))
        
        # Store policy ID for later use
        if "policy_id" in policy:
            policy_id = policy["policy_id"]
        elif "policy" in policy and "id" in policy["policy"]:
            policy_id = policy["policy"]["id"]
        else:
            policy_id = policy_request["id"]
            print(f"Could not find policy ID in response, using request ID: {policy_id}")
        
    except requests.RequestException as e:
        print(f"Error creating policy: {e}")
        # For demo purposes, use the ID from the request
        policy_id = policy_request["id"]
        print(f"Using mock policy ID: {policy_id}")
    
    # 2. Evaluate the policy against input data
    print("\n2. Evaluating policy against different inputs...")
    
    # Test cases
    test_cases = [
        {
            "name": "Admin accessing public resource",
            "data": {
                "user": {"id": "user1", "role": "admin"},
                "resource": {"id": "res1", "visibility": "public", "owner": "user2"}
            }
        },
        {
            "name": "User accessing own resource",
            "data": {
                "user": {"id": "user1", "role": "user"},
                "resource": {"id": "res2", "visibility": "private", "owner": "user1"}
            }
        },
        {
            "name": "User accessing another's private resource",
            "data": {
                "user": {"id": "user1", "role": "user"},
                "resource": {"id": "res3", "visibility": "private", "owner": "user2"}
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\nScenario: {test_case['name']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/policies/{policy_id}/evaluate",
                json={"input": test_case["data"]}
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"Access allowed: {result['allowed']}")
            if "reasons" in result:
                print(f"Reasons: {', '.join(result['reasons'])}")
            
        except requests.RequestException as e:
            print(f"Error evaluating policy: {e}")
            # Mock result based on the test case
            allowed = False
            if test_case["name"] == "Admin accessing public resource":
                allowed = True
            elif test_case["name"] == "User accessing own resource":
                allowed = True
                
            print(f"Using mock evaluation result: {allowed}")
    
    # 3. List all policies
    print("\n3. Listing all policies...")
    
    try:
        response = requests.get(f"{BASE_URL}/policies")
        response.raise_for_status()
        policies = response.json()
        
        print(f"Found {len(policies)} policies:")
        for p in policies:
            # Handle case where policies are returned as strings
            if isinstance(p, str):
                print(f"  - {p}")
            else:
                p_id = p.get("id") or p.get("policy_id") or "unknown"
                p_name = p.get("name") or p.get("policy", {}).get("name") or "Unnamed Policy"
                print(f"  - {p_id}: {p_name}")
        
    except requests.RequestException as e:
        print(f"Error listing policies: {e}")
        print("Using mock policy list for demonstration")
        print(f"  - {policy_id}: Resource Access Policy")
    
    # 4. Get policy details
    print(f"\n4. Getting details for policy {policy_id}...")
    
    try:
        response = requests.get(f"{BASE_URL}/policies/{policy_id}")
        response.raise_for_status()
        policy_details = response.json()
        
        # Handle different response structures
        if "policy" in policy_details:
            policy_details = policy_details["policy"]
        
        print("Policy details:")
        print(f"  Name: {policy_details['name']}")
        print(f"  Description: {policy_details['description']}")
        print(f"  Version: {policy_details['version']}")
        print(f"  Rules: {len(policy_details['rules'])}")
        
    except requests.RequestException as e:
        print(f"Error getting policy details: {e}")
        print("Using mock policy details for demonstration")
        print("  Name: Resource Access Policy")
        print("  Description: Controls access to resources based on user role and resource type")
        print("  Version: 1.0.0")
        print("  Rules: 2")
    
    # 5. Update the policy
    print("\n5. Updating the policy...")
    
    # Add a new rule to the policy
    updated_policy = policy_request.copy()
    updated_policy["rules"].append({
        "<=": [{"var": "resource.sensitivityLevel"}, 5]
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
        
        # Handle different response structures
        if "policy" in updated:
            updated = updated["policy"]
        
        print("Policy updated successfully:")
        print(f"  New version: {updated['version']}")
        print(f"  Rules count: {len(updated['rules'])}")
        
    except requests.RequestException as e:
        print(f"Error updating policy: {e}")
        print("Using mock update result for demonstration")
        print("  New version: 1.1.0")
        print("  Rules count: 3")
    
    # 6. Delete the policy
    print(f"\n6. Deleting policy {policy_id}...")
    
    try:
        response = requests.delete(f"{BASE_URL}/policies/{policy_id}")
        response.raise_for_status()
        delete_result = response.json()
        
        # Handle different response structures
        if "deleted" in delete_result:
            print(f"Policy deleted: {delete_result['deleted']}")
        else:
            print(f"Policy deleted successfully: {policy_id}")
            if "message" in delete_result:
                print(f"Message: {delete_result['message']}")
        
    except requests.RequestException as e:
        print(f"Error deleting policy: {e}")
        print("Using mock deletion result for demonstration")
        print("Policy deleted: True")

if __name__ == "__main__":
    asyncio.run(main()) 