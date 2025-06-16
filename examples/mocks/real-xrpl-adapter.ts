/**
 * Real XRPL adapter implementation using the XRPL library
 */

import { Client, Wallet, Payment, TrustSet, IssuedCurrencyAmount } from 'xrpl';
import chalk from 'chalk';
import ora from 'ora';

export class RealXRPLAdapter {
  private client: Client;
  private wallets: Map<string, Wallet> = new Map();
  private connected: boolean = false;
  private network: string;
  private spinner: any;

  /**
   * Create a new XRPL adapter
   * @param options Configuration options
   */
  constructor(options = { network: 'testnet' }) {
    this.network = options.network;

    // Set up the client based on the network
    if (this.network === 'testnet') {
      this.client = new Client('wss://s.altnet.rippletest.net:51233');
    } else if (this.network === 'devnet') {
      this.client = new Client('wss://s.devnet.rippletest.net:51233');
    } else if (this.network === 'mainnet') {
      this.client = new Client('wss://xrplcluster.com');
    } else {
      this.client = new Client('wss://s.altnet.rippletest.net:51233');
    }

    this.spinner = ora();
  }

  /**
   * Connect to the XRPL network
   */
  async connect(): Promise<boolean> {
    this.spinner.start(chalk.blue(`Connecting to XRPL ${this.network}...`));
    try {
      await this.client.connect();
      this.connected = true;
      this.spinner.succeed(chalk.green(`Connected to XRPL ${this.network}`));
      return true;
    } catch (error: any) {
      this.spinner.fail(
        chalk.red(`Failed to connect to XRPL ${this.network}: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Disconnect from the XRPL network
   */
  async disconnect(): Promise<boolean> {
    this.spinner.start(
      chalk.blue(`Disconnecting from XRPL ${this.network}...`)
    );
    try {
      await this.client.disconnect();
      this.connected = false;
      this.spinner.succeed(
        chalk.green(`Disconnected from XRPL ${this.network}`)
      );
      return true;
    } catch (error: any) {
      this.spinner.fail(
        chalk.red(
          `Failed to disconnect from XRPL ${this.network}: ${error.message}`
        )
      );
      throw error;
    }
  }

  /**
   * Create a new XRPL wallet and fund it from the testnet faucet
   * @param userId User identifier
   * @returns Wallet information
   */
  async createWallet(userId: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to XRPL network');
    }

    this.spinner.start(chalk.blue(`Creating XRPL wallet for ${userId}...`));

    try {
      // Generate a new wallet
      const fundResult = await this.client.fundWallet();
      const wallet = fundResult.wallet;

      // Store the wallet
      this.wallets.set(userId, wallet);

      this.spinner.succeed(
        chalk.green(`Created and funded XRPL wallet for ${userId}`)
      );
      console.log(chalk.cyan(`  Address: ${wallet.address}`));
      console.log(chalk.cyan(`  Balance: ${Number(fundResult.balance)} XRP`));

      return {
        address: wallet.address,
        seed: wallet.seed,
        balance: Number(fundResult.balance) * 1000000, // Convert to drops
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
      };
    } catch (error: any) {
      this.spinner.fail(
        chalk.red(`Failed to create XRPL wallet: ${error.message}`)
      );
      throw error;
    }
  }

  /**
   * Get the balance of a wallet
   * @param userId User identifier
   * @returns Balance in drops (1 XRP = 1,000,000 drops)
   */
  async getBalance(userId: string): Promise<number> {
    if (!this.connected) {
      throw new Error('Not connected to XRPL network');
    }

    if (!this.wallets.has(userId)) {
      throw new Error(`Wallet for user ${userId} not found`);
    }

    const wallet = this.wallets.get(userId)!;

    try {
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated',
      });

      // Convert from XRP to drops (1 XRP = 1,000,000 drops)
      const balance = Number(accountInfo.result.account_data.Balance);
      return balance;
    } catch (error: any) {
      console.error(chalk.red(`Failed to get balance: ${error.message}`));
      throw error;
    }
  }

  /**
   * Send an XRP payment from one user to another
   * @param senderId Sender user ID
   * @param recipientAddress Recipient address
   * @param amount Amount in drops (1 XRP = 1,000,000 drops)
   * @param memo Optional memo
   * @returns Transaction result
   */
  async sendPayment(
    senderId: string,
    recipientAddress: string,
    amount: number,
    memo?: string
  ): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to XRPL network');
    }

    if (!this.wallets.has(senderId)) {
      throw new Error(`Wallet for sender ${senderId} not found`);
    }

    const senderWallet = this.wallets.get(senderId)!;
    const amountInXRP = amount / 1000000;

    this.spinner.start(
      chalk.blue(`Sending ${amountInXRP} XRP to ${recipientAddress}...`)
    );

    try {
      // Prepare the payment transaction
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Amount: amount.toString(),
        Destination: recipientAddress,
      };

      // Add memo if provided
      if (memo) {
        payment.Memos = [
          {
            Memo: {
              MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase(),
              MemoFormat: '746578742F706C61696E', // text/plain in hex
            },
          },
        ];
      }

      // Sign and submit the transaction
      const txResponse = await this.client.submitAndWait(payment, {
        wallet: senderWallet,
      });

      const txResult =
        txResponse.result.meta && typeof txResponse.result.meta === 'object'
          ? txResponse.result.meta.TransactionResult
          : 'Unknown';

      if (txResult === 'tesSUCCESS') {
        this.spinner.succeed(
          chalk.green(`Payment of ${amountInXRP} XRP sent successfully`)
        );
        console.log(
          chalk.cyan(`  Transaction hash: ${txResponse.result.hash}`)
        );
        console.log(
          chalk.cyan(
            `  Explorer link: https://${
              this.network === 'mainnet' ? '' : this.network + '.'
            }xrpl.org/transactions/${txResponse.result.hash}`
          )
        );

        return {
          success: true,
          hash: txResponse.result.hash,
          sender: senderWallet.address,
          recipient: recipientAddress,
          amount: amount,
          fee: Number(txResponse.result.tx_json.Fee || '0'),
          date: new Date().toISOString(),
        };
      } else {
        this.spinner.fail(chalk.red(`Payment failed: ${txResult}`));
        throw new Error(`Payment failed: ${txResult}`);
      }
    } catch (error: any) {
      this.spinner.fail(chalk.red(`Payment failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Issue a token to a recipient
   * @param issuerId Issuer user ID
   * @param tokenCode Token code (e.g., "EUR")
   * @param recipient Recipient address
   * @param amount Amount of tokens
   * @returns Transaction result
   */
  async issueToken(
    issuerId: string,
    tokenCode: string,
    recipientAddress: string,
    amount: number
  ): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to XRPL network');
    }

    if (!this.wallets.has(issuerId)) {
      throw new Error(`Wallet for issuer ${issuerId} not found`);
    }

    const issuerWallet = this.wallets.get(issuerId)!;

    this.spinner.start(chalk.blue(`Setting up trustline for ${tokenCode}...`));

    try {
      // First, we need to establish a trustline from the recipient to the issuer
      // This is a two-step process:
      // 1. Create a second wallet for the recipient if not already in our map
      let recipientWallet: Wallet;

      // Check if we already have this wallet
      const existingRecipient = Array.from(this.wallets.values()).find(
        (wallet) => wallet.address === recipientAddress
      );

      if (existingRecipient) {
        recipientWallet = existingRecipient;
      } else {
        // We need to create a new wallet for this address
        // This is a simplified approach - in a real app, you'd have the recipient's seed
        const fundResult = await this.client.fundWallet();
        recipientWallet = fundResult.wallet;
      }

      // 2. Set up the trustline
      const trustSetTx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: recipientWallet.address,
        LimitAmount: {
          currency: tokenCode,
          issuer: issuerWallet.address,
          value: amount.toString(),
        },
      };

      const trustSetResult = await this.client.submitAndWait(trustSetTx, {
        wallet: recipientWallet,
      });

      this.spinner.succeed(
        chalk.green(`Trustline established for ${tokenCode}`)
      );

      // Now issue the token by sending a payment
      this.spinner.start(
        chalk.blue(
          `Issuing ${amount} ${tokenCode} tokens to ${recipientAddress}...`
        )
      );

      const issuedCurrency: IssuedCurrencyAmount = {
        currency: tokenCode,
        issuer: issuerWallet.address,
        value: amount.toString(),
      };

      const tokenPayment: Payment = {
        TransactionType: 'Payment',
        Account: issuerWallet.address,
        Amount: issuedCurrency,
        Destination: recipientAddress,
      };

      const paymentResult = await this.client.submitAndWait(tokenPayment, {
        wallet: issuerWallet,
      });

      const txResult =
        paymentResult.result.meta &&
        typeof paymentResult.result.meta === 'object'
          ? paymentResult.result.meta.TransactionResult
          : 'Unknown';

      if (txResult === 'tesSUCCESS') {
        this.spinner.succeed(
          chalk.green(`Issued ${amount} ${tokenCode} tokens successfully`)
        );
        console.log(
          chalk.cyan(`  Transaction hash: ${paymentResult.result.hash}`)
        );
        console.log(
          chalk.cyan(
            `  Explorer link: https://${
              this.network === 'mainnet' ? '' : this.network + '.'
            }xrpl.org/transactions/${paymentResult.result.hash}`
          )
        );

        return {
          success: true,
          hash: paymentResult.result.hash,
          issuer: issuerWallet.address,
          tokenCode: tokenCode,
          recipient: recipientAddress,
          amount: amount,
          date: new Date().toISOString(),
        };
      } else {
        this.spinner.fail(chalk.red(`Token issuance failed: ${txResult}`));
        throw new Error(`Token issuance failed: ${txResult}`);
      }
    } catch (error: any) {
      this.spinner.fail(chalk.red(`Token issuance failed: ${error.message}`));
      throw error;
    }
  }
}
