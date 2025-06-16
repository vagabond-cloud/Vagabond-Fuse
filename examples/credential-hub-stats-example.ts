/**
 * Example demonstrating how to use the Credential Hub Stats API with TypeScript
 *
 * This example shows how to:
 * 1. Get credential statistics (issued, verified, revoked counts)
 * 2. Handle API errors gracefully
 * 3. Issue and revoke credentials to see stats change
 *
 * IMPORTANT: Before running this example, make sure the Credential Hub service is running:
 * cd services/credential-hub
 * uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Define the base URL for the Credential Hub service
const BASE_URL = 'http://localhost:8000';

// Define types for our API responses
interface StatsResponse {
  issued: number;
  verified: number;
  revoked: number;
  timestamp: string;
}

interface CredentialResponse {
  credential_id: string;
  credential: any;
  message: string;
}

/**
 * Check if the Credential Hub service is running
 */
async function checkServiceAvailability(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}`, { timeout: 2000 });
    return true;
  } catch (error: any) {
    return false;
  }
}

/**
 * Get credential statistics from the Credential Hub service
 */
async function getStats(): Promise<StatsResponse> {
  try {
    const response = await axios.get(`${BASE_URL}/stats`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting stats:', error.message || error);
    // Return mock stats for demonstration
    return {
      issued: 0,
      verified: 0,
      revoked: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Issue a sample credential and return its ID
 */
async function issueCredential(): Promise<string> {
  const credentialRequest = {
    subject_id: `did:ion:test:subject${uuidv4()}`,
    issuer_id: 'did:ion:test:issuer123',
    claims: {
      name: `User-${uuidv4().substring(0, 8)}`,
      email: `user-${uuidv4().substring(0, 8)}@example.com`,
      role: 'member',
    },
    proof_type: 'jwt',
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/credentials/issue`,
      credentialRequest
    );
    const result = response.data as CredentialResponse;
    return result.credential_id;
  } catch (error: any) {
    console.error('Error issuing credential:', error.message || error);
    return `mock-credential-${uuidv4()}`;
  }
}

/**
 * Verify a credential by ID
 */
async function verifyCredential(credentialId: string): Promise<void> {
  try {
    await axios.post(`${BASE_URL}/credentials/verify`, {
      credential_id: credentialId,
    });
  } catch (error: any) {
    console.error('Error verifying credential:', error.message || error);
  }
}

/**
 * Revoke a credential by ID
 */
async function revokeCredential(credentialId: string): Promise<void> {
  try {
    await axios.post(
      `${BASE_URL}/credentials/${credentialId}/revoke`,
      {},
      { params: { reason: 'Example revocation' } }
    );
  } catch (error: any) {
    console.error('Error revoking credential:', error.message || error);
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Display a summary of the stats changes
 */
function displayStatsSummary(
  initialStats: StatsResponse,
  finalStats: StatsResponse,
  credentialsIssued: number,
  credentialsVerified: number,
  credentialsRevoked: number
): void {
  console.log('\n6. Summary of credential operations:');
  console.log(
    `  - Started with ${initialStats.issued} issued, ${initialStats.verified} verified, ${initialStats.revoked} revoked credentials`
  );
  console.log(`  - Issued ${credentialsIssued} new credentials`);
  console.log(`  - Verified ${credentialsVerified} credentials`);
  console.log(`  - Revoked ${credentialsRevoked} credentials`);
  console.log(
    `  - Ended with ${finalStats.issued} issued, ${finalStats.verified} verified, ${finalStats.revoked} revoked credentials`
  );
}

/**
 * Run in demo mode with mock data when service is unavailable
 */
async function runDemoMode(): Promise<void> {
  console.log('\n⚠️  RUNNING IN DEMO MODE ⚠️');
  console.log(
    'The Credential Hub service is not available. Using mock data for demonstration.'
  );
  console.log('To run with real data, make sure the service is running:');
  console.log('  cd services/credential-hub');
  console.log('  uvicorn app.main:app --reload --host 0.0.0.0 --port 8001');
  console.log('\nContinuing with mock data...\n');

  // Create mock stats that change over time
  const mockInitialStats: StatsResponse = {
    issued: 10,
    verified: 5,
    revoked: 2,
    timestamp: new Date().toISOString(),
  };

  const mockUpdatedStats: StatsResponse = {
    issued: 15,
    verified: 5,
    revoked: 2,
    timestamp: new Date().toISOString(),
  };

  const mockVerifiedStats: StatsResponse = {
    issued: 15,
    verified: 8,
    revoked: 2,
    timestamp: new Date().toISOString(),
  };

  const mockFinalStats: StatsResponse = {
    issued: 15,
    verified: 8,
    revoked: 4,
    timestamp: new Date().toISOString(),
  };

  // 1. Get initial stats
  console.log('\n1. Getting initial credential statistics...');
  console.log('Initial stats:', JSON.stringify(mockInitialStats, null, 2));

  // 2. Issue some credentials and check stats
  console.log('\n2. Issuing credentials and checking stats...');
  const credentialIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    console.log(`Issuing credential ${i + 1}...`);
    const credentialId = `mock-credential-${uuidv4()}`;
    credentialIds.push(credentialId);
    await sleep(100);
  }

  console.log(
    'Updated stats after issuing:',
    JSON.stringify(mockUpdatedStats, null, 2)
  );
  console.log(
    `Issued count increased by: ${
      mockUpdatedStats.issued - mockInitialStats.issued
    }`
  );

  // 3. Verify some credentials
  console.log('\n3. Verifying credentials and checking stats...');
  for (let i = 0; i < 3; i++) {
    console.log(`Verifying credential ${i + 1}...`);
    await sleep(100);
  }

  console.log(
    'Stats after verification:',
    JSON.stringify(mockVerifiedStats, null, 2)
  );
  console.log(
    `Verified count increased by: ${
      mockVerifiedStats.verified - mockUpdatedStats.verified
    }`
  );

  // 4. Revoke some credentials
  console.log('\n4. Revoking credentials and checking stats...');
  for (let i = 0; i < 2; i++) {
    console.log(`Revoking credential ${i + 1}...`);
    await sleep(100);
  }

  console.log('Final stats:', JSON.stringify(mockFinalStats, null, 2));
  console.log(
    `Revoked count increased by: ${
      mockFinalStats.revoked - mockVerifiedStats.revoked
    }`
  );

  // 5. Summary
  console.log('\n5. Note about visualization:');
  console.log(
    '  In the TypeScript version, we do not generate visualizations.'
  );
  console.log(
    '  For visualization capabilities, please use the Python version of this example.'
  );

  // 6. Display summary
  displayStatsSummary(mockInitialStats, mockFinalStats, 5, 3, 2);
}

/**
 * Main function to run the example
 */
async function main(): Promise<void> {
  console.log('Credential Hub Stats Example (TypeScript)');
  console.log('---------------------------------------');

  // Check if the service is available
  const isServiceAvailable = await checkServiceAvailability();

  if (!isServiceAvailable) {
    await runDemoMode();
    return;
  }

  console.log('✅ Credential Hub service is available at', BASE_URL);

  // 1. Get initial stats
  console.log('\n1. Getting initial credential statistics...');
  const initialStats = await getStats();
  console.log('Initial stats:', JSON.stringify(initialStats, null, 2));

  // 2. Issue some credentials and check stats
  console.log('\n2. Issuing credentials and checking stats...');
  const credentialIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    console.log(`Issuing credential ${i + 1}...`);
    const credentialId = await issueCredential();
    credentialIds.push(credentialId);
    await sleep(500); // Small delay between operations
  }

  // Get updated stats
  const updatedStats = await getStats();
  console.log(
    'Updated stats after issuing:',
    JSON.stringify(updatedStats, null, 2)
  );
  console.log(
    `Issued count increased by: ${updatedStats.issued - initialStats.issued}`
  );

  // 3. Verify some credentials
  console.log('\n3. Verifying credentials and checking stats...');
  for (let i = 0; i < 3; i++) {
    // Verify first 3
    console.log(`Verifying credential ${i + 1}...`);
    await verifyCredential(credentialIds[i]);
    await sleep(500); // Small delay between operations
  }

  // Get updated stats
  const verifiedStats = await getStats();
  console.log(
    'Stats after verification:',
    JSON.stringify(verifiedStats, null, 2)
  );
  console.log(
    `Verified count increased by: ${
      verifiedStats.verified - updatedStats.verified
    }`
  );

  // 4. Revoke some credentials
  console.log('\n4. Revoking credentials and checking stats...');
  for (let i = 0; i < 2; i++) {
    // Revoke first 2
    console.log(`Revoking credential ${i + 1}...`);
    await revokeCredential(credentialIds[i]);
    await sleep(500); // Small delay between operations
  }

  // Get final stats
  const finalStats = await getStats();
  console.log('Final stats:', JSON.stringify(finalStats, null, 2));
  console.log(
    `Revoked count increased by: ${finalStats.revoked - verifiedStats.revoked}`
  );

  // 5. Summary
  console.log('\n5. Note about visualization:');
  console.log(
    '  In the TypeScript version, we do not generate visualizations.'
  );
  console.log(
    '  For visualization capabilities, please use the Python version of this example.'
  );

  // 6. Display summary
  displayStatsSummary(initialStats, finalStats, 5, 3, 2);
}

// Run the example
main().catch((error: any) => {
  console.error('Error running example:', error);
});
