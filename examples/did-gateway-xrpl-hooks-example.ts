/**
 * Advanced example demonstrating how to use the DID Gateway package with XRPL DID method
 * and XRPL Hooks v3
 *
 * This example shows how to:
 * 1. Create a DID using the XRPL method with Hooks v3
 * 2. Store larger DID documents using XRPL Hooks
 * 3. Implement advanced DID operations with XRPL Hooks
 * 4. Set up DID authorization using XRPL Hooks
 */

import { DIDGateway, DIDMethod } from './mocks/did-gateway';

// Mock XRPL Hooks v3 API (in a real implementation, this would use the actual XRPL Hooks API)
class XrplHooksAPI {
  // Store mock data in memory
  private mockStorage: Map<string, string> = new Map();

  async deployHook(
    account: string,
    hookCode: string,
    hookParams: any
  ): Promise<string> {
    console.log(`[MOCK] Deploying Hook to account ${account}`);
    return `hook_hash_${Date.now().toString(16)}`;
  }

  async invokeHook(
    account: string,
    hookName: string,
    params: any
  ): Promise<any> {
    console.log(`[MOCK] Invoking Hook ${hookName} on account ${account}`);
    return { success: true, result: params };
  }

  async storeData(
    account: string,
    key: string,
    value: string
  ): Promise<boolean> {
    console.log(`[MOCK] Storing data with key ${key} on account ${account}`);
    // Store the actual value in our mock storage
    this.mockStorage.set(`${account}:${key}`, value);
    return true;
  }

  async readData(account: string, key: string): Promise<string> {
    console.log(`[MOCK] Reading data with key ${key} from account ${account}`);
    // Return the actual stored value if it exists
    const storageKey = `${account}:${key}`;
    if (this.mockStorage.has(storageKey)) {
      return this.mockStorage.get(storageKey) || '';
    }
    // Return a mock value that's valid JSON if the key contains 'meta'
    if (key.includes('meta')) {
      return JSON.stringify({
        chunks: 10,
        updated: new Date().toISOString(),
      });
    }
    // Return mock data for chunks
    if (key.includes('chunk')) {
      return JSON.stringify({
        chunkData: `Mock data for chunk ${key.split(':').pop()}`,
        index: parseInt(key.split(':').pop() || '0'),
      });
    }
    // Return mock data for auth
    if (key.includes('auth')) {
      return JSON.stringify({
        allowedMethods: ['resolve', 'update'],
        allowedOrigins: ['https://example.com'],
      });
    }
    return JSON.stringify({ mockData: `Data for ${key}` });
  }
}

// DID Hook Manager for XRPL
class DidHookManager {
  private hooksApi: XrplHooksAPI;

  constructor() {
    this.hooksApi = new XrplHooksAPI();
  }

  // Deploy the DID Hook to an XRPL account
  async deployDidHook(account: string, privateKey: string): Promise<string> {
    // In a real implementation, this would be the actual Hook code
    const didHookCode = `
      // XRPL Hook for DID Management
      #include <stdint.h>
      #include "hookapi.h"

      // Hook callback function
      int64_t hook(uint32_t reserved) {
          // DID management logic would go here
          return 0;
      }
    `;

    return await this.hooksApi.deployHook(account, didHookCode, {
      name: 'did_manager',
      version: '1.0.0',
    });
  }

  // Store a large DID document using the Hook's storage
  async storeDidDocument(
    account: string,
    did: string,
    document: any
  ): Promise<boolean> {
    const documentJson = JSON.stringify(document);

    // Split the document into chunks if it's too large
    const maxChunkSize = 1024;
    const chunks = [];

    for (let i = 0; i < documentJson.length; i += maxChunkSize) {
      chunks.push(documentJson.substring(i, i + maxChunkSize));
    }

    // Store metadata
    await this.hooksApi.storeData(
      account,
      `${did}:meta`,
      JSON.stringify({
        chunks: chunks.length,
        updated: new Date().toISOString(),
      })
    );

    // Store each chunk
    for (let i = 0; i < chunks.length; i++) {
      await this.hooksApi.storeData(account, `${did}:chunk:${i}`, chunks[i]);
    }

    return true;
  }

  // Retrieve a DID document from the Hook's storage
  async retrieveDidDocument(account: string, did: string): Promise<any> {
    try {
      // Get metadata
      const metaData = await this.hooksApi.readData(account, `${did}:meta`);
      const meta = JSON.parse(metaData);

      // For demo purposes, create a mock document instead of trying to parse chunks
      // In a real implementation, we would retrieve and combine all chunks
      return {
        id: did,
        service: Array(20)
          .fill(0)
          .map((_, i) => ({
            id: `#service-${i}`,
            type: 'ExampleService',
            serviceEndpoint: `https://example.com/service/${i}`,
          })),
        verificationMethod: [
          {
            id: '#keys-1',
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
          },
        ],
        authentication: ['#keys-1'],
      };
    } catch (error) {
      console.error('Error retrieving DID document:', error);
      throw error;
    }
  }

  // Set up DID authorization rules
  async setupDidAuthorization(
    account: string,
    did: string,
    authRules: any
  ): Promise<boolean> {
    return await this.hooksApi.storeData(
      account,
      `${did}:auth`,
      JSON.stringify(authRules)
    );
  }

  // Verify a DID authorization
  async verifyDidAuthorization(
    account: string,
    did: string,
    proof: any
  ): Promise<boolean> {
    const authRulesJson = await this.hooksApi.readData(account, `${did}:auth`);
    const authRules = JSON.parse(authRulesJson);

    // In a real implementation, this would verify the proof against the auth rules
    console.log(`[MOCK] Verifying authorization for DID ${did}`);
    return true;
  }
}

async function main() {
  console.log('XRPL DID Gateway with Hooks v3 Example');
  console.log('--------------------------------------');

  // Create a new DID Gateway instance
  const gateway = new DIDGateway();
  const hookManager = new DidHookManager();

  // Create a new DID using XRPL method
  console.log('\n1. Creating a new DID using XRPL method...');
  const didDocument = {
    id: '', // Will be assigned by the DID method
    verificationMethod: [
      {
        id: '#keys-1',
        type: 'Ed25519VerificationKey2020',
        controller: '',
        publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
      },
    ],
    authentication: ['#keys-1'],
    assertionMethod: ['#keys-1'],
  };

  // Create the DID
  const createResult = await gateway.create(DIDMethod.XRPL, didDocument);
  console.log(`Created DID: ${createResult.didDocument?.id}`);

  // Store the DID and private key for later use
  const did = createResult.didDocument?.id as string;
  const privateKey = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'; // XRPL account seed

  // Extract the XRPL account address from the DID
  const accountAddress = did.split(':')[2];

  // Deploy the DID Hook to the XRPL account
  console.log('\n2. Deploying DID Hook to XRPL account...');
  const hookHash = await hookManager.deployDidHook(accountAddress, privateKey);
  console.log(`Hook deployed with hash: ${hookHash}`);

  // Create a large DID document that exceeds the Domain field size limit
  console.log('\n3. Creating a large DID document...');
  const largeDidDocument = {
    ...didDocument,
    service: Array(20)
      .fill(0)
      .map((_, i) => ({
        id: `#service-${i}`,
        type: 'ExampleService',
        serviceEndpoint: `https://example.com/service/${i}`,
        description: `This is an example service with a long description that would exceed the Domain field size limit when combined with multiple services. This is service number ${i} in the array of services.`,
      })),
    additionalData: {
      credentials: Array(10)
        .fill(0)
        .map((_, i) => ({
          id: `credential-${i}`,
          type: ['VerifiableCredential', 'ExampleCredential'],
          issuer: 'did:example:issuer',
          issuanceDate: new Date().toISOString(),
          credentialSubject: {
            id: did,
            attributes: {
              name: 'Example Name',
              details:
                'This is a detailed attribute with a lot of information that would contribute to exceeding the Domain field size limit.',
            },
          },
        })),
    },
  };

  // Store the large DID document using the Hook's storage
  console.log('\n4. Storing large DID document using Hook storage...');
  await hookManager.storeDidDocument(accountAddress, did, largeDidDocument);

  // Retrieve the DID document from the Hook's storage
  console.log('\n5. Retrieving DID document from Hook storage...');
  const retrievedDocument = await hookManager.retrieveDidDocument(
    accountAddress,
    did
  );
  console.log('Retrieved document has the following services:');
  console.log(`- Number of services: ${retrievedDocument.service.length}`);
  console.log(`- First service ID: ${retrievedDocument.service[0].id}`);
  console.log(
    `- Last service ID: ${
      retrievedDocument.service[retrievedDocument.service.length - 1].id
    }`
  );

  // Set up DID authorization rules
  console.log('\n6. Setting up DID authorization rules...');
  const authRules = {
    allowedMethods: ['resolve', 'update'],
    allowedOrigins: ['https://example.com', 'https://trusted-app.com'],
    requiredClaims: ['name', 'email'],
  };
  await hookManager.setupDidAuthorization(accountAddress, did, authRules);

  // Verify a DID authorization
  console.log('\n7. Verifying DID authorization...');
  const authProof = {
    method: 'update',
    origin: 'https://example.com',
    claims: {
      name: 'Example User',
      email: 'user@example.com',
    },
    signature: 'mock_signature',
  };
  const isAuthorized = await hookManager.verifyDidAuthorization(
    accountAddress,
    did,
    authProof
  );
  console.log(`Authorization verified: ${isAuthorized}`);

  console.log('\n8. Benefits of using XRPL Hooks with DIDs:');
  console.log(
    '- Store larger DID documents beyond the Domain field size limit'
  );
  console.log('- Implement complex authorization rules and permissions');
  console.log(
    '- Enable advanced DID operations like delegation and revocation'
  );
  console.log('- Create DID-specific smart contract functionality');
  console.log('- Integrate with other XRPL Hook-based applications');
}

main().catch(console.error);
