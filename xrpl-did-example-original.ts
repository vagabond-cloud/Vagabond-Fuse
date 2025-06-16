/**
 * Example demonstrating how to use different wallet adapters with the XRPL DID driver
 */
const { XrplDriver } = require('../packages/did-gateway/src/methods/xrpl');
const { XummAdapter } = require('../packages/wallet-kit/adapters/xumm');
const { LedgerAdapter } = require('../packages/wallet-kit/adapters/ledger');
const {
  DIDResolutionResult,
} = require('../packages/did-gateway/src/lib/types');
const {
  WalletAdapter,
} = require('../packages/wallet-kit/src/lib/wallet-adapter');

/**
 * Example using Xumm wallet adapter
 */
async function xummWalletExample() {
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
  } catch (error) {
    console.error('Error in Xumm wallet example:', error.message || error);
  }
}

/**
 * Example of using a wallet adapter with fallback to private key
 */
async function walletWithFallbackExample() {
  console.log('=== Wallet with Fallback Example ===');

  // Create XRPL DID driver
  const driver = new XrplDriver('wss://s.altnet.rippletest.net:51233');

  try {
    // Try to use Ledger adapter first
    console.log('Attempting to use Ledger adapter...');
    const ledgerAdapter = new LedgerAdapter({
      accountIndex: 0,
    });

    let didResult;
    let didAddress;

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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        'Ledger connection failed, falling back to private key:',
        errorMessage
      );

      // Remove the wallet adapter
      driver.setWalletAdapter(undefined);

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
  } catch (error) {
    console.error(
      'Error in wallet with fallback example:',
      error.message || error
    );
  }
}

// Export the examples for use in other files
module.exports = {
  xummWalletExample,
  ledgerWalletExample,
  switchWalletAdaptersExample,
  walletWithFallbackExample,
};
