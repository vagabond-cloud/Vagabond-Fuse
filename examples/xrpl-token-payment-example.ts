/**
 * XRPL Token Payment Example
 *
 * This example demonstrates how to:
 * 1. Connect to the XRPL network
 * 2. Create and fund a test wallet
 * 3. Send an XRP payment
 * 4. Check balance after transaction
 */

import { Client, Wallet, Payment } from 'xrpl';

async function runExample(): Promise<void> {
  console.log('=== XRPL Token Payment Example ===');

  // Connect to XRPL Testnet
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();
  console.log('Connected to XRPL Testnet');

  try {
    // For demo purposes, we'll generate a test wallet
    // In production, you would use your own wallet with proper key management
    const testWallet = Wallet.generate();
    console.log(`Generated test wallet with address: ${testWallet.address}`);

    // Fund the test wallet using testnet faucet
    console.log('Requesting funds from testnet faucet...');
    const fundResult = await client.fundWallet();
    const fundedWallet = fundResult.wallet;
    console.log(`Funded wallet address: ${fundedWallet.address}`);
    console.log(`Wallet balance: ${fundResult.balance} XRP`);

    // Create a simple XRP payment transaction
    const payment: Payment = {
      TransactionType: 'Payment',
      Account: fundedWallet.address,
      Amount: '1000000', // 1 XRP in drops (1 XRP = 1,000,000 drops)
      Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe', // Example destination address
    };

    // Sign and submit the payment transaction
    console.log('Signing and submitting payment transaction...');
    const paymentResult = await client.submitAndWait(payment, {
      wallet: fundedWallet,
    });

    // Safely access the transaction result
    const txResult =
      typeof paymentResult.result.meta === 'object' &&
      paymentResult.result.meta &&
      'TransactionResult' in paymentResult.result.meta
        ? paymentResult.result.meta.TransactionResult
        : 'Unknown';

    console.log('Transaction result:', txResult);
    console.log('Transaction hash:', paymentResult.result.hash);
    console.log(
      'Explorer link:',
      `https://testnet.xrpl.org/transactions/${paymentResult.result.hash}`
    );

    // Check the balance after the transaction
    const accountInfo = await client.request({
      command: 'account_info',
      account: fundedWallet.address,
      ledger_index: 'validated',
    });
    console.log(
      `Updated wallet balance: ${accountInfo.result.account_data.Balance} drops`
    );
  } catch (error) {
    console.error('Error during XRPL payment example:', error);
  } finally {
    // Disconnect from the XRPL network
    await client.disconnect();
    console.log('Disconnected from XRPL Testnet');
  }
}

// Run the example directly when this file is executed
runExample().catch(console.error);

export { runExample };
