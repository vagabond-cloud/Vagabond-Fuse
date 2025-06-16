/**
 * Integration Example - Fuse Components Working Together
 *
 * This example demonstrates a complete workflow using all Fuse components:
 * 1. DID Gateway for identity management
 * 2. Wallet Kit for key management
 * 3. Policy Utils for policy evaluation
 */

import { DIDGateway, DIDMethod } from './mocks/did-gateway.js';
import { WalletKit, KeyType } from './mocks/wallet-kit.js';
import { PolicyCompiler } from './mocks/policy-utils.js';
import axios from 'axios';

// Define service endpoints
const CREDENTIAL_HUB_URL = 'http://localhost:8000';
const POLICY_ENGINE_URL = 'http://localhost:8001';

async function main() {
  console.log('CS-SIF Integration Example');
  console.log('=========================');

  try {
    // Step 1: Create a wallet and generate keys
    console.log('\n1. Creating wallet and generating keys...');
    const wallet = new WalletKit({
      storageOptions: { secureStorage: true },
    });

    const keyPair = await wallet.generateKey(KeyType.SECP256K1);
    console.log(
      `Generated key pair with public key: ${keyPair.publicKey.substring(
        0,
        10
      )}...`
    );

    // Step 2: Create a DID using the wallet keys
    console.log('\n2. Creating a DID using the wallet keys...');
    const didGateway = new DIDGateway();

    const publicKeyJwk = {
      kty: 'EC',
      crv: 'secp256k1',
      x: keyPair.publicKey.substring(0, 32), // Simplified for example
      y: keyPair.publicKey.substring(32, 64), // Simplified for example
    };

    const didDocument = {
      id: '',
      verificationMethod: [
        {
          id: '#keys-1',
          type: 'EcdsaSecp256k1VerificationKey2018',
          controller: '',
          publicKeyJwk,
        },
      ],
      authentication: ['#keys-1'],
      assertionMethod: ['#keys-1'],
    };

    const createResult = await didGateway.create(DIDMethod.ION, didDocument);
    const did = createResult.didDocument?.id as string;
    console.log(`Created DID: ${did}`);

    // Step 3: Define and compile a policy
    console.log('\n3. Defining and compiling a policy...');
    const policyCompiler = new PolicyCompiler();

    const accessPolicy = {
      id: 'credential-access-policy',
      name: 'Credential Access Policy',
      description: 'Controls who can access credential data',
      version: '1.0.0',
      rules: [
        // Rule: Credential must not be expired
        {
          '>': [{ var: 'credential.expirationDate' }, { var: 'now' }],
        },
        // Rule: User must be the subject of the credential or an authorized verifier
        {
          or: [
            { '==': [{ var: 'user.did' }, { var: 'credential.subject' }] },
            {
              in: [
                { var: 'user.did' },
                { var: 'credential.authorizedVerifiers' },
              ],
            },
          ],
        },
      ],
    };

    const compilationResult = await policyCompiler.compile(accessPolicy);
    console.log('Policy compiled to Rego:');
    console.log(compilationResult.rego?.substring(0, 150) + '...');

    // Step 4: Register the policy with the Policy Engine
    console.log('\n4. Registering policy with Policy Engine...');
    try {
      const policyResponse = await axios.post(
        `${POLICY_ENGINE_URL}/policies`,
        accessPolicy
      );
      console.log(`Policy registered with ID: ${policyResponse.data.id}`);
    } catch (error) {
      console.log(
        'Could not connect to Policy Engine service. Using mock data for demonstration.'
      );
      console.log(`Mock policy ID: ${accessPolicy.id}`);
    }

    // Step 5: Issue a verifiable credential
    console.log('\n5. Issuing a verifiable credential...');

    const credentialRequest = {
      subject_id: 'did:ion:test:subject123',
      issuer_id: did,
      claims: {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        employeeId: '12345',
        department: 'Engineering',
      },
      proof_type: 'jwt',
      expiration_date: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    let credential;
    try {
      const credentialResponse = await axios.post(
        `${CREDENTIAL_HUB_URL}/credentials/issue`,
        credentialRequest
      );
      credential = credentialResponse.data.credential;
      console.log('Credential issued successfully:');
      console.log(JSON.stringify(credential, null, 2));
    } catch (error) {
      console.log(
        'Could not connect to Credential Hub service. Using mock data for demonstration.'
      );
      credential = {
        id: `urn:uuid:${Math.random().toString(36).substring(2, 15)}`,
        issuer: did,
        credential_subject: {
          id: 'did:ion:test:subject123',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          employeeId: '12345',
          department: 'Engineering',
        },
        issuance_date: new Date().toISOString(),
        expiration_date: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        proof: {
          type: 'JwtProof2020',
          created: new Date().toISOString(),
          verificationMethod: `${did}#keys-1`,
          proofPurpose: 'assertionMethod',
          jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..PLACEHOLDER',
        },
      };
      console.log('Mock credential created for demonstration.');
    }

    // Step 6: Verify the credential against the policy
    console.log('\n6. Verifying the credential against the policy...');

    // Prepare evaluation data
    const evaluationData = {
      user: {
        did: 'did:ion:test:hr123', // One of the authorized verifiers
        role: 'HR',
      },
      credential: {
        subject: credential.credential_subject?.id || 'did:ion:test:subject123',
        expirationDate: credential.expiration_date,
        authorizedVerifiers: ['did:ion:test:hr123', 'did:ion:test:security456'],
      },
      now: new Date().toISOString(),
    };

    try {
      // First verify the credential signature
      try {
        console.log('Sending verification request with:', {
          credential_id: credential.id,
        });
        const verifyResponse = await axios.post(
          `${CREDENTIAL_HUB_URL}/credentials/verify`,
          { credential_id: credential.id }
        );
        console.log(
          `Credential signature verification: ${verifyResponse.data.is_valid}`
        );
      } catch (verifyError: any) {
        console.error('Verification error:', verifyError.message);
        if (verifyError.response) {
          console.error('Error response data:', verifyError.response.data);
          console.error('Error response status:', verifyError.response.status);
        }
        // Try with the full credential object instead
        console.log('Trying with full credential object...');
        const verifyResponse2 = await axios.post(
          `${CREDENTIAL_HUB_URL}/credentials/verify`,
          { credential: credential }
        );
        console.log(
          `Credential signature verification (second attempt): ${verifyResponse2.data.is_valid}`
        );
      }

      // Get the list of policies to find the correct ID
      const policiesResponse = await axios.get(`${POLICY_ENGINE_URL}/policies`);
      const policy = policiesResponse.data.policies.find(
        (p: any) => p.name === accessPolicy.name
      );

      if (!policy) {
        console.log('Policy not found, using the registered policy ID');
        // Then evaluate against the policy
        const policyResponse = await axios.post(
          `${POLICY_ENGINE_URL}/policies/${accessPolicy.id}/evaluate`,
          { input_data: evaluationData }
        );

        console.log(`Policy evaluation result: ${policyResponse.data.allowed}`);
        if (policyResponse.data.reasons) {
          console.log(`Reasons: ${policyResponse.data.reasons.join(', ')}`);
        }
      } else {
        console.log(`Found policy with ID: ${policy.id}`);
        // Then evaluate against the policy
        const policyResponse = await axios.post(
          `${POLICY_ENGINE_URL}/policies/${policy.id}/evaluate`,
          { input_data: evaluationData }
        );

        console.log(`Policy evaluation result: ${policyResponse.data.allowed}`);
        if (policyResponse.data.reasons) {
          console.log(`Reasons: ${policyResponse.data.reasons.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(
        'Could not connect to services. Using mock data for demonstration.'
      );

      // Mock verification
      console.log('Mock credential verification: true');

      // Mock policy evaluation - use our policy compiler to evaluate
      const evalResult = await policyCompiler.evaluate(
        accessPolicy,
        evaluationData
      );
      console.log(`Policy evaluation result: ${evalResult.allowed}`);
      if (evalResult.reasons) {
        console.log(`Reasons: ${evalResult.reasons.join(', ')}`);
      }
    }

    console.log('\nIntegration workflow completed successfully!');
  } catch (error) {
    console.error('Error in integration workflow:', error);
  }
}

main().catch(console.error);
