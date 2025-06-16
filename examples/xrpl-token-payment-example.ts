/**
 * Example demonstrating XRPL token payments for DID operations
 *
 * This example shows how to:
 * 1. Set up a wallet adapter with Xumm
 * 2. Configure the token for fee payments
 * 3. Initialize the XRPL driver with fee payment support
 * 4. Perform DID operations with token fee payments
 */

import { XrplDriver } from '../packages/did-gateway/src/methods/xrpl';
import { XummAdapter } from '../packages/wallet-kit/adapters/xumm';
import { TokenConfig } from '../packages/wallet-kit/src/lib/payment-service';

// Run the example
async function runExample(): Promise<void> {
  try {
    console.log('=== XRPL Token Payment Example ===');

    // 1. Set up Xumm wallet adapter
    console.log('Setting up Xumm wallet adapter...');
    const xummAdapter = new XummAdapter({
      apiKey: 'YOUR_XUMM_API_KEY',
      apiSecret: 'YOUR_XUMM_API_SECRET',
    });

    // 2. Connect to wallet
    console.log('Connecting to wallet...');
    const connected = await xummAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to wallet');
    }

    const walletAddress = await xummAdapter.getAddress();
    console.log(`Connected to wallet with address: ${walletAddress}`);

    // 3. Configure token for fee payments
    const tokenConfig: TokenConfig = {
      currency: 'VGB', // VGB token currency code
      issuer: 'rhcyBrowwApgNonehKBj8Po5z4gTyRknaU', // VGB token issuer address
      minFeeAmount: '1', // Minimum fee amount
    };

    // 4. Initialize XRPL driver with fee configuration
    console.log('Initializing XRPL driver with fee configuration...');
    const xrplDriver = new XrplDriver(
      'wss://s.altnet.rippletest.net:51233', // Use testnet for example
      xummAdapter,
      {
        tokenConfig,
        feeRecipient: walletAddress, // Use the connected wallet as fee recipient for this example
      }
    );

    // 5. Create a trustline for the token if needed
    console.log('Setting up trustline for token...');
    const feeService = xrplDriver.getFeeService();
    if (!feeService) {
      throw new Error('Fee service not initialized');
    }

    const trustlineSetup = await feeService.setupTrustline();
    if (!trustlineSetup) {
      throw new Error('Failed to set up trustline');
    }
    console.log('Trustline setup successful');

    // 6. Check token balance
    const tokenBalance = await feeService.getPaymentService().getTokenBalance();
    console.log(`Current token balance: ${tokenBalance || '0'}`);

    // 7. Check if balance is sufficient for create operation
    const hasSufficientBalance = await feeService.hasSufficientBalance(
      'create'
    );
    if (!hasSufficientBalance) {
      console.log('Insufficient token balance for create operation');
      console.log('Please add tokens to your account and try again');
      return;
    }
    console.log('Balance is sufficient for create operation');

    // 8. Create a DID with token fee payment
    console.log('Creating DID with token fee payment...');
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      service: [
        {
          id: '#service-1',
          type: 'LinkedDomains',
          serviceEndpoint: 'https://example.com',
        },
      ],
    };

    const createResult = await xrplDriver.create(didDocument);
    if (createResult.didResolutionMetadata.error) {
      console.error(
        'Error creating DID:',
        createResult.didResolutionMetadata.message
      );
      return;
    }

    const did = createResult.didDocument?.id;
    console.log(`DID created successfully: ${did}`);
    console.log(
      'DID Document:',
      JSON.stringify(createResult.didDocument, null, 2)
    );

    // 9. Check token balance after creation
    const newTokenBalance = await feeService
      .getPaymentService()
      .getTokenBalance();
    console.log(
      `Updated token balance after creation: ${newTokenBalance || '0'}`
    );

    // 10. Resolve the DID (may be free depending on configuration)
    console.log('Resolving DID...');
    const resolveResult = await xrplDriver.resolve(did!);
    if (resolveResult.didResolutionMetadata.error) {
      console.error(
        'Error resolving DID:',
        resolveResult.didResolutionMetadata.message
      );
      return;
    }
    console.log('DID resolved successfully');

    // 11. Update the DID with token fee payment
    console.log('Updating DID with token fee payment...');

    // Check if balance is sufficient for update operation
    const hasUpdateBalance = await feeService.hasSufficientBalance('update');
    if (!hasUpdateBalance) {
      console.log('Insufficient token balance for update operation');
      return;
    }

    const updatedDocument = {
      ...didDocument,
      service: [
        {
          id: '#service-1',
          type: 'LinkedDomains',
          serviceEndpoint: 'https://updated-example.com',
        },
        {
          id: '#service-2',
          type: 'MessagingService',
          serviceEndpoint: 'https://messaging.example.com',
        },
      ],
    };

    const updateResult = await xrplDriver.update(did!, updatedDocument);
    if (updateResult.didResolutionMetadata.error) {
      console.error(
        'Error updating DID:',
        updateResult.didResolutionMetadata.message
      );
      return;
    }
    console.log('DID updated successfully');
    console.log(
      'Updated DID Document:',
      JSON.stringify(updateResult.didDocument, null, 2)
    );

    // 12. Check token balance after update
    const finalTokenBalance = await feeService
      .getPaymentService()
      .getTokenBalance();
    console.log(
      `Final token balance after update: ${finalTokenBalance || '0'}`
    );

    // 13. Disconnect from wallet
    await xummAdapter.disconnect();
    console.log('Disconnected from wallet');
  } catch (error: any) {
    console.error('Error in example:', error.message || error);
  }
}

// Only run if executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample };
