# DID Gateway

A method-agnostic gateway for Decentralized Identifiers (DIDs) that supports multiple DID methods:

- `did:ion` - ION DID method (Sidetree on Bitcoin)
- `did:polygon` - Polygon DID method (Ethereum-based)
- `did:xrpl` - XRPL DID method (XRP Ledger)

## Installation

```bash
npm install @cs-sif/did-gateway
# or
yarn add @cs-sif/did-gateway
# or
pnpm add @cs-sif/did-gateway
```

## Usage

```typescript
import { DIDGateway, DIDMethod } from '@cs-sif/did-gateway';

// Create a new DID Gateway instance
const gateway = new DIDGateway();

// Create a new DID
const createResult = await gateway.create(DIDMethod.XRPL, {
  verificationMethod: [
    {
      id: '#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
    },
  ],
  service: [
    {
      id: '#service-1',
      type: 'LinkedDomains',
      serviceEndpoint: 'https://example.com',
    },
  ],
});

// Resolve a DID
const resolveResult = await gateway.resolve(
  'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
);

// Update a DID
const updateResult = await gateway.update(
  'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  {
    service: [
      {
        id: '#service-2',
        type: 'MessagingService',
        serviceEndpoint: 'https://messaging.example.com',
      },
    ],
  },
  'privateKeyOrSeed'
);

// Deactivate a DID
const deactivateResult = await gateway.deactivate(
  'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
  'privateKeyOrSeed'
);
```

## Supported DID Methods

### ION (`did:ion`)

The ION DID method is implemented using the [ION Tools](https://github.com/decentralized-identity/ion-tools) library. It creates DIDs on the ION network, which is a Layer 2 DID network based on the Sidetree protocol that runs on Bitcoin.

### Polygon (`did:polygon`)

The Polygon DID method is implemented using the [ethers](https://github.com/ethers-io/ethers.js/) library. It creates DIDs on the Polygon blockchain.

### XRPL (`did:xrpl`)

The XRPL DID method is implemented using the [xrpl.js](https://github.com/XRPLF/xrpl.js) library. It creates DIDs on the XRP Ledger using XRPL Hooks v3.

#### XRPL DID Format

```
did:xrpl:<account_address>
```

Where `<account_address>` is a valid XRP Ledger account address.

#### XRPL DID Implementation

The XRPL DID method stores DID Documents in the account's Domain field, which has a size limitation. For larger documents, consider using a content-addressed storage system and storing the reference in the Domain field.

#### Using Wallet Adapters with XRPL DIDs

The XRPL DID driver now supports wallet adapters, allowing you to use various wallet providers for signing transactions. This is particularly useful for integrating with hardware wallets or wallet apps like Xumm.

```typescript
import { XrplDriver } from '@cs-sif/did-gateway';
import { XummAdapter } from '@cs-sif/wallet-kit/adapters/xumm';

// Create a wallet adapter
const walletAdapter = new XummAdapter({
  apiKey: 'your-xumm-api-key',
  apiSecret: 'your-xumm-api-secret',
});

// Create an XRPL DID driver with the wallet adapter
const driver = new XrplDriver('wss://xrplcluster.com', walletAdapter);

// Example: Create a DID with proper error handling
async function createDid() {
  try {
    // Connect to the wallet first
    const connected = await walletAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Xumm wallet');
    }

    // Get the user's address from the wallet
    const address = await walletAdapter.getAddress();

    // Create a DID document
    const document = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${address}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      service: [
        {
          id: '#service-1',
          type: 'LinkedDomains',
          serviceEndpoint: 'https://example.com',
        },
      ],
    };

    // Create a DID using the wallet adapter
    // No private key needed as the wallet will handle signing
    const result = await driver.create(document);
    console.log('DID created:', result.didDocument?.id);
    return result;
  } catch (error) {
    console.error('Error creating DID:', error);
    throw error;
  }
}

// Example: Update a DID
async function updateDid(did) {
  try {
    // Connect to the wallet first
    const connected = await walletAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Xumm wallet');
    }

    // Verify the wallet address matches the DID
    const address = await walletAdapter.getAddress();
    const didAddress = did.split(':')[2];
    if (address !== didAddress) {
      throw new Error('Wallet address does not match DID address');
    }

    // Update document
    const document = {
      service: [
        {
          id: '#service-2',
          type: 'MessagingService',
          serviceEndpoint: 'https://messaging.example.com',
        },
      ],
    };

    const result = await driver.update(did, document);
    console.log('DID updated:', result.didDocument?.id);
    return result;
  } catch (error) {
    console.error('Error updating DID:', error);
    throw error;
  }
}
```

You can also use the Ledger hardware wallet adapter:

```typescript
import { XrplDriver } from '@cs-sif/did-gateway';
import { LedgerAdapter } from '@cs-sif/wallet-kit/adapters/ledger';

async function manageDIDWithLedger() {
  // Create a wallet adapter for Ledger
  const walletAdapter = new LedgerAdapter({
    accountIndex: 0, // Use the first account
  });

  try {
    // Create an XRPL DID driver with the wallet adapter
    const driver = new XrplDriver('wss://xrplcluster.com', walletAdapter);

    // Connect to the Ledger device
    console.log(
      'Please connect your Ledger device and open the XRP Ledger app...'
    );
    const connected = await walletAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Ledger device');
    }

    // Get the address from the Ledger
    const address = await walletAdapter.getAddress();
    console.log('Connected to Ledger with address:', address);

    // Create a DID document
    const document = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${address}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    };

    // Create a DID (will require confirmation on the Ledger device)
    console.log('Please confirm the transaction on your Ledger device...');
    const result = await driver.create(document);
    console.log('DID created:', result.didDocument?.id);

    // Disconnect when done
    await walletAdapter.disconnect();
    console.log('Disconnected from Ledger device');

    return result;
  } catch (error) {
    console.error('Error managing DID with Ledger:', error);
    // Make sure to disconnect even if there's an error
    await walletAdapter.disconnect().catch(console.error);
    throw error;
  }
}
```

For more information on wallet adapters, see the [Wallet Kit documentation](../wallet-kit/adapters/README.md).

## API Reference

### `DIDGateway`

The main class for interacting with DIDs.

#### Methods

- `create(method: DIDMethod, document: Partial<DIDDocument>, privateKey?: string): Promise<DIDResolutionResult>`

  Creates a new DID with the specified method and document.

- `resolve(did: string): Promise<DIDResolutionResult>`

  Resolves a DID and returns its DID document.

- `update(did: string, document: Partial<DIDDocument>, privateKey: string): Promise<DIDResolutionResult>`

  Updates a DID document.

- `deactivate(did: string, privateKey: string): Promise<DIDResolutionResult>`

  Deactivates a DID.

### `XrplDriver`

The driver for XRPL DIDs.

#### Methods

- `constructor(network: string = 'wss://xrplcluster.com', walletAdapter?: WalletAdapter)`

  Creates a new XRPL DID driver with an optional wallet adapter.

- `setWalletAdapter(adapter: WalletAdapter): void`

  Sets the wallet adapter to use for signing transactions.

- `getWalletAdapter(): WalletAdapter | null`

  Gets the current wallet adapter.

- `create(document: Partial<DIDDocument>, privateKey?: string): Promise<DIDResolutionResult>`

  Creates a new XRPL DID. If a wallet adapter is set, it will be used for signing; otherwise, the privateKey is required.

- `resolve(did: string): Promise<DIDResolutionResult>`

  Resolves an XRPL DID.

- `update(did: string, document: Partial<DIDDocument>, privateKey?: string): Promise<DIDResolutionResult>`

  Updates an XRPL DID. If a wallet adapter is set, it will be used for signing; otherwise, the privateKey is required.

- `deactivate(did: string, privateKey?: string): Promise<DIDResolutionResult>`

  Deactivates an XRPL DID. If a wallet adapter is set, it will be used for signing; otherwise, the privateKey is required.

## License

MIT
