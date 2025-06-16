#!/usr/bin/env python3
"""
Example demonstrating how to use the Credential Hub Stats API

This example shows how to:
1. Get credential statistics (issued, verified, revoked counts)
2. Handle API errors gracefully
3. Issue and revoke credentials to see stats change
"""

import asyncio
import json
import requests
import time
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import pandas as pd
import uuid

# Define the base URL for the Credential Hub service
BASE_URL = "http://localhost:8000"

def get_stats():
    """
    Get credential statistics from the Credential Hub service.
    
    Returns:
        dict: Statistics containing issued, verified, and revoked counts
    """
    try:
        response = requests.get(f"{BASE_URL}/stats")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error getting stats: {e}")
        # Return mock stats for demonstration
        return {
            "issued": 0,
            "verified": 0,
            "revoked": 0,
            "timestamp": datetime.now().isoformat()
        }

def issue_credential():
    """Issue a sample credential and return its ID"""
    credential_request = {
        "subject_id": f"did:ion:test:subject{uuid.uuid4()}",
        "issuer_id": "did:ion:test:issuer123",
        "claims": {
            "name": f"User-{uuid.uuid4().hex[:8]}",
            "email": f"user-{uuid.uuid4().hex[:8]}@example.com",
            "role": "member"
        },
        "proof_type": "jwt"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/issue",
            json=credential_request
        )
        response.raise_for_status()
        result = response.json()
        print(f"  Response: {json.dumps(result, indent=2)}")
        return result.get("credential_id", f"mock-credential-{uuid.uuid4()}")
    except requests.RequestException as e:
        print(f"Error issuing credential: {e}")
        return f"mock-credential-{uuid.uuid4()}"

def verify_credential(credential_id):
    """Verify a credential by ID"""
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/verify",
            json={"credential_id": credential_id}
        )
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error verifying credential: {e}")

def revoke_credential(credential_id):
    """Revoke a credential by ID"""
    try:
        response = requests.post(
            f"{BASE_URL}/credentials/{credential_id}/revoke",
            params={"reason": "Example revocation"}
        )
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error revoking credential: {e}")

def plot_stats(stats_history):
    """Generate a plot of credential statistics over time"""
    if not stats_history:
        print("No stats history to plot")
        return
    
    # Convert to pandas DataFrame for easier plotting
    df = pd.DataFrame(stats_history)
    
    # Create a simple bar chart
    plt.figure(figsize=(10, 6))
    latest = stats_history[-1]
    plt.bar(['Issued', 'Verified', 'Revoked'], 
            [latest['issued'], latest['verified'], latest['revoked']])
    plt.title('Credential Hub Statistics')
    plt.ylabel('Count')
    plt.savefig('credential_stats.png')
    print("Stats chart saved as 'credential_stats.png'")
    
    # Create a line chart for history
    if len(stats_history) > 1:
        plt.figure(figsize=(12, 6))
        plt.plot(range(len(stats_history)), [s['issued'] for s in stats_history], label='Issued')
        plt.plot(range(len(stats_history)), [s['verified'] for s in stats_history], label='Verified')
        plt.plot(range(len(stats_history)), [s['revoked'] for s in stats_history], label='Revoked')
        plt.title('Credential Stats Over Time')
        plt.xlabel('Time')
        plt.ylabel('Count')
        plt.legend()
        plt.savefig('credential_stats_history.png')
        print("Stats history chart saved as 'credential_stats_history.png'")

async def main():
    print("Credential Hub Stats Example")
    print("---------------------------")
    
    # 1. Get initial stats
    print("\n1. Getting initial credential statistics...")
    initial_stats = get_stats()
    print(f"Initial stats: {json.dumps(initial_stats, indent=2)}")
    
    # Keep track of stats over time
    stats_history = [initial_stats]
    
    # 2. Issue some credentials and check stats
    print("\n2. Issuing credentials and checking stats...")
    credential_ids = []
    for i in range(5):
        print(f"Issuing credential {i+1}...")
        credential_id = issue_credential()
        credential_ids.append(credential_id)
        time.sleep(0.5)  # Small delay between operations
    
    # Get updated stats
    updated_stats = get_stats()
    stats_history.append(updated_stats)
    print(f"Updated stats after issuing: {json.dumps(updated_stats, indent=2)}")
    print(f"Issued count increased by: {updated_stats['issued'] - initial_stats['issued']}")
    
    # 3. Verify some credentials
    print("\n3. Verifying credentials and checking stats...")
    for i, credential_id in enumerate(credential_ids[:3]):  # Verify first 3
        print(f"Verifying credential {i+1}...")
        verify_credential(credential_id)
        time.sleep(0.5)  # Small delay between operations
    
    # Get updated stats
    verified_stats = get_stats()
    stats_history.append(verified_stats)
    print(f"Stats after verification: {json.dumps(verified_stats, indent=2)}")
    print(f"Verified count increased by: {verified_stats['verified'] - updated_stats['verified']}")
    
    # 4. Revoke some credentials
    print("\n4. Revoking credentials and checking stats...")
    for i, credential_id in enumerate(credential_ids[:2]):  # Revoke first 2
        print(f"Revoking credential {i+1}...")
        revoke_credential(credential_id)
        time.sleep(0.5)  # Small delay between operations
    
    # Get final stats
    final_stats = get_stats()
    stats_history.append(final_stats)
    print(f"Final stats: {json.dumps(final_stats, indent=2)}")
    print(f"Revoked count increased by: {final_stats['revoked'] - verified_stats['revoked']}")
    
    # 5. Plot the stats
    print("\n5. Generating statistics visualization...")
    try:
        plot_stats(stats_history)
    except Exception as e:
        print(f"Error generating plot: {e}")
        print("Skipping visualization. Make sure matplotlib and pandas are installed.")
    
    # 6. Summary
    print("\n6. Summary of credential operations:")
    print(f"  - Started with {initial_stats['issued']} issued, {initial_stats['verified']} verified, {initial_stats['revoked']} revoked credentials")
    print(f"  - Issued {len(credential_ids)} new credentials")
    print(f"  - Verified {3} credentials")
    print(f"  - Revoked {2} credentials")
    print(f"  - Ended with {final_stats['issued']} issued, {final_stats['verified']} verified, {final_stats['revoked']} revoked credentials")

if __name__ == "__main__":
    asyncio.run(main()) 