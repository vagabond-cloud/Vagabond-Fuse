import { XrplDriver } from '../methods/xrpl';
import { Client, Wallet } from 'xrpl';
import { WalletAdapter } from '../../../wallet-kit/src/lib/wallet-adapter';

// Mock wallet adapter
class MockWalletAdapter implements WalletAdapter {
  private connected = false;
  private address = 'rMockWalletAddress';

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getAddress(): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }
    return this.address;
  }

  async signTransaction(transaction: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }
    return 'mock_signed_transaction_blob';
  }

  async submitTransaction(txBlob: string): Promise<any> {
    return {
      hash: 'mock_transaction_hash',
      ledger_index: 1234,
      meta: {},
      validated: true,
    };
  }

  // Implement other required methods with minimal functionality
  async generateKey(): Promise<any> {
    throw new Error('Not implemented');
  }

  async sign(): Promise<any> {
    throw new Error('Not implemented');
  }

  async verify(): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async exportKey(): Promise<string> {
    throw new Error('Not implemented');
  }

  async importKey(): Promise<string> {
    throw new Error('Not implemented');
  }

  async listKeys(): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async deleteKey(): Promise<boolean> {
    throw new Error('Not implemented');
  }
}

// Mock the xrpl library
jest.mock('xrpl', () => {
  // Mock wallet
  const mockWallet = {
    address: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    seed: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb',
    publicKey:
      'ED0827E5CD9A74F1BC533A43A9EFFDCFA5D8545F9F267B9C69F8D847D398D306CD',
    privateKey:
      '00D78B9735C3F26501C7337B8A5727FD53A6EFDBC6AA55984F098488561F985E23',
    classicAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    sign: jest.fn().mockReturnValue({
      tx_blob: 'signed_transaction_blob',
      hash: 'transaction_hash',
    }),
  };

  // Mock Client class
  const MockClient = jest.fn().mockImplementation(() => {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      autofill: jest.fn().mockImplementation(async (transaction) => {
        return {
          ...transaction,
          Fee: '10',
          Sequence: 1,
          LastLedgerSequence: 100,
        };
      }),
      submitAndWait: jest.fn().mockResolvedValue({
        result: {
          hash: 'transaction_hash',
          status: 'success',
        },
      }),
      submit: jest.fn().mockResolvedValue({
        result: {
          tx_json: {
            hash: 'mock_transaction_hash',
          },
          status: 'success',
        },
      }),
      request: jest.fn().mockImplementation(async (request) => {
        if (request.command === 'account_info') {
          if (request.account === 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh') {
            return {
              result: {
                account_data: {
                  Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                  Domain:
                    '7b226964223a226469643a7872706c3a7248623943464157794234726a3931565257653936446b756b4734627764747954682227d', // Hex encoded JSON
                  Balance: '1000000000',
                },
                ledger_index: 1000,
              },
            };
          } else if (request.account === 'rDTXLQ7ZKZVKz33zJbHjgVShjsBnqMBhmN') {
            return {
              result: {
                account_data: {
                  Account: 'rDTXLQ7ZKZVKz33zJbHjgVShjsBnqMBhmN',
                  // No Domain field
                  Balance: '1000000000',
                },
                ledger_index: 1000,
              },
            };
          } else if (request.account === 'rMockWalletAddress') {
            return {
              result: {
                account_data: {
                  Account: 'rMockWalletAddress',
                  Domain:
                    '7b226964223a226469643a7872706c3a724d6f636b57616c6c6574416464726573732227d', // Hex encoded JSON
                  Balance: '1000000000',
                },
                ledger_index: 1000,
              },
            };
          } else {
            throw new Error('Account not found');
          }
        }
        return { result: {} };
      }),
    };
  });

  return {
    Client: MockClient,
    Wallet: {
      fromSeed: jest.fn().mockReturnValue(mockWallet),
      generate: jest.fn().mockReturnValue(mockWallet),
    },
    convertStringToHex: jest.fn().mockImplementation((str) => {
      return Buffer.from(str).toString('hex');
    }),
    xrpToDrops: jest.fn().mockImplementation((xrp) => {
      return String(Number(xrp) * 1000000);
    }),
  };
});

describe('XrplDriver', () => {
  let driver: XrplDriver;
  let mockWalletAdapter: MockWalletAdapter;

  beforeEach(() => {
    mockWalletAdapter = new MockWalletAdapter();
    driver = new XrplDriver('wss://test.xrpl.org');
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new XRPL DID with a generated wallet', async () => {
      const document = {
        verificationMethod: [
          {
            id: '#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
          },
        ],
      };

      const result = await driver.create(document);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(
        'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
      );
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.created).toBeDefined();
      expect(result.didDocumentMetadata.versionId).toBe('transaction_hash');
    });

    it('should create a new XRPL DID with a provided private key', async () => {
      const document = {
        verificationMethod: [
          {
            id: '#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
            publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
          },
        ],
      };

      const result = await driver.create(
        document,
        'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
      );

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(
        'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
      );
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.created).toBeDefined();
      expect(result.didDocumentMetadata.versionId).toBe('transaction_hash');
    });

    it('should create a new XRPL DID using wallet adapter', async () => {
      // Set the wallet adapter
      driver.setWalletAdapter(mockWalletAdapter);

      const document = {
        verificationMethod: [
          {
            id: '#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:xrpl:rMockWalletAddress',
            publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
          },
        ],
      };

      const result = await driver.create(document);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe('did:xrpl:rMockWalletAddress');
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.created).toBeDefined();
      expect(result.didDocumentMetadata.versionId).toBe(
        'mock_transaction_hash'
      );
    });

    it('should handle errors during creation', async () => {
      // Mock Client to throw an error
      const mockClient = require('xrpl').Client;
      mockClient.mockImplementationOnce(() => {
        return {
          connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
          isConnected: jest.fn().mockReturnValue(false),
        };
      });

      const document = { id: 'test' };
      const result = await driver.create(document);

      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
      expect(result.didResolutionMetadata.message).toBe('Connection failed');
    });
  });

  describe('resolve', () => {
    it('should resolve an existing XRPL DID', async () => {
      const did = 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
      const result = await driver.resolve(did);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
    });

    it('should create a minimal DID document when no Domain field exists', async () => {
      const did = 'did:xrpl:rDTXLQ7ZKZVKz33zJbHjgVShjsBnqMBhmN';
      const result = await driver.resolve(did);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
    });

    it('should handle invalid DID format', async () => {
      const result = await driver.resolve('invalid:did');
      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
      expect(result.didResolutionMetadata.message).toContain(
        'Invalid XRPL DID format'
      );
    });

    it('should handle non-existent accounts', async () => {
      const did = 'did:xrpl:rNonExistentAccount';
      const result = await driver.resolve(did);

      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
    });
  });

  describe('update', () => {
    it('should update an existing XRPL DID', async () => {
      const did = 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
      const document = {
        verificationMethod: [
          {
            id: '#key-2',
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: 'zNewPublicKeyMultibase',
          },
        ],
      };

      const result = await driver.update(
        did,
        document,
        'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
      );

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.updated).toBeDefined();
      expect(result.didDocumentMetadata.versionId).toBe('transaction_hash');
    });

    it('should update an existing XRPL DID using wallet adapter', async () => {
      // Set up mock wallet adapter
      driver.setWalletAdapter(mockWalletAdapter);
      await mockWalletAdapter.connect();

      const did = 'did:xrpl:rMockWalletAddress';
      const document = {
        verificationMethod: [
          {
            id: '#key-2',
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: 'zNewPublicKeyMultibase',
          },
        ],
      };

      const result = await driver.update(did, document);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.updated).toBeDefined();
      expect(result.didDocumentMetadata.versionId).toBe(
        'mock_transaction_hash'
      );
    });

    it('should reject updates with incorrect private key', async () => {
      // Mock Wallet.fromSeed to return a wallet with a different address
      const mockWallet = require('xrpl').Wallet;
      mockWallet.fromSeed.mockReturnValueOnce({
        address: 'rDifferentAddress',
        sign: jest.fn(),
      });

      const did = 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
      const document = { id: 'test' };
      const result = await driver.update(did, document, 'wrong_seed');

      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
    });

    it('should reject updates with mismatched wallet adapter address', async () => {
      // Set up mock wallet adapter with a different address
      const mismatchedAdapter = new MockWalletAdapter();
      driver.setWalletAdapter(mismatchedAdapter);
      await mismatchedAdapter.connect();

      // Mock getAddress to return a different address
      jest
        .spyOn(mismatchedAdapter, 'getAddress')
        .mockResolvedValueOnce('rDifferentAddress');

      const did = 'did:xrpl:rMockWalletAddress';
      const document = { id: 'test' };

      const result = await driver.update(did, document);

      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
      expect(result.didResolutionMetadata.message).toContain(
        'does not match DID address'
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate an existing XRPL DID', async () => {
      const did = 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
      const result = await driver.deactivate(
        did,
        'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
      );

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.deactivated).toBe(true);
    });

    it('should deactivate an existing XRPL DID using wallet adapter', async () => {
      // Set up mock wallet adapter
      driver.setWalletAdapter(mockWalletAdapter);
      await mockWalletAdapter.connect();

      const did = 'did:xrpl:rMockWalletAddress';
      const result = await driver.deactivate(did);

      expect(result.didDocument).toBeDefined();
      expect(result.didDocument?.id).toBe(did);
      expect(result.didResolutionMetadata.contentType).toBe(
        'application/did+json'
      );
      expect(result.didDocumentMetadata.deactivated).toBe(true);
      expect(result.didDocumentMetadata.versionId).toBe(
        'mock_transaction_hash'
      );
    });

    it('should reject deactivation with incorrect private key', async () => {
      // Mock Wallet.fromSeed to return a wallet with a different address
      const mockWallet = require('xrpl').Wallet;
      mockWallet.fromSeed.mockReturnValueOnce({
        address: 'rDifferentAddress',
        sign: jest.fn(),
      });

      const did = 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
      const result = await driver.deactivate(did, 'wrong_seed');

      expect(result.didDocument).toBeNull();
      expect(result.didResolutionMetadata.error).toBe('notFound');
    });
  });

  describe('wallet adapter management', () => {
    it('should get and set wallet adapter', () => {
      expect(driver.getWalletAdapter()).toBeNull();

      driver.setWalletAdapter(mockWalletAdapter);

      expect(driver.getWalletAdapter()).toBe(mockWalletAdapter);
    });
  });
});
