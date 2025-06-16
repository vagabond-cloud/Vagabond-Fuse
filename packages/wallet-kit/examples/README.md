# Wallet Kit Examples

This directory contains example code demonstrating how to use the wallet adapters with the XRPL DID driver.

## Available Examples

### XRPL DID Example (`xrpl-did-example.ts`)

This example demonstrates:

1. Using the Xumm wallet adapter to create, resolve, and update DIDs
2. Using the Ledger hardware wallet adapter for DID operations
3. Switching between different wallet adapters
4. Implementing a fallback mechanism from hardware wallet to private key

## Running the Examples

To run the examples, you need to:

1. Install the required dependencies:

   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

2. Configure your API keys and credentials where needed (e.g., Xumm API keys)

3. Run the example using ts-node:
   ```bash
   npx ts-node packages/wallet-kit/examples/xrpl-did-example.ts
   ```

## Modifying the Examples

By default, all examples are commented out in the `runExamples()` function. Uncomment the example you want to run:

```typescript
async function runExamples(): Promise<void> {
  // Uncomment the example you want to run
  await xummWalletExample();
  // await ledgerWalletExample();
  // await switchWalletAdaptersExample();
  // await walletWithFallbackExample();

  console.log('Examples completed');
}
```

## Creating Your Own Examples

To create your own example:

1. Create a new TypeScript file in this directory
2. Import the necessary components:

   ```typescript
   import { XrplDriver } from '../../did-gateway/src/methods/xrpl';
   import { WalletAdapter } from '../src/lib/wallet-adapter';
   import { YourAdapter } from '../adapters/your-adapter';
   ```

3. Implement your example code
4. Add proper error handling and cleanup (especially for hardware wallets)
5. Document your example in this README
