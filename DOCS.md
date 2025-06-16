# Fuse: Cross-Chain Self-Sovereign Identity Fabric

## Overview

Fuse (Cross-Chain Self-Sovereign Identity Fabric) is a comprehensive framework for self-sovereign identity management across multiple blockchains. The project consists of several integrated components that work together to provide a complete identity solution, enabling users to maintain control over their digital identities while ensuring interoperability across different blockchain networks.

### Key Features

1. **Cross-Chain Identity Management**

   - Support for multiple blockchain networks (Bitcoin, Ethereum, XRPL)
     - Bitcoin: Leveraging the Sidetree protocol for scalable DID operations
     - Ethereum: Utilizing smart contracts for DID management
     - XRPL: Native integration with XRP Ledger's transaction system
   - Method-agnostic DID operations
     - Unified API for all supported DID methods
     - Consistent error handling and response formats
     - Seamless switching between different blockchain networks
   - Seamless integration with existing blockchain infrastructure
     - Support for popular blockchain networks
     - Compatibility with existing identity systems
     - Easy migration from legacy systems

2. **Secure Key Management**

   - Hardware wallet support (Ledger, Xumm)
     - Direct integration with Ledger hardware wallets
     - Mobile wallet support through Xumm
     - Secure key storage and backup options
   - Secure key storage and backup
     - Encrypted key storage
     - Backup and recovery mechanisms
     - Key rotation policies
   - Cross-platform compatibility (Web, Mobile)
     - Web browser support
     - Mobile app integration
     - Desktop application support

3. **Advanced Policy Engine**

   - JSON Logic to Rego compilation
     - High-level policy definition
     - Automated compilation to Rego
     - Policy optimization
   - WASM-based policy evaluation
     - Fast policy execution
     - Secure evaluation environment
     - Cross-platform compatibility
   - GDPR and regulatory compliance support
     - Built-in compliance templates
     - Audit logging
     - Privacy-preserving features

4. **Verifiable Credentials**

   - Zero-knowledge proof support
     - Selective disclosure
     - Privacy-preserving verification
     - Efficient proof generation
   - Selective disclosure capabilities
     - Fine-grained access control
     - Privacy-preserving sharing
     - Attribute-based verification
   - Credential revocation and status tracking
     - Real-time revocation checks
     - Status monitoring
     - Audit trail generation

5. **Enterprise Integration**
   - RESTful APIs for all services
     - Comprehensive API documentation
     - OpenAPI/Swagger support
     - Rate limiting and monitoring
   - Comprehensive SDK support
     - TypeScript SDK
     - Python SDK
     - Mobile SDKs
   - Extensive documentation and examples
     - Getting started guides
     - API reference
     - Best practices

### Architecture Overview

The Fuse framework is built on a modular architecture that enables:

1. **Flexible Deployment**

   - Microservices-based design
     - Independent scaling
     - Service isolation
     - Easy maintenance
   - Containerized components
     - Docker support
     - Kubernetes deployment
     - Cloud-native architecture
   - Scalable infrastructure
     - Horizontal scaling
     - Load balancing
     - High availability

2. **Security First**

   - End-to-end encryption
     - Data in transit
     - Data at rest
     - Key management
   - Hardware security module (HSM) support
     - Secure key storage
     - Hardware acceleration
     - Compliance requirements
   - Regular security audits
     - Code reviews
     - Penetration testing
     - Vulnerability scanning

3. **Developer Experience**

   - TypeScript and Python SDKs
     - Type safety
     - Comprehensive documentation
     - Example code
   - Comprehensive documentation
     - API reference
     - Architecture guides
     - Best practices
   - Extensive test coverage
     - Unit tests
     - Integration tests
     - Performance tests

4. **Interoperability**
   - W3C DID standards compliance
     - DID Core specification
     - DID Resolution
     - DID Document format
   - Verifiable Credentials data model
     - W3C VC standard
     - JSON-LD support
     - Schema validation
   - Open Policy Agent integration
     - Policy evaluation
     - Access control
     - Compliance checking

## Repository Structure

The Fuse project is organized into several key directories, each containing specific components of the framework. This structure enables modular development, clear separation of concerns, and easy maintenance of the codebase.

### TypeScript Packages (`packages/`)

1. **Wallet Kit** (`wallet-kit/`)

   - Secure key management and storage
     - Hardware security module (HSM) integration
     - Encrypted key storage
     - Key backup and recovery
     - Key rotation policies
   - Hardware wallet integration (Ledger, Xumm)
     - Direct device communication
     - Transaction signing
     - Address management
     - Connection handling
   - Cross-platform support (Web, React Native)
     - Browser compatibility
     - Mobile app integration
     - Desktop application support
     - Platform-specific optimizations
   - WASM-based cryptographic operations
     - Fast cryptographic computations
     - Secure execution environment
     - Cross-platform compatibility
     - Memory-efficient operations
   - Key backup and recovery mechanisms
     - Encrypted backups
     - Recovery phrases
     - Multi-device sync
     - Backup verification

2. **DID Gateway** (`did-gateway/`)

   - Method-agnostic DID operations
     - Unified API for all DID methods
     - Consistent error handling
     - Cross-method compatibility
     - Method-specific optimizations
   - Support for multiple DID methods:
     - `did:ion` (Sidetree on Bitcoin)
       - Scalable DID operations
       - Cost-effective updates
       - High throughput
     - `did:polygon` (Ethereum-based)
       - Smart contract integration
       - Low transaction costs
       - Fast confirmations
     - `did:xrpl` (XRP Ledger)
       - Native transaction support
       - Multi-signature capabilities
       - Efficient storage
   - DID document management
     - Document creation and updates
     - Version control
     - Conflict resolution
     - Document validation
   - Resolution and verification services
     - DID resolution
     - Document verification
     - Key verification
     - Service endpoint validation

3. **Policy Utils** (`policy-utils/`)
   - JSON Logic to Rego compilation
     - High-level policy definition
     - Automated compilation
     - Policy optimization
     - Validation checks
   - Policy evaluation engine
     - Real-time evaluation
     - Batch processing
     - Performance optimization
     - Caching mechanisms
   - WASM-based policy execution
     - Fast execution
     - Secure environment
     - Cross-platform support
     - Memory efficiency
   - GDPR and compliance templates
     - Built-in compliance rules
     - Custom rule creation
     - Audit logging
     - Compliance reporting
   - Policy validation and testing tools
     - Syntax validation
     - Semantic checking
     - Test case generation
     - Coverage analysis

### Python Services (`services/`)

1. **Credential Hub** (`credential-hub/`)

   - FastAPI-based credential service
     - RESTful API endpoints
     - WebSocket support
     - Async operations
     - Rate limiting
   - Zero-knowledge proof generation
     - Proof creation
     - Verification
     - Optimization
     - Privacy-preserving features
   - Credential lifecycle management
     - Issuance
     - Verification
     - Revocation
     - Status tracking
   - Selective disclosure capabilities
     - Attribute selection
     - Privacy-preserving sharing
     - Minimized data exposure
     - Consent management
   - ClickHouse integration for analytics
     - Event tracking
     - Usage metrics
     - Performance monitoring
     - Audit logging
   - Credential verification with datetime handling
     - Support for both offset-aware and offset-naive datetime formats
     - Automatic timezone normalization for expiration date checks
     - Robust error handling for datetime comparison issues
     - Consistent verification results regardless of datetime format

## Configuration

### Credential Hub Configuration

The Credential Hub service requires proper configuration to connect to ClickHouse for event tracking and analytics:

#### Environment Variables

Create a `.env` file in the `services/credential-hub` directory with the following variables:

```env
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=cs_sif
CLICKHOUSE_PASSWORD=password
CLICKHOUSE_DATABASE=cs_sif_analytics
```

#### ClickHouse Setup

Ensure ClickHouse is properly set up with the required database and tables:

```sql
-- Create the analytics database
CREATE DATABASE IF NOT EXISTS cs_sif_analytics;

-- Create the credential events table
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

#### Starting the Service

You can start the Credential Hub service with the correct environment variables using the provided script:

```bash
# From the examples directory
./start-credential-hub.sh
```

This script loads the environment variables and starts the service with the proper configuration.

#### Event Tracking

The Credential Hub service tracks the following credential events in ClickHouse:

- **Issue**: When a new credential is issued
- **Verify**: When a credential is verified
- **Revoke**: When a credential is revoked
- **Generate Proof**: When a zero-knowledge proof is generated
- **Verify Proof**: When a proof is verified

Each event includes metadata such as the credential ID, subject ID, issuer ID, timestamp, result (success/failure), and additional details.

2. **Policy Engine** (`policy-engine/`)
   - FastAPI service for policy execution
     - RESTful API
     - WebSocket support
     - Async operations
     - Rate limiting
   - OPA WASM integration
     - Policy evaluation
     - Access control
     - Compliance checking
     - Performance optimization
   - Policy management and versioning
     - Version control
     - Update handling
     - Rollback support
     - Conflict resolution
   - Real-time policy evaluation
     - Fast execution
     - Batch processing
     - Caching
     - Performance monitoring
   - Compliance rule templates
     - Built-in rules
     - Custom rules
     - Rule validation
     - Documentation
   - Policy decision logging
     - Audit trails
     - Performance metrics
     - Error tracking
     - Compliance reports

### Examples (`examples/`)

The examples directory contains comprehensive sample code demonstrating:

1. **Basic Usage**

   - DID creation and management
     - Creation workflows
     - Update processes
     - Deactivation
     - Resolution
   - Wallet operations
     - Key generation
     - Transaction signing
     - Address management
     - Backup/restore
   - Policy definition and evaluation
     - Policy creation
     - Rule definition
     - Evaluation
     - Testing
   - Credential issuance and verification
     - Issuance workflow
     - Verification process
     - Revocation
     - Status checking

2. **Integration Examples**

   - End-to-end workflows
     - Complete scenarios
     - Best practices
     - Error handling
     - Performance optimization
   - Cross-component interactions
     - Service communication
     - Data flow
     - State management
     - Error handling
   - Real-world use cases
     - Common scenarios
     - Industry examples
     - Best practices
     - Performance considerations
   - Best practices implementation
     - Code organization
     - Error handling
     - Testing
     - Documentation

3. **Advanced Features**
   - Hardware wallet integration
     - Device communication
     - Transaction signing
     - Error handling
     - User interaction
   - Zero-knowledge proofs
     - Proof generation
     - Verification
     - Optimization
     - Privacy preservation
   - Complex policy scenarios
     - Advanced rules
     - Performance optimization
     - Testing
     - Documentation
   - Performance optimization
     - Caching strategies
     - Batch processing
     - Resource management
     - Monitoring

Each example includes:

- Detailed comments and documentation
  - Code explanation
  - Usage instructions
  - Best practices
  - Common pitfalls
- Error handling patterns
  - Error types
  - Recovery strategies
  - User feedback
  - Logging
- Testing scenarios
  - Unit tests
  - Integration tests
  - Performance tests
  - Edge cases
- Performance considerations
  - Optimization techniques
  - Resource usage
  - Scalability
  - Monitoring

## Core Components

The Fuse framework consists of five core components that work together to provide a complete self-sovereign identity solution:

### 1. DID Gateway

The DID Gateway provides a method-agnostic interface for managing Decentralized Identifiers (DIDs) across multiple blockchain networks. It serves as the central component for DID operations in the Fuse framework.

#### Supported DID Methods

1. **ION DID Method** (`did:ion`)

   - Built on Bitcoin's Sidetree protocol
   - Provides scalable DID operations
   - Supports high-throughput DID creation
   - Enables cost-effective updates

2. **Polygon DID Method** (`did:polygon`)

   - Ethereum-based implementation
   - Low transaction costs
   - Fast confirmation times
   - EVM compatibility

3. **XRPL DID Method** (`did:xrpl`)
   - XRP Ledger integration
   - Built-in transaction support
   - Native multi-signature capabilities
   - Efficient storage options

#### Key Features

1. **Method-Agnostic API**

   - Unified interface for all DID methods
   - Consistent error handling
   - Standardized response formats
   - Cross-method compatibility

2. **Blockchain Integration**

   - Direct blockchain interaction
   - Transaction management
   - Network monitoring
   - Fee estimation

3. **Wallet Integration**

   - Hardware wallet support
   - Software wallet compatibility
   - Key management integration
   - Transaction signing

4. **Error Handling**
   - Comprehensive error types
   - Detailed error messages
   - Recovery suggestions
   - Transaction status tracking

#### Usage Example

```typescript
import { DIDGateway, DIDMethod } from '@fuse/did-gateway';

// Create a new DID Gateway instance
const gateway = new DIDGateway();

// Create a new DID with XRPL method
const createResult = await gateway.create(DIDMethod.XRPL, {
  verificationMethod: [
    {
      id: '#key-1',
      type: 'Ed25519VerificationKey2020',
      controller: 'did:xrpl:rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
    },
  ],
});

// Resolve the created DID
const resolutionResult = await gateway.resolve(createResult.didDocument?.id);

// Update the DID document
const updateResult = await gateway.update(
  createResult.didDocument?.id,
  {
    service: [
      {
        id: '#service-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://example.com',
      },
    ],
  },
  privateKey
);

// Deactivate the DID
const deactivateResult = await gateway.deactivate(
  createResult.didDocument?.id,
  privateKey
);
```

### 2. Wallet Kit

The Wallet Kit provides a unified interface for key management, signing operations, and wallet integration across different platforms. It serves as the security foundation for the Fuse framework.

#### Key Features

1. **Secure Key Management**

   - Hardware security module (HSM) support
   - Secure key storage
   - Key backup and recovery
   - Key rotation policies

2. **Multiple Key Types**

   - SECP256K1 (Bitcoin, Ethereum)
   - Ed25519 (XRPL, Solana)
   - RSA (Legacy systems)
   - Custom key type support

3. **Wallet Integration**

   - Hardware wallets (Ledger)
   - Mobile wallets (Xumm)
   - Browser extensions
   - Custom wallet support

4. **Cross-Platform Support**
   - Web applications
   - React Native mobile apps
   - Node.js services
   - Browser extensions

#### Usage Example

```typescript
import { WalletKit, KeyType, KeyFormat } from '@fuse/wallet-kit';

// Create a wallet with secure storage options
const wallet = new WalletKit({
  storageOptions: {
    secureStorage: true,
    biometricProtection: true,
    backupEnabled: true,
    backupLocation: 'secure://backup',
    encryptionKey: 'your-encryption-key',
  },
});

// Generate a new key pair
const keyPair = await wallet.generateKey(KeyType.SECP256K1, {
  label: 'My Key',
  tags: ['primary', 'signing'],
  metadata: {
    created: new Date().toISOString(),
    purpose: 'signing',
  },
});

// Sign data with the generated key
const signature = await wallet.sign(
  new TextEncoder().encode('Hello, World!'),
  keyPair.id,
  {
    algorithm: 'ECDSA',
    encoding: 'hex',
  }
);

// Export the key in different formats
const jwk = await wallet.exportKey(keyPair.id, KeyFormat.JWK);
const hex = await wallet.exportKey(keyPair.id, KeyFormat.HEX);
const base64 = await wallet.exportKey(keyPair.id, KeyFormat.BASE64);

// List all keys in the wallet
const keys = await wallet.listKeys();
console.log('Available keys:', keys);

// Delete a key
const deleted = await wallet.deleteKey(keyPair.id);
console.log('Key deleted:', deleted);
```

### 3. Policy Utils

The Policy Utils package provides tools for defining, compiling, and evaluating access control policies using JSON Logic, which can be compiled to Rego code for use with Open Policy Agent (OPA).

#### Key Features

1. **Policy Definition**

   - JSON Logic syntax
   - Policy templates
   - Rule composition
   - Policy versioning

2. **Policy Compilation**

   - JSON Logic to Rego conversion
   - WASM module generation
   - Policy optimization
   - Validation checks

3. **Policy Evaluation**

   - Real-time evaluation
   - Batch processing
   - Decision logging
   - Performance metrics

4. **Compliance Support**
   - GDPR templates
   - Industry standards
   - Custom compliance rules
   - Audit trails

#### Usage Example

```typescript
import { PolicyCompiler } from '@fuse/policy-utils';

// Create a policy compiler
const compiler = new PolicyCompiler({
  optimizationLevel: 'high',
  enableLogging: true,
  cacheSize: 1000,
});

// Define a policy
const policy = {
  id: 'data-access-policy',
  name: 'Data Access Policy',
  description: 'Controls access to sensitive data',
  version: '1.0.0',
  rules: [
    {
      // JSON Logic rule
      and: [
        { '>=': [{ var: 'user.age' }, 18] },
        { in: [{ var: 'user.role' }, ['admin', 'manager']] },
        {
          or: [
            { '==': [{ var: 'user.department' }, 'IT'] },
            { '==': [{ var: 'user.department' }, 'Security'] },
          ],
        },
      ],
    },
  ],
  metadata: {
    created: new Date().toISOString(),
    author: 'System Admin',
    tags: ['access-control', 'data-protection'],
  },
};

// Compile the policy to Rego
const compilationResult = await compiler.compile(policy, {
  target: 'rego',
  format: 'wasm',
  optimization: true,
});

// Evaluate the policy against input data
const evaluationResult = await compiler.evaluate(policy, {
  user: {
    age: 25,
    role: 'admin',
    department: 'IT',
    permissions: ['read', 'write'],
  },
  context: {
    time: new Date().toISOString(),
    ip: '192.168.1.1',
    device: 'mobile',
  },
});

// Get policy statistics
const stats = await compiler.getStats();
console.log('Policy statistics:', stats);
```

### 4. Credential Hub

The Credential Hub service manages verifiable credentials, including issuance, verification, and revocation, with support for zero-knowledge proofs.

#### Key Features

1. **Credential Management**

   - Issuance workflow
   - Verification process
   - Revocation handling
   - Status tracking

2. **Zero-Knowledge Proofs**

   - Proof generation
   - Proof verification
   - Selective disclosure
   - Privacy preservation

3. **Credential Storage**

   - Secure storage
   - Version control
   - Backup and recovery
   - Access control

4. **Analytics and Monitoring**
   - Usage statistics
   - Performance metrics
   - Audit logs
   - Compliance reports

#### API Endpoints

1. **Credential Operations**

   - `POST /credentials/issue`: Issue new credentials
   - `POST /credentials/verify`: Verify credentials
   - `POST /credentials/revoke`: Revoke credentials
   - `GET /credentials/status/{id}`: Check status

2. **Proof Operations**

   - `POST /proofs/generate`: Generate ZK proofs
   - `POST /proofs/verify`: Verify ZK proofs
   - `GET /proofs/status/{id}`: Check proof status

3. **Management Operations**
   - `GET /stats`: Get statistics
   - `GET /audit`: Get audit logs
   - `POST /backup`: Create backup
   - `POST /restore`: Restore from backup

### 5. Policy Engine

The Policy Engine service evaluates access control policies against input data using OPA WASM for secure, efficient policy evaluation.

#### Key Features

1. **Policy Management**

   - Policy registration
   - Version control
   - Update handling
   - Deletion management

2. **Policy Evaluation**

   - Real-time evaluation
   - Batch processing
   - Decision logging
   - Performance optimization

3. **Compliance Support**

   - GDPR compliance
   - Industry standards
   - Custom rules
   - Audit trails

4. **Integration Features**
   - REST API
   - WebSocket support
   - Event streaming
   - Monitoring hooks

#### API Endpoints

1. **Policy Operations**

   - `POST /policies`: Create policy
   - `GET /policies`: List policies
   - `GET /policies/{id}`: Get policy
   - `PUT /policies/{id}`: Update policy
   - `DELETE /policies/{id}`: Delete policy

2. **Evaluation Operations**

   - `POST /policies/{id}/evaluate`: Evaluate policy
   - `POST /policies/batch-evaluate`: Batch evaluation
   - `GET /policies/{id}/decisions`: Get decisions
   - `GET /policies/{id}/stats`: Get statistics

3. **Management Operations**
   - `GET /stats`: Get engine statistics
   - `GET /audit`: Get audit logs
   - `POST /backup`: Create backup
   - `POST /restore`: Restore from backup

## Wallet Adapter System

The Wallet Adapter system provides a standardized interface for connecting different types of wallets to the Fuse DID Gateway. This enables the DID Gateway to work with various wallet providers through a consistent API, following the "bring-your-own-wallet" pattern.

### Architecture

#### Core Components

1. **WalletAdapter Interface**

   - Base interface for all wallet adapters
   - Standardized method signatures
   - Type-safe implementation
   - Error handling patterns

2. **Wallet-specific Adapters**

   - Xumm mobile wallet adapter
   - Ledger hardware wallet adapter
   - Browser extension adapters
   - Custom wallet implementations

3. **XRPL DID Driver Integration**
   - Direct wallet adapter support
   - Transaction signing integration
   - Address validation
   - Network interaction

#### Interface Hierarchy

```
WalletInterface (Base)
    ↑
WalletAdapter (XRPL-specific)
    ↑
XummAdapter, LedgerAdapter, etc.
```

### WalletAdapter Interface

The `WalletAdapter` interface extends the base `WalletInterface` with XRPL-specific functionality:

```typescript
export interface WalletAdapter extends WalletInterface {
  // Get the XRPL address associated with this wallet
  getAddress(): Promise<string>;

  // Sign an XRPL transaction
  signTransaction(transaction: XrplTransaction): Promise<string>;

  // Submit a signed transaction to the XRPL
  submitTransaction(txBlob: string): Promise<XrplTransactionResult>;

  // Connect to the wallet
  connect(): Promise<boolean>;

  // Disconnect from the wallet
  disconnect(): Promise<void>;

  // Check if the wallet is connected
  isConnected(): Promise<boolean>;
}
```

The base `WalletInterface` provides key management functionality:

```typescript
export interface WalletInterface {
  // Generate a new key pair
  generateKey(type: KeyType): Promise<KeyPair>;

  // Sign data with a specific key
  sign(data: Uint8Array, keyId: string): Promise<SignatureResult>;

  // Verify a signature
  verify(
    data: Uint8Array,
    signature: string,
    publicKey: string,
    keyType: KeyType
  ): Promise<boolean>;

  // Export a key in a specific format
  exportKey(keyId: string, format: KeyFormat): Promise<string>;

  // Import a key from external source
  importKey(key: string, type: KeyType, format: KeyFormat): Promise<string>;

  // List all available keys
  listKeys(): Promise<string[]>;

  // Delete a specific key
  deleteKey(keyId: string): Promise<boolean>;
}
```

### Implemented Adapters

#### 1. Xumm Adapter

The Xumm adapter provides integration with the Xumm mobile wallet for XRPL.

##### Configuration

```typescript
export interface XummAdapterConfig {
  // Xumm API credentials
  apiKey: string;
  apiSecret: string;

  // Optional configuration
  network?: 'mainnet' | 'testnet';
  timeout?: number;
  retryAttempts?: number;
  debug?: boolean;
}
```

##### Implementation Details

1. **SDK Integration**

   - Uses `xumm-sdk` package
   - Handles API authentication
   - Manages WebSocket connections
   - Implements retry logic

2. **Sign-in Flow**

   - QR code generation
   - Mobile app deep linking
   - Connection state management
   - Session persistence

3. **Transaction Management**

   - Transaction preparation
   - Signing request handling
   - Status monitoring
   - Error recovery

4. **Network Interaction**
   - XRPL node connection
   - Transaction submission
   - Status verification
   - Fee estimation

##### Key Methods

1. **Connection Management**

   ```typescript
   async connect(): Promise<boolean> {
     // Initialize SDK
     // Generate sign-in request
     // Handle user approval
     // Store session
   }

   async disconnect(): Promise<void> {
     // Clear session
     // Close connections
     // Reset state
   }
   ```

2. **Transaction Handling**

   ```typescript
   async signTransaction(transaction: XrplTransaction): Promise<string> {
     // Validate transaction
     // Create signing request
     // Handle user approval
     // Return signed transaction
   }

   async submitTransaction(txBlob: string): Promise<XrplTransactionResult> {
     // Submit to XRPL
     // Monitor status
     // Handle errors
     // Return result
   }
   ```

##### Limitations

1. **Key Management**

   - No direct key generation
   - Limited key export options
   - No key import support
   - Restricted key operations

2. **User Interaction**
   - Requires mobile app
   - Needs user approval
   - Limited automation
   - Session timeouts

#### 2. Ledger Adapter

The Ledger adapter provides integration with Ledger hardware wallets via WebUSB.

##### Configuration

```typescript
export interface LedgerAdapterConfig {
  // Account configuration
  accountIndex?: number;
  derivationPath?: string;

  // Optional settings
  timeout?: number;
  debug?: boolean;
  autoConnect?: boolean;
}
```

##### Implementation Details

1. **Device Communication**

   - WebUSB transport
   - APDU command handling
   - Connection management
   - Error recovery

2. **Key Management**

   - Public key derivation
   - Address generation
   - Key verification
   - Path management

3. **Transaction Handling**

   - Transaction preparation
   - Device signing
   - Status monitoring
   - Error handling

4. **Security Features**
   - Device verification
   - PIN protection
   - Transaction confirmation
   - Secure channel

##### Key Methods

1. **Device Management**

   ```typescript
   async connect(): Promise<boolean> {
     // Request device
     // Open connection
     // Verify app
     // Initialize state
   }

   async getPublicKey(): Promise<string> {
     // Derive public key
     // Format address
     // Cache result
     // Return address
   }
   ```

2. **Transaction Operations**

   ```typescript
   async signTransaction(transaction: XrplTransaction): Promise<string> {
     // Prepare transaction
     // Send to device
     // Get signature
     // Return result
   }

   async signWithLedger(data: Buffer): Promise<string> {
     // Format data
     // Send to device
     // Get signature
     // Return result
   }
   ```

##### Limitations

1. **Device Requirements**

   - Physical device needed
   - XRPL app installed
   - WebUSB support
   - Secure context

2. **User Interaction**
   - Manual confirmation
   - Device connection
   - PIN entry
   - Transaction review

### Integration with XRPL DID Driver

The XRPL DID Driver has been updated to accept a wallet adapter for signing operations:

```typescript
export class XrplDriver {
  constructor(
    network: string = 'wss://xrplcluster.com',
    walletAdapter?: WalletAdapter
  ) {
    this.network = network;
    this.walletAdapter = walletAdapter || null;
  }

  // Methods to set/get the wallet adapter
  setWalletAdapter(adapter: WalletAdapter): void {
    this.walletAdapter = adapter;
  }

  getWalletAdapter(): WalletAdapter | null {
    return this.walletAdapter;
  }

  // DID operations that use the wallet adapter
  async create(
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    // Use wallet adapter if available
    if (this.walletAdapter) {
      return this.createWithWallet(document);
    }
    // Fall back to private key
    return this.createWithKey(document, privateKey);
  }

  async update(
    did: string,
    document: Partial<DIDDocument>,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    // Use wallet adapter if available
    if (this.walletAdapter) {
      return this.updateWithWallet(did, document);
    }
    // Fall back to private key
    return this.updateWithKey(did, document, privateKey);
  }

  async deactivate(
    did: string,
    privateKey?: string
  ): Promise<DIDResolutionResult> {
    // Use wallet adapter if available
    if (this.walletAdapter) {
      return this.deactivateWithWallet(did);
    }
    // Fall back to private key
    return this.deactivateWithKey(did, privateKey);
  }
}
```

#### DID Operations with Wallet Adapter

1. **Create Operation**

   - Generate DID document
   - Prepare transaction
   - Sign with wallet
   - Submit to network

2. **Update Operation**

   - Modify DID document
   - Create update transaction
   - Sign with wallet
   - Submit to network

3. **Deactivate Operation**
   - Prepare deactivation
   - Create transaction
   - Sign with wallet
   - Submit to network

### Creating a Custom Adapter

To create a custom wallet adapter:

1. **Directory Structure**

   ```
   packages/wallet-kit/adapters/<provider>/
   ├── index.ts
   ├── types.ts
   ├── constants.ts
   └── __tests__/
   ```

2. **Interface Implementation**

   ```typescript
   export class YourAdapter implements WalletAdapter {
     private connected = false;
     private config: YourAdapterConfig;
     private currentAddress?: string;

     constructor(config: YourAdapterConfig = {}) {
       this.config = {
         // Default configuration
         ...config,
       };
     }

     // Implement required methods
     async connect(): Promise<boolean> { ... }
     async disconnect(): Promise<void> { ... }
     async isConnected(): Promise<boolean> { ... }
     async getAddress(): Promise<string> { ... }
     async signTransaction(transaction: XrplTransaction): Promise<string> { ... }
     async submitTransaction(txBlob: string): Promise<XrplTransactionResult> { ... }

     // Implement or throw for WalletInterface methods
     async generateKey(type: KeyType): Promise<KeyPair> { ... }
     async sign(data: Uint8Array, keyId: string): Promise<SignatureResult> { ... }
     async verify(data: Uint8Array, signature: string, publicKey: string, keyType: KeyType): Promise<boolean> { ... }
     async exportKey(keyId: string, format: KeyFormat): Promise<string> { ... }
     async importKey(key: string, type: KeyType, format: KeyFormat): Promise<string> { ... }
     async listKeys(): Promise<string[]> { ... }
     async deleteKey(keyId: string): Promise<boolean> { ... }
   }
   ```

3. **Error Handling**

   ```typescript
   export class WalletAdapterError extends Error {
     constructor(message: string, public code: string, public details?: any) {
       super(message);
       this.name = 'WalletAdapterError';
     }
   }

   // Usage in adapter
   throw new WalletAdapterError(
     'Failed to connect to wallet',
     'CONNECTION_FAILED',
     { reason: 'timeout' }
   );
   ```

### Usage Examples

#### Using Xumm Wallet with XRPL DID Driver

```typescript
import { XrplDriver } from '@fuse/did-gateway';
import { XummAdapter } from '@fuse/wallet-kit/adapters/xumm';

async function createDidWithXumm() {
  // Create a wallet adapter
  const walletAdapter = new XummAdapter({
    apiKey: 'your-xumm-api-key',
    apiSecret: 'your-xumm-api-secret',
    network: 'mainnet',
    timeout: 30000,
  });

  // Create an XRPL DID driver with the wallet adapter
  const driver = new XrplDriver('wss://xrplcluster.com', walletAdapter);

  try {
    // Connect to the wallet
    console.log('Connecting to Xumm wallet...');
    const connected = await walletAdapter.connect();
    if (!connected) {
      throw new Error('Failed to connect to Xumm wallet');
    }

    // Get the user's address from the wallet
    const address = await walletAdapter.getAddress();
    console.log('Connected to wallet:', address);

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
    console.log('Creating DID...');
    const result = await driver.create(document);
    console.log('DID created:', result.didDocument?.id);

    // Disconnect when done
    await walletAdapter.disconnect();
    console.log('Disconnected from wallet');

    return result;
  } catch (error) {
    console.error('Error creating DID:', error);
    // Make sure to disconnect even if there's an error
    await walletAdapter.disconnect().catch(console.error);
    throw error;
  }
}
```

#### Using Ledger Hardware Wallet with XRPL DID Driver

```typescript
import { XrplDriver } from '@fuse/did-gateway';
import { LedgerAdapter } from '@fuse/wallet-kit/adapters/ledger';

async function createDidWithLedger() {
  // Create a wallet adapter for Ledger
  const walletAdapter = new LedgerAdapter({
    accountIndex: 0,
    derivationPath: "m/44'/144'/0'/0/0",
    timeout: 30000,
  });

  // Create an XRPL DID driver with the wallet adapter
  const driver = new XrplDriver('wss://xrplcluster.com', walletAdapter);

  try {
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
    console.log('Disconnected from Ledger');

    return result;
  } catch (error) {
    console.error('Error creating DID with Ledger:', error);
    // Make sure to disconnect even if there's an error
    await walletAdapter.disconnect().catch(console.error);
    throw error;
  }
}
```

#### Switching Between Multiple Wallet Adapters

```typescript
import { XrplDriver } from '@fuse/did-gateway';
import { XummAdapter } from '@fuse/wallet-kit/adapters/xumm';
import { LedgerAdapter } from '@fuse/wallet-kit/adapters/ledger';
import { WalletAdapter } from '@fuse/wallet-kit';

async function switchWalletAdapters() {
  // Create multiple wallet adapters
  const adapters: Record<string, WalletAdapter> = {
    xumm: new XummAdapter({
      apiKey: 'your-xumm-api-key',
      apiSecret: 'your-xumm-api-secret',
    }),
    ledger: new LedgerAdapter({
      accountIndex: 0,
    }),
  };

  // Create an XRPL DID driver
  const driver = new XrplDriver('wss://xrplcluster.com');

  try {
    // First use Xumm adapter
    console.log('Switching to Xumm wallet...');
    driver.setWalletAdapter(adapters.xumm);
    await adapters.xumm.connect();

    // Create a DID with Xumm
    const xummAddress = await adapters.xumm.getAddress();
    console.log('Xumm address:', xummAddress);
    const xummDocument = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${xummAddress}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    };

    const xummResult = await driver.create(xummDocument);
    console.log('DID created with Xumm:', xummResult.didDocument?.id);

    // Disconnect Xumm
    await adapters.xumm.disconnect();
    console.log('Disconnected from Xumm');

    // Switch to Ledger adapter
    console.log('Switching to Ledger wallet...');
    driver.setWalletAdapter(adapters.ledger);
    await adapters.ledger.connect();

    // Create a DID with Ledger
    const ledgerAddress = await adapters.ledger.getAddress();
    console.log('Ledger address:', ledgerAddress);
    const ledgerDocument = {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'Ed25519VerificationKey2020',
          controller: `did:xrpl:${ledgerAddress}`,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    };

    const ledgerResult = await driver.create(ledgerDocument);
    console.log('DID created with Ledger:', ledgerResult.didDocument?.id);

    // Disconnect Ledger
    await adapters.ledger.disconnect();
    console.log('Disconnected from Ledger');
  } catch (error) {
    console.error('Error switching wallet adapters:', error);
    // Make sure to disconnect all adapters
    await Promise.all(
      Object.values(adapters).map((adapter) =>
        adapter.disconnect().catch(console.error)
      )
    );
    throw error;
  }
}
```

### Testing Wallet Adapters

Wallet adapters should be tested with Jest:

1. **Test Directory Structure**

   ```
   packages/wallet-kit/adapters/<provider>/__tests__/
   ├── index.test.ts
   ├── connection.test.ts
   ├── transaction.test.ts
   └── __mocks__/
   ```

2. **Mock Implementation**

   ```typescript
   // __mocks__/your-wallet-sdk.ts
   export const mockWallet = {
     connect: jest.fn().mockResolvedValue({ address: 'rTestAddress' }),
     disconnect: jest.fn().mockResolvedValue(undefined),
     signTransaction: jest.fn().mockResolvedValue('signed_tx_blob'),
     submitTransaction: jest.fn().mockResolvedValue({
       hash: 'test_hash',
       ledger_index: 12345,
       meta: {},
       validated: true,
     }),
   };
   ```

3. **Test Implementation**

   ```typescript
   import { YourAdapter } from '../index';
   import { mockWallet } from './__mocks__/your-wallet-sdk';

   jest.mock('your-wallet-sdk', () => mockWallet);

   describe('YourAdapter', () => {
     let adapter: YourAdapter;

     beforeEach(() => {
       adapter = new YourAdapter({
         apiKey: 'test_api_key',
       });
       jest.clearAllMocks();
     });

     describe('connect', () => {
       it('should connect successfully', async () => {
         const result = await adapter.connect();
         expect(result).toBe(true);
         expect(await adapter.isConnected()).toBe(true);
         expect(mockWallet.connect).toHaveBeenCalled();
       });

       it('should handle connection errors', async () => {
         mockWallet.connect.mockRejectedValueOnce(
           new Error('Connection failed')
         );
         await expect(adapter.connect()).rejects.toThrow('Connection failed');
         expect(await adapter.isConnected()).toBe(false);
       });
     });

     describe('signTransaction', () => {
       it('should sign a transaction when connected', async () => {
         await adapter.connect();
         const transaction = {
           TransactionType: 'Payment',
           Account: 'rSomeAddress',
           Destination: 'rAnotherAddress',
           Amount: '1000000',
         };
         const result = await adapter.signTransaction(transaction);
         expect(result).toBe('signed_tx_blob');
         expect(mockWallet.signTransaction).toHaveBeenCalledWith(transaction);
       });

       it('should throw when not connected', async () => {
         const transaction = {
           TransactionType: 'Payment',
           Account: 'rSomeAddress',
           Destination: 'rAnotherAddress',
           Amount: '1000000',
         };
         await expect(adapter.signTransaction(transaction)).rejects.toThrow(
           'Wallet not connected'
         );
       });
     });
   });
   ```

### Best Practices

1. **Error Handling**

   - Use custom error types
   - Provide detailed error messages
   - Include recovery suggestions
   - Log error context

2. **Connection Management**

   - Verify connection status
   - Handle reconnection
   - Clean up resources
   - Monitor connection health

3. **Transaction Handling**

   - Validate transactions
   - Handle timeouts
   - Monitor status
   - Provide feedback

4. **Security**

   - Verify device/app
   - Validate addresses
   - Check signatures
   - Protect sensitive data

5. **User Experience**
   - Clear error messages
   - Progress feedback
   - Recovery options
   - Helpful instructions

### Limitations and Considerations

1. **External Dependencies**

   - SDK version compatibility
   - API changes
   - Network requirements
   - Platform support

2. **User Interaction**

   - Manual confirmation
   - Device connection
   - App installation
   - Network access

3. **Key Management**

   - Limited key operations
   - Export restrictions
   - Import limitations
   - Backup options

4. **Browser Compatibility**

   - WebUSB support
   - HTTPS requirement
   - Platform limitations
   - Mobile support

5. **Mobile Support**
   - App availability
   - Deep linking
   - Background operation
   - State management

### Future Enhancements

1. **Additional Adapters**

   - Browser extensions
   - Mobile wallets
   - Hardware wallets
   - Custom implementations

2. **Adapter Factory**

   - Dynamic loading
   - Configuration management
   - Error handling
   - State management

3. **Error Handling**

   - Enhanced error types
   - Recovery mechanisms
   - User guidance
   - Logging improvements

4. **Connection Management**

   - Automatic reconnection
   - Connection pooling
   - Health monitoring
   - State recovery

5. **Transaction Monitoring**
   - Status tracking
   - Confirmation monitoring
   - Error recovery
   - Event notifications

## Integration Examples

The Fuse framework provides several integration examples that demonstrate how the different components work together:

### End-to-End Identity Management

```typescript
import { DIDGateway, DIDMethod } from '@fuse/did-gateway';
import { WalletKit, KeyType } from '@fuse/wallet-kit';
import { PolicyCompiler } from '@fuse/policy-utils';
import axios from 'axios';

async function createIdentityWithCredential() {
  // 1. Create a wallet and generate keys
  const wallet = new WalletKit({
    storageOptions: { secureStorage: true },
  });
  const keyPair = await wallet.generateKey(KeyType.SECP256K1);

  // 2. Create a DID using the generated key
  const gateway = new DIDGateway();
  const didResult = await gateway.create(
    DIDMethod.ION,
    {
      verificationMethod: [
        {
          id: '#key-1',
          type: 'EcdsaSecp256k1VerificationKey2019',
          controller: '#id',
          publicKeyJwk: JSON.parse(await wallet.exportKey(keyPair.id, 'JWK')),
        },
      ],
    },
    await wallet.exportKey(keyPair.id, 'HEX')
  );

  // 3. Define an access control policy
  const compiler = new PolicyCompiler();
  const policy = {
    id: 'credential-access',
    name: 'Credential Access Policy',
    version: '1.0',
    rules: [
      {
        and: [
          { '>=': [{ var: 'requester.trustLevel' }, 3] },
          { in: [{ var: 'requester.purpose' }, ['verification', 'audit']] },
        ],
      },
    ],
  };
  const compiledPolicy = await compiler.compile(policy);

  // 4. Issue a credential using the Credential Hub service
  const credentialRequest = {
    issuer: didResult.didDocument?.id,
    subject: 'did:example:123',
    claims: {
      name: 'Alice Smith',
      degree: 'Computer Science',
      graduationDate: '2023-06-15',
    },
    policy: compiledPolicy.rego,
  };

  const credentialResponse = await axios.post(
    'http://localhost:8001/credentials/issue',
    credentialRequest,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await wallet.sign(
          new TextEncoder().encode(JSON.stringify(credentialRequest)),
          keyPair.id
        )}`,
      },
    }
  );

  return {
    did: didResult.didDocument?.id,
    credential: credentialResponse.data.credential,
  };
}
```

## Development and Testing

### Prerequisites

- Node.js (v18+)
- pnpm (v8+)
- Python (v3.11+)
- Poetry (v1.5+)

### Setup

```bash
# Install dependencies
pnpm install

# Install Python dependencies
cd services/credential-hub && poetry install && cd ../..
cd services/policy-engine && poetry install && cd ../..
```

### Commands

```bash
# Run tests across all packages and services
pnpm test

# Run linting across all packages and services
pnpm lint

# Build all packages and services
pnpm build

# Clean build artifacts
pnpm clean
```

### Testing Standards

- TypeScript: Jest with 90%+ coverage
- Python: Pytest with 90%+ coverage
- Strict typing in both TypeScript and Python
- Consistent code style enforced by ESLint and Ruff

## Future Roadmap

1. **Additional DID Methods**: Support for more DID methods (did:web, did:key, etc.)
2. **Enhanced Privacy Features**: Advanced zero-knowledge proof capabilities
3. **Cross-Chain Credential Verification**: Verify credentials across different blockchains
4. **Mobile SDK**: Native mobile support for React Native and Flutter
5. **Enterprise Integration**: Tools for integrating with existing identity systems
6. **Governance Framework**: Tools for managing decentralized governance
7. **Selective Disclosure**: Enhanced selective disclosure capabilities for credentials
