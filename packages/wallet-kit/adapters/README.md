# Wallet Adapters for DID Gateway

This directory contains wallet adapters that can be used with the DID Gateway for XRPL DIDs.

## Available Adapters

- **Xumm**: Default adapter that integrates with the Xumm wallet for XRPL
- **Ledger**: Adapter for Ledger hardware wallets using WebUSB

## Bring Your Own Wallet

You can create your own wallet adapter by implementing the `WalletAdapter` interface from `@cs-sif/wallet-kit`.

### Step 1: Create a new adapter

Create a new directory under `packages/wallet-kit/adapters/<provider>/` and implement the adapter:

```typescript
import {
  KeyFormat,
  KeyPair,
  KeyType,
  SignatureResult,
  WalletAdapter,
  XrplTransaction,
  XrplTransactionResult,
} from '@cs-sif/wallet-kit';

/**
 * Your adapter configuration
 */
export interface YourAdapterConfig {
  // Configuration properties
  apiKey?: string;
  network?: string;
}

/**
 * Your wallet adapter implementation
 */
export class YourAdapter implements WalletAdapter {
  private connected = false;
  private config: YourAdapterConfig;
  private currentAddress?: string;

  constructor(config: YourAdapterConfig = {}) {
    this.config = {
      network: 'mainnet',
      ...config,
    };
  }

  // Required methods for XRPL operations
  async connect(): Promise<boolean> {
    try {
      // Implement connection to your wallet provider
      // Example:
      // const result = await yourWalletSDK.connect({
      //   apiKey: this.config.apiKey,
      //   network: this.config.network
      // });

      this.connected = true;
      this.currentAddress = 'rYourWalletXRPLAddress';
      return true;
    } catch (error) {
      console.error('Failed to connect to wallet:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Implement disconnection from your wallet provider
      // Example:
      // await yourWalletSDK.disconnect();

      this.connected = false;
      this.currentAddress = undefined;
    } catch (error) {
      console.error('Error disconnecting from wallet:', error);
      throw error;
    }
  }

  async isConnected(): Promise<boolean> {
    // Check connection status
    return this.connected;
  }

  async getAddress(): Promise<string> {
    if (!this.connected || !this.currentAddress) {
      throw new Error('Not connected to wallet');
    }
    return this.currentAddress;
  }

  async signTransaction(transaction: XrplTransaction): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    try {
      // Implement transaction signing with your wallet provider
      // Example:
      // const signedTx = await yourWalletSDK.signTransaction(transaction);
      // return signedTx.blob;

      return 'your_signed_transaction_blob';
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  async submitTransaction(txBlob: string): Promise<XrplTransactionResult> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    try {
      // Implement transaction submission with your wallet provider
      // Example:
      // const result = await yourWalletSDK.submitTransaction(txBlob);

      return {
        hash: 'transaction_hash',
        ledger_index: 12345,
        meta: {},
        validated: true,
      };
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    }
  }

  // Required methods from WalletInterface
  async generateKey(type: KeyType): Promise<KeyPair> {
    // If your wallet supports key generation
    try {
      // Example:
      // const keyPair = await yourWalletSDK.generateKey(type);
      // return {
      //   publicKey: keyPair.publicKey,
      //   privateKey: keyPair.privateKey,
      //   keyType: type
      // };

      throw new Error('Key generation not supported');
    } catch (error) {
      console.error('Error generating key:', error);
      throw error;
    }
  }

  async sign(data: Uint8Array, keyId: string): Promise<SignatureResult> {
    if (!this.connected) {
      throw new Error('Not connected to wallet');
    }

    try {
      // Example:
      // const signature = await yourWalletSDK.sign(data, keyId);
      // return {
      //   signature: signature.hex,
      //   keyId: keyId,
      //   algorithm: 'ed25519'
      // };

      return {
        signature: 'simulated_signature',
        keyId: keyId,
        algorithm: 'ed25519',
      };
    } catch (error) {
      console.error('Error signing data:', error);
      throw error;
    }
  }

  async verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: KeyType
  ): Promise<boolean> {
    try {
      // Example:
      // return await yourWalletSDK.verify(data, signature, publicKey, keyType);

      throw new Error('Signature verification not supported');
    } catch (error) {
      console.error('Error verifying signature:', error);
      throw error;
    }
  }

  async exportKey(keyId: string, format: KeyFormat): Promise<string> {
    try {
      // Example:
      // return await yourWalletSDK.exportKey(keyId, format);

      throw new Error('Key export not supported');
    } catch (error) {
      console.error('Error exporting key:', error);
      throw error;
    }
  }

  async importKey(
    key: string,
    type: KeyType,
    format: KeyFormat
  ): Promise<string> {
    try {
      // Example:
      // return await yourWalletSDK.importKey(key, type, format);

      throw new Error('Key import not supported');
    } catch (error) {
      console.error('Error importing key:', error);
      throw error;
    }
  }

  async listKeys(): Promise<string[]> {
    try {
      // Example:
      // return await yourWalletSDK.listKeys();

      throw new Error('Listing keys not supported');
    } catch (error) {
      console.error('Error listing keys:', error);
      throw error;
    }
  }

  async deleteKey(keyId: string): Promise<boolean> {
    try {
      // Example:
      // return await yourWalletSDK.deleteKey(keyId);

      throw new Error('Key deletion not supported');
    } catch (error) {
      console.error('Error deleting key:', error);
      throw error;
    }
  }
}
```

### Step 2: Write tests for your adapter

Create a `__tests__` directory in your adapter's directory and write tests:

```typescript
import { YourAdapter } from '../index';

// Mock any dependencies
jest.mock('your-dependency', () => {
  return {
    connect: jest.fn().mockResolvedValue({ address: 'rTestAddress' }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    signTransaction: jest.fn().mockResolvedValue('signed_tx_blob'),
    submitTransaction: jest.fn().mockResolvedValue({
      hash: 'test_hash',
      ledger_index: 12345,
      meta: {},
      validated: true,
    }),
  };
});

describe('YourAdapter', () => {
  let adapter: YourAdapter;

  beforeEach(() => {
    // Initialize your adapter for testing
    adapter = new YourAdapter({
      apiKey: 'test_api_key',
      network: 'testnet',
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const result = await adapter.connect();

      expect(result).toBe(true);
      expect(await adapter.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Mock a connection failure
      const mockDependency = require('your-dependency');
      mockDependency.connect.mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const result = await adapter.connect();

      expect(result).toBe(false);
      expect(await adapter.isConnected()).toBe(false);
    });
  });

  describe('signTransaction', () => {
    it('should sign a transaction when connected', async () => {
      // First connect
      await adapter.connect();

      const transaction = {
        TransactionType: 'Payment',
        Account: 'rSomeAddress',
        Destination: 'rAnotherAddress',
        Amount: '1000000',
      };

      const result = await adapter.signTransaction(transaction);

      expect(result).toBe('signed_tx_blob');
    });

    it('should throw an error when not connected', async () => {
      const transaction = {
        TransactionType: 'Payment',
        Account: 'rSomeAddress',
        Destination: 'rAnotherAddress',
        Amount: '1000000',
      };

      await expect(adapter.signTransaction(transaction)).rejects.toThrow(
        'Not connected to wallet'
      );
    });
  });

  // Add more tests for other methods
});
```

### Step 3: Use your adapter with the XRPL DID driver

```typescript
import { XrplDriver } from '@cs-sif/did-gateway';
import { YourAdapter } from '@cs-sif/wallet-kit/adapters/your-adapter';

async function createDidWithYourWallet() {
  try {
    // Create your adapter
    const adapter = new YourAdapter({
      apiKey: 'your_api_key',
      network: 'mainnet',
    });

    // Connect to the wallet
    console.log('Connecting to wallet...');
    const connected = await adapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to wallet');
    }

    // Get the wallet address
    const address = await adapter.getAddress();
    console.log(`Connected to wallet with address: ${address}`);

    // Create XRPL driver with your adapter
    const driver = new XrplDriver('wss://xrplcluster.com', adapter);

    // Create a DID document
    const document = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${address}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      service: [
        {
          id: '#service-1',
          type: 'LinkedDomains',
          serviceEndpoint: 'https://example.com',
        },
      ],
    };

    // Create the DID
    console.log('Creating DID...');
    const result = await driver.create(document);
    console.log(`DID created: ${result.didDocument?.id}`);

    // Disconnect when done
    await adapter.disconnect();
    console.log('Disconnected from wallet');

    return result;
  } catch (error) {
    console.error('Error creating DID:', error);
    throw error;
  }
}

// Call the function
createDidWithYourWallet()
  .then((result) => console.log('Operation completed successfully'))
  .catch((error) => console.error('Operation failed:', error));
```

## Implementing Required Methods

If your wallet doesn't support some of the required methods (like key management), you can throw a "Not supported" error:

```typescript
async generateKey(_type: KeyType): Promise<KeyPair> {
  throw new Error('Key generation not supported in this wallet adapter');
}
```

## Adding a New Adapter to the Project

1. Create your adapter in a new directory under `packages/wallet-kit/adapters/`
2. Implement the `WalletAdapter` interface
3. Write tests with at least 90% coverage
4. Add your adapter to the README.md file
5. Submit a pull request
