/**
 * Examples to fix 422 Unprocessable Entity errors
 * 
 * This script demonstrates the correct way to call the endpoints
 * that were returning 422 errors.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

// Example 1: Issuing a credential correctly
async function issueCredential() {
    try {
        const response = await axios.post(`${BASE_URL}/credentials/issue`, {
            subject_id: "did:example:123",
            issuer_id: "did:example:issuer",
            claims: {
                name: "Alice",
                age: 30,
                email: "alice@example.com"
            },
            proof_type: "jwt"
        });

        console.log('Credential issued successfully:');
        console.log(JSON.stringify(response.data, null, 2));
        return response.data.credential_id;
    } catch (error) {
        console.error('Error issuing credential:');
        console.error(error.response?.data || error.message);
    }
}

// Example 2: Evaluating a policy correctly
async function evaluatePolicy() {
    try {
        // First, get the list of policies to find the correct ID
        const policiesResponse = await axios.get(`${BASE_URL}/policies`);

        // Find the policy with name "Credential Access Policy"
        const policy = policiesResponse.data.policies.find(p => p.name === "Credential Access Policy");

        if (!policy) {
            console.error('Policy "Credential Access Policy" not found');
            return;
        }

        console.log(`Found policy with ID: ${policy.id}`);

        // Now evaluate the policy using the correct ID
        const response = await axios.post(`${BASE_URL}/policies/${policy.id}/evaluate`, {
            input_data: {
                user: {
                    did: "did:example:123"
                },
                credential: {
                    subject: "did:example:123",
                    expirationDate: "2026-06-15",
                    authorizedVerifiers: ["did:example:verifier1"]
                },
                now: "2025-06-15"
            }
        });

        console.log('Policy evaluation successful:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error evaluating policy:');
        console.error(error.response?.data || error.message);
    }
}

// Run the examples
async function main() {
    console.log('=== Example 1: Issuing a credential ===');
    await issueCredential();

    console.log('\n=== Example 2: Evaluating a policy ===');
    await evaluatePolicy();
}

main().catch(console.error); 