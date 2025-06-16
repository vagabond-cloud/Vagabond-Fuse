/**
 * Example demonstrating how to use different wallet adapters with the XRPL DID driver
 */
import { XrplDriver } from '../../did-gateway/src/methods/xrpl';
import { XummAdapter } from '../adapters/xumm';
import { LedgerAdapter } from '../adapters/ledger';
import { DIDResolutionResult } from '../../did-gateway/src/lib/types';
import { WalletAdapter } from '../src/lib/wallet-adapter';

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
  } catch (error) {
    console.error('Error in Xumm wallet example:', error);
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
  } catch (error) {
    console.error('Error in Ledger wallet example:', error);
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
  } catch (error) {
    console.error('Error in switching wallet adapters example:', error);
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
    } catch (ledgerError) {
      console.warn(
        'Ledger connection failed, falling back to private key:',
        ledgerError.message
      );

      // Remove the wallet adapter
      driver.setWalletAdapter(undefined as unknown as WalletAdapter);

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
    console.error('Error in wallet with fallback example:', error);
  }
}

// Run the examples
async function runExamples(): Promise<void> {
  // Uncomment the example you want to run
  // await xummWalletExample();
  // await ledgerWalletExample();
  // await switchWalletAdaptersExample();
  // await walletWithFallbackExample();

  console.log('Examples completed');
}

// Run the examples when the script is executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

// Export the examples for use in other files
export {
  xummWalletExample,
  ledgerWalletExample,
  switchWalletAdaptersExample,
  walletWithFallbackExample,
};
