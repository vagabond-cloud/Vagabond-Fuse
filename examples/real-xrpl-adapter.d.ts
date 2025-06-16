/**
 * Type declarations for the real XRPL adapter
 */

declare module '../real-xrpl-adapter.mjs' {
  export class XRPLAdapter {
    constructor();
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    createWallet(userId: string): Promise<any>;
    getBalance(address: string): Promise<number>;
    sendPayment(
      senderId: string,
      receiverAddress: string,
      amount: number,
      memo?: string
    ): Promise<any>;
    issueToken(
      issuerId: string,
      tokenType: string,
      receiverAddress: string,
      amount: number
    ): Promise<any>;
  }
}

export default XRPLAdapter;
