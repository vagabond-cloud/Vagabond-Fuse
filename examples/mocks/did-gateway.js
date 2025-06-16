/**
 * Mock implementation of the did-gateway package for examples
 */

export enum DIDMethod {
  ION = 'ion',
  POLYGON = 'polygon',
  XRPL = 'xrpl',
  WEB = 'web',
  KEY = 'key',
}

interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk?: any;
}

interface DIDDocument {
  id: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  service?: any[];
}

interface DIDDocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
  versionId?: string;
}

interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didDocumentMetadata: DIDDocumentMetadata;
  didResolutionMetadata: any;
}

export class DIDGateway {
  constructor() {
    console.log('[MOCK] Created DID Gateway instance');
  }

  async create(
    method: DIDMethod,
    document: Partial<DIDDocument>
  ): Promise<DIDResolutionResult> {
    // Generate a mock DID based on the method
    const didId = `did:${method}:${Date.now().toString(16)}`;

    // Create a complete DID document
    const didDocument: DIDDocument = {
      ...document,
      id: didId,
    };

    // Update controller fields if they're empty
    if (didDocument.verificationMethod) {
      didDocument.verificationMethod = didDocument.verificationMethod.map(
        (vm) => ({
          ...vm,
          controller: vm.controller || didId,
        })
      );
    }

    console.log(`[MOCK] Created DID with method ${method}: ${didId}`);

    return {
      didDocument,
      didDocumentMetadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
    };
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    // Parse the DID to extract method and ID
    const [_, method, id] = did.split(':');

    // Create a mock DID document
    const didDocument: DIDDocument = {
      id: did,
      verificationMethod: [
        {
          id: `${did}#keys-1`,
          type: 'EcdsaSecp256k1VerificationKey2018',
          controller: did,
          publicKeyJwk: {
            kty: 'EC',
            crv: 'secp256k1',
            x: 'sample-public-key-x-value',
            y: 'sample-public-key-y-value',
          },
        },
      ],
      authentication: [`${did}#keys-1`],
      assertionMethod: [`${did}#keys-1`],
      service: [],
    };

    console.log(`[MOCK] Resolved DID: ${did}`);

    return {
      didDocument,
      didDocumentMetadata: {
        created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
    };
  }

  async update(
    did: string,
    document: Partial<DIDDocument>,
    privateKey: string
  ): Promise<DIDResolutionResult> {
    // Validate the private key (mock validation)
    if (!privateKey || privateKey.length < 10) {
      throw new Error('Invalid private key');
    }

    // Create an updated DID document
    const didDocument: DIDDocument = {
      ...document,
      id: did,
    };

    console.log(`[MOCK] Updated DID document for ${did}`);

    return {
      didDocument,
      didDocumentMetadata: {
        created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated: new Date().toISOString(),
        versionId: `${Date.now().toString(16)}`,
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
    };
  }

  async deactivate(
    did: string,
    privateKey: string
  ): Promise<DIDResolutionResult> {
    // Validate the private key (mock validation)
    if (!privateKey || privateKey.length < 10) {
      throw new Error('Invalid private key');
    }

    console.log(`[MOCK] Deactivated DID: ${did}`);

    return {
      didDocument: {
        id: did,
      },
      didDocumentMetadata: {
        created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated: new Date().toISOString(),
        deactivated: true,
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
    };
  }
}
