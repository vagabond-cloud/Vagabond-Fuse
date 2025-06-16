/**
 * Mock implementation of the wallet-kit package for examples
 */

export enum KeyType {
  SECP256K1 = 'SECP256K1',
  ED25519 = 'ED25519',
  RSA = 'RSA',
}

export enum KeyFormat {
  HEX = 'HEX',
  BASE64 = 'BASE64',
  JWK = 'JWK',
}

interface WalletOptions {
  storageOptions: {
    secureStorage?: boolean;
    biometricProtection?: boolean;
    backupEnabled?: boolean;
  };
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

interface Signature {
  signature: string;
  algorithm: string;
}

export class WalletKit {
  private keys: Map<string, KeyPair> = new Map();
  private options: WalletOptions;

  constructor(options: WalletOptions) {
    this.options = options;
    console.log('[MOCK] Created wallet with options:', JSON.stringify(options));
  }

  async generateKey(type: KeyType): Promise<KeyPair> {
    // Mock key generation
    const keyId = `key-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mockPublicKey = `04${keyId.padEnd(64, '0')}`;
    const mockPrivateKey = keyId.padEnd(64, '1');

    const keyPair = { publicKey: mockPublicKey, privateKey: mockPrivateKey };
    this.keys.set(keyId, keyPair);

    console.log(`[MOCK] Generated ${type} key pair with ID: ${keyId}`);
    return keyPair;
  }

  async listKeys(): Promise<string[]> {
    return Array.from(this.keys.keys());
  }

  async sign(data: Uint8Array, keyId: string): Promise<Signature> {
    if (!this.keys.has(keyId)) {
      throw new Error(`Key with ID ${keyId} not found`);
    }

    // Mock signature generation
    const mockSignature = `sig-${Buffer.from(data)
      .toString('hex')
      .substring(0, 10)}-${keyId}`;
    return {
      signature: mockSignature,
      algorithm: 'ES256K',
    };
  }

  async verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: KeyType
  ): Promise<boolean> {
    // Mock verification - always returns true
    console.log(`[MOCK] Verifying signature with ${keyType}`);
    return true;
  }

  async exportKey(keyId: string, format: KeyFormat): Promise<string> {
    if (!this.keys.has(keyId)) {
      throw new Error(`Key with ID ${keyId} not found`);
    }

    const keyPair = this.keys.get(keyId)!;

    switch (format) {
      case KeyFormat.HEX:
        return keyPair.privateKey;
      case KeyFormat.BASE64:
        return Buffer.from(keyPair.privateKey, 'hex').toString('base64');
      case KeyFormat.JWK:
        return JSON.stringify({
          kty: 'EC',
          crv: 'secp256k1',
          x: keyPair.publicKey.substring(0, 32),
          y: keyPair.publicKey.substring(32),
          d: keyPair.privateKey,
        });
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async importKey(
    key: string,
    type: KeyType,
    format: KeyFormat
  ): Promise<string> {
    // Mock import - create a new key ID
    const keyId = `imported-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Mock key pair based on the imported key
    const mockPublicKey = `04${keyId.padEnd(64, '2')}`;
    const mockPrivateKey = key.substring(0, 64);

    this.keys.set(keyId, {
      publicKey: mockPublicKey,
      privateKey: mockPrivateKey,
    });

    console.log(
      `[MOCK] Imported ${type} key with format ${format}, assigned ID: ${keyId}`
    );
    return keyId;
  }
}
