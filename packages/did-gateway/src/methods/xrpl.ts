import { DIDDocument, DIDResolutionResult } from '../lib/types';
import {
  Client,
  Wallet,
  AccountSet,
  convertStringToHex,
  xrpToDrops,
} from 'xrpl';
import { WalletAdapter } from '../../../wallet-kit/src/lib/wallet-adapter';
import { XummAdapter } from '../../../wallet-kit/adapters/xumm';

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

  /**
   * Constructor
   * @param network - XRPL network to connect to (default: 'wss://xrplcluster.com')
   * @param walletAdapter - Optional wallet adapter (defaults to XummAdapter if not provided)
   */
  constructor(
    network: string = 'wss://xrplcluster.com',
    walletAdapter?: WalletAdapter
  ) {
    this.network = network;
    this.walletAdapter = walletAdapter || null;
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
      await this.closeClient();
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
      // Extract address from DID
      const address = this.extractAddressFromDid(did);

      const client = await this.initClient();

      // Get account info
      const accountInfo = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      });

      await this.closeClient();

      // Extract DID Document from Domain field
      let didDocument: DIDDocument;

      if (accountInfo.result.account_data.Domain) {
        // Convert hex to string and parse JSON
        const domainHex = accountInfo.result.account_data.Domain;
        const domainString = Buffer.from(domainHex, 'hex').toString('utf8');

        try {
          didDocument = JSON.parse(domainString);
        } catch (e) {
          // If parsing fails, create a minimal DID document
          didDocument = { id: did };
        }
      } else {
        // If no Domain field, create a minimal DID document
        didDocument = { id: did };
      }

      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {},
      };
    } catch (error: any) {
      await this.closeClient();
      return this.createErrorResult(error);
    }
  }

  /**
   * Update an XRPL DID
   * @param did - DID to update
   * @param document - Updated DID Document
   * @param privateKey - Private key (seed) for the account
   * @returns DID Resolution Result
   */
  async update(
    did: string,
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    try {
      // Extract address from DID
      const address = this.extractAddressFromDid(did);
      const client = await this.initClient();

      // If wallet adapter is provided, use it
      if (this.walletAdapter) {
        // Connect to wallet if not already connected
        if (!(await this.walletAdapter.isConnected())) {
          const connected = await this.walletAdapter.connect();
          if (!connected) {
            throw new Error('Failed to connect to wallet');
          }
        }

        // Verify that the wallet address matches the DID address
        const walletAddress = await this.walletAdapter.getAddress();
        if (walletAddress !== address) {
          throw new Error('Wallet address does not match DID address');
        }

        // Update DID Document in account's Domain field
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
        };

        // Sign transaction using wallet adapter
        const signedTxBlob = await this.walletAdapter.signTransaction(
          accountSet
        );

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
            updated: new Date().toISOString(),
            versionId: result.result.tx_json.hash,
          },
        };
      } else {
        // Legacy flow using xrpl.js Wallet
        if (!privateKey) {
          throw new Error(
            'Private key is required when wallet adapter is not provided'
          );
        }

        const wallet = Wallet.fromSeed(privateKey);

        // Verify that the wallet address matches the DID address
        if (wallet.address !== address) {
          throw new Error('Private key does not match DID address');
        }

        // Update DID Document in account's Domain field
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
            updated: new Date().toISOString(),
            versionId: result.result.hash,
          },
        };
      }
    } catch (error: any) {
      await this.closeClient();
      return this.createErrorResult(error);
    }
  }

  /**
   * Deactivate an XRPL DID
   * @param did - DID to deactivate
   * @param privateKey - Private key (seed) for the account
   * @returns DID Resolution Result
   */
  async deactivate(
    did: string,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    try {
      // Extract address from DID
      const address = this.extractAddressFromDid(did);
      const client = await this.initClient();

      // If wallet adapter is provided, use it
      if (this.walletAdapter) {
        // Connect to wallet if not already connected
        if (!(await this.walletAdapter.isConnected())) {
          const connected = await this.walletAdapter.connect();
          if (!connected) {
            throw new Error('Failed to connect to wallet');
          }
        }

        // Verify that the wallet address matches the DID address
        const walletAddress = await this.walletAdapter.getAddress();
        if (walletAddress !== address) {
          throw new Error('Wallet address does not match DID address');
        }

        // Create an empty DID document
        const emptyDocumentHex = convertStringToHex(
          JSON.stringify({ id: did, deactivated: true })
        );

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: address,
          Domain: emptyDocumentHex.slice(0, 256), // Domain field has a size limit
        };

        // Sign transaction using wallet adapter
        const signedTxBlob = await this.walletAdapter.signTransaction(
          accountSet
        );

        // Submit transaction
        const result = await client.submit(signedTxBlob);

        await this.closeClient();

        // Return DID Resolution Result
        return {
          didDocument: { id: did },
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          didDocumentMetadata: {
            deactivated: true,
            updated: new Date().toISOString(),
            versionId: result.result.tx_json.hash,
          },
        };
      } else {
        // Legacy flow using xrpl.js Wallet
        if (!privateKey) {
          throw new Error(
            'Private key is required when wallet adapter is not provided'
          );
        }

        const wallet = Wallet.fromSeed(privateKey);

        // Verify that the wallet address matches the DID address
        if (wallet.address !== address) {
          throw new Error('Private key does not match DID address');
        }

        // Create an empty DID document
        const emptyDocumentHex = convertStringToHex(
          JSON.stringify({ id: did, deactivated: true })
        );

        const accountSet = {
          TransactionType: 'AccountSet',
          Account: wallet.address,
          Domain: emptyDocumentHex.slice(0, 256), // Domain field has a size limit
        } as any; // Type assertion to avoid TypeScript errors with xrpl.js

        // Submit transaction
        const prepared = await client.autofill(accountSet);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await this.closeClient();

        // Return DID Resolution Result
        return {
          didDocument: { id: did },
          didResolutionMetadata: {
            contentType: 'application/did+json',
          },
          didDocumentMetadata: {
            deactivated: true,
            updated: new Date().toISOString(),
            versionId: result.result.hash,
          },
        };
      }
    } catch (error: any) {
      await this.closeClient();
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
   * Create error result
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
