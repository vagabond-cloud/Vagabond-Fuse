/**
 * Simple example demonstrating wallet adapter functionality for XRPL
 *
 * This example shows how to:
 * 1. Create and use different wallet adapters (Xumm and Ledger)
 * 2. Connect to wallets
 * 3. Get addresses
 * 4. Sign and submit transactions
 * 5. Switch between adapters
 */

// Mock interfaces and types for demonstration
interface XrplTransaction {
  TransactionType: string;
  Account: string;
  [key: string]: any;
}

interface XrplTransactionResult {
  hash: string;
  ledger_index: number;
  meta: any;
  validated: boolean;
}

// WalletAdapter interface
interface WalletAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  getAddress(): Promise<string>;
  signTransaction(transaction: XrplTransaction): Promise<string>;
  submitTransaction(txBlob: string): Promise<XrplTransactionResult>;
}

// Mock Xumm adapter implementation
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
}

// Mock Ledger adapter implementation
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
}

/**
 * Example 1: Using Xumm wallet adapter
 */
async function xummWalletExample(): Promise<void> {
  console.log('=== Xumm Wallet Example ===');

  // Create Xumm adapter with API credentials
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
    console.log('Wallet address:', address);

    // Create a transaction
    const transaction: XrplTransaction = {
      TransactionType: 'Payment',
      Account: address,
      Destination: 'rDestinationAddress',
      Amount: '1000000', // 1 XRP in drops
      Fee: '12',
    };

    // Sign the transaction
    console.log('Signing transaction...');
    const signedTxBlob = await xummAdapter.signTransaction(transaction);
    console.log('Transaction signed:', signedTxBlob);

    // Submit the transaction
    console.log('Submitting transaction...');
    const result = await xummAdapter.submitTransaction(signedTxBlob);
    console.log('Transaction submitted:', result);

    // Disconnect from Xumm wallet
    await xummAdapter.disconnect();
    console.log('Disconnected from Xumm wallet');
  } catch (error: any) {
    console.error('Error in Xumm wallet example:', error.message || error);
  }
}

/**
 * Example 2: Using Ledger hardware wallet adapter
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
    console.log('Wallet address:', address);

    // Create a transaction
    const transaction: XrplTransaction = {
      TransactionType: 'Payment',
      Account: address,
      Destination: 'rDestinationAddress',
      Amount: '1000000', // 1 XRP in drops
      Fee: '12',
    };

    // Sign the transaction
    console.log('Signing transaction (confirm on your Ledger device)...');
    const signedTxBlob = await ledgerAdapter.signTransaction(transaction);
    console.log('Transaction signed:', signedTxBlob);

    // Submit the transaction
    console.log('Submitting transaction...');
    const result = await ledgerAdapter.submitTransaction(signedTxBlob);
    console.log('Transaction submitted:', result);

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
 * Example 3: Switching between wallet adapters
 */
async function switchWalletAdaptersExample(): Promise<void> {
  console.log('=== Switching Wallet Adapters Example ===');

  // Create and store multiple wallet adapters
  const adapters: Record<string, WalletAdapter> = {
    xumm: new XummAdapter({
      apiKey: 'YOUR_XUMM_API_KEY',
      apiSecret: 'YOUR_XUMM_API_SECRET',
    }),
    ledger: new LedgerAdapter({
      accountIndex: 0,
    }),
  };

  let currentAdapter: WalletAdapter | null = null;

  try {
    // First use Xumm adapter
    console.log('Using Xumm adapter...');
    currentAdapter = adapters.xumm;

    // Connect to Xumm wallet
    await currentAdapter.connect();

    // Get the wallet address
    const xummAddress = await currentAdapter.getAddress();
    console.log('Xumm wallet address:', xummAddress);

    // Create a transaction
    let transaction: XrplTransaction = {
      TransactionType: 'Payment',
      Account: xummAddress,
      Destination: 'rDestinationAddress',
      Amount: '1000000',
      Fee: '12',
    };

    // Sign and submit with Xumm
    const xummSignedTx = await currentAdapter.signTransaction(transaction);
    const xummResult = await currentAdapter.submitTransaction(xummSignedTx);
    console.log('Transaction submitted with Xumm:', xummResult.hash);

    // Disconnect from Xumm wallet
    await currentAdapter.disconnect();
    console.log('Disconnected from Xumm wallet');

    // Now switch to Ledger adapter
    console.log('Switching to Ledger adapter...');
    currentAdapter = adapters.ledger;

    // Connect to Ledger device
    await currentAdapter.connect();

    // Get the wallet address
    const ledgerAddress = await currentAdapter.getAddress();
    console.log('Ledger wallet address:', ledgerAddress);

    // Create a new transaction with the Ledger address
    transaction = {
      TransactionType: 'Payment',
      Account: ledgerAddress,
      Destination: 'rDestinationAddress',
      Amount: '2000000', // 2 XRP
      Fee: '12',
    };

    // Sign and submit with Ledger
    const ledgerSignedTx = await currentAdapter.signTransaction(transaction);
    const ledgerResult = await currentAdapter.submitTransaction(ledgerSignedTx);
    console.log('Transaction submitted with Ledger:', ledgerResult.hash);

    // Disconnect from Ledger device
    await currentAdapter.disconnect();
    console.log('Disconnected from Ledger device');
  } catch (error: any) {
    console.error(
      'Error in switching wallet adapters example:',
      error.message || error
    );

    // Make sure to disconnect if there's an error
    if (currentAdapter) {
      try {
        await currentAdapter.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting from wallet:', disconnectError);
      }
    }
  }
}

/**
 * Example 4: Wallet adapter with fallback mechanism
 */
async function walletWithFallbackExample(): Promise<void> {
  console.log('=== Wallet with Fallback Example ===');

  // Create a list of adapters to try in order
  const adapters: WalletAdapter[] = [
    new LedgerAdapter({ accountIndex: 0 }),
    new XummAdapter({
      apiKey: 'YOUR_XUMM_API_KEY',
      apiSecret: 'YOUR_XUMM_API_SECRET',
    }),
  ];

  let connectedAdapter: WalletAdapter | null = null;
  let address: string = '';

  try {
    // Try each adapter in sequence until one connects
    for (let i = 0; i < adapters.length; i++) {
      const adapter = adapters[i];
      const adapterName = adapter instanceof LedgerAdapter ? 'Ledger' : 'Xumm';

      try {
        console.log('Attempting to connect to ' + adapterName + '...');
        const connected = await adapter.connect();

        if (connected) {
          console.log('Connected to ' + adapterName);
          connectedAdapter = adapter;
          address = await adapter.getAddress();
          console.log(adapterName + ' wallet address:', address);
          break;
        }
      } catch (error) {
        console.warn(
          'Failed to connect to ' + adapterName + ', trying next adapter...'
        );
      }
    }

    if (!connectedAdapter) {
      throw new Error('Failed to connect to any wallet');
    }

    // Create a transaction
    const transaction: XrplTransaction = {
      TransactionType: 'Payment',
      Account: address,
      Destination: 'rDestinationAddress',
      Amount: '1000000',
      Fee: '12',
    };

    // Sign and submit the transaction
    console.log('Signing and submitting transaction...');
    const signedTxBlob = await connectedAdapter.signTransaction(transaction);
    const result = await connectedAdapter.submitTransaction(signedTxBlob);
    console.log('Transaction submitted:', result);

    // Disconnect from wallet
    await connectedAdapter.disconnect();
    console.log('Disconnected from wallet');
  } catch (error: any) {
    console.error(
      'Error in wallet with fallback example:',
      error.message || error
    );

    // Make sure to disconnect if there's an error
    if (connectedAdapter) {
      try {
        await connectedAdapter.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting from wallet:', disconnectError);
      }
    }
  }
}

// Run the examples
async function runExamples(): Promise<void> {
  console.log('====================================');
  console.log('WALLET ADAPTER EXAMPLES STARTING NOW');
  console.log('====================================');
  console.log(
    'This is a standalone example that demonstrates wallet adapter functionality.'
  );
  console.log(
    'The implementation is simplified and mocked for demonstration purposes.'
  );
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
  console.log('====================================');
}

// Export the examples for use in other files
export {
  xummWalletExample,
  ledgerWalletExample,
  switchWalletAdaptersExample,
  walletWithFallbackExample,
};

// Run the examples when the script is executed directly
runExamples().catch((error) => {
  console.error('Error running examples:', error);
});
