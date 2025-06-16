# Creating and Managing Decentralized Identifiers (DIDs)

## Introduction

Welcome to the FuseStream DID (Decentralized Identifier) documentation. This guide is designed to help developers, system administrators, and security professionals implement and manage DIDs within our platform. DIDs are a crucial component of our identity infrastructure, enabling secure, self-sovereign identity management for our users and creators.

## Description

Decentralized Identifiers (DIDs) are a new type of identifier that enables verifiable, self-sovereign digital identity. In the FuseStream ecosystem, DIDs serve as the foundation for:

- User identity verification
- Content attribution
- Creator authentication
- Secure service access
- Cross-platform identity portability

Our DID implementation follows the W3C DID specification while adding custom extensions to support our specific use cases, such as creator verification and content attribution.

## Overview

This guide explains how to create and manage Decentralized Identifiers (DIDs) in our system. DIDs are a fundamental component of our identity management system, providing secure, self-sovereign identity for users.

## Prerequisites

Before you begin working with DIDs in our system, ensure you have the following:

- Node.js 18+ or Go 1.22+ installed and configured
- Access to our DID service endpoints
- Required environment variables:
  - `DID_SERVICE_URL`: The base URL for our DID service
  - `DID_API_KEY`: Your authentication key for the DID service

## Creating a DID

This section covers the two primary methods for creating DIDs in our system: using our TypeScript SDK or the command-line interface.

### Using the API

The TypeScript SDK provides a programmatic way to create and manage DIDs. This example demonstrates how to create a new DID with default settings and a Spark service endpoint.

```typescript
// Example using our TypeScript SDK
import { DIDClient } from '@fuse/did-sdk';

const client = new DIDClient({
  serviceUrl: process.env.DID_SERVICE_URL,
  apiKey: process.env.DID_API_KEY,
});

async function createDID() {
  try {
    const did = await client.create({
      method: 'fuse', // Our custom DID method
      options: {
        keyType: 'Ed25519', // Default key type
        verificationMethod: true, // Include verification method
        serviceEndpoints: [
          {
            id: '#spark-service',
            type: 'SparkService',
            serviceEndpoint: 'https://api.fuse.stream/spark',
          },
        ],
      },
    });

    return did;
  } catch (error) {
    console.error('Failed to create DID:', error);
    throw error;
  }
}
```

### Using the CLI

For quick operations or scripting, our command-line interface provides a convenient way to create DIDs. This example shows how to create a DID with specific parameters.

```bash
fuse did create \
  --method fuse \
  --key-type Ed25519 \
  --verification-method \
  --service-endpoint "https://api.fuse.stream/spark"
```

## DID Document Structure

A DID document is a JSON-LD document that describes a DID. It contains the public keys, authentication methods, and service endpoints associated with the DID. Here's the structure we use in our system:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2018/v1"
  ],
  "id": "did:fuse:123456789abcdef",
  "controller": "did:fuse:123456789abcdef",
  "verificationMethod": [
    {
      "id": "did:fuse:123456789abcdef#keys-1",
      "type": "Ed25519VerificationKey2018",
      "controller": "did:fuse:123456789abcdef",
      "publicKeyBase58": "..."
    }
  ],
  "service": [
    {
      "id": "did:fuse:123456789abcdef#spark-service",
      "type": "SparkService",
      "serviceEndpoint": "https://api.fuse.stream/spark"
    }
  ]
}
```

## Key Management

Key management is a critical aspect of DID security. This section covers key generation, storage, and best practices.

### Generating Keys

Our SDK provides utilities for generating cryptographic key pairs. This example shows how to generate an Ed25519 key pair:

```typescript
import { generateKeyPair } from '@fuse/did-sdk';

const keyPair = await generateKeyPair('Ed25519');
```

### Storing Keys Securely

Proper key storage is essential for maintaining the security of your DIDs. Follow these guidelines:

1. Private keys should never be stored in plain text
2. Use hardware security modules (HSMs) in production
3. Implement key rotation policies
4. Follow our key backup and recovery procedures

## Verification Methods

Verification methods define how a DID can be authenticated. Our system supports multiple verification methods to accommodate different use cases and security requirements.

Our system supports multiple verification methods:

1. Ed25519 (default) - Fast, secure, and widely supported
2. Secp256k1 - Compatible with Ethereum and other blockchain systems
3. RSA - Traditional public-key cryptography

To add a verification method:

```typescript
await client.addVerificationMethod({
  did: 'did:fuse:123456789abcdef',
  type: 'Ed25519VerificationKey2018',
  keyPair: generatedKeyPair,
});
```

## Service Endpoints

Service endpoints allow DIDs to interact with various services in our ecosystem. This section explains how to add and manage service endpoints.

Service endpoints can be added to your DID document:

```typescript
await client.addService({
  did: 'did:fuse:123456789abcdef',
  service: {
    id: '#spark-service',
    type: 'SparkService',
    serviceEndpoint: 'https://api.fuse.stream/spark',
  },
});
```

## Security Considerations

Security is paramount when working with DIDs. This section outlines key security considerations and best practices.

1. **Key Protection**

   - Store private keys in secure hardware
   - Implement key rotation policies
   - Use multi-signature schemes for high-value operations

2. **Access Control**

   - Implement proper authentication
   - Use role-based access control
   - Monitor and audit DID operations

3. **Compliance**
   - Follow GDPR requirements for personal data
   - Implement data minimization principles
   - Maintain audit logs of all operations

## Best Practices

Following best practices ensures the security and reliability of your DID implementation. This section provides guidelines for key management, document updates, and error handling.

1. **Key Management**

   - Regularly rotate keys
   - Use different keys for different purposes
   - Implement proper backup procedures

2. **Document Updates**

   - Keep service endpoints up to date
   - Remove unused verification methods
   - Maintain proper versioning

3. **Error Handling**
   - Implement proper error handling
   - Log all operations
   - Monitor for suspicious activities

## Troubleshooting

This section provides solutions for common issues you might encounter when working with DIDs in our system.

Common issues and solutions:

1. **DID Creation Fails**

   - Check network connectivity
   - Verify API credentials
   - Ensure proper input format

2. **Key Generation Issues**

   - Verify system entropy
   - Check for proper permissions
   - Ensure correct key type

3. **Service Endpoint Issues**
   - Verify endpoint availability
   - Check endpoint format
   - Ensure proper authentication

## API Reference

For detailed API documentation, including all available methods, parameters, and response formats, refer to our [API Reference](https://docs.fuse.stream/api/did).

## Support

If you need assistance with DID implementation or encounter any issues, our support team is here to help:

- Technical issues: support@fuse.stream
- Security concerns: security@fuse.stream
- Documentation feedback: docs@fuse.stream
