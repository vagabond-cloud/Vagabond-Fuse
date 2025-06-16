/**
 * Example demonstrating how to use the DID Gateway package
 *
 * This example shows how to:
 * 1. Create a DID using different methods
 * 2. Resolve a DID
 * 3. Update a DID document
 * 4. Deactivate a DID
 */

import { DIDGateway, DIDMethod } from './mocks/did-gateway.js';

async function main() {
  console.log('DID Gateway Example');
  console.log('------------------');

  // Create a new DID Gateway instance
  const gateway = new DIDGateway();

  // Create a new DID using ION method
  console.log('\n1. Creating a new DID using ION method...');
  const didDocument = {
    id: '', // Will be assigned by the DID method
    verificationMethod: [
      {
        id: '#keys-1',
        type: 'EcdsaSecp256k1VerificationKey2018',
        controller: '',
        publicKeyJwk: {
          kty: 'EC',
          crv: 'secp256k1',
          x: 'sample-public-key-x-value',
          y: 'sample-public-key-y-value',
        },
      },
    ],
    authentication: ['#keys-1'],
    assertionMethod: ['#keys-1'],
  };

  // Create the DID
  const createResult = await gateway.create(DIDMethod.ION, didDocument);
  console.log(`Created DID: ${createResult.didDocument?.id}`);

  // Store the DID and private key for later use
  const did = createResult.didDocument?.id as string;
  const privateKey = 'sample-private-key'; // In a real app, this would be securely stored

  // Resolve the DID
  console.log('\n2. Resolving the DID...');
  const resolveResult = await gateway.resolve(did);
  console.log('Resolved DID Document:');
  console.log(JSON.stringify(resolveResult.didDocument, null, 2));

  // Update the DID document
  console.log('\n3. Updating the DID document...');
  const updatedDocument = {
    ...didDocument,
    service: [
      {
        id: '#service-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://example.com',
      },
    ],
  };

  const updateResult = await gateway.update(did, updatedDocument, privateKey);
  console.log('Updated DID Document:');
  console.log(JSON.stringify(updateResult.didDocument, null, 2));

  // Deactivate the DID
  console.log('\n4. Deactivating the DID...');
  const deactivateResult = await gateway.deactivate(did, privateKey);
  console.log(
    `DID deactivated: ${deactivateResult.didDocumentMetadata.deactivated}`
  );

  // Create a DID using Polygon method
  console.log('\n5. Creating a new DID using Polygon method...');
  const polygonResult = await gateway.create(DIDMethod.POLYGON, didDocument);
  console.log(`Created Polygon DID: ${polygonResult.didDocument?.id}`);
}

main().catch(console.error);
