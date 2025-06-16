import { DIDGateway } from '../lib/did-gateway';
import { DIDMethod } from '../lib/types';

// Mock the drivers
jest.mock('../methods/xrpl', () => {
  return {
    XrplDriver: jest.fn().mockImplementation(() => {
      return {
        create: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:xrpl:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        resolve: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:xrpl:test' },
          didResolutionMetadata: { contentType: 'application/did+json' },
          didDocumentMetadata: {},
        }),
        update: jest.fn().mockResolvedValue({
          didDocument: { id: 'did:xrpl:test' },
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

// Mock the other drivers to avoid conflicts
jest.mock('../lib/drivers/ion', () => {
  return {
    IonDriver: jest.fn().mockImplementation(() => {
      return {
        create: jest.fn(),
        resolve: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
      };
    }),
  };
});

jest.mock('../lib/drivers/polygon', () => {
  return {
    PolygonDriver: jest.fn().mockImplementation(() => {
      return {
        create: jest.fn(),
        resolve: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
      };
    }),
  };
});

describe('DIDGateway with XRPL', () => {
  let gateway: DIDGateway;

  beforeEach(() => {
    gateway = new DIDGateway();
  });

  test('should create a new XRPL DID', async () => {
    const result = await gateway.create(DIDMethod.XRPL, { id: 'test' });
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:xrpl:test');
  });

  test('should resolve an XRPL DID', async () => {
    const result = await gateway.resolve('did:xrpl:test');
    expect(result.didDocument).toBeDefined();
    expect(result.didDocument?.id).toBe('did:xrpl:test');
  });

  test('should update an XRPL DID', async () => {
    const result = await gateway.update(
      'did:xrpl:test',
      { id: 'test' },
      'privateKey'
    );
    expect(result.didDocument).toBeDefined();
    expect(result.didDocumentMetadata.updated).toBe('timestamp');
  });

  test('should deactivate an XRPL DID', async () => {
    const result = await gateway.deactivate('did:xrpl:test', 'privateKey');
    expect(result.didDocument).toBeNull();
    expect(result.didDocumentMetadata.deactivated).toBe(true);
  });
});
