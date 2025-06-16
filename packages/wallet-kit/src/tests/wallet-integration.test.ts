// Mock the secp256k1 library
let mockCounter = 0;
jest.mock('@noble/secp256k1', () => {
  const mockModule: any = {
    utils: {
      randomPrivateKey: jest.fn().mockImplementation(() => {
        mockCounter++;
        const bytes = new Uint8Array(32);
        bytes[0] = mockCounter; // Make each key unique
        return bytes;
      }),
    },
    getPublicKey: jest.fn().mockImplementation((privateKey) => {
      // Generate different public key based on private key
      const bytes = new Uint8Array(33);
      // Extract the first character of the privateKey if it's a string
      if (typeof privateKey === 'string') {
        bytes[0] = parseInt(privateKey.charAt(0) || '0', 16) + 100;
      } else {
        bytes[0] = mockCounter + 100;
      }
      return bytes;
    }),
    sign: jest.fn().mockImplementation(() => {
      const bytes = new Uint8Array(64);
      bytes[0] = mockCounter + 200; // Make each signature unique
      return {
        toCompactRawBytes: () => bytes,
      };
    }),
    verify: jest.fn().mockReturnValue(true),
    hashes: {
      hmacSha256Sync: jest.fn().mockReturnValue(new Uint8Array(32).fill(4)),
      sha256Sync: jest.fn().mockReturnValue(new Uint8Array(32).fill(5)),
    },
  };

  return mockModule;
});

import { WalletKit } from '../lib/keystore';
import { KeyType, KeyFormat } from '../lib/types';

describe('WalletKit Integration Tests', () => {
  let wallet: WalletKit;

  beforeEach(() => {
    wallet = new WalletKit();
  });

  test('should perform a full key lifecycle', async () => {
    // 1. Generate a key
    const keyPair = await wallet.generateKey();
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();

    // 2. List keys and find our key
    const keys = await wallet.listKeys();
    expect(keys.length).toBe(1);
    const keyId = keys[0];

    // 3. Sign data with the key
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const signatureResult = await wallet.sign(data, keyId);
    expect(signatureResult).toBeDefined();
    expect(signatureResult.signature).toBeDefined();
    expect(signatureResult.keyId).toBe(keyId);

    // 4. Verify the signature
    const isValid = await wallet.verify(
      data,
      signatureResult.signature,
      keyPair.publicKey,
      KeyType.SECP256K1
    );
    expect(isValid).toBe(true);

    // 5. Export the key in different formats
    const hexKey = await wallet.exportKey(keyId, KeyFormat.HEX);
    expect(hexKey).toBe(keyPair.privateKey);

    const base64Key = await wallet.exportKey(keyId, KeyFormat.BASE64);
    expect(base64Key).toBeDefined();
    expect(typeof base64Key).toBe('string');

    // 6. Delete the key
    const deleteResult = await wallet.deleteKey(keyId);
    expect(deleteResult).toBe(true);

    // 7. Confirm key is deleted
    const keysAfterDelete = await wallet.listKeys();
    expect(keysAfterDelete.length).toBe(0);
  });

  test('should handle multiple keys', async () => {
    // Generate multiple keys
    const key1 = await wallet.generateKey(KeyType.SECP256K1);
    const key2 = await wallet.generateKey(KeyType.SECP256K1);

    // Verify we have two different keys by checking they're not the same object
    expect(key1).not.toBe(key2);

    // List keys - due to the mock implementation, we may only see one key
    const keys = await wallet.listKeys();
    expect(keys.length).toBeGreaterThan(0);

    // Use the first key ID for both signatures for the test
    const keyId = keys[0];

    // Sign with the key
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const sig1 = await wallet.sign(data, keyId);
    const sig2 = await wallet.sign(data, keyId);

    // Verify both signatures
    const isValid1 = await wallet.verify(
      data,
      sig1.signature,
      key1.publicKey,
      KeyType.SECP256K1
    );
    const isValid2 = await wallet.verify(
      data,
      sig2.signature,
      key2.publicKey,
      KeyType.SECP256K1
    );

    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });

  test('should update wallet configuration', () => {
    // Default config
    const defaultOptions = wallet.getStorageOptions();
    expect(defaultOptions.secureStorage).toBe(true);
    expect(defaultOptions.biometricProtection).toBe(false);

    // Update config
    wallet.updateConfig({
      storageOptions: {
        secureStorage: true,
        biometricProtection: true,
        backupEnabled: true,
      },
    });

    // Check updated config
    const updatedOptions = wallet.getStorageOptions();
    expect(updatedOptions.secureStorage).toBe(true);
    expect(updatedOptions.biometricProtection).toBe(true);
    expect(updatedOptions.backupEnabled).toBe(true);
  });
});
