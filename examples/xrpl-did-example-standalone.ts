/**
 * Standalone example demonstrating how to use different wallet adapters with the XRPL DID driver
 *
 * This is a simplified version that doesn't rely on the actual implementation
 * but demonstrates the concepts and patterns.
 */

// Mock interfaces and types
interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyType: string;
}

interface SignatureResult {
  signature: string;
  keyId: string;
  algorithm: string;
}

interface XrplTransaction {
  TransactionType: string;
  [key: string]: any;
}

interface XrplTransactionResult {
  hash: string;
  ledger_index: number;
  meta: any;
  validated: boolean;
}

interface DIDDocument {
  id: string;
  verificationMethod?: any[];
  service?: any[];
  [key: string]: any;
}

interface DIDResolutionResult {
  didDocument: DIDDocument | null;
  didResolutionMetadata: {
    contentType?: string;
    error?: string;
    message?: string;
  };
  didDocumentMetadata: {
    created?: string;
    updated?: string;
    deactivated?: boolean;
    versionId?: string;
  };
}

// Mock WalletAdapter interface
interface WalletAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  getAddress(): Promise<string>;
  signTransaction(transaction: XrplTransaction): Promise<string>;
  submitTransaction(txBlob: string): Promise<XrplTransactionResult>;
  generateKey(type: string): Promise<KeyPair>;
  sign(data: Uint8Array, keyId: string): Promise<SignatureResult>;
  verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: string
  ): Promise<boolean>;
  exportKey(keyId: string, format: string): Promise<string>;
  importKey(key: string, type: string, format: string): Promise<string>;
  listKeys(): Promise<string[]>;
  deleteKey(keyId: string): Promise<boolean>;
}

// Mock XummAdapter implementation
class XummAdapter implements WalletAdapter {
  private connected = false;
  private address = 'rXummMockAddress';
  private config: any;

  constructor(config: any) {
    this.config = config;
    console.log('Xumm adapter initialized with config:', config);
  }

  async connect(): Promise<boolean> {
    console.log('Connecting to Xumm wallet...');
    // In a real implementation, this would connect to the Xumm SDK
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from Xumm wallet...');
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getAddress(): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Xumm wallet');
    }
    return this.address;
  }

  async signTransaction(transaction: XrplTransaction): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Xumm wallet');
    }
    console.log('Signing transaction with Xumm:', transaction);
    return 'mock_signed_transaction_blob';
  }

  async submitTransaction(txBlob: string): Promise<XrplTransactionResult> {
    console.log('Submitting transaction:', txBlob);
    return {
      hash: 'mock_transaction_hash',
      ledger_index: 1234,
      meta: {},
      validated: true,
    };
  }

  // Stub implementations for the remaining methods
  async generateKey(type: string): Promise<KeyPair> {
    throw new Error('Not implemented');
  }

  async sign(data: Uint8Array, keyId: string): Promise<SignatureResult> {
    throw new Error('Not implemented');
  }

  async verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: string
  ): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async exportKey(keyId: string, format: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async importKey(key: string, type: string, format: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async listKeys(): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async deleteKey(keyId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}

// Mock LedgerAdapter implementation
class LedgerAdapter implements WalletAdapter {
  private connected = false;
  private address = 'rLedgerMockAddress';
  private config: any;

  constructor(config: any) {
    this.config = config;
    console.log('Ledger adapter initialized with config:', config);
  }

  async connect(): Promise<boolean> {
    console.log('Connecting to Ledger device...');
    // In a real implementation, this would connect to the Ledger device
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from Ledger device...');
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  async getAddress(): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Ledger device');
    }
    return this.address;
  }

  async signTransaction(transaction: XrplTransaction): Promise<string> {
    if (!this.connected) {
      throw new Error('Not connected to Ledger device');
    }
    console.log('Signing transaction with Ledger:', transaction);
    return 'mock_signed_transaction_blob';
  }

  async submitTransaction(txBlob: string): Promise<XrplTransactionResult> {
    console.log('Submitting transaction:', txBlob);
    return {
      hash: 'mock_transaction_hash',
      ledger_index: 1234,
      meta: {},
      validated: true,
    };
  }

  // Stub implementations for the remaining methods
  async generateKey(type: string): Promise<KeyPair> {
    throw new Error('Not implemented');
  }

  async sign(data: Uint8Array, keyId: string): Promise<SignatureResult> {
    throw new Error('Not implemented');
  }

  async verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: string
  ): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async exportKey(keyId: string, format: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async importKey(key: string, type: string, format: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async listKeys(): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async deleteKey(keyId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}

// Mock XrplDriver implementation
class XrplDriver {
  private network: string;
  private walletAdapter: WalletAdapter | null = null;

  constructor(network: string, walletAdapter?: WalletAdapter) {
    this.network = network;
    this.walletAdapter = walletAdapter || null;
    console.log(`XrplDriver initialized with network: ${network}`);
  }

  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
    console.log('Wallet adapter set');
  }

  getWalletAdapter(): WalletAdapter | null {
    return this.walletAdapter;
  }

  async create(
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    console.log('Creating DID with document:', document);

    let address: string;

    if (this.walletAdapter) {
      console.log('Using wallet adapter for DID creation');
      address = await this.walletAdapter.getAddress();

      // Mock transaction
      const transaction = {
        TransactionType: 'AccountSet',
        Account: address,
        Domain: 'mock_domain_hex',
        SetFlag: 5,
      };

      // Sign and submit transaction
      const signedTxBlob = await this.walletAdapter.signTransaction(
        transaction
      );
      const result = await this.walletAdapter.submitTransaction(signedTxBlob);

      console.log('Transaction submitted:', result);
    } else {
      console.log('Using private key for DID creation');
      address = 'rPrivateKeyMockAddress';
    }

    const did = `did:xrpl:${address}`;

    return {
      didDocument: {
        id: did,
        ...(document as any),
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {
        created: new Date().toISOString(),
        versionId: 'mock_transaction_hash',
      },
    };
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    console.log('Resolving DID:', did);

    // Extract address from DID
    const parts = did.split(':');
    if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'xrpl') {
      throw new Error('Invalid XRPL DID format');
    }

    const address = parts[2];

    return {
      didDocument: {
        id: did,
        verificationMethod: [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2020',
            controller: did,
            publicKeyMultibase: 'zMockPublicKeyMultibase',
          },
        ],
        service: [
          {
            id: `${did}#service-1`,
            type: 'LinkedDomains',
            serviceEndpoint: 'https://example.com',
          },
        ],
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {},
    };
  }

  async update(
    did: string,
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    console.log('Updating DID:', did);
    console.log('Update document:', document);

    // Extract address from DID
    const parts = did.split(':');
    if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'xrpl') {
      throw new Error('Invalid XRPL DID format');
    }

    const address = parts[2];

    if (this.walletAdapter) {
      console.log('Using wallet adapter for DID update');
      const walletAddress = await this.walletAdapter.getAddress();

      if (walletAddress !== address) {
        throw new Error('Wallet address does not match DID address');
      }

      // Mock transaction
      const transaction = {
        TransactionType: 'AccountSet',
        Account: address,
        Domain: 'mock_domain_hex',
      };

      // Sign and submit transaction
      const signedTxBlob = await this.walletAdapter.signTransaction(
        transaction
      );
      const result = await this.walletAdapter.submitTransaction(signedTxBlob);

      console.log('Transaction submitted:', result);
    } else {
      console.log('Using private key for DID update');
      if (!privateKey) {
        throw new Error(
          'Private key is required when wallet adapter is not provided'
        );
      }
    }

    return {
      didDocument: {
        id: did,
        ...(document as any),
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {
        updated: new Date().toISOString(),
        versionId: 'mock_transaction_hash',
      },
    };
  }

  async deactivate(
    did: string,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    console.log('Deactivating DID:', did);

    // Extract address from DID
    const parts = did.split(':');
    if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'xrpl') {
      throw new Error('Invalid XRPL DID format');
    }

    const address = parts[2];

    if (this.walletAdapter) {
      console.log('Using wallet adapter for DID deactivation');
      const walletAddress = await this.walletAdapter.getAddress();

      if (walletAddress !== address) {
        throw new Error('Wallet address does not match DID address');
      }

      // Mock transaction
      const transaction = {
        TransactionType: 'AccountSet',
        Account: address,
        Domain: 'mock_deactivated_domain_hex',
      };

      // Sign and submit transaction
      const signedTxBlob = await this.walletAdapter.signTransaction(
        transaction
      );
      const result = await this.walletAdapter.submitTransaction(signedTxBlob);

      console.log('Transaction submitted:', result);
    } else {
      console.log('Using private key for DID deactivation');
      if (!privateKey) {
        throw new Error(
          'Private key is required when wallet adapter is not provided'
        );
      }
    }

    return {
      didDocument: { id: did },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {
        deactivated: true,
        updated: new Date().toISOString(),
        versionId: 'mock_transaction_hash',
      },
    };
  }
}

/**
 * Example using Xumm wallet adapter
 */
async function xummWalletExample(): Promise<void> {
  console.log('=== Xumm Wallet Example ===');

  // Create Xumm adapter with your API credentials
  const xummAdapter = new XummAdapter({
    apiKey: 'YOUR_XUMM_API_KEY',
    apiSecret: 'YOUR_XUMM_API_SECRET',
  });

  try {
    // Connect to Xumm wallet
    console.log('Connecting to Xumm wallet...');
    const connected = await xummAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Xumm wallet');
    }
    console.log('Connected to Xumm wallet');

    // Get the wallet address
    const address = await xummAdapter.getAddress();
    console.log(`Wallet address: ${address}`);

    // Create XRPL DID driver with Xumm adapter
    const driver = new XrplDriver(
      'wss://s.altnet.rippletest.net:51233',
      xummAdapter
    );

    // Create a DID document
    const didDocument = {
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

    // Create a DID
    console.log('Creating DID... (check your Xumm app for approval)');
    const createResult = await driver.create(didDocument);
    console.log(`DID created: ${createResult.didDocument?.id}`);

    // Resolve the DID
    console.log('Resolving DID...');
    const resolveResult = await driver.resolve(`did:xrpl:${address}`);
    console.log(
      'DID resolved:',
      JSON.stringify(resolveResult.didDocument, null, 2)
    );

    // Update the DID
    console.log('Updating DID... (check your Xumm app for approval)');
    const updateDocument = {
      service: [
        {
          id: '#service-2',
          type: 'MessagingService',
          serviceEndpoint: 'https://messaging.example.com',
        },
      ],
    };

    const updateResult = await driver.update(
      `did:xrpl:${address}`,
      updateDocument
    );
    console.log(
      'DID updated:',
      JSON.stringify(updateResult.didDocument, null, 2)
    );

    // Disconnect from Xumm wallet
    await xummAdapter.disconnect();
    console.log('Disconnected from Xumm wallet');
  } catch (error: any) {
    console.error('Error in Xumm wallet example:', error.message || error);
  }
}

/**
 * Example using Ledger hardware wallet adapter
 */
async function ledgerWalletExample(): Promise<void> {
  console.log('=== Ledger Wallet Example ===');

  // Create Ledger adapter
  const ledgerAdapter = new LedgerAdapter({
    accountIndex: 0,
  });

  try {
    // Connect to Ledger device
    console.log(
      'Please connect your Ledger device and open the XRP Ledger app...'
    );
    const connected = await ledgerAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Ledger device');
    }
    console.log('Connected to Ledger device');

    // Get the wallet address
    const address = await ledgerAdapter.getAddress();
    console.log(`Wallet address: ${address}`);

    // Create XRPL DID driver with Ledger adapter
    const driver = new XrplDriver(
      'wss://s.altnet.rippletest.net:51233',
      ledgerAdapter
    );

    // Create a DID document
    const didDocument = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${address}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    };

    // Create a DID
    console.log('Creating DID... (confirm on your Ledger device)');
    const createResult = await driver.create(didDocument);
    console.log(`DID created: ${createResult.didDocument?.id}`);

    // Resolve the DID
    console.log('Resolving DID...');
    const resolveResult = await driver.resolve(`did:xrpl:${address}`);
    console.log(
      'DID resolved:',
      JSON.stringify(resolveResult.didDocument, null, 2)
    );

    // Disconnect from Ledger device
    await ledgerAdapter.disconnect();
    console.log('Disconnected from Ledger device');
  } catch (error: any) {
    console.error('Error in Ledger wallet example:', error.message || error);
    // Make sure to disconnect even if there's an error
    try {
      await ledgerAdapter.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from Ledger:', disconnectError);
    }
  }
}

/**
 * Example of switching between different wallet adapters
 */
async function switchWalletAdaptersExample(): Promise<void> {
  console.log('=== Switching Wallet Adapters Example ===');

  // Create XRPL DID driver with no initial adapter
  const driver = new XrplDriver('wss://s.altnet.rippletest.net:51233');

  try {
    // First use Xumm adapter
    console.log('Using Xumm adapter...');
    const xummAdapter = new XummAdapter({
      apiKey: 'YOUR_XUMM_API_KEY',
      apiSecret: 'YOUR_XUMM_API_SECRET',
    });

    // Set the adapter
    driver.setWalletAdapter(xummAdapter);

    // Connect to Xumm wallet
    console.log('Connecting to Xumm wallet...');
    await xummAdapter.connect();

    // Get the wallet address
    const xummAddress = await xummAdapter.getAddress();
    console.log(`Xumm wallet address: ${xummAddress}`);

    // Resolve a DID using Xumm adapter
    const xummDid = `did:xrpl:${xummAddress}`;
    const xummResolveResult = await driver.resolve(xummDid);
    console.log(`Resolved DID with Xumm adapter: ${xummDid}`);

    // Disconnect from Xumm wallet
    await xummAdapter.disconnect();
    console.log('Disconnected from Xumm wallet');

    // Now switch to Ledger adapter
    console.log('Switching to Ledger adapter...');
    const ledgerAdapter = new LedgerAdapter({
      accountIndex: 0,
    });

    // Set the adapter
    driver.setWalletAdapter(ledgerAdapter);

    // Connect to Ledger device
    console.log(
      'Please connect your Ledger device and open the XRP Ledger app...'
    );
    await ledgerAdapter.connect();

    // Get the wallet address
    const ledgerAddress = await ledgerAdapter.getAddress();
    console.log(`Ledger wallet address: ${ledgerAddress}`);

    // Resolve a DID using Ledger adapter
    const ledgerDid = `did:xrpl:${ledgerAddress}`;
    const ledgerResolveResult = await driver.resolve(ledgerDid);
    console.log(`Resolved DID with Ledger adapter: ${ledgerDid}`);

    // Disconnect from Ledger device
    await ledgerAdapter.disconnect();
    console.log('Disconnected from Ledger device');
  } catch (error: any) {
    console.error(
      'Error in switching wallet adapters example:',
      error.message || error
    );
  }
}

/**
 * Example of using a wallet adapter with fallback to private key
 */
async function walletWithFallbackExample(): Promise<void> {
  console.log('=== Wallet with Fallback Example ===');

  // Create XRPL DID driver
  const driver = new XrplDriver('wss://s.altnet.rippletest.net:51233');

  try {
    // Try to use Ledger adapter first
    console.log('Attempting to use Ledger adapter...');
    const ledgerAdapter = new LedgerAdapter({
      accountIndex: 0,
    });

    let didResult: DIDResolutionResult;
    let didAddress: string;

    try {
      // Try to connect to Ledger
      console.log('Connecting to Ledger device...');
      const connected = await ledgerAdapter.connect();

      if (connected) {
        // Successfully connected to Ledger
        console.log('Connected to Ledger device');

        // Set the adapter
        driver.setWalletAdapter(ledgerAdapter);

        // Get the wallet address
        didAddress = await ledgerAdapter.getAddress();
        console.log(`Ledger wallet address: ${didAddress}`);

        // Create a DID document
        const didDocument = {
          verificationMethod: [
            {
              id: '#key-1',
              type: 'Ed25519VerificationKey2020',
              controller: `did:xrpl:${didAddress}`,
              publicKeyMultibase:
                'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
            },
          ],
        };

        // Create a DID using Ledger
        console.log('Creating DID with Ledger... (confirm on your device)');
        didResult = await driver.create(didDocument);

        // Disconnect from Ledger
        await ledgerAdapter.disconnect();
        console.log('Disconnected from Ledger device');
      } else {
        throw new Error('Failed to connect to Ledger');
      }
    } catch (error: any) {
      console.warn(
        'Ledger connection failed, falling back to private key:',
        error.message || 'Unknown error'
      );

      // Remove the wallet adapter
      driver.setWalletAdapter(null as any);

      // Use private key instead
      const privateKey = 'sEdVLfuWRu1PevYJv9qnKsXdZQJXVJm'; // Example seed

      // Create a DID document
      const didDocument = {
        verificationMethod: [
          {
            id: '#key-1',
            type: 'Ed25519VerificationKey2020',
            controller: 'did:xrpl:rExampleAddress',
            publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
          },
        ],
      };

      // Create a DID using private key
      console.log('Creating DID with private key...');
      didResult = await driver.create(didDocument, privateKey);
      didAddress = didResult.didDocument?.id?.split(':')[2] || '';
    }

    console.log(`DID created: ${didResult.didDocument?.id}`);

    // Resolve the DID
    console.log('Resolving DID...');
    const resolveResult = await driver.resolve(`did:xrpl:${didAddress}`);
    console.log(
      'DID resolved:',
      JSON.stringify(resolveResult.didDocument, null, 2)
    );
  } catch (error: any) {
    console.error(
      'Error in wallet with fallback example:',
      error.message || error
    );
  }
}

// Run the examples
async function runExamples(): Promise<void> {
  console.log(
    'This is a standalone example that demonstrates the concepts of using wallet adapters with XRPL DIDs.'
  );
  console.log(
    'The implementation is simplified and mocked for demonstration purposes.'
  );
  console.log('\nAvailable examples:');
  console.log('- xummWalletExample()');
  console.log('- ledgerWalletExample()');
  console.log('- switchWalletAdaptersExample()');
  console.log('- walletWithFallbackExample()');

  console.log('\nRunning examples:');

  // Run the examples
  await xummWalletExample();
  console.log('\n');

  await ledgerWalletExample();
  console.log('\n');

  await switchWalletAdaptersExample();
  console.log('\n');

  await walletWithFallbackExample();

  console.log('\nExamples completed');
}

// Run the examples when the script is executed directly
if (require.main === module) {
  runExamples().catch((error) => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
}

// Export the examples for use in other files
export {
  xummWalletExample,
  ledgerWalletExample,
  switchWalletAdaptersExample,
  walletWithFallbackExample,
};
