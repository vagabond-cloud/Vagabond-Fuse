/**
 * Real XRPL Adapter
 * 
 * This is a real implementation of the XRPL adapter for the EU Digital Identity Wallet simulation.
 * It provides actual connectivity to the XRP Ledger Testnet.
 */

import { Client, Wallet, convertStringToHex, xrpToDrops } from 'xrpl';
import { v4 as uuidv4 } from 'uuid';

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
      console.error(`Failed to connect to XRPL: ${error.message}`);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      console.log('Disconnecting from XRPL Testnet...');
      await this.client.disconnect();
      this.isConnected = false;
      console.log('Successfully disconnected from XRPL Testnet');
      return true;
    }
    return false;
  }

  async createWallet(userId) {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    try {
      // Generate a new wallet on the testnet
      const fundResult = await this.client.fundWallet();
      const wallet = fundResult.wallet;
      
      // Store the wallet with the user ID
      this.wallets.set(userId, wallet);
      
      console.log(`Created XRPL wallet for ${userId}: ${wallet.address}`);
      return {
        address: wallet.address,
        seed: wallet.seed,
        balance: await this.getBalance(userId)
      };
    } catch (error) {
      console.error(`Failed to create wallet: ${error.message}`);
      throw error;
    }
  }

  async getBalance(userId) {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    const wallet = this.wallets.get(userId);
    if (!wallet) {
      throw new Error(`Wallet not found for user: ${userId}`);
    }

    try {
      const response = await this.client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated'
      });
      
      return Number(response.result.account_data.Balance);
    } catch (error) {
      console.error(`Failed to get balance: ${error.message}`);
      throw error;
    }
  }

  async sendPayment(senderId, receiverAddress, amount, memo = '') {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    // Get sender wallet
    const senderWallet = this.wallets.get(senderId);
    if (!senderWallet) {
      throw new Error(`Sender wallet not found: ${senderId}`);
    }

    try {
      // Prepare the transaction
      const prepared = await this.client.autofill({
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Amount: amount.toString(),
        Destination: receiverAddress,
        Memos: memo ? [{
          Memo: {
            MemoData: convertStringToHex(memo)
          }
        }] : undefined
      });

      // Sign the transaction
      const signed = senderWallet.sign(prepared);

      // Submit the transaction
      const result = await this.client.submitAndWait(signed.tx_blob);

      console.log(`Payment sent: ${result.result.hash}`);
      return {
        hash: result.result.hash,
        type: 'Payment',
        sender: senderWallet.address,
        receiver: receiverAddress,
        amount,
        memo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to send payment: ${error.message}`);
      throw error;
    }
  }

  async issueToken(issuerId, tokenType, receiverAddress, amount, metadata = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to XRPL network');
    }

    // Get issuer wallet
    const issuerWallet = this.wallets.get(issuerId);
    if (!issuerWallet) {
      throw new Error(`Issuer wallet not found: ${issuerId}`);
    }

    try {
      // For simplicity, we'll use a trust line and payment to simulate token issuance
      // In a real implementation, you might want to use NFTs or other token standards
      
      // First, create a trust line from the receiver to the issuer
      // This step would normally be done by the receiver, but for simulation purposes we'll do it here
      
      // Find receiver wallet by address
      let receiverWallet = null;
      for (const [id, wallet] of this.wallets.entries()) {
        if (wallet.address === receiverAddress) {
          receiverWallet = wallet;
          break;
        }
      }

      if (!receiverWallet) {
        throw new Error(`Receiver wallet not found for address: ${receiverAddress}`);
      }
      
      // Create a currency code from the token type (must be 3 characters for standard currencies)
      const currencyCode = tokenType.substring(0, 3);
      
      // Set trust line
      const trustSetTx = await this.client.autofill({
        TransactionType: 'TrustSet',
        Account: receiverWallet.address,
        LimitAmount: {
          currency: currencyCode,
          issuer: issuerWallet.address,
          value: (amount * 2).toString() // Set limit higher than the amount to be issued
        }
      });
      
      const signedTrustSet = receiverWallet.sign(trustSetTx);
      await this.client.submitAndWait(signedTrustSet.tx_blob);
      
      // Now issue the tokens via a payment
      const issueTx = await this.client.autofill({
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Destination: receiverAddress,
        Amount: {
          currency: currencyCode,
          issuer: issuerWallet.address,
          value: amount.toString()
        },
        Memos: [{
          Memo: {
            MemoData: convertStringToHex(JSON.stringify({
              tokenType,
              metadata,
              timestamp: new Date().toISOString()
            }))
          }
        }]
      });
      
      const signedIssue = issuerWallet.sign(issueTx);
      const result = await this.client.submitAndWait(signedIssue.tx_blob);
      
      // Record token issuance
      if (!this.tokenIssuances.has(tokenType)) {
        this.tokenIssuances.set(tokenType, []);
      }
      
      const issuance = {
        tokenId: `${tokenType}_${result.result.hash}`,
        issuer: issuerWallet.address,
        receiver: receiverAddress,
        amount,
        tokenType,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      this.tokenIssuances.get(tokenType).push(issuance);
      
      return {
        hash: result.result.hash,
        type: 'TokenIssuance',
        issuer: issuerWallet.address,
        receiver: receiverAddress,
        tokenType,
        tokenId: `${tokenType}_${result.result.hash}`,
        amount,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to issue token: ${error.message}`);
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

export default XRPLAdapter; 