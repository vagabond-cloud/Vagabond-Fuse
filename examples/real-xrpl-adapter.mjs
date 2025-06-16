/**
 * Real XRPL Adapter
 * 
 * This is a real implementation of the XRPL adapter for the EU Digital Identity Wallet simulation.
 * It provides actual connectivity to the XRP Ledger Testnet.
 */

import xrpl from 'xrpl';
import { v4 as uuidv4 } from 'uuid';

const { Client, Wallet, convertStringToHex } = xrpl;

export class XRPLAdapter {
  constructor() {
    this.client = null;
    this.wallets = new Map();
    this.isConnected = false;
    this.tokenIssuances = new Map();
    this.testnetUrl = 'wss://s.altnet.rippletest.net:51233';
  }

  async connect() {
    try {
      console.log('Connecting to XRPL Testnet...');
      this.client = new Client(this.testnetUrl);
      await this.client.connect();
      this.isConnected = true;
      console.log('Successfully connected to XRPL Testnet');
      return true;
    } catch (error) {
      console.error(`Failed to connect to XRPL Testnet: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        console.log('Disconnected from XRPL Testnet');
        return true;
      } catch (error) {
        console.error(`Error disconnecting from XRPL: ${error.message}`);
        return false;
      }
    }
    return true;
  }

  async createWallet(userId) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Check if we already have a wallet for this user
      if (this.wallets.has(userId)) {
        return this.wallets.get(userId);
      }

      // Create a new wallet
      const fundResult = await this.client.fundWallet();
      const wallet = fundResult.wallet;
      
      // Store the wallet
      this.wallets.set(userId, wallet);
      
      console.log(`Created XRPL wallet for ${userId}: ${wallet.address}`);
      return wallet;
    } catch (error) {
      console.error(`Failed to create XRPL wallet: ${error.message}`);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });

      return parseInt(response.result.account_data.Balance);
    } catch (error) {
      console.error(`Failed to get balance for ${address}: ${error.message}`);
      throw error;
    }
  }

  async sendPayment(senderId, receiverAddress, amount, memo) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Get the sender's wallet
      const senderWallet = this.wallets.get(senderId);
      if (!senderWallet) {
        throw new Error(`Sender wallet not found for ID: ${senderId}`);
      }

      // Prepare the payment transaction
      const payment = {
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Destination: receiverAddress,
        Amount: String(amount),
      };

      // Add memo if provided
      if (memo) {
        payment.Memos = [{
          Memo: {
            MemoData: convertStringToHex(memo)
          }
        }];
      }

      // Prepare and sign the transaction
      const prepared = await this.client.autofill(payment);
      const signed = senderWallet.sign(prepared);

      // Submit the transaction
      const result = await this.client.submitAndWait(signed.tx_blob);

      console.log(`Payment sent from ${senderId} to ${receiverAddress}`);
      console.log(`Amount: ${amount / 1000000} XRP`);
      if (memo) console.log(`Memo: ${memo}`);

      return {
        hash: result.result.hash,
        type: 'Payment',
        sender: senderWallet.address,
        receiver: receiverAddress,
        amount,
        memo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Payment failed: ${error.message}`);
      throw error;
    }
  }

  async issueToken(issuerId, tokenType, receiverAddress, amount, metadata) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Get the issuer's wallet
      const issuerWallet = this.wallets.get(issuerId);
      if (!issuerWallet) {
        throw new Error(`Issuer wallet not found for ID: ${issuerId}`);
      }

      // In a real implementation, this would create a trustline and issue tokens
      // For this simulation, we'll just create a payment with a memo indicating token issuance
      const payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: receiverAddress,
        Amount: '1000', // Nominal amount
        Memos: [{
          Memo: {
            MemoData: convertStringToHex(JSON.stringify({
              type: 'TokenIssuance',
              tokenType: tokenType,
              amount: amount,
              metadata: metadata || {},
              timestamp: new Date().toISOString()
            }))
          }
        }]
      };

      // Prepare and sign the transaction
      const prepared = await this.client.autofill(payment);
      const signed = issuerWallet.sign(prepared);

      // Submit the transaction
      const result = await this.client.submitAndWait(signed.tx_blob);

      console.log(`Token ${tokenType} issued by ${issuerId} to ${receiverAddress}`);
      console.log(`Amount: ${amount}`);

      // Store token issuance record
      const tokenId = `${tokenType}_${uuidv4().substring(0, 8)}`;
      this.tokenIssuances.set(tokenId, {
        issuer: issuerWallet.address,
        receiver: receiverAddress,
        tokenType,
        amount,
        metadata,
        txHash: result.result.hash,
        timestamp: new Date().toISOString()
      });

      return {
        hash: result.result.hash,
        type: 'TokenIssuance',
        issuer: issuerWallet.address,
        receiver: receiverAddress,
        tokenType,
        tokenId,
        amount,
        metadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Token issuance failed: ${error.message}`);
      throw error;
    }
  }

  async getTokenBalance(userId, tokenType) {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    const wallet = this.wallets.get(userId);
    if (!wallet) {
      throw new Error(`Wallet not found for user: ${userId}`);
    }

    try {
      // Create a currency code from the token type (must be 3 characters for standard currencies)
      const currencyCode = tokenType.substring(0, 3);

      // Find issuers for this token type
      const issuers = new Set();
      if (this.tokenIssuances.has(tokenType)) {
        for (const issuance of this.tokenIssuances.get(tokenType)) {
          issuers.add(issuance.issuer);
        }
      }

      let totalBalance = 0;

      // Check balance for each issuer
      for (const issuer of issuers) {
        try {
          const response = await this.client.request({
            command: 'account_lines',
            account: wallet.address,
            peer: issuer,
            ledger_index: 'validated'
          });

          for (const line of response.result.lines) {
            if (line.currency === currencyCode) {
              totalBalance += Number(line.balance);
            }
          }
        } catch (err) {
          // If no trust lines exist, just continue
          continue;
        }
      }

      return totalBalance;
    } catch (error) {
      console.error(`Failed to get token balance: ${error.message}`);
      throw error;
    }
  }

  async getTransactionHistory(userId) {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    const wallet = this.wallets.get(userId);
    if (!wallet) {
      throw new Error(`Wallet not found for user: ${userId}`);
    }

    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: wallet.address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        limit: 20
      });

      return response.result.transactions.map(tx => {
        const transaction = tx.tx;
        return {
          hash: transaction.hash,
          type: transaction.TransactionType,
          sender: transaction.Account,
          receiver: transaction.Destination,
          amount: transaction.Amount,
          timestamp: new Date(tx.date * 1000).toISOString()
        };
      });
    } catch (error) {
      console.error(`Failed to get transaction history: ${error.message}`);
      throw error;
    }
  }
} 