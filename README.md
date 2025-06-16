# Getting Started with Vagabond-Fuse

This guide will help you get started with the Vagabond-Fuse (Cross-Chain Self-Sovereign Identity Fabric) framework. We'll cover installation, basic setup, and walk through some common use cases.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js and pnpm**

   ```bash
   # Install Node.js (v18 or later)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18

   # Install pnpm
   npm install -g pnpm@8
   ```

2. **Python and Poetry**

   ```bash
   # Install Python 3.11
   brew install python@3.11

   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   ```

3. **Development Tools**
   - Git
   - Docker (for local development)
   - VS Code or your preferred IDE
   - Postman or similar API testing tool

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/vagabond-cloud/Vagabond-Fuse.git
   cd cs-sif
   ```

2. **Install Dependencies**

   ```bash
   # Install TypeScript dependencies
   pnpm install

   # Install Python dependencies
   cd services/credential-hub && poetry install && cd ../..
   cd services/policy-engine && poetry install && cd ../..
   ```

3. **Build the Project**
   ```bash
   pnpm build
   ```

## Basic Setup

### 1. Configure Environment

Create a `.env` file in the root directory:

```env
# Network Configuration
XRPL_NODE_URL=wss://xrplcluster.com
ETH_NODE_URL=https://eth-mainnet.alchemyapi.io/v2/your-api-key
BTC_NODE_URL=https://your-bitcoin-node-url

# Service Configuration
CREDENTIAL_HUB_PORT=8000
POLICY_ENGINE_PORT=8001

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# Optional: Xumm API Keys
XUMM_API_KEY=your-xumm-api-key
XUMM_API_SECRET=your-xumm-api-secret
```

### 2. Start Services

1. **Start Credential Hub**

   ```bash
   cd services/credential-hub
   poetry run uvicorn app.main:app --port 8000 --reload
   ```

2. **Start Policy Engine**
   ```bash
   cd services/policy-engine
   poetry run uvicorn app.main:app --port 8001 --reload
   ```

### 3. Database Setup with Docker

For local development and testing, you can use Docker to set up the required databases:

1. **PostgreSQL for Credential Storage**

   ```bash
   # Create a Docker container for PostgreSQL
   docker run --name cs-sif-postgres \
     -e POSTGRES_USER=cs_sif \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=credential_hub \
     -p 5432:5432 \
     -d postgres:14
   ```

2. **MongoDB for Policy Storage**

   ```bash
   # Create a Docker container for MongoDB
   docker run --name cs-sif-mongodb \
     -e MONGO_INITDB_ROOT_USERNAME=cs_sif \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     -p 27017:27017 \
     -d mongo:5
   ```

3. **Redis for Caching and Session Management**

   ```bash
   # Create a Docker container for Redis
   docker run --name cs-sif-redis \
     -p 6379:6379 \
     -d redis:7
   ```

4. **Clickhouse for Analytics and Metrics**

   ```bash
   # Create a Docker container for Clickhouse
   docker run --name cs-sif-clickhouse \
     -p 8123:8123 \
     -p 9000:9000 \
     -e CLICKHOUSE_DB=cs_sif_analytics \
     -e CLICKHOUSE_USER=cs_sif \
     -e CLICKHOUSE_PASSWORD=password \
     -d clickhouse/clickhouse-server:23.3
   ```

5. **Docker Compose (Alternative Setup)**

   Create a `docker-compose.yml` file in the root directory:

   ```yaml
   version: '3.8'

   services:
     postgres:
       image: postgres:14
       container_name: cs-sif-postgres
       environment:
         POSTGRES_USER: cs_sif
         POSTGRES_PASSWORD: password
         POSTGRES_DB: credential_hub
       ports:
         - '5432:5432'
       volumes:
         - postgres_data:/var/lib/postgresql/data

     mongodb:
       image: mongo:5
       container_name: cs-sif-mongodb
       environment:
         MONGO_INITDB_ROOT_USERNAME: cs_sif
         MONGO_INITDB_ROOT_PASSWORD: password
       ports:
         - '27017:27017'
       volumes:
         - mongo_data:/data/db

     redis:
       image: redis:7
       container_name: cs-sif-redis
       ports:
         - '6379:6379'
       volumes:
         - redis_data:/data

     clickhouse:
       image: clickhouse/clickhouse-server:23.3
       container_name: cs-sif-clickhouse
       environment:
         CLICKHOUSE_DB: cs_sif_analytics
         CLICKHOUSE_USER: cs_sif
         CLICKHOUSE_PASSWORD: password
       ports:
         - '8123:8123'
         - '9000:9000'
       volumes:
         - clickhouse_data:/var/lib/clickhouse

   volumes:
     postgres_data:
     mongo_data:
     redis_data:
     clickhouse_data:
   ```

   Then start all services with:

   ```bash
   docker-compose up -d
   ```

6. **Update Environment Variables**

   Add the following to your `.env` file to connect to these databases:

   ```env
   # Database Configuration
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=cs_sif
   POSTGRES_PASSWORD=password
   POSTGRES_DB=credential_hub

   MONGODB_URI=mongodb://cs_sif:password@localhost:27017/policy_engine

   REDIS_HOST=localhost
   REDIS_PORT=6379

   CLICKHOUSE_HOST=localhost
   CLICKHOUSE_PORT=8123
   CLICKHOUSE_USER=cs_sif
   CLICKHOUSE_PASSWORD=password
   CLICKHOUSE_DB=cs_sif_analytics
   ```

## Basic Usage

### 1. Creating a DID

```typescript
import { DIDGateway, DIDMethod } from '@cs-sif/did-gateway';
import { WalletKit, KeyType } from '@cs-sif/wallet-kit';

async function createDID() {
  // Initialize wallet
  const wallet = new WalletKit({
    storageOptions: {
      secureStorage: true,
      backupEnabled: true,
    },
  });

  // Generate a key pair
  const keyPair = await wallet.generateKey(KeyType.SECP256K1);

  // Create DID Gateway instance
  const gateway = new DIDGateway();

  // Create a DID document
  const document = {
    verificationMethod: [
      {
        id: '#key-1',
        type: 'EcdsaSecp256k1VerificationKey2019',
        controller: '#id',
        publicKeyJwk: JSON.parse(await wallet.exportKey(keyPair.id, 'JWK')),
      },
    ],
  };

  // Create the DID
  const result = await gateway.create(DIDMethod.ION, document);
  console.log('Created DID:', result.didDocument?.id);
}
```

### 2. Issuing a Credential

```typescript
import { CredentialHub } from '@cs-sif/credential-hub';
import { PolicyCompiler } from '@cs-sif/policy-utils';

async function issueCredential() {
  // Initialize services
  const credentialHub = new CredentialHub('http://localhost:8001');
  const policyCompiler = new PolicyCompiler();

  // Define a policy
  const policy = {
    id: 'credential-access',
    rules: [
      {
        and: [
          { '>=': [{ var: 'requester.trustLevel' }, 3] },
          { in: [{ var: 'requester.purpose' }, ['verification', 'audit']] },
        ],
      },
    ],
  };

  // Compile the policy
  const compiledPolicy = await policyCompiler.compile(policy);

  // Issue a credential
  const credential = await credentialHub.issue({
    issuer: 'did:ion:example',
    subject: 'did:ion:subject',
    claims: {
      name: 'John Doe',
      age: 30,
      role: 'developer',
    },
    policy: compiledPolicy.rego,
  });

  console.log('Issued credential:', credential);
}
```

### 3. Using Hardware Wallets

```typescript
import { XrplDriver } from '@cs-sif/did-gateway';
import { LedgerAdapter } from '@cs-sif/wallet-kit/adapters/ledger';

async function useLedgerWallet() {
  // Create a Ledger adapter
  const walletAdapter = new LedgerAdapter({
    accountIndex: 0,
    derivationPath: "m/44'/144'/0'/0/0",
  });

  // Create an XRPL DID driver
  const driver = new XrplDriver('wss://xrplcluster.com', walletAdapter);

  try {
    // Connect to the Ledger device
    console.log('Please connect your Ledger device...');
    await walletAdapter.connect();

    // Get the address
    const address = await walletAdapter.getAddress();
    console.log('Connected to address:', address);

    // Create a DID
    const result = await driver.create({
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${address}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    });

    console.log('Created DID:', result.didDocument?.id);
  } finally {
    await walletAdapter.disconnect();
  }
}
```

## Common Use Cases

### 1. Cross-Chain Identity Management

```typescript
import { DIDGateway, DIDMethod } from '@cs-sif/did-gateway';

async function manageCrossChainIdentity() {
  const gateway = new DIDGateway();

  // Create DIDs on different chains
  const ionDid = await gateway.create(DIDMethod.ION, {
    // ION DID document
  });

  const polygonDid = await gateway.create(DIDMethod.POLYGON, {
    // Polygon DID document
  });

  const xrplDid = await gateway.create(DIDMethod.XRPL, {
    // XRPL DID document
  });

  // Link DIDs across chains
  await gateway.linkDIDs(ionDid.didDocument?.id, polygonDid.didDocument?.id);
  await gateway.linkDIDs(polygonDid.didDocument?.id, xrplDid.didDocument?.id);
}
```

### 2. Policy-Based Access Control

```typescript
import { PolicyEngine } from '@cs-sif/policy-engine';
import { PolicyCompiler } from '@cs-sif/policy-utils';

async function implementAccessControl() {
  const policyEngine = new PolicyEngine('http://localhost:8001');
  const compiler = new PolicyCompiler();

  // Define a complex policy
  const policy = {
    id: 'data-access',
    rules: [
      {
        and: [
          { '>=': [{ var: 'user.trustLevel' }, 4] },
          { in: [{ var: 'user.role' }, ['admin', 'manager']] },
          {
            or: [
              { '==': [{ var: 'resource.type' }, 'sensitive'] },
              { '==': [{ var: 'resource.type' }, 'confidential'] },
            ],
          },
        ],
      },
    ],
  };

  // Compile and register the policy
  const compiledPolicy = await compiler.compile(policy);
  await policyEngine.registerPolicy(compiledPolicy);

  // Evaluate access
  const decision = await policyEngine.evaluate('data-access', {
    user: {
      trustLevel: 5,
      role: 'admin',
    },
    resource: {
      type: 'sensitive',
      id: 'resource-123',
    },
  });

  console.log('Access granted:', decision.allowed);
}
```

### 3. Zero-Knowledge Proofs

```typescript
import { CredentialHub } from '@cs-sif/credential-hub';

async function useZeroKnowledgeProofs() {
  const credentialHub = new CredentialHub('http://localhost:8001');

  // Generate a zero-knowledge proof
  const proof = await credentialHub.generateProof({
    credential: 'credential-123',
    reveal: ['name', 'role'], // Only reveal these attributes
    nonce: 'random-nonce',
  });

  // Verify the proof
  const verified = await credentialHub.verifyProof(proof);
  console.log('Proof verified:', verified);
}
```

## Testing

### 1. Run Unit Tests

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm test --filter @cs-sif/did-gateway
```

### 2. Run Integration Tests

```bash
# Start test services
pnpm test:services

# Run integration tests
pnpm test:integration
```

## Troubleshooting

### Common Issues

1. **Wallet Connection Issues**

   - Ensure hardware wallet is connected and unlocked
   - Check if the correct app is open on the device
   - Verify WebUSB permissions in the browser

2. **Service Connection Issues**

   - Check if all services are running
   - Verify environment variables
   - Check network connectivity
   - Review service logs

3. **Policy Evaluation Errors**

   - Verify policy syntax
   - Check input data format
   - Review policy engine logs
   - Validate policy compilation

4. **ClickHouse Configuration**

   - Ensure ClickHouse is running with the correct credentials
   - Create a `.env` file in the credential-hub service directory with the following:
     ```
     CLICKHOUSE_HOST=localhost
     CLICKHOUSE_PORT=8123
     CLICKHOUSE_USER=cs_sif
     CLICKHOUSE_PASSWORD=password
     CLICKHOUSE_DATABASE=cs_sif_analytics
     ```
   - Create the required database and tables:

     ```sql
     CREATE DATABASE IF NOT EXISTS cs_sif_analytics;

     CREATE TABLE IF NOT EXISTS cs_sif_analytics.credential_events (
       event_type String,
       credential_id String,
       subject_id String,
       issuer_id String,
       timestamp DateTime,
       result String,
       details String,
       metadata String
     ) ENGINE = MergeTree()
     ORDER BY (event_type, timestamp);
     ```

5. **Datetime Handling Issues**
   - When verifying credentials, ensure datetime formats are consistent
   - The system handles both offset-aware (with timezone) and offset-naive (without timezone) datetime formats
   - If you encounter "can't compare offset-naive and offset-aware datetimes" errors, check your datetime formats in credential expiration dates

### Getting Help

- Check the [Documentation](DOCS.md)
- Open an [issue](https://github.com/vagabond-cloud/Vagabond-Fuse/issues)
- Contact support at support@cs-sif.org

## Next Steps

1. Explore the [Documentation](DOCS.md) for detailed information
2. Check out the [examples](examples/) directory for more use cases
3. Join our community for support and updates
4. Contribute to the project by submitting pull requests

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and standards
- Development workflow
- Testing requirements
- Pull request process

## License

Vagabond-Fuse is licensed under the [MIT License](LICENSE.md).

## XRPL Token Payment

The platform now supports XRPL token payments for service fees. This allows users to pay for DID operations using custom XRPL tokens.

### Token Configuration

To configure the token for fee payments:

```typescript
const tokenConfig = {
  currency: 'VGB', // VGB token currency code
  issuer: 'rhcyBrowwApgNonehKBj8Po5z4gTyRknaU', // VGB token issuer address
  minFeeAmount: '1', // Minimum fee amount
};
```

### Fee Configuration

The fee service can be configured with different fee amounts for various operations:

```typescript
const feeConfig = {
  createFee: '10', // Fee for creating a DID
  updateFee: '5', // Fee for updating a DID
  resolveFee: '0', // Fee for resolving a DID (free)
  deactivateFee: '2', // Fee for deactivating a DID
  feeRecipient: 'rFeeRecipientAddress', // Fee recipient address
};
```

### Integration with XRPL Driver

```typescript
// Initialize wallet adapter
const xummAdapter = new XummAdapter({
  apiKey: 'YOUR_XUMM_API_KEY',
  apiSecret: 'YOUR_XUMM_API_SECRET',
});

// Connect to wallet
await xummAdapter.connect();

// Get wallet address
const walletAddress = await xummAdapter.getAddress();

// Initialize XRPL driver with fee configuration
const xrplDriver = new XrplDriver(
  'wss://xrplcluster.com', // XRPL network
  xummAdapter,
  {
    tokenConfig: {
      currency: 'VGB', // VGB token currency code
      issuer: 'rhcyBrowwApgNonehKBj8Po5z4gTyRknaU', // VGB token issuer address
      minFeeAmount: '1', // Minimum fee amount
    },
    feeRecipient: walletAddress, // Fee recipient address
  }
);

// Create a DID (fee will be automatically charged)
const didDocument = {
  '@context': ['https://www.w3.org/ns/did/v1'],
  service: [
    {
      id: '#service-1',
      type: 'LinkedDomains',
      serviceEndpoint: 'https://example.com',
    },
  ],
};

const createResult = await xrplDriver.create(didDocument);
```

### Example

See the full example in [examples/xrpl-token-payment-example.ts](examples/xrpl-token-payment-example.ts).
