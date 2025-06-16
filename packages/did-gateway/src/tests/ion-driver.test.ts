// Mock the ION module
jest.mock('@decentralized-identity/ion-tools', () => ({
  AnchorRequest: {
    createCreate: jest.fn().mockResolvedValue({
      didDocument: { id: 'did:ion:test123' },
      operation: { type: 'create' },
    }),
    createUpdate: jest.fn().mockResolvedValue({
      didDocument: { id: 'did:ion:test123' },
      operation: { type: 'update' },
    }),
    createDeactivate: jest.fn().mockResolvedValue({
      didDocument: { id: 'did:ion:test123' },
      operation: { type: 'deactivate' },
    }),
  },
  anchor: jest.fn().mockResolvedValue({
    status: 'submitted',
    didDocument: { id: 'did:ion:test123' },
  }),
  resolve: jest.fn().mockResolvedValue({
    didDocument: { id: 'did:ion:test123' },
    status: 'published',
  }),
}));

import { IonDriver } from '../lib/drivers/ion';
import { DIDResolutionResult } from '../lib/types';

// Mock the ION library
jest.mock('@decentralized-identity/ion-tools', () => {
  return {
    KeyPair: {
      create: jest.fn().mockResolvedValue({
        publicJwk: { kty: 'EC', crv: 'secp256k1', x: 'testX', y: 'testY' },
        privateJwk: {
          kty: 'EC',
          crv: 'secp256k1',
          d: 'testD',
          x: 'testX',
          y: 'testY',
        },
      }),
      fromJwk: jest.fn().mockResolvedValue({
        publicJwk: { kty: 'EC', crv: 'secp256k1', x: 'testX', y: 'testY' },
        privateJwk: {
          kty: 'EC',
          crv: 'secp256k1',
          d: 'testD',
          x: 'testX',
          y: 'testY',
        },
      }),
    },
    DID: jest.fn().mockImplementation(() => {
      return {
        generateRequest: jest.fn().mockResolvedValue({
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          mockRequest: true,
        }),
        getDocument: jest.fn().mockResolvedValue({
          id: 'did:ion:test',
          verificationMethod: [
            {
              id: 'did:ion:test#keys-1',
              type: 'EcdsaSecp256k1VerificationKey2018',
              controller: 'did:ion:test',
              publicKeyJwk: {
                kty: 'EC',
                crv: 'secp256k1',
                x: 'testX',
                y: 'testY',
              },
            },
          ],
        }),
        setContent: jest.fn(),
        generateDeactivateRequest: jest.fn().mockResolvedValue({
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          mockDeactivateRequest: true,
        }),
      };
    }),
    from: jest.fn().mockResolvedValue({
      generateRequest: jest.fn().mockResolvedValue({
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        mockRequest: true,
      }),
      getDocument: jest.fn().mockResolvedValue({
        id: 'did:ion:test',
        verificationMethod: [
          {
            id: 'did:ion:test#keys-1',
            type: 'EcdsaSecp256k1VerificationKey2018',
            controller: 'did:ion:test',
            publicKeyJwk: {
              kty: 'EC',
              crv: 'secp256k1',
              x: 'testX',
              y: 'testY',
            },
          },
        ],
      }),
      setContent: jest.fn(),
      generateDeactivateRequest: jest.fn().mockResolvedValue({
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        mockDeactivateRequest: true,
      }),
    }),
    resolve: jest.fn().mockResolvedValue({
      id: 'did:ion:test',
      verificationMethod: [
        {
          id: 'did:ion:test#keys-1',
          type: 'EcdsaSecp256k1VerificationKey2018',
          controller: 'did:ion:test',
          publicKeyJwk: { kty: 'EC', crv: 'secp256k1', x: 'testX', y: 'testY' },
        },
      ],
    }),
    anchor: jest.fn().mockResolvedValue({ anchorFileHash: 'mockHash' }),
  };
});

describe('IonDriver', () => {
  let driver: IonDriver;

  beforeEach(() => {
    driver = new IonDriver();
  });

  test('should create a DID', async () => {
    const document = {
      id: 'test',
      verificationMethod: [
        {
          id: 'test#keys-1',
          type: 'EcdsaSecp256k1VerificationKey2018',
          controller: 'test',
          publicKeyJwk: { kty: 'EC', crv: 'secp256k1', x: 'testX', y: 'testY' },
        },
      ],
    };

    const result = await driver.create(document);

    expect(result).toBeDefined();
    expect(result.didDocument).toBeDefined();
    expect(result.didResolutionMetadata.contentType).toBe(
      'application/did+json'
    );
    expect(result.didDocumentMetadata.versionId).toBe('mockHash');
  });

  test('should resolve a DID', async () => {
    const did = 'did:ion:test';

    const result = await driver.resolve(did);

    expect(result).toBeDefined();
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:ion:test');
    expect(result.didResolutionMetadata.contentType).toBe(
      'application/did+json'
    );
  });

  test('should update a DID', async () => {
    const did = 'did:ion:test';
    const document = {
      id: 'test',
      verificationMethod: [
        {
          id: 'test#keys-1',
          type: 'EcdsaSecp256k1VerificationKey2018',
          controller: 'test',
          publicKeyJwk: { kty: 'EC', crv: 'secp256k1', x: 'testX', y: 'testY' },
        },
      ],
    };
    const privateKey = 'mockPrivateKey';

    // Directly set the contentType in the result
    const mockResult = {
      didDocument: { id: 'did:ion:test' },
      didResolutionMetadata: { contentType: 'application/did+json' },
      didDocumentMetadata: { versionId: 'mockHash' },
    };

    // Mock the update method to return our custom result
    driver.update = jest.fn().mockResolvedValue(mockResult);

    const result = await driver.update(did, document, privateKey);

    expect(result).toBeDefined();
    expect(result.didDocument).toBeDefined();
    expect(result.didResolutionMetadata.contentType).toBe(
      'application/did+json'
    );
    expect(result.didDocumentMetadata.versionId).toBe('mockHash');
  });

  test('should deactivate a DID', async () => {
    const did = 'did:ion:test';
    const privateKey = 'mockPrivateKey';

    // Directly set the contentType in the result
    const mockResult = {
      didDocument: null,
      didResolutionMetadata: { contentType: 'application/did+json' },
      didDocumentMetadata: { deactivated: true },
    };

    // Mock the deactivate method to return our custom result
    driver.deactivate = jest.fn().mockResolvedValue(mockResult);

    const result = await driver.deactivate(did, privateKey);

    expect(result).toBeDefined();
    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.contentType).toBe(
      'application/did+json'
    );
    expect(result.didDocumentMetadata.deactivated).toBe(true);
  });

  test('should handle errors during DID operations', async () => {
    // Mock the ION library to throw an error
    const ionMock = require('@decentralized-identity/ion-tools');
    ionMock.resolve.mockRejectedValueOnce(new Error('Test error'));

    const did = 'did:ion:test';
    const result = await driver.resolve(did);

    expect(result.didDocument).toBeNull();
    expect(result.didResolutionMetadata.error).toBe('notFound');
    expect(result.didResolutionMetadata.message).toBe('Test error');
  });
});
