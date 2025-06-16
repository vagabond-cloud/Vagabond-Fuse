import { DIDDocument, DIDResolutionResult } from '../lib';
import {
  Client,
  Wallet,
  AccountSet,
  convertStringToHex,
  xrpToDrops,
} from 'xrpl';
import { WalletAdapter, TokenConfig } from '@fuse/wallet-kit';
import { FeeService } from '../lib/fee-service';
import { DEFAULT_TOKEN_CONFIG } from '../lib/fee-service';

/**
 * XRPL DID Driver implementation
 *
 * This driver implements the XRPL DID method using XRPL Hooks v3
 * Format: did:xrpl:<account_address>
 */
export class XrplDriver {
  private client: Client | null = null;
  private network: string;
  private walletAdapter: WalletAdapter | null = null;
  private feeService: FeeService | null = null;

  /**
   * Constructor
   * @param network - XRPL network to connect to (default: 'wss://xrplcluster.com')
   * @param walletAdapter - Optional wallet adapter (defaults to null)
   * @param feeConfig - Optional fee configuration for token payments
   */
  constructor(
    network: string = 'wss://xrplcluster.com',
    walletAdapter?: WalletAdapter,
    feeConfig?: {
      tokenConfig: TokenConfig;
      feeRecipient: string;
    }
  ) {
    this.network = network;
    this.walletAdapter = walletAdapter || null;

    // Initialize fee service if configuration is provided
    if (feeConfig && this.walletAdapter) {
      this.feeService = new FeeService(
        this.walletAdapter,
        feeConfig.tokenConfig || DEFAULT_TOKEN_CONFIG,
        { feeRecipient: feeConfig.feeRecipient },
        network
      );
    }
  }

  /**
   * Set the wallet adapter
   * @param adapter - Wallet adapter to use
   */
  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
  }

  /**
   * Get the current wallet adapter
   * @returns Current wallet adapter or null if not set
   */
  getWalletAdapter(): WalletAdapter | null {
    return this.walletAdapter;
  }

  /**
   * Set up the fee service
   * @param tokenConfig - Token configuration
   * @param feeRecipient - Fee recipient address
   */
  setupFeeService(
    tokenConfig: TokenConfig | undefined,
    feeRecipient: string
  ): void {
    if (!this.walletAdapter) {
      throw new Error(
        'Wallet adapter must be set before setting up fee service'
      );
    }

    this.feeService = new FeeService(
      this.walletAdapter,
      tokenConfig || DEFAULT_TOKEN_CONFIG,
      { feeRecipient },
      this.network
    );
  }

  /**
   * Get the fee service
   * @returns Fee service or null if not set
   */
  getFeeService(): FeeService | null {
    return this.feeService;
  }

  /**
   * Initialize XRPL client
   */
  private async initClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client(this.network);
      await this.client.connect();
    }
    return this.client;
  }

  /**
   * Close XRPL client connection
   */
  private async closeClient(): Promise<void> {
    if (this.client && this.client.isConnected()) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Create a new XRPL DID
   * @param document - DID Document to create
   * @param privateKey - Optional private key (seed) to use
   * @returns DID Resolution Result
   */
  async create(
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    try {
      // Process fee payment if fee service is configured
      if (this.feeService) {
        // Check if user has sufficient balance
        const hasSufficientBalance = await this.feeService.hasSufficientBalance(
          'create'
        );
        if (!hasSufficientBalance) {
          return this.createErrorResult(
            new Error('Insufficient token balance for create operation')
          );
        }

        // Ensure trustline exists
        const trustlineSetup = await this.feeService.setupTrustline();
        if (!trustlineSetup) {
          return this.createErrorResult(
            new Error('Failed to set up token trustline')
          );
        }

        // Pay the fee
        const feePaymentSuccess = await this.feeService.payCreateFee();
        if (!feePaymentSuccess) {
          return this.createErrorResult(
            new Error('Fee payment failed for create operation')
          );
        }
      }

      const client = await this.initClient();
      let address: string;
      let signedTxBlob: string;

      // If wallet adapter is provided, use it
      if (this.walletAdapter) {
        // Connect to wallet if not already connected
        if (!(await this.walletAdapter.isConnected())) {
          const connected = await this.walletAdapter.connect();
          if (!connected) {
            throw new Error('Failed to connect to wallet');
          }
        }

        // Get address from wallet
        address = await this.walletAdapter.getAddress();

        // Create DID identifier
        const did = `did:xrpl:${address}`;

        // Store DID Document in account's Domain field
        const didDocumentHex = convertStringToHex(
          JSON.stringify({
            ...document,
            id: did,
          })
        );

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
          SetFlag: 5, // Enable rippling
        };

        // Sign transaction using wallet adapter
        signedTxBlob = await this.walletAdapter.signTransaction(accountSet);

        // Submit transaction
        const result = await client.submit(signedTxBlob);

        await this.closeClient();

        // Create a new object to avoid duplicate 'id' property
        const didDocument: DIDDocument = {
          id: did,
          ...(document as any), // Remove DIDDocument type to avoid duplicate 'id' property
        };

        // Return DID Resolution Result
        return {
          didDocument,
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          didDocumentMetadata: {
            created: new Date().toISOString(),
            versionId: result.result.tx_json.hash,
          },
        };
      } else {
        // Legacy flow using xrpl.js Wallet
        // Create wallet with provided seed or generate a new one
        const wallet = privateKey
          ? Wallet.fromSeed(privateKey)
          : Wallet.generate();

        // Fund the account if it's a new one (in a real implementation, this would be handled differently)
        if (!privateKey) {
          // This is a simplified example; in production, you'd need a proper funding mechanism
          // For testnet, you might use a faucet
          // For mainnet, the account would need to be funded externally
        }

        // Create DID identifier
        const did = `did:xrpl:${wallet.address}`;

        // Store DID Document in account's Domain field (simplified approach)
        const didDocumentHex = convertStringToHex(
          JSON.stringify({
            ...document,
            id: did,
          })
        );

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
          SetFlag: 5, // Enable rippling
        } as any; // Type assertion to avoid TypeScript errors with xrpl.js

        // Submit transaction
        const prepared = await client.autofill(accountSet);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await this.closeClient();

        // Create a new object to avoid duplicate 'id' property
        const didDocument: DIDDocument = {
          id: did,
          ...(document as any), // Remove DIDDocument type to avoid duplicate 'id' property
        };

        // Return DID Resolution Result
        return {
          didDocument,
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          didDocumentMetadata: {
            created: new Date().toISOString(),
            versionId: result.result.hash,
          },
        };
      }
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Resolve an XRPL DID
   * @param did - DID to resolve
   * @returns DID Resolution Result
   */
  async resolve(did: string): Promise<DIDResolutionResult> {
    try {
      // Process fee payment if fee service is configured and fees are required for resolution
      if (this.feeService) {
        // Check if user has sufficient balance
        const hasSufficientBalance = await this.feeService.hasSufficientBalance(
          'resolve'
        );
        if (!hasSufficientBalance) {
          return this.createErrorResult(
            new Error('Insufficient token balance for resolve operation')
          );
        }

        // Pay the fee if needed (resolve may be free)
        const feePaymentSuccess = await this.feeService.payResolveFee();
        if (!feePaymentSuccess) {
          return this.createErrorResult(
            new Error('Fee payment failed for resolve operation')
          );
        }
      }

      // Extract XRPL address from DID
      const address = this.extractAddressFromDid(did);

      // Initialize XRPL client
      const client = await this.initClient();

      // Get account info
      const accountInfo = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });

      // Get Domain field from account info
      const domain = accountInfo.result.account_data.Domain;
      if (!domain) {
        throw new Error('DID document not found in account Domain field');
      }

      // Convert hex Domain field to string and parse as JSON
      const didDocumentStr = Buffer.from(domain, 'hex').toString('utf8');
      const didDocument = JSON.parse(didDocumentStr);

      await this.closeClient();

      // Return DID Resolution Result
      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          updated: accountInfo.result.account_data.PreviousTxnLgrSeq
            ? new Date().toISOString() // Just use current time since we don't have a timestamp
            : undefined,
        },
      };
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Update an XRPL DID
   * @param did - DID to update
   * @param document - Updated DID Document
   * @param privateKey - Optional private key (seed) to use
   * @returns DID Resolution Result
   */
  async update(
    did: string,
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    try {
      // Process fee payment if fee service is configured
      if (this.feeService) {
        // Check if user has sufficient balance
        const hasSufficientBalance = await this.feeService.hasSufficientBalance(
          'update'
        );
        if (!hasSufficientBalance) {
          return this.createErrorResult(
            new Error('Insufficient token balance for update operation')
          );
        }

        // Pay the fee
        const feePaymentSuccess = await this.feeService.payUpdateFee();
        if (!feePaymentSuccess) {
          return this.createErrorResult(
            new Error('Fee payment failed for update operation')
          );
        }
      }

      // Extract XRPL address from DID
      const address = this.extractAddressFromDid(did);

      // Initialize XRPL client
      const client = await this.initClient();

      // Store updated DID Document in account's Domain field
      const didDocumentHex = convertStringToHex(
        JSON.stringify({
          ...document,
          id: did,
        })
      );

      let result: any;

      // If wallet adapter is provided, use it
      if (this.walletAdapter) {
        // Connect to wallet if not already connected
        if (!(await this.walletAdapter.isConnected())) {
          const connected = await this.walletAdapter.connect();
          if (!connected) {
            throw new Error('Failed to connect to wallet');
          }
        }

        // Get address from wallet
        const walletAddress = await this.walletAdapter.getAddress();

        // Verify wallet address matches DID address
        if (walletAddress !== address) {
          throw new Error(
            `Wallet address ${walletAddress} does not match DID address ${address}`
          );
        }

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
        };

        // Sign transaction using wallet adapter
        const signedTxBlob = await this.walletAdapter.signTransaction(
          accountSet
        );

        // Submit transaction
        result = await client.submit(signedTxBlob);
      } else {
        // Legacy flow using xrpl.js Wallet
        if (!privateKey) {
          throw new Error(
            'Private key is required for update when no wallet adapter is provided'
          );
        }

        // Create wallet from private key
        const wallet = Wallet.fromSeed(privateKey);

        // Verify wallet address matches DID address
        if (wallet.address !== address) {
          throw new Error(
            `Wallet address ${wallet.address} does not match DID address ${address}`
          );
        }

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
        } as any; // Type assertion to avoid TypeScript errors with xrpl.js

        // Submit transaction
        const prepared = await client.autofill(accountSet);
        const signed = wallet.sign(prepared);
        result = await client.submitAndWait(signed.tx_blob);
      }

      await this.closeClient();

      // Return updated DID document
      return {
        didDocument: {
          id: did,
          ...(document as any), // Remove DIDDocument type to avoid duplicate 'id' property
        },
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          updated: new Date().toISOString(),
          versionId: result.result.tx_json?.hash || result.result.hash,
        },
      };
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Deactivate an XRPL DID
   * @param did - DID to deactivate
   * @param privateKey - Optional private key (seed) to use
   * @returns DID Resolution Result
   */
  async deactivate(
    did: string,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    try {
      // Process fee payment if fee service is configured
      if (this.feeService) {
        // Check if user has sufficient balance
        const hasSufficientBalance = await this.feeService.hasSufficientBalance(
          'deactivate'
        );
        if (!hasSufficientBalance) {
          return this.createErrorResult(
            new Error('Insufficient token balance for deactivate operation')
          );
        }

        // Pay the fee
        const feePaymentSuccess = await this.feeService.payDeactivateFee();
        if (!feePaymentSuccess) {
          return this.createErrorResult(
            new Error('Fee payment failed for deactivate operation')
          );
        }
      }

      // Extract XRPL address from DID
      const address = this.extractAddressFromDid(did);

      // Initialize XRPL client
      const client = await this.initClient();

      // Create a deactivated DID document
      const deactivatedDocument = {
        id: did,
        '@context': ['https://www.w3.org/ns/did/v1'],
        controller: [],
        verificationMethod: [],
        authentication: [],
        assertionMethod: [],
        keyAgreement: [],
        capabilityInvocation: [],
        capabilityDelegation: [],
        service: [],
        alsoKnownAs: [],
        deactivated: true,
      };

      // Store deactivated DID Document in account's Domain field
      const didDocumentHex = convertStringToHex(
        JSON.stringify(deactivatedDocument)
      );

      let result: any;

      // If wallet adapter is provided, use it
      if (this.walletAdapter) {
        // Connect to wallet if not already connected
        if (!(await this.walletAdapter.isConnected())) {
          const connected = await this.walletAdapter.connect();
          if (!connected) {
            throw new Error('Failed to connect to wallet');
          }
        }

        // Get address from wallet
        const walletAddress = await this.walletAdapter.getAddress();

        // Verify wallet address matches DID address
        if (walletAddress !== address) {
          throw new Error(
            `Wallet address ${walletAddress} does not match DID address ${address}`
          );
        }

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
        };

        // Sign transaction using wallet adapter
        const signedTxBlob = await this.walletAdapter.signTransaction(
          accountSet
        );

        // Submit transaction
        result = await client.submit(signedTxBlob);
      } else {
        // Legacy flow using xrpl.js Wallet
        if (!privateKey) {
          throw new Error(
            'Private key is required for deactivation when no wallet adapter is provided'
          );
        }

        // Create wallet from private key
        const wallet = Wallet.fromSeed(privateKey);

        // Verify wallet address matches DID address
        if (wallet.address !== address) {
          throw new Error(
            `Wallet address ${wallet.address} does not match DID address ${address}`
          );
        }

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: didDocumentHex.slice(0, 256), // Domain field has a size limit
        } as any; // Type assertion to avoid TypeScript errors with xrpl.js

        // Submit transaction
        const prepared = await client.autofill(accountSet);
        const signed = wallet.sign(prepared);
        result = await client.submitAndWait(signed.tx_blob);
      }

      await this.closeClient();

      // Return deactivated DID document
      return {
        didDocument: deactivatedDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          deactivated: true,
          updated: new Date().toISOString(),
          versionId: result.result.tx_json?.hash || result.result.hash,
        },
      };
    } catch (error: any) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Extract XRPL address from DID
   * @param did - DID to extract address from
   * @returns XRPL address
   * @private
   */
  private extractAddressFromDid(did: string): string {
    // Format: did:xrpl:<address>
    const parts = did.split(':');
    if (parts.length !== 3 || parts[0] !== 'did' || parts[1] !== 'xrpl') {
      throw new Error('Invalid XRPL DID format');
    }
    return parts[2];
  }

  /**
   * Create an error result
   * @param error - Error to create result from
   * @returns DID Resolution Result with error
   * @private
   */
  private createErrorResult(error: Error): DIDResolutionResult {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: 'notFound',
        message: error.message,
      },
      didDocumentMetadata: {},
    };
  }
}
