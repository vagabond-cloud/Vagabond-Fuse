/**
 * Mock implementation of an XRPL adapter for the EU Digital Identity simulation
 */

export class XRPLAdapter {
  private wallets = new Map();
  private connected = false;
  private network = 'testnet';

  constructor(options = { network: 'testnet' }) {
    this.network = options.network;
    console.log(`[MOCK] Created XRPL adapter for ${this.network} network`);
  }

  async connect(): Promise<boolean> {
    this.connected = true;
    console.log(`[MOCK] Connected to XRPL ${this.network}`);
    return true;
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    console.log(`[MOCK] Disconnected from XRPL ${this.network}`);
    return true;
  }

  async createWallet(userId: string): Promise<any> {
    const walletAddress = `r${userId.substring(0, 8)}${Math.floor(Math.random() * 10000000)}`;
    const walletData = {
      address: walletAddress,
      seed: `s${Math.random().toString(36).substring(2, 15)}`,
      balance: 1000000000, // 1000 XRP in drops
      sequence: 1,
    };
    
    this.wallets.set(userId, walletData);
    console.log(`[MOCK] Created XRPL wallet for ${userId}: ${walletAddress}`);
    return walletData;
  }

  async getBalance(userId: string): Promise<number> {
    if (!this.wallets.has(userId)) {
      throw new Error(`Wallet for user ${userId} not found`);
    }
    
    return this.wallets.get(userId).balance;
  }

  async sendPayment(
    senderId: string, 
    recipientAddress: string, 
    amount: number,
    memo?: string
  ): Promise<any> {
    if (!this.wallets.has(senderId)) {
      throw new Error(`Wallet for sender ${senderId} not found`);
    }
    
    const senderWallet = this.wallets.get(senderId);
    
    if (senderWallet.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    // Update sender balance
    senderWallet.balance -= amount;
    senderWallet.sequence += 1;
    
    // Create transaction result
    const txHash = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    console.log(`[MOCK] Payment sent from ${senderId} to ${recipientAddress}`);
    console.log(`[MOCK] Amount: ${amount / 1000000} XRP`);
    if (memo) console.log(`[MOCK] Memo: ${memo}`);
    
    return {
      success: true,
      hash: txHash,
      sender: senderWallet.address,
      recipient: recipientAddress,
      amount: amount,
      fee: 12, // Standard XRPL fee in drops
      date: new Date().toISOString(),
    };
  }

  async issueToken(
    issuerId: string,
    tokenCode: string,
    recipient: string,
    amount: number
  ): Promise<any> {
    if (!this.wallets.has(issuerId)) {
      throw new Error(`Wallet for issuer ${issuerId} not found`);
    }
    
    const issuerWallet = this.wallets.get(issuerId);
    issuerWallet.sequence += 1;
    
    console.log(`[MOCK] Token ${tokenCode} issued by ${issuerId} to ${recipient}`);
    console.log(`[MOCK] Amount: ${amount}`);
    
    return {
      success: true,
      hash: `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      issuer: issuerWallet.address,
      tokenCode: tokenCode,
      recipient: recipient,
      amount: amount,
      date: new Date().toISOString(),
    };
  }
} 