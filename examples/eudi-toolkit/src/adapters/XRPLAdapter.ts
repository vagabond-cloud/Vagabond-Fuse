import { Client, Wallet } from 'xrpl';
import {
  DIDAdapter,
  DIDCreateOptions,
  DIDResolutionResult,
  DIDDocument,
} from '../core';

export interface XRPLAdapterConfig {
  server: string;
  wallet?: Wallet;
}

export class XRPLAdapter implements DIDAdapter {
  private client: Client | null = null;
  private wallet: Wallet | null = null;
  private server: string;

  constructor(config: XRPLAdapterConfig) {
    this.server = config.server;
    this.wallet = config.wallet || null;
  }

  async connect(): Promise<void> {
    try {
      this.client = new Client(this.server);
      await this.client.connect();
      console.log('Connected to XRPL');
    } catch (error) {
      console.error('Error connecting to XRPL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      console.log('Disconnected from XRPL');
    }
  }

  async create(options: DIDCreateOptions): Promise<DIDResolutionResult> {
    try {
      if (!this.client || !this.wallet) {
        throw new Error('XRPL client or wallet not initialized');
      }

      // Get the current ledger index
      const ledgerResponse = await this.client.request({
        command: 'ledger_current',
      });
      const currentLedgerIndex = parseInt(
        ledgerResponse.result.ledger_current_index
      );

      // Create a DID document
      const didDocument = this.generateDIDDocument(this.wallet.address);

      // Prepare the transaction
      const tx = {
        TransactionType: 'AccountSet',
        Account: this.wallet.address,
        // Set LastLedgerSequence to current ledger + 30 to give more time for processing
        LastLedgerSequence: currentLedgerIndex + 30,
        Memos: [
          {
            Memo: {
              MemoType: Buffer.from('did:document', 'utf8').toString('hex'),
              MemoData: Buffer.from(
                JSON.stringify(didDocument),
                'utf8'
              ).toString('hex'),
            },
          },
        ],
      };

      // Use a different approach - prepare, sign, and submit separately
      console.log("Preparing transaction...");
      const prepared = await this.client.autofill(tx);
      console.log("Signing transaction...");
      const signed = this.wallet.sign(prepared);
      console.log("Submitting transaction...");
      
      // Submit the transaction
      const submitResponse = await this.client.request({
        command: 'submit',
        tx_blob: signed.tx_blob
      });
      console.log("Submit response:", submitResponse.result.engine_result);
      
      if (submitResponse.result.engine_result !== 'tesSUCCESS' && 
          submitResponse.result.engine_result !== 'terQUEUED') {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'invalidDid',
            message: `Error creating DID: ${submitResponse.result.engine_result} - ${submitResponse.result.engine_result_message}`,
          },
          didDocumentMetadata: {},
        };
      }
      
      // Transaction was submitted successfully, now wait for validation
      console.log("Transaction submitted, waiting for validation...");
      
      // Wait for the transaction to be validated
      let txHash = signed.hash;
      let validated = false;
      let attempts = 10;
      
      while (!validated && attempts > 0) {
        try {
          console.log(`Checking transaction status (${attempts} attempts left)...`);
          const txResponse = await this.client.request({
            command: 'tx',
            transaction: txHash,
          });
          
          if (txResponse.result.validated) {
            validated = true;
            console.log("Transaction validated!");
            
            if (txResponse.result.meta.TransactionResult === 'tesSUCCESS') {
              // Return the DID document
              return {
                didDocument,
                didResolutionMetadata: {
                  contentType: 'application/did+json',
                },
                didDocumentMetadata: {
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  txHash: txHash,
                },
              };
            } else {
              return {
                didDocument: null,
                didResolutionMetadata: {
                  error: 'invalidDid',
                  message: `Transaction validated but failed: ${txResponse.result.meta.TransactionResult}`,
                },
                didDocumentMetadata: {},
              };
            }
          }
        } catch (error: any) {
          console.log("Transaction not yet validated, waiting...");
        }
        
        // Wait 3 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts--;
      }
      
      if (!validated) {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'timeout',
            message: 'Timed out waiting for transaction validation',
          },
          didDocumentMetadata: {},
        };
      }
      
      // This should not be reached, but just in case
      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'notFound',
          message: `Error creating DID: ${error.message}`,
        },
        didDocumentMetadata: {},
      };
    }
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    try {
      if (!this.client) {
        throw new Error('XRPL client not initialized');
      }

      // Extract the address from the DID
      const address = this.extractAddressFromDID(did);
      if (!address) {
        throw new Error('Invalid DID format');
      }

      // Query the account transactions
      const response = await this.client.request({
        command: 'account_tx',
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        forward: false,
      });

      // Find the transaction with the DID document
      const tx = response.result.transactions.find((tx: any) => {
        if (!tx.tx || !tx.tx.Memos || !tx.tx.Memos.length) return false;
        const memo = tx.tx.Memos[0];
        if (!memo.Memo || !memo.Memo.MemoType) return false;
        const memoType = Buffer.from(memo.Memo.MemoType, 'hex').toString(
          'utf8'
        );
        return memoType === 'did:document';
      });

      if (!tx) {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'notFound',
            message: 'DID document not found',
          },
          didDocumentMetadata: {},
        };
      }

      // Extract the DID document from the transaction
      const memoData = tx.tx.Memos[0].Memo.MemoData;
      const didDocument = JSON.parse(
        Buffer.from(memoData, 'hex').toString('utf8')
      );

      return {
        didDocument,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          created: new Date(tx.tx.date * 1000).toISOString(),
          updated: new Date(tx.tx.date * 1000).toISOString(),
        },
      };
    } catch (error: any) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'notFound',
          message: `Error resolving DID: ${error.message}`,
        },
        didDocumentMetadata: {},
      };
    }
  }

  async update(
    did: string,
    document: DIDDocument
  ): Promise<DIDResolutionResult> {
    try {
      if (!this.client || !this.wallet) {
        throw new Error('XRPL client or wallet not initialized');
      }

      // Extract the address from the DID
      const address = this.extractAddressFromDID(did);
      if (!address || address !== this.wallet.address) {
        throw new Error('Invalid DID or not authorized to update');
      }

      // Get the current ledger index
      const ledgerResponse = await this.client.request({
        command: 'ledger_current',
      });
      const currentLedgerIndex = parseInt(
        ledgerResponse.result.ledger_current_index
      );

      // Prepare the transaction
      const tx = {
        TransactionType: 'AccountSet',
        Account: this.wallet.address,
        LastLedgerSequence: currentLedgerIndex + 20,
        Memos: [
          {
            Memo: {
              MemoType: Buffer.from('did:document', 'utf8').toString('hex'),
              MemoData: Buffer.from(JSON.stringify(document), 'utf8').toString(
                'hex'
              ),
            },
          },
        ],
      };

      // Sign and submit the transaction
      const response = await this.client.submitAndWait(tx, {
        wallet: this.wallet,
      });

      // Check if the transaction was successful
      if (response.result.meta.TransactionResult !== 'tesSUCCESS') {
        return {
          didDocument: null,
          didResolutionMetadata: {
            error: 'invalidDid',
            message: `Error updating DID: ${response.result.meta.TransactionResult}`,
          },
          didDocumentMetadata: {},
        };
      }

      // Return the updated DID document
      return {
        didDocument: document,
        didResolutionMetadata: {
          contentType: 'application/did+json',
        },
        didDocumentMetadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        didDocument: null,
        didResolutionMetadata: {
          error: 'notFound',
          message: `Error updating DID: ${error.message}`,
        },
        didDocumentMetadata: {},
      };
    }
  }

  async delete(did: string): Promise<boolean> {
    try {
      if (!this.client || !this.wallet) {
        throw new Error('XRPL client or wallet not initialized');
      }

      // Extract the address from the DID
      const address = this.extractAddressFromDID(did);
      if (!address || address !== this.wallet.address) {
        throw new Error('Invalid DID or not authorized to delete');
      }

      // Get the current ledger index
      const ledgerResponse = await this.client.request({
        command: 'ledger_current',
      });
      const currentLedgerIndex = parseInt(
        ledgerResponse.result.ledger_current_index
      );

      // Prepare the transaction with an empty DID document
      const tx = {
        TransactionType: 'AccountSet',
        Account: this.wallet.address,
        LastLedgerSequence: currentLedgerIndex + 20,
        Memos: [
          {
            Memo: {
              MemoType: Buffer.from('did:document:deleted', 'utf8').toString(
                'hex'
              ),
              MemoData: Buffer.from(
                JSON.stringify({ deleted: true }),
                'utf8'
              ).toString('hex'),
            },
          },
        ],
      };

      // Sign and submit the transaction
      const response = await this.client.submitAndWait(tx, {
        wallet: this.wallet,
      });

      // Check if the transaction was successful
      return response.result.meta.TransactionResult === 'tesSUCCESS';
    } catch (error) {
      console.error('Error deleting DID:', error);
      return false;
    }
  }

  private generateDIDDocument(address: string): DIDDocument {
    const did = `did:xrpl:${address}`;
    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: did,
      controller: did,
      verificationMethod: [
        {
          id: `${did}#keys-1`,
          type: 'Ed25519VerificationKey2020',
          controller: did,
          publicKeyMultibase: `z${this.wallet?.publicKey || ''}`,
        },
      ],
      authentication: [`${did}#keys-1`],
      assertionMethod: [`${did}#keys-1`],
    };
  }

  private extractAddressFromDID(did: string): string | null {
    const match = did.match(/^did:xrpl:([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  }
}
