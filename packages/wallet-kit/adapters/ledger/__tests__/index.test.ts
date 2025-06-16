import { LedgerAdapter } from '../index';
import Transport from '@ledgerhq/hw-transport-webusb';

// Mock the Transport module
jest.mock('@ledgerhq/hw-transport-webusb', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(),
    },
  };
});

describe('LedgerAdapter', () => {
  let adapter: LedgerAdapter;
  let mockTransport: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock transport instance
    mockTransport = {
      close: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockImplementation((cla, ins, p1, p2, data) => {
        // Mock responses based on APDU commands
        if (ins === 0x02) {
          // Get public key command
          return Promise.resolve({
            publicKey: Buffer.from('ED' + '0'.repeat(64)).toString('hex'),
            address: 'rSomeXrplAddressHere',
          });
        } else if (ins === 0x04) {
          // Sign command
          return Promise.resolve({
            signature: Buffer.from('1'.repeat(128)).toString('hex'),
          });
        }
        return Promise.resolve({});
      }),
    };

    // Setup the mock for Transport.create
    (Transport.create as jest.Mock).mockResolvedValue(mockTransport);

    // Create adapter instance
    adapter = new LedgerAdapter({ accountIndex: 0 });
  });

  describe('connect', () => {
    it('should connect successfully to Ledger device', async () => {
      const result = await adapter.connect();

      expect(Transport.create).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Make the mock throw an error
      (Transport.create as jest.Mock).mockRejectedValue(
        new Error('Connection failed')
      );

      const result = await adapter.connect();

      expect(Transport.create).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Ledger device', async () => {
      // First connect
      await adapter.connect();

      // Then disconnect
      await adapter.disconnect();

      expect(mockTransport.close).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await adapter.disconnect();

      expect(mockTransport.close).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      await adapter.connect();

      const result = await adapter.isConnected();

      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      const result = await adapter.isConnected();

      expect(result).toBe(false);
    });
  });

  describe('getAddress', () => {
    it('should return the address when connected', async () => {
      await adapter.connect();

      const address = await adapter.getAddress();

      expect(address).toMatch(/^r/); // XRPL addresses start with 'r'
    });

    it('should throw error when not connected', async () => {
      await expect(adapter.getAddress()).rejects.toThrow(
        'Not connected to Ledger device'
      );
    });
  });

  describe('signTransaction', () => {
    const mockTransaction = {
      TransactionType: 'Payment',
      Account: 'rSomeAddress',
      Destination: 'rSomeDestination',
      Amount: '1000000',
    };

    it('should sign a transaction when connected', async () => {
      await adapter.connect();

      const signedTx = await adapter.signTransaction(mockTransaction);

      expect(signedTx).toBeTruthy();
      expect(typeof signedTx).toBe('string');
    });

    it('should throw error when not connected', async () => {
      await expect(adapter.signTransaction(mockTransaction)).rejects.toThrow(
        'Not connected to Ledger device'
      );
    });
  });

  describe('submitTransaction', () => {
    it('should submit a transaction', async () => {
      const result = await adapter.submitTransaction('some_signed_blob');

      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('ledger_index');
      expect(result).toHaveProperty('validated');
    });
  });

  describe('sign', () => {
    it('should sign data when connected', async () => {
      await adapter.connect();

      const data = new Uint8Array([1, 2, 3, 4]);
      const result = await adapter.sign(data, 'some-key-id');

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('keyId');
      expect(result).toHaveProperty('algorithm');
      expect(result.algorithm).toBe('ed25519');
    });

    it('should throw error when not connected', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      await expect(adapter.sign(data, 'some-key-id')).rejects.toThrow(
        'Not connected to Ledger device'
      );
    });
  });

  describe('unsupported operations', () => {
    it('should throw error for generateKey', async () => {
      await expect(adapter.generateKey('ed25519')).rejects.toThrow(
        'Key generation not supported'
      );
    });

    it('should throw error for verify', async () => {
      await expect(
        adapter.verify(new Uint8Array([1]), 'sig', 'pubkey', 'ed25519')
      ).rejects.toThrow('Signature verification not supported');
    });

    it('should throw error for exportKey', async () => {
      await expect(adapter.exportKey('keyId', 'hex')).rejects.toThrow(
        'Key export not supported'
      );
    });

    it('should throw error for importKey', async () => {
      await expect(adapter.importKey('key', 'ed25519', 'hex')).rejects.toThrow(
        'Key import not supported'
      );
    });

    it('should throw error for listKeys', async () => {
      await expect(adapter.listKeys()).rejects.toThrow(
        'Listing keys not supported'
      );
    });

    it('should throw error for deleteKey', async () => {
      await expect(adapter.deleteKey('keyId')).rejects.toThrow(
        'Key deletion not supported'
      );
    });
  });
});
