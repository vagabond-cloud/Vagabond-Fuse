/**
 * XRPL Integration Adapter
 *
 * This adapter provides integration with the XRP Ledger for DIDs and credentials.
 * It supports storing DIDs and credentials as NFTs and transactions with memos.
 */

import { Client, Wallet, convertStringToHex, NFTokenMint, Payment } from 'xrpl';
import { v4 as uuidv4 } from 'uuid';

import { DIDDriver } from '../core/did';
import { DIDResolutionResult } from '../core/types';

// Define interfaces for XRPL transaction types
interface XrplTransactionMeta {
  TransactionResult?: string;
  [key: string]: any;
}

interface XrplTransaction {
  TransactionType?: string;
  Memos?: Array<{
    Memo: {
      MemoType?: string;
      MemoData?: string;
      MemoFormat?: string;
    };
  }>;
  date?: number;
  hash?: string;
  [key: string]: any;
}

interface XrplTransactionResponse {
  tx?: XrplTransaction;
  meta?: XrplTransactionMeta;
  [key: string]: any;
}

export interface XRPLAdapterConfig {
  server: string;
  wallet?: Wallet;
}

export class XRPLAdapter implements DIDDriver {
  private client: Client;
  private wallet?: Wallet;
  private connected: boolean = false;

  constructor(config: XRPLAdapterConfig) {
    this.client = new Client(config.server);
    this.wallet = config.wallet;
  }

  /**
   * Connect to the XRPL
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
      console.log('Connected to XRPL');
    }
  }

  /**
   * Disconnect from the XRPL
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
      console.log('Disconnected from XRPL');
    }
  }

  /**
   * Set the wallet adapter
   * @param wallet The wallet to use
   */
  setWalletAdapter(wallet: Wallet): void {
    this.wallet = wallet;
  }

  /**
   * Create a DID on the XRPL
   * @param document Optional partial DID document
   * @returns The DID resolution result
   */
  async create(document?: Partial<any>): Promise<DIDResolutionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    await this.connect();

    // Create a unique DID
    const did = `did:xrpl:${this.wallet.address}`;

    // Create the DID document
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: did,
      controller: did,
      verificationMethod: [
        {
          id: `${did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase: `z${this.wallet.publicKey}`,
        },
      ],
      authentication: [`${did}#key-1`],
      assertionMethod: [`${did}#key-1`],
      ...document,
    };

    // Store the DID document on the XRPL as a memo in a payment transaction
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: this.wallet.address,
      Destination: this.wallet.address,
      Amount: '1',
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex('did:document'),
            MemoData: convertStringToHex(JSON.stringify(didDocument)),
            MemoFormat: convertStringToHex('application/json'),
          },
        },
      ],
    };

    // Submit the transaction
    const result = await this.client.submitAndWait(tx, { wallet: this.wallet });

    // Check if the transaction was successful
    if (
      (result.result.meta as XrplTransactionMeta)?.TransactionResult !==
      'tesSUCCESS'
    ) {
      throw new Error(
        `Transaction failed: ${
          (result.result.meta as XrplTransactionMeta)?.TransactionResult
        }`
      );
    }

    return {
      didResolutionMetadata: {
        contentType: 'application/did+json',
        retrieved: new Date().toISOString(),
      },
      didDocument,
      didDocumentMetadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        txHash: result.result.hash,
      },
    };
  }

  /**
   * Resolve a DID on the XRPL
   * @param did The DID to resolve
   * @returns The DID resolution result
   */
  async resolve(did: string): Promise<DIDResolutionResult> {
    await this.connect();

    // Extract the address from the DID
    const didParts = did.split(':');
    if (
      didParts.length !== 3 ||
      didParts[0] !== 'did' ||
      didParts[1] !== 'xrpl'
    ) {
      throw new Error(`Invalid DID format: ${did}`);
    }

    const address = didParts[2];

    // Get all transactions for the address
    const transactions = await this.client.request({
      command: 'account_tx',
      account: address,
      ledger_index_min: -1,
      ledger_index_max: -1,
      binary: false,
      forward: false,
    });

    // Find the latest DID document transaction
    let latestDIDDocument = null;
    let latestTimestamp = 0;
    let latestTxHash = '';

    for (const txObj of transactions.result.transactions) {
      const tx = txObj as XrplTransactionResponse;
      if (tx.tx?.TransactionType === 'Payment' && tx.tx?.Memos) {
        for (const memo of tx.tx.Memos) {
          if (
            memo.Memo &&
            memo.Memo.MemoType &&
            Buffer.from(memo.Memo.MemoType, 'hex').toString() === 'did:document'
          ) {
            // Found a DID document memo
            if (tx.tx?.date && tx.tx?.date > latestTimestamp) {
              // Make sure MemoData is defined before using Buffer.from
              if (memo.Memo.MemoData) {
                const didDocumentJson = Buffer.from(
                  memo.Memo.MemoData,
                  'hex'
                ).toString();
                latestDIDDocument = JSON.parse(didDocumentJson);
                latestTimestamp = tx.tx.date;
                // Ensure hash is defined
                latestTxHash = tx.tx.hash || '';
              }
            }
          }
        }
      }
    }

    if (!latestDIDDocument) {
      return {
        didResolutionMetadata: {
          error: 'notFound',
          message: `DID not found: ${did}`,
        },
        didDocument: null,
        didDocumentMetadata: {},
      };
    }

    return {
      didResolutionMetadata: {
        contentType: 'application/did+json',
        retrieved: new Date().toISOString(),
      },
      didDocument: latestDIDDocument,
      didDocumentMetadata: {
        created: new Date(latestTimestamp * 1000).toISOString(),
        updated: new Date(latestTimestamp * 1000).toISOString(),
        txHash: latestTxHash,
      },
    };
  }

  /**
   * Update a DID on the XRPL
   * @param did The DID to update
   * @param document The updated DID document
   * @returns The DID resolution result
   */
  async update(
    did: string,
    document: Partial<any>
  ): Promise<DIDResolutionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    await this.connect();

    // Extract the address from the DID
    const didParts = did.split(':');
    if (
      didParts.length !== 3 ||
      didParts[0] !== 'did' ||
      didParts[1] !== 'xrpl'
    ) {
      throw new Error(`Invalid DID format: ${did}`);
    }

    const address = didParts[2];

    // Verify that the wallet controls the DID
    if (address !== this.wallet.address) {
      throw new Error(`Wallet does not control DID: ${did}`);
    }

    // Resolve the current DID document
    const resolution = await this.resolve(did);
    if (!resolution.didDocument) {
      throw new Error(`DID not found: ${did}`);
    }

    // Update the DID document
    const updatedDocument = {
      ...resolution.didDocument,
      ...document,
    };

    // Store the updated DID document on the XRPL
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: this.wallet.address,
      Destination: this.wallet.address,
      Amount: '1',
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex('did:document'),
            MemoData: convertStringToHex(JSON.stringify(updatedDocument)),
            MemoFormat: convertStringToHex('application/json'),
          },
        },
      ],
    };

    // Submit the transaction
    const result = await this.client.submitAndWait(tx, { wallet: this.wallet });

    // Check if the transaction was successful
    if (
      (result.result.meta as XrplTransactionMeta)?.TransactionResult !==
      'tesSUCCESS'
    ) {
      throw new Error(
        `Transaction failed: ${
          (result.result.meta as XrplTransactionMeta)?.TransactionResult
        }`
      );
    }

    return {
      didResolutionMetadata: {
        contentType: 'application/did+json',
        retrieved: new Date().toISOString(),
      },
      didDocument: updatedDocument,
      didDocumentMetadata: {
        created: resolution.didDocumentMetadata.created,
        updated: new Date().toISOString(),
        txHash: result.result.hash,
      },
    };
  }

  /**
   * Deactivate a DID on the XRPL
   * @param did The DID to deactivate
   * @returns The DID resolution result
   */
  async deactivate(did: string): Promise<DIDResolutionResult> {
    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    await this.connect();

    // Extract the address from the DID
    const didParts = did.split(':');
    if (
      didParts.length !== 3 ||
      didParts[0] !== 'did' ||
      didParts[1] !== 'xrpl'
    ) {
      throw new Error(`Invalid DID format: ${did}`);
    }

    const address = didParts[2];

    // Verify that the wallet controls the DID
    if (address !== this.wallet.address) {
      throw new Error(`Wallet does not control DID: ${did}`);
    }

    // Resolve the current DID document
    const resolution = await this.resolve(did);
    if (!resolution.didDocument) {
      throw new Error(`DID not found: ${did}`);
    }

    // Update the DID document to mark it as deactivated
    const deactivatedDocument = {
      ...resolution.didDocument,
      deactivated: true,
    };

    // Store the deactivated DID document on the XRPL
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: this.wallet.address,
      Destination: this.wallet.address,
      Amount: '1',
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex('did:document'),
            MemoData: convertStringToHex(JSON.stringify(deactivatedDocument)),
            MemoFormat: convertStringToHex('application/json'),
          },
        },
      ],
    };

    // Submit the transaction
    const result = await this.client.submitAndWait(tx, { wallet: this.wallet });

    // Check if the transaction was successful
    if (
      (result.result.meta as XrplTransactionMeta)?.TransactionResult !==
      'tesSUCCESS'
    ) {
      throw new Error(
        `Transaction failed: ${
          (result.result.meta as XrplTransactionMeta)?.TransactionResult
        }`
      );
    }

    return {
      didResolutionMetadata: {
        contentType: 'application/did+json',
        retrieved: new Date().toISOString(),
      },
      didDocument: deactivatedDocument,
      didDocumentMetadata: {
        created: resolution.didDocumentMetadata.created,
        updated: new Date().toISOString(),
        deactivated: true,
        txHash: result.result.hash,
      },
    };
  }

  /**
   * Issue a credential as an NFT on the XRPL
   * @param credential The credential to issue
   * @returns The transaction hash
   */
  async issueCredentialAsNFT(credential: any): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not set');
    }

    await this.connect();

    // Create the NFT mint transaction
    const tx: NFTokenMint = {
      TransactionType: 'NFTokenMint',
      Account: this.wallet.address,
      URI: convertStringToHex(credential.id),
      NFTokenTaxon: 0,
      Memos: [
        {
          Memo: {
            MemoType: convertStringToHex('credential'),
            MemoData: convertStringToHex(JSON.stringify(credential)),
            MemoFormat: convertStringToHex('application/json'),
          },
        },
      ],
    };

    // Submit the transaction
    const result = await this.client.submitAndWait(tx, { wallet: this.wallet });

    // Check if the transaction was successful
    if (
      (result.result.meta as XrplTransactionMeta)?.TransactionResult !==
      'tesSUCCESS'
    ) {
      throw new Error(
        `Offer creation failed: ${
          (result.result.meta as XrplTransactionMeta)?.TransactionResult
        }`
      );
    }

    return result.result.hash;
  }

  /**
   * Get the wallet address
   * @returns The wallet address
   */
  getAddress(): string {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }
    return this.wallet.address;
  }
}
