// Mock the secp256k1 library
jest.mock('@noble/secp256k1', () => {
  const mockModule: any = {
    utils: {
      randomPrivateKey: jest.fn().mockReturnValue(new Uint8Array(32).fill(1)),
    },
    getPublicKey: jest.fn().mockReturnValue(new Uint8Array(33).fill(2)),
    sign: jest.fn().mockResolvedValue({
      toCompactRawBytes: () => new Uint8Array(64).fill(3),
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

describe('WalletKit', () => {
  let wallet: WalletKit;

  beforeEach(() => {
    wallet = new WalletKit();
  });

  test('should generate a key pair', async () => {
    const keyPair = await wallet.generateKey();
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.keyType).toBe(KeyType.SECP256K1);
  });

  test('should list keys', async () => {
    await wallet.generateKey();
    const keys = await wallet.listKeys();
    expect(keys.length).toBe(1);
  });

  test('should sign and verify data', async () => {
    const keyPair = await wallet.generateKey();
    const keyId = await wallet.importKey(
      keyPair.privateKey,
      KeyType.SECP256K1,
      KeyFormat.HEX
    );

    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const signatureResult = await wallet.sign(data, keyId);

    expect(signatureResult).toBeDefined();
    expect(signatureResult.signature).toBeDefined();
    expect(signatureResult.keyId).toBe(keyId);

    const isValid = await wallet.verify(
      data,
      signatureResult.signature,
      keyPair.publicKey,
      KeyType.SECP256K1
    );
    expect(isValid).toBe(true);
  });

  test('should export and import keys', async () => {
    const keyPair = await wallet.generateKey();
    const keyId = await wallet.importKey(
      keyPair.privateKey,
      KeyType.SECP256K1,
      KeyFormat.HEX
    );

    const exportedKey = await wallet.exportKey(keyId, KeyFormat.HEX);
    expect(exportedKey).toBe(keyPair.privateKey);

    const newKeyId = await wallet.importKey(
      exportedKey,
      KeyType.SECP256K1,
      KeyFormat.HEX
    );
    expect(newKeyId).toBeDefined();
  });

  test('should delete keys', async () => {
    const keyPair = await wallet.generateKey();
    const keys = await wallet.listKeys();
    const keyId = keys[0];

    const result = await wallet.deleteKey(keyId);
    expect(result).toBe(true);

    const keysAfterDelete = await wallet.listKeys();
    expect(keysAfterDelete.length).toBe(0);
  });
});
