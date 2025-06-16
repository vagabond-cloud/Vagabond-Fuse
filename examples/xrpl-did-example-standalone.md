# XRPL DID Wallet Adapters - Standalone Example

This standalone example demonstrates how to use different wallet adapters with the XRPL DID driver. It's a simplified, mocked implementation that shows the concepts and patterns without requiring any external dependencies.

## Running the Example

```bash
npx ts-node --transpile-only xrpl-did-example-standalone.ts
```

## What This Example Demonstrates

1. **Wallet Adapter Interface**: A common interface for different wallet implementations (Xumm, Ledger)
2. **XRPL DID Driver with Wallet Adapters**: How the DID driver can use wallet adapters for operations
3. **Xumm Mobile Wallet Integration**: Using Xumm for DID operations
4. **Ledger Hardware Wallet Integration**: Using Ledger for DID operations
5. **Switching Between Adapters**: How to switch between different wallet adapters
6. **Fallback Mechanism**: Falling back to private key when a wallet adapter fails

## Example Scenarios

The example includes four scenarios:

### 1. Xumm Wallet Example

Shows how to:

- Initialize and connect to a Xumm wallet
- Create, resolve, and update DIDs using Xumm
- Handle wallet-specific signing and transaction submission

### 2. Ledger Hardware Wallet Example

Shows how to:

- Connect to a Ledger hardware wallet
- Create and resolve DIDs using Ledger
- Handle hardware wallet signing

### 3. Switching Between Wallet Adapters

Shows how to:

- Start with one wallet adapter (Xumm)
- Switch to another adapter (Ledger) during runtime
- Maintain DID operations across different adapters

### 4. Wallet with Fallback to Private Key

Shows how to:

- Try to use a hardware wallet first
- Fall back to a private key if the hardware wallet is unavailable
- Maintain consistent DID operations regardless of the signing method

## Implementation Notes

This is a mocked implementation for demonstration purposes. In a real implementation:

1. The wallet adapters would connect to actual wallet services/devices
2. Transactions would be signed by the actual wallet
3. Transactions would be submitted to the XRPL network
4. Error handling would be more robust

To see the full implementation, refer to:

- `packages/wallet-kit/src/lib/wallet-adapter.ts`
- `packages/wallet-kit/adapters/xumm/index.ts`
- `packages/wallet-kit/adapters/ledger/index.ts`
- `packages/did-gateway/src/methods/xrpl.ts`
