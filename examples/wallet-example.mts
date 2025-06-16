/**
 * Example demonstrating how to use the WalletKit package
 *
 * This example shows how to:
 * 1. Create a wallet
 * 2. Generate keys
 * 3. Sign data
 * 4. Verify signatures
 * 5. Export and import keys
 */

import { WalletKit, KeyType, KeyFormat } from './mocks/wallet-kit.js';

async function main() {
  console.log('WalletKit Example');
  console.log('----------------');

  // Create a new wallet
  const wallet = new WalletKit({
    storageOptions: {
      secureStorage: true,
      biometricProtection: false,
      backupEnabled: true,
    },
  });

  // Generate a new key pair
  console.log('\n1. Generating a new key pair...');
  const keyPair = await wallet.generateKey(KeyType.SECP256K1);
  console.log(`Generated key pair:`);
  console.log(`- Public key: ${keyPair.publicKey.substring(0, 10)}...`);
  console.log(`- Private key: ${keyPair.privateKey.substring(0, 10)}...`);

  // List keys in the wallet
  console.log('\n2. Listing keys in the wallet...');
  const keys = await wallet.listKeys();
  console.log(`Found ${keys.length} key(s) in the wallet`);

  // Use the first key to sign data
  const keyId = keys[0];
  console.log(`\n3. Signing data with key ${keyId}...`);

  // Create some data to sign
  const data = new TextEncoder().encode('Hello, Decentralized Identity!');

  // Sign the data
  const signature = await wallet.sign(data, keyId);
  console.log(`Signature: ${signature.signature.substring(0, 20)}...`);
  console.log(`Algorithm: ${signature.algorithm}`);

  // Verify the signature
  console.log('\n4. Verifying signature...');
  const isValid = await wallet.verify(
    data,
    signature.signature,
    keyPair.publicKey,
    KeyType.SECP256K1
  );
  console.log(`Signature valid: ${isValid}`);

  // Export and import keys
  console.log('\n5. Exporting key in different formats...');
  const hexKey = await wallet.exportKey(keyId, KeyFormat.HEX);
  console.log(`Hex format: ${hexKey.substring(0, 10)}...`);

  const base64Key = await wallet.exportKey(keyId, KeyFormat.BASE64);
  console.log(`Base64 format: ${base64Key.substring(0, 10)}...`);

  console.log('\n6. Importing key...');
  const importedKeyId = await wallet.importKey(
    hexKey,
    KeyType.SECP256K1,
    KeyFormat.HEX
  );
  console.log(`Imported key ID: ${importedKeyId}`);

  // List keys again
  const keysAfterImport = await wallet.listKeys();
  console.log(`\n7. Wallet now contains ${keysAfterImport.length} key(s)`);
}

main().catch(console.error);
