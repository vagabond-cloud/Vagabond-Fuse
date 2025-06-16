import { Xumm } from 'xumm-sdk';
import {
  KeyFormat,
  KeyPair,
  KeyType,
  SignatureResult,
  WalletInterface,
} from '../../src/lib/types';
import {
  WalletAdapter,
  XrplTransaction,
  XrplTransactionResult,
} from '../../src/lib/wallet-adapter';

/**
 * Xumm adapter configuration
 */
export interface XummAdapterConfig {
  apiKey: string;
  apiSecret: string;
}

/**
 * Xumm adapter implementation
 */
export class XummAdapter implements WalletAdapter {
  private sdk: Xumm;
  private connected: boolean = false;
  private userToken?: string;
  private currentAddress?: string;

  /**
   * Constructor
   * @param config - Xumm adapter configuration
   */
  constructor(config: XummAdapterConfig) {
    this.sdk = new Xumm(config.apiKey, config.apiSecret);
  }

  /**
   * Connect to Xumm wallet
   * @returns True if connection successful
   */
  async connect(): Promise<boolean> {
    try {
      // Create a new session
      const session = await this.sdk.payload.create({
        txjson: {
          TransactionType: 'SignIn',
        },
      });

      // Store the session token
      this.userToken = session.uuid;

      // Wait for the user to scan and approve
      const result = await this.sdk.payload.get(this.userToken);

      if (result.meta.signed) {
        this.connected = true;
        this.currentAddress = result.response.account;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect to Xumm wallet:', error);
      return false;
    }
  }

  /**
   * Disconnect from Xumm wallet
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.userToken = undefined;
    this.currentAddress = undefined;
  }

  /**
   * Check if connected to Xumm wallet
   * @returns True if connected
   */
  async isConnected(): Promise<boolean> {
    return this.connected;
  }

  /**
   * Get the XRPL address associated with this wallet
   * @returns XRPL address
   */
  async getAddress(): Promise<string> {
    if (!this.connected || !this.currentAddress) {
      throw new Error('Not connected to Xumm wallet');
    }
    return this.currentAddress;
  }

  /**
   * Sign an XRPL transaction
   * @param transaction - The transaction to sign
   * @returns Signed transaction blob
   */
  async signTransaction(transaction: XrplTransaction): Promise<string> {
    if (!this.connected || !this.userToken) {
      throw new Error('Not connected to Xumm wallet');
    }

    const payload = await this.sdk.payload.create({
      txjson: transaction,
    });

    // Wait for user to sign
    const result = await this.sdk.payload.get(payload.uuid);

    if (!result.meta.signed) {
      throw new Error('User rejected transaction signing');
    }

    return result.response.hex || '';
  }

  /**
   * Submit a signed transaction to the XRPL
   * @param txBlob - The signed transaction blob
   * @returns Transaction result
   */
  async submitTransaction(txBlob: string): Promise<XrplTransactionResult> {
    if (!this.connected) {
      throw new Error('Not connected to Xumm wallet');
    }

    const result = await this.sdk.payload.submit(txBlob);

    return {
      hash: result.txid,
      ledger_index: result.ledger_index,
      meta: result.metadata,
      validated: result.validated,
    };
  }

  /**
   * Generate a new key pair (not supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async generateKey(_type: KeyType): Promise<KeyPair> {
    throw new Error('Key generation not supported in Xumm wallet adapter');
  }

  /**
   * Sign data with a key (not directly supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async sign(_data: Uint8Array, _keyId: string): Promise<SignatureResult> {
    throw new Error('Direct data signing not supported in Xumm wallet adapter');
  }

  /**
   * Verify a signature (not directly supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async verify(
    _data: Uint8Array,
    _signature: string,
    _publicKey: string,
    _keyType: KeyType
  ): Promise<boolean> {
    throw new Error(
      'Signature verification not supported in Xumm wallet adapter'
    );
  }

  /**
   * Export a key (not supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async exportKey(_keyId: string, _format: KeyFormat): Promise<string> {
    throw new Error('Key export not supported in Xumm wallet adapter');
  }

  /**
   * Import a key (not supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async importKey(
    _key: string,
    _type: KeyType,
    _format: KeyFormat
  ): Promise<string> {
    throw new Error('Key import not supported in Xumm wallet adapter');
  }

  /**
   * List keys (not supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async listKeys(): Promise<string[]> {
    throw new Error('Listing keys not supported in Xumm wallet adapter');
  }

  /**
   * Delete a key (not supported in Xumm)
   * @throws Error - This operation is not supported in Xumm
   */
  async deleteKey(_keyId: string): Promise<boolean> {
    throw new Error('Key deletion not supported in Xumm wallet adapter');
  }
}
