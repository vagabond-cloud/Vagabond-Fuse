/**
 * Example demonstrating how to use the Policy Engine service with OPA WASM integration in TypeScript
 *
 * This example shows how to:
 * 1. Create a policy with GDPR rules
 * 2. Evaluate data against the policy using the service API
 * 3. Understand policy decisions and reasons
 * 4. Update and manage policies
 *
 * Note: If the Policy Engine service is not running, this example will automatically
 * switch to mock mode and simulate the API responses.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Define the base URL for the Policy Engine service
const BASE_URL = 'http://localhost:8001';

// Flag to track if we're in mock mode
let MOCK_MODE = false;

// Define interfaces for the example
interface Policy {
  name: string;
  description: string;
  version: string;
  type: string;
  rules: any[];
  metadata?: Record<string, any>;
}

interface PolicyResponse {
  policy_id: string;
  policy: Policy;
}

interface EvaluationRequest {
  input_data: Record<string, any>;
}

interface EvaluationResponse {
  allowed: boolean;
  reasons: string[];
  errors?: string[];
}

interface TestCase {
  name: string;
  data: Record<string, any>;
  expected_result: boolean;
}

// Helper function to check if the service is running
async function checkServiceAvailability(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
    return true;
  } catch (error: any) {
    console.log(
      'Policy Engine service is not available. Switching to mock mode.'
    );
    MOCK_MODE = true;
    return false;
  }
}

// Helper function to create a policy
async function createPolicy(policy: Policy): Promise<PolicyResponse | null> {
  if (MOCK_MODE) {
    return mockCreatePolicy(policy);
  }

  try {
    const response = await axios.post(`${BASE_URL}/policies`, policy);
    return response.data;
  } catch (error: any) {
    console.error('Error creating policy:', error.message);
    console.log('Switching to mock mode.');
    MOCK_MODE = true;
    return mockCreatePolicy(policy);
  }
}

// Mock implementation of createPolicy
function mockCreatePolicy(policy: Policy): PolicyResponse {
  const policyId = uuidv4();
  console.log('MOCK: Created policy with ID:', policyId);

  return {
    policy_id: policyId,
    policy: policy,
  };
}

// Helper function to evaluate a policy
async function evaluatePolicy(
  policyId: string,
  data: Record<string, any>
): Promise<EvaluationResponse | null> {
  if (MOCK_MODE) {
    return mockEvaluatePolicy(data);
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/policies/${policyId}/evaluate`,
      { input_data: data }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error evaluating policy:', error.message);
    console.log('Switching to mock mode.');
    MOCK_MODE = true;
    return mockEvaluatePolicy(data);
  }
}

// Mock implementation of evaluatePolicy
function mockEvaluatePolicy(data: Record<string, any>): EvaluationResponse {
  // Simulate GDPR policy evaluation
  const user = data.user || {};
  const purpose = data.purpose;
  const context = data.context || {};

  // Check conditions
  const hasConsent = user.consent === true;
  const hasPurpose = purpose !== null && purpose !== undefined;
  const isPurposeAllowed =
    hasPurpose &&
    Array.isArray(user.allowed_purposes) &&
    user.allowed_purposes.includes(purpose);
  const isSensitivityAcceptable =
    !context.sensitivityLevel || context.sensitivityLevel <= 3;

  // Determine if allowed
  const allowed =
    hasConsent && hasPurpose && isPurposeAllowed && isSensitivityAcceptable;

  // Generate reasons
  const reasons: string[] = [];

  if (hasConsent) {
    reasons.push('User has provided consent');
  } else {
    reasons.push('User has not provided consent');
  }

  if (hasPurpose) {
    reasons.push('Purpose is specified');

    if (isPurposeAllowed) {
      reasons.push('Purpose is allowed');
    } else {
      reasons.push('Purpose is not allowed');
    }
  } else {
    reasons.push('Purpose is not specified');
  }

  if (context.sensitivityLevel && context.sensitivityLevel > 3) {
    reasons.push('Sensitivity level exceeds allowed threshold');
  }

  return {
    allowed,
    reasons,
  };
}

// Helper function to update a policy
async function updatePolicy(
  policyId: string,
  policy: Policy
): Promise<Policy | null> {
  if (MOCK_MODE) {
    return mockUpdatePolicy(policy);
  }

  try {
    const response = await axios.put(
      `${BASE_URL}/policies/${policyId}`,
      policy
    );
    return response.data;
  } catch (error: any) {
    console.error('Error updating policy:', error.message);
    console.log('Switching to mock mode.');
    MOCK_MODE = true;
    return mockUpdatePolicy(policy);
  }
}

// Mock implementation of updatePolicy
function mockUpdatePolicy(policy: Policy): Policy {
  console.log('MOCK: Updated policy');
  // Return a deep copy of the policy to ensure all properties are preserved
  return {
    ...policy,
    version: policy.version || '1.0.0', // Ensure version is defined
  };
}

// Helper function to delete a policy
async function deletePolicy(policyId: string): Promise<boolean> {
  if (MOCK_MODE) {
    return mockDeletePolicy(policyId);
  }

  try {
    await axios.delete(`${BASE_URL}/policies/${policyId}`);
    return true;
  } catch (error: any) {
    console.error('Error deleting policy:', error.message);
    console.log('Switching to mock mode.');
    MOCK_MODE = true;
    return mockDeletePolicy(policyId);
  }
}

// Mock implementation of deletePolicy
function mockDeletePolicy(policyId: string): boolean {
  console.log('MOCK: Deleted policy with ID:', policyId);
  return true;
}

// Main function
async function main() {
  console.log('Policy Engine Service WASM Example (TypeScript)');
  console.log('--------------------------------------------');

  // Check if the service is running
  await checkServiceAvailability();

  if (MOCK_MODE) {
    console.log(
      '\n⚠️  Running in MOCK MODE - Policy Engine service is not available'
    );
    console.log(
      'This example will simulate API responses for demonstration purposes.'
    );
    console.log(
      'To run with the actual service, start the Policy Engine service:'
    );
    console.log('  cd ../services/policy-engine');
    console.log('  poetry run uvicorn app.main:app --reload');
    console.log('');
  }

  // 1. Create a GDPR policy
  console.log('\n1. Creating a GDPR policy...');

  // Define a GDPR policy using JSON Logic
  // These rules will be converted to Rego and compiled to WASM by the service
  const gdprPolicy: Policy = {
    name: 'GDPR Data Processing Policy',
    description: 'Controls data processing based on user consent and purpose',
    version: '1.0.0',
    type: 'compliance',
    rules: [
      // Rule 1: User must have provided consent
      {
        '==': [{ var: 'user.consent' }, true],
      },
      // Rule 2: Purpose must be specified
      {
        '!=': [{ var: 'purpose' }, null],
      },
      // Rule 3: Purpose must be in the list of allowed purposes
      {
        in: [{ var: 'purpose' }, { var: 'user.allowed_purposes' }],
      },
    ],
    metadata: {
      category: 'GDPR',
      owner: 'data-protection-officer',
      tags: ['gdpr', 'consent', 'data-processing'],
    },
  };

  const policyResponse = await createPolicy(gdprPolicy);
  const policyId = policyResponse?.policy_id || uuidv4();

  if (policyResponse) {
    console.log('Policy created successfully:');
    console.log(`  ID: ${policyResponse.policy_id}`);
    console.log(`  Name: ${policyResponse.policy.name}`);
    console.log(`  Version: ${policyResponse.policy.version}`);
  }

  // 2. Evaluate the policy against input data
  console.log('\n2. Evaluating policy against different scenarios...');

  // Test cases
  const testCases: TestCase[] = [
    {
      name: 'Valid consent and purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics', 'service-improvement'],
        },
        purpose: 'marketing',
      },
      expected_result: true,
    },
    {
      name: 'No consent',
      data: {
        user: {
          consent: false,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'marketing',
      },
      expected_result: false,
    },
    {
      name: 'Missing purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: null,
      },
      expected_result: false,
    },
    {
      name: 'Disallowed purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'profiling',
      },
      expected_result: false,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nScenario: ${testCase.name}`);

    const result = await evaluatePolicy(policyId, testCase.data);

    if (result) {
      console.log(`Access allowed: ${result.allowed}`);
      console.log(`Reasons: ${result.reasons.join(', ')}`);

      // Verify the result matches the expected outcome
      if (result.allowed === testCase.expected_result) {
        console.log('✅ Result matches expected outcome');
      } else {
        console.log(
          `❌ Result does not match expected outcome (${testCase.expected_result})`
        );
      }
    }
  }

  // 3. Update the policy to add context-based restrictions
  console.log('\n3. Updating the policy to add context-based restrictions...');

  // Add a new rule for sensitivity level restrictions
  const updatedPolicy = { ...gdprPolicy };
  updatedPolicy.rules.push({
    '<=': [{ var: 'context.sensitivityLevel' }, 3],
  });
  updatedPolicy.version = '1.1.0';
  updatedPolicy.description += ' and sensitivity level';

  const updateResult = await updatePolicy(policyId, updatedPolicy);

  if (updateResult) {
    console.log('Policy updated successfully:');
    console.log(`  New version: ${updateResult.version}`);
    console.log(`  Rules count: ${updateResult.rules?.length || 'unknown'}`);
  }

  // 4. Evaluate with context-based restrictions
  console.log(
    '\n4. Evaluating updated policy with context-based restrictions...'
  );

  const contextTestCases: TestCase[] = [
    {
      name: 'Low sensitivity data',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'marketing',
        context: {
          sensitivityLevel: 2,
        },
      },
      expected_result: true,
    },
    {
      name: 'High sensitivity data',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'marketing',
        context: {
          sensitivityLevel: 5,
        },
      },
      expected_result: false,
    },
  ];

  for (const testCase of contextTestCases) {
    console.log(`\nScenario: ${testCase.name}`);

    const result = await evaluatePolicy(policyId, testCase.data);

    if (result) {
      console.log(`Access allowed: ${result.allowed}`);
      console.log(`Reasons: ${result.reasons.join(', ')}`);

      // Verify the result matches the expected outcome
      if (result.allowed === testCase.expected_result) {
        console.log('✅ Result matches expected outcome');
      } else {
        console.log(
          `❌ Result does not match expected outcome (${testCase.expected_result})`
        );
      }
    }
  }
}

main();
