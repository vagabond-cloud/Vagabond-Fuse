#!/usr/bin/env node

/**
 * Test script for the real XRPL adapter
 */

import { XRPLAdapter } from '../../examples/real-xrpl-adapter.mjs';

async function testRealAdapter() {
    console.log('Testing real XRPL adapter...');

    try {
        // Create adapter
        const adapter = new XRPLAdapter();
        console.log('XRPL adapter created');

        // Connect to testnet
        const connected = await adapter.connect();
        if (!connected) {
            console.error('Failed to connect to XRPL testnet');
            return;
        }

        // Create wallets
        console.log('Creating wallets...');
        const wallet1 = await adapter.createWallet('user1');
        console.log(`Wallet 1 created: ${wallet1.address}`);

        const wallet2 = await adapter.createWallet('user2');
        console.log(`Wallet 2 created: ${wallet2.address}`);

        // Get balances
        console.log('Getting balances...');
        const balance1 = await adapter.getBalance(wallet1.address);
        console.log(`Wallet 1 balance: ${balance1 / 1000000} XRP`);

        const balance2 = await adapter.getBalance(wallet2.address);
        console.log(`Wallet 2 balance: ${balance2 / 1000000} XRP`);

        // Send payment
        console.log('Sending payment...');
        const payment = await adapter.sendPayment('user1', wallet2.address, 1000000, 'Test payment');
        console.log(`Payment sent: ${payment.hash}`);

        // Get updated balances
        const updatedBalance1 = await adapter.getBalance(wallet1.address);
        console.log(`Wallet 1 updated balance: ${updatedBalance1 / 1000000} XRP`);

        const updatedBalance2 = await adapter.getBalance(wallet2.address);
        console.log(`Wallet 2 updated balance: ${updatedBalance2 / 1000000} XRP`);

        // Issue token
        console.log('Issuing token...');
        const token = await adapter.issueToken('user1', 'TEST', wallet2.address, 100, { purpose: 'testing' });
        console.log(`Token issued: ${token.hash}`);

        // Disconnect
        await adapter.disconnect();
        console.log('Test completed successfully!');
    } catch (error) {
        console.error(`Test failed: ${error.message}`);
    }
}

testRealAdapter(); 