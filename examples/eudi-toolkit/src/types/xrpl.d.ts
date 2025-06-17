declare module 'xrpl' {
  export class Client {
    constructor(server: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    request(request: any): Promise<any>;
    submitAndWait(tx: any, options?: any): Promise<any>;
    autofill(tx: any): Promise<any>;
  }

  export class Wallet {
    static generate(): Wallet;
    static fromSeed(seed: string): Wallet;
    sign(tx: any): any;
    
    address: string;
    publicKey: string;
    privateKey: string;
    seed: string;
  }

  export interface Payment {
    TransactionType: 'Payment';
    Account: string;
    Destination: string;
    Amount: string | object;
    Memos?: Array<{
      Memo: {
        MemoType?: string;
        MemoData?: string;
        MemoFormat?: string;
      }
    }>;
    [key: string]: any;
  }

  export interface NFTokenMint {
    TransactionType: 'NFTokenMint';
    Account: string;
    URI: string;
    NFTokenTaxon: number;
    Flags?: number;
    Memos?: Array<{
      Memo: {
        MemoType?: string;
        MemoData?: string;
        MemoFormat?: string;
      }
    }>;
    [key: string]: any;
  }

  export interface NFTokenCreateOffer {
    TransactionType: 'NFTokenCreateOffer';
    Account: string;
    NFTokenID: string;
    Amount: string;
    Destination?: string;
    Flags?: number;
    [key: string]: any;
  }

  export interface Transaction {
    TransactionType: string;
    Account: string;
    [key: string]: any;
  }

  export interface TransactionMetadataBase {
    TransactionResult: string;
    [key: string]: any;
  }

  export interface MPTokenIssuanceCreateMetadata extends TransactionMetadataBase {}
  export interface NFTokenAcceptOfferMetadata extends TransactionMetadataBase {}
  export interface NFTokenCancelOfferMetadata extends TransactionMetadataBase {}
  export interface NFTokenCreateOfferMetadata extends TransactionMetadataBase {}
  export interface NFTokenMintMetadata extends TransactionMetadataBase {}
  export interface PaymentMetadata extends TransactionMetadataBase {}

  export function convertStringToHex(string: string): string;
} 