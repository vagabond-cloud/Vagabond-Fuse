/**
 * Example demonstrating how to use the DID Gateway package with XRPL DID method
 *
 * This example shows how to:
 * 1. Create a DID using the XRPL method
 * 2. Resolve an XRPL DID
 * 3. Update an XRPL DID document
 * 4. Deactivate an XRPL DID
 */

import { DIDGateway, DIDMethod } from './mocks/did-gateway';

async function main() {
  console.log('XRPL DID Gateway Example');
  console.log('------------------------');

  // Create a new DID Gateway instance
  const gateway = new DIDGateway();

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
  // In a real app, this would be the XRPL account seed (private key)
  const privateKey = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb';

  // Resolve the DID
  console.log('\n2. Resolving the XRPL DID...');
  const resolveResult = await gateway.resolve(did);
  console.log('Resolved DID Document:');
  console.log(JSON.stringify(resolveResult.didDocument, null, 2));

  // Update the DID document
  console.log('\n3. Updating the XRPL DID document...');
  const updatedDocument = {
    ...didDocument,
    service: [
      {
        id: '#service-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://example.com',
      },
      {
        id: '#service-2',
        type: 'MessagingService',
        serviceEndpoint: 'https://messaging.example.com',
      },
    ],
  };

  const updateResult = await gateway.update(did, updatedDocument, privateKey);
  console.log('Updated DID Document:');
  console.log(JSON.stringify(updateResult.didDocument, null, 2));

  // Deactivate the DID
  console.log('\n4. Deactivating the XRPL DID...');
  const deactivateResult = await gateway.deactivate(did, privateKey);
  console.log(
    `DID deactivated: ${deactivateResult.didDocumentMetadata.deactivated}`
  );

  // Example of how XRPL DIDs work with real accounts
  console.log('\n5. XRPL DID Format Examples:');
  console.log('- Standard XRPL Account:');
  console.log('  did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh');
  console.log('- Testnet Account:');
  console.log('  did:xrpl:rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe');

  console.log('\n6. How XRPL DIDs Work:');
  console.log("- DID documents are stored in the account's Domain field");
  console.log('- The Domain field has a size limitation (max 256 bytes)');
  console.log(
    '- For larger documents, use content-addressed storage and store the reference'
  );
  console.log(
    '- XRPL Hooks v3 can be used for more sophisticated functionality'
  );

  console.log('\n7. Benefits of XRPL DIDs:');
  console.log("- Leverages XRPL's high throughput and low fees");
  console.log('- Built-in account management and key rotation');
  console.log("- Integration with XRPL's decentralized exchange");
  console.log('- Compatibility with existing XRPL infrastructure');
}

main().catch(console.error);
