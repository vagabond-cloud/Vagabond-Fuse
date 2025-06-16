# Using Hardware Wallets with FuseStream

## Introduction

Welcome to the FuseStream Hardware Wallet integration guide. This documentation explains how to securely integrate and use hardware wallets with our platform for enhanced security and key management. Hardware wallets provide an additional layer of security by keeping private keys isolated from internet-connected devices.

## Description

Hardware wallets in the FuseStream ecosystem serve multiple critical purposes:

- Secure storage of DID private keys
- Signing of verifiable credentials
- Authentication for high-value operations
- Secure key backup and recovery
- Multi-signature operations for platform governance

Our implementation supports industry-standard hardware wallets and follows best practices for secure key management.

## Overview

This guide covers the integration and usage of hardware wallets with our platform, including setup, key management, and security considerations. You'll learn how to use hardware wallets for both development and production environments.

## Prerequisites

Before integrating hardware wallets, ensure you have:

- Node.js 18+ or Go 1.22+ installed
- Access to our Hardware Wallet Service endpoints
- Required environment variables:
  - `HW_SERVICE_URL`: The base URL for our hardware wallet service
  - `HW_API_KEY`: Your authentication key for the service
- Supported hardware wallet (see list below)

## Supported Hardware Wallets

Our platform currently supports the following hardware wallets:

1. **Ledger**

   - Nano S Plus
   - Nano X
   - Stax
   - Minimum firmware version: 2.1.0

2. **Trezor**

   - Model One
   - Model T
   - Minimum firmware version: 2.6.0

3. **GridPlus**
   - Lattice1
   - Minimum firmware version: 1.0.0

## Integration

### Using the API

The TypeScript SDK provides a programmatic way to interact with hardware wallets:

```typescript
import { HardwareWalletClient } from '@fuse/hw-sdk';

const client = new HardwareWalletClient({
  serviceUrl: process.env.HW_SERVICE_URL,
  apiKey: process.env.HW_API_KEY,
});

async function setupHardwareWallet() {
  try {
    // Initialize connection to hardware wallet
    const wallet = await client.connect({
      type: 'ledger',
      path: "m/44'/60'/0'/0/0", // BIP44 path
      options: {
        timeout: 30000,
        debug: process.env.NODE_ENV === 'development',
      },
    });

    // Verify connection
    const isConnected = await wallet.isConnected();
    if (!isConnected) {
      throw new Error('Failed to connect to hardware wallet');
    }

    // Get public key
    const publicKey = await wallet.getPublicKey();

    return {
      wallet,
      publicKey,
    };
  } catch (error) {
    console.error('Failed to setup hardware wallet:', error);
    throw error;
  }
}
```

### Using the CLI

For quick operations or scripting, our command-line interface provides hardware wallet management:

```bash
fuse hw connect \
  --type ledger \
  --path "m/44'/60'/0'/0/0" \
  --timeout 30000
```

## Key Management

### Generating Keys

```typescript
async function generateKeyPair(wallet) {
  try {
    const keyPair = await wallet.generateKeyPair({
      type: 'Ed25519',
      label: 'FuseStream DID Key',
      options: {
        backup: true,
        exportable: false,
      },
    });

    return keyPair;
  } catch (error) {
    console.error('Failed to generate key pair:', error);
    throw error;
  }
}
```

### Signing Operations

```typescript
async function signCredential(wallet, credential) {
  try {
    const signature = await wallet.sign({
      data: credential,
      type: 'Ed25519Signature2018',
      options: {
        display: true, // Show on device display
        verify: true, // Verify on device
      },
    });

    return signature;
  } catch (error) {
    console.error('Failed to sign credential:', error);
    throw error;
  }
}
```

## Security Features

### Multi-Signature Support

```typescript
async function setupMultiSig(wallet, threshold, signers) {
  try {
    const multiSig = await wallet.createMultiSig({
      threshold,
      signers,
      options: {
        timeout: 60000,
        requireConfirmation: true,
      },
    });

    return multiSig;
  } catch (error) {
    console.error('Failed to setup multi-signature:', error);
    throw error;
  }
}
```

### Backup and Recovery

```typescript
async function backupWallet(wallet) {
  try {
    const backup = await wallet.createBackup({
      type: 'encrypted',
      options: {
        password: true,
        verify: true,
      },
    });

    return backup;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}
```

## Security Considerations

1. **Physical Security**

   - Store hardware wallets in a secure location
   - Use tamper-evident seals
   - Implement proper access controls

2. **Operational Security**

   - Verify device authenticity
   - Check firmware versions
   - Monitor for suspicious activities

3. **Key Management**
   - Implement proper backup procedures
   - Use multi-signature for critical operations
   - Regular key rotation

## Best Practices

1. **Device Management**

   - Keep firmware updated
   - Verify device integrity
   - Use proper PIN/passphrase

2. **Operation Security**

   - Verify transactions on device
   - Use timeout settings
   - Implement proper error handling

3. **Backup and Recovery**
   - Regular backups
   - Secure storage of recovery phrases
   - Test recovery procedures

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**

   - Check USB connection
   - Verify device compatibility
   - Update device drivers

2. **Signing Problems**

   - Check device display
   - Verify transaction data
   - Check device timeout

3. **Backup Issues**
   - Verify backup integrity
   - Check storage location
   - Test recovery process

## API Reference

For detailed API documentation, including all available methods, parameters, and response formats, refer to our [API Reference](https://docs.fuse.stream/api/hardware-wallet).

## Support

If you need assistance with hardware wallet integration or encounter any issues, our support team is here to help:

- Technical issues: support@fuse.stream
- Security concerns: security@fuse.stream
- Documentation feedback: docs@fuse.stream
