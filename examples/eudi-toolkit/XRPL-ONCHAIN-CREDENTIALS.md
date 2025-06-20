# XRPL On-Chain Credentials System

## Overview

The XRPL On-Chain Credentials System is a comprehensive implementation that leverages XRPL's native NFT functionality to create, manage, and verify digital credentials entirely on the blockchain. This system provides a complete alternative to traditional off-chain credential storage while maintaining full compatibility with W3C Verifiable Credentials standards.

## Key Features

### 🎫 **NFT-Based Credentials**
- Credentials are issued as XRPL NFTs with embedded metadata
- Immutable proof of issuance and ownership
- Native blockchain-based transfer and ownership management
- Automatic cryptographic proof of authenticity

### 🔍 **Multi-Level Verification**
- **Basic**: Metadata validation and structure verification
- **Enhanced**: Transaction hash verification and chain of custody
- **Cryptographic**: Full cryptographic signature validation

### 🔄 **Credential Lifecycle Management**
- **Issuance**: Mint credentials as NFTs with comprehensive metadata
- **Transfer**: Secure ownership transfers via XRPL offers
- **Revocation**: Soft revocation via memos or hard revocation via burning
- **Status Management**: Real-time status tracking through blockchain events

### 🛡️ **Privacy & Security**
- Selective disclosure through zero-knowledge proofs
- GDPR-compliant data handling
- Immutable audit trails
- Cryptographic proof of possession

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 XRPL On-Chain Credentials                   │
├─────────────────────────────────────────────────────────────┤
│  Credential Issuance    │  Verification Engine             │
│  - NFT Minting         │  - Multi-level verification      │
│  - Metadata Embedding  │  - Chain of custody validation   │
│  - Ownership Transfer  │  - Cryptographic proof checking  │
├─────────────────────────────────────────────────────────────┤
│  Status Management     │  Privacy Technologies             │
│  - Revocation Tracking │  - Selective disclosure          │
│  - Expiration Handling │  - Zero-knowledge proofs         │
│  - Real-time Updates   │  - Data minimization            │
├─────────────────────────────────────────────────────────────┤
│                    XRPL Ledger                             │
│  - NFToken Transactions                                    │
│  - Immutable Transaction History                           │
│  - Native Transfer Mechanisms                              │
│  - Built-in Cryptographic Security                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### XRPLOnChainCredentials Class

The main class providing all on-chain credential functionality:

```typescript
import { XRPLOnChainCredentials, VerificationLevel } from './src/adapters/xrpl-onchain-credentials';

// Initialize with XRPL testnet
const credentialSystem = new XRPLOnChainCredentials('wss://s.altnet.rippletest.net:51233');
credentialSystem.setWallet(myWallet);
await credentialSystem.connect();
```

### Credential Metadata Structure

```typescript
interface OnChainCredentialMetadata {
  id: string;                    // Unique credential identifier
  type: string[];               // Credential types (e.g., ['VerifiableCredential', 'DrivingLicense'])
  issuer: string;               // DID of the credential issuer
  issuanceDate: string;         // ISO 8601 timestamp
  expirationDate?: string;      // Optional expiration
  credentialSubject: {          // Subject data
    id: string;                 // Subject DID
    [key: string]: any;        // Custom attributes
  };
  proof: {                      // Cryptographic proof
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    nftTokenId?: string;
    transactionHash?: string;
  };
  xrplMetadata: {              // XRPL-specific settings
    nftTokenId?: string;
    taxon: number;             // NFT collection identifier
    transferable: boolean;     // Can be transferred
    burnable: boolean;         // Can be burned (permanently revoked)
    mutable: boolean;          // Metadata can be updated
    transferFee?: number;      // Fee for secondary sales
  };
}
```

## Usage Examples

### 1. Issuing a Credential

```typescript
// Issue a driving license credential
const result = await credentialSystem.issueCredential(
  {
    type: 'DrivingLicense',
    credentialSubject: {
      firstName: 'John',
      lastName: 'Doe',
      licenseNumber: 'DL-123456',
      licenseClass: 'Class C',
      issuingAuthority: 'DMV'
    }
  },
  holderAddress,
  {
    transferable: true,
    burnable: true,
    taxon: 1001,
    expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
  }
);

console.log(`Credential issued: ${result.nftTokenId}`);
```

### 2. Verifying a Credential

```typescript
// Comprehensive verification
const verification = await credentialSystem.verifyCredential(
  nftTokenId,
  VerificationLevel.ENHANCED
);

console.log(`Valid: ${verification.valid}`);
console.log(`Status: ${verification.status}`);
console.log(`Issuer Verified: ${verification.issuerVerified}`);
console.log(`Not Expired: ${verification.notExpired}`);
console.log(`Not Revoked: ${verification.notRevoked}`);
```

### 3. Transferring a Credential

```typescript
// Transfer credential to new owner
const transfer = await credentialSystem.transferCredential(
  nftTokenId,
  newOwnerAddress,
  'offer_based'
);

if (transfer.success) {
  console.log(`Transfer offer created: ${transfer.transactionHash}`);
}
```

### 4. Revoking a Credential

```typescript
// Soft revocation (mark as revoked but keep NFT)
const revocation = await credentialSystem.revokeCredential(nftTokenId, false);

// Hard revocation (burn the NFT permanently)
const burning = await credentialSystem.revokeCredential(nftTokenId, true);
```

### 5. Getting Credential Information

```typescript
// Get comprehensive credential info
const info = await credentialSystem.getCredentialInfo(nftTokenId);

console.log('NFT Data:', info.nftData);
console.log('Metadata:', info.metadata);
console.log('Verification Result:', info.verificationResult);
console.log('Transaction History:', info.transactionHistory);
```

## XRPL Integration Details

### NFT Flags Used

- **tfBurnable (0x00000001)**: Allows credential revocation via burning
- **tfTransferable (0x00000008)**: Enables credential transfers
- **tfMutable (0x00000010)**: Allows metadata updates for corrections

### Transaction Types

1. **NFTokenMint**: Creates new credentials as NFTs
2. **NFTokenCreateOffer**: Creates transfer offers for credentials
3. **NFTokenAcceptOffer**: Accepts credential transfer offers
4. **NFTokenBurn**: Permanently revokes credentials
5. **Payment with Memos**: Records status changes and revocations

### Metadata Storage

Credential metadata is stored in multiple locations:
- **URI Field**: Basic credential information (256 bytes max)
- **Transaction Memos**: Complete credential data and status updates
- **On-Chain History**: Immutable audit trail of all credential events

## Use Cases

### 1. Government Documents
- **Driver's Licenses**: Transferable, burnable, with expiration
- **Passports**: Non-transferable, permanent, with biometric data
- **Birth Certificates**: Permanent, non-transferable, immutable

### 2. Academic Credentials
- **Diplomas**: Non-transferable, permanent, with academic records
- **Certificates**: Transferable, with expiration, updatable
- **Transcripts**: Permanent, non-transferable, with course details

### 3. Professional Certifications
- **Medical Licenses**: Transferable, with renewal cycles
- **Professional Certifications**: Expiring, updatable, transferable
- **Employment Records**: Transferable, burnable, with performance data

### 4. Financial Credentials
- **Credit Reports**: Temporary, non-transferable, regularly updated
- **Banking KYC**: Transferable between institutions, privacy-preserving
- **Insurance Policies**: Transferable, with coverage details

## Security Considerations

### Cryptographic Security
- **Ed25519 Signatures**: For credential integrity
- **XRPL Transaction Signatures**: For blockchain-level security
- **Hash-based Verification**: For tamper detection

### Privacy Protection
- **Selective Disclosure**: Only reveal necessary attributes
- **Zero-Knowledge Proofs**: Prove facts without revealing data
- **Data Minimization**: Store only essential information on-chain

### Access Control
- **DID-based Authentication**: Cryptographic identity verification
- **Policy-based Authorization**: Rule-based access decisions
- **Consent Management**: GDPR-compliant consent tracking

## Integration with Existing Systems

### W3C Verifiable Credentials
- Full compatibility with VC data model
- Interoperable with existing VC ecosystems
- Standards-compliant JSON-LD contexts

### DID Infrastructure
- Supports multiple DID methods
- XRPL DID integration
- Universal resolver compatibility

### Policy Frameworks
- GDPR compliance automation
- eIDAS 2.0 alignment
- Configurable governance rules

## Deployment Guide

### Prerequisites
- Node.js 18+ and npm/yarn
- XRPL.js library
- TypeScript support
- Access to XRPL testnet/mainnet

### Installation
```bash
# Install dependencies
npm install

# Install XRPL library
npm install xrpl

# Install TypeScript tools (if needed)
npm install -g typescript ts-node
```

### Configuration
```typescript
// Initialize for testnet
const credentialSystem = new XRPLOnChainCredentials('wss://s.altnet.rippletest.net:51233');

// Initialize for mainnet
const credentialSystem = new XRPLOnChainCredentials('wss://xrplcluster.com');
```

### Running the Demo
```bash
# Run the comprehensive demo
./examples/demo-onchain.sh

# Or run the TypeScript demo directly
ts-node examples/onchain-credentials-demo.ts
```

## API Reference

### Core Methods

#### `issueCredential(credentialData, recipientAddress, options)`
Issues a new credential as an XRPL NFT.

#### `verifyCredential(nftTokenId, verificationLevel)`
Verifies a credential with specified verification level.

#### `transferCredential(nftTokenId, newOwnerAddress, transferMethod)`
Transfers credential ownership.

#### `revokeCredential(nftTokenId, burnNFT)`
Revokes a credential (soft or hard revocation).

#### `getCredentialInfo(nftTokenId)`
Gets comprehensive credential information.

#### `listCredentialsByIssuer(issuerAddress)`
Lists all credentials issued by a specific address.

### Verification Levels

- **BASIC**: Structure and metadata validation
- **ENHANCED**: Transaction hash and ownership verification
- **CRYPTOGRAPHIC**: Full cryptographic proof validation

### Status Types

- **ACTIVE**: Valid and usable credential
- **SUSPENDED**: Temporarily disabled
- **REVOKED**: Permanently invalidated
- **EXPIRED**: Past expiration date

## Future Enhancements

### Planned Features
- **Multi-signature Credentials**: Requiring multiple authorities
- **Credential Templates**: Standardized schemas for common use cases
- **Automated Renewal**: Smart contract-based renewal processes
- **Cross-chain Bridges**: Integration with other blockchain networks

### Research Areas
- **Advanced Privacy**: Homomorphic encryption for on-chain computation
- **Scalability**: Layer 2 solutions for high-volume issuance
- **Interoperability**: Cross-chain credential verification
- **Governance**: Decentralized credential authority management

## Support and Resources

### Documentation
- [XRPL Developer Portal](https://xrpl.org/docs/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [DID Specification](https://www.w3.org/TR/did-core/)

### Community
- [XRPL Discord](https://discord.gg/xrpl)
- [Vagabond Fuse GitHub](https://github.com/vagabond-fuse)
- [EU Digital Identity Initiative](https://digital-strategy.ec.europa.eu/)

### Contributing
Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code standards and testing
- Documentation requirements
- Security considerations
- Community guidelines

---

**XRPL On-Chain Credentials** - Bringing trust to the blockchain, one credential at a time. 🎫⛓️✨ 