import { DIDGateway } from '../lib/did-gateway';
import { DIDMethod } from '../lib/types';

// Mock the drivers
jest.mock('../lib/drivers/ion', () => {
  return {
    IonDriver: jest.fn().mockImplementation(() => {
      return {
        create: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:ion:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        resolve: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:ion:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        update: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:ion:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: { updated: 'timestamp' },
        }),
        deactivate: jest.fn().mockResolvedValue({
          didDocument: null,
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: { deactivated: true },
        }),
      };
    }),
  };
});

jest.mock('../lib/drivers/polygon', () => {
  return {
    PolygonDriver: jest.fn().mockImplementation(() => {
      return {
        create: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:polygon:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        resolve: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:polygon:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        update: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:polygon:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: { updated: 'timestamp' },
        }),
        deactivate: jest.fn().mockResolvedValue({
          didDocument: null,
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: { deactivated: true },
        }),
      };
    }),
  };
});

describe('DIDGateway', () => {
  let gateway: DIDGateway;

  beforeEach(() => {
    gateway = new DIDGateway();
  });

  test('should create a new ION DID', async () => {
    const result = await gateway.create(DIDMethod.ION, { id: 'test' });
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:ion:test');
  });

  test('should create a new Polygon DID', async () => {
    const result = await gateway.create(DIDMethod.POLYGON, { id: 'test' });
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:polygon:test');
  });

  test('should resolve an ION DID', async () => {
    const result = await gateway.resolve('did:ion:test');
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:ion:test');
  });

  test('should resolve a Polygon DID', async () => {
    const result = await gateway.resolve('did:polygon:test');
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:polygon:test');
  });

  test('should update an ION DID', async () => {
    const result = await gateway.update(
      'did:ion:test',
      { id: 'test' },
      'privateKey'
    );
    expect(result.didDocument).toBeDefined();
    expect(result.didDocumentMetadata.updated).toBe('timestamp');
  });

  test('should deactivate a Polygon DID', async () => {
    const result = await gateway.deactivate('did:polygon:test', 'privateKey');
    expect(result.didDocument).toBeNull();
    expect(result.didDocumentMetadata.deactivated).toBe(true);
  });

  test('should throw an error for unsupported DID method', async () => {
    await expect(gateway.resolve('did:unsupported:test')).rejects.toThrow(
      'Unsupported DID method'
    );
  });

  test('should throw an error for invalid DID format', async () => {
    await expect(gateway.resolve('invalid')).rejects.toThrow(
      'Invalid DID format'
    );
  });
});
