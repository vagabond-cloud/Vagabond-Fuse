/**
 * Example demonstrating how to use the Policy Utils package
 *
 * This example shows how to:
 * 1. Define policies using JSON Logic
 * 2. Compile policies to Rego
 * 3. Evaluate policies against data
 * 4. Handle complex policy rules
 */

import { PolicyCompiler, Policy } from './mocks/policy-utils.js';

async function main() {
  console.log('Policy Utils Example');
  console.log('-------------------');

  // Create a policy compiler instance
  const compiler = new PolicyCompiler();

  // Define a simple policy
  console.log('\n1. Defining a simple policy...');
  const simplePolicy: Policy = {
    id: 'access-control',
    name: 'Basic Access Control',
    description: 'Controls access based on user role and resource type',
    version: '1.0.0',
    rules: [{ '==': [{ var: 'user.role' }, 'admin'] }],
  };

  console.log(JSON.stringify(simplePolicy, null, 2));

  // Compile the policy to Rego
  console.log('\n2. Compiling policy to Rego...');
  const compilationResult = await compiler.compile(simplePolicy);

  if (compilationResult.errors) {
    console.error('Compilation errors:', compilationResult.errors);
  } else {
    console.log('Rego code:');
    console.log(compilationResult.rego);
  }

  // Define test data
  const adminData = { user: { role: 'admin' } };
  const userData = { user: { role: 'user' } };

  // Evaluate the policy against data
  console.log('\n3. Evaluating policy against admin data...');
  const adminResult = await compiler.evaluate(simplePolicy, adminData);
  console.log(`Access allowed: ${adminResult.allowed}`);
  console.log(`Reasons: ${adminResult.reasons?.join(', ')}`);

  console.log('\n4. Evaluating policy against user data...');
  const userResult = await compiler.evaluate(simplePolicy, userData);
  console.log(`Access allowed: ${userResult.allowed}`);
  console.log(`Reasons: ${userResult.reasons?.join(', ')}`);

  // Define a more complex policy
  console.log('\n5. Defining a complex policy with multiple rules...');
  const complexPolicy: Policy = {
    id: 'resource-access',
    name: 'Resource Access Control',
    description:
      'Controls access based on user role, resource type, and time constraints',
    version: '1.0.0',
    rules: [
      // Rule 1: User must be admin OR manager
      {
        or: [
          { '==': [{ var: 'user.role' }, 'admin'] },
          { '==': [{ var: 'user.role' }, 'manager'] },
        ],
      },
      // Rule 2: Resource must be public OR user must be the owner
      {
        or: [
          { '==': [{ var: 'resource.visibility' }, 'public'] },
          { '==': [{ var: 'resource.owner' }, { var: 'user.id' }] },
        ],
      },
    ],
  };

  console.log(JSON.stringify(complexPolicy, null, 2));

  // Compile the complex policy
  console.log('\n6. Compiling complex policy...');
  const complexResult = await compiler.compile(complexPolicy);

  if (complexResult.errors) {
    console.error('Compilation errors:', complexResult.errors);
  } else {
    console.log('Rego code:');
    console.log(complexResult.rego);
  }

  // Test the complex policy
  console.log('\n7. Testing complex policy with different scenarios...');

  const testCases = [
    {
      name: 'Admin accessing public resource',
      data: {
        user: { id: '1', role: 'admin' },
        resource: { visibility: 'public', owner: '2' },
      },
    },
    {
      name: 'User accessing own resource',
      data: {
        user: { id: '1', role: 'user' },
        resource: { visibility: 'private', owner: '1' },
      },
    },
    {
      name: "User accessing another's private resource",
      data: {
        user: { id: '1', role: 'user' },
        resource: { visibility: 'private', owner: '2' },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\nScenario: ${testCase.name}`);
    const result = await compiler.evaluate(complexPolicy, testCase.data);
    console.log(`Access allowed: ${result.allowed}`);
    if (result.reasons) {
      console.log(`Reasons: ${result.reasons.join(', ')}`);
    }
    if (result.errors) {
      console.log(`Errors: ${result.errors.join(', ')}`);
    }
  }
}

main().catch(console.error);
