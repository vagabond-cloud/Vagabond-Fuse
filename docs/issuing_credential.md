# Issuing and Managing Verifiable Credentials

## Introduction

Welcome to the FuseStream Verifiable Credentials documentation. This guide explains how to issue, manage, and verify credentials within our platform. Verifiable Credentials are a crucial component of our trust infrastructure, enabling secure and privacy-preserving verification of user attributes, creator status, and content authenticity.

## Description

Verifiable Credentials (VCs) are tamper-evident credentials that can be cryptographically verified. In the FuseStream ecosystem, VCs serve multiple purposes:

- Creator verification and badges
- Content authenticity verification
- Age verification
- Community moderation status
- Platform achievements and milestones
- Content rights and permissions

Our VC implementation follows the W3C Verifiable Credentials Data Model specification while adding custom extensions to support our specific use cases.

## Overview

This guide covers the complete lifecycle of verifiable credentials in our system, from issuance to verification and revocation. You'll learn how to create, issue, and manage credentials using our TypeScript SDK or REST API.

## Prerequisites

Before you begin working with Verifiable Credentials, ensure you have:

- Node.js 18+ or Go 1.22+ installed
- Access to our Credential Service endpoints
- Required environment variables:
  - `CREDENTIAL_SERVICE_URL`: The base URL for our credential service
  - `CREDENTIAL_API_KEY`: Your authentication key for the service
  - `ISSUER_DID`: Your issuer DID (must be registered as an authorized issuer)

## Creating a Credential

### Using the API

The TypeScript SDK provides a programmatic way to create and issue credentials. This example demonstrates how to create a creator verification credential:

```typescript
import { CredentialClient } from '@fuse/credential-sdk';

const client = new CredentialClient({
  serviceUrl: process.env.CREDENTIAL_SERVICE_URL,
  apiKey: process.env.CREDENTIAL_API_KEY,
  issuerDid: process.env.ISSUER_DID,
});

async function issueCreatorCredential(holderDid: string) {
  try {
    const credential = await client.create({
      type: 'CreatorVerificationCredential',
      holder: holderDid,
      claims: {
        creatorType: 'verified',
        verificationDate: new Date().toISOString(),
        contentCategories: ['spark', 'video'],
        followerCount: 10000,
      },
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      options: {
        proofType: 'Ed25519Signature2018',
        statusType: 'RevocationList2020',
      },
    });

    return credential;
  } catch (error) {
    console.error('Failed to issue credential:', error);
    throw error;
  }
}
```

### Using the CLI

For quick operations or scripting, our command-line interface provides a convenient way to issue credentials:

```bash
fuse credential issue \
  --type CreatorVerificationCredential \
  --holder did:fuse:123456789abcdef \
  --claims '{"creatorType":"verified","verificationDate":"2024-03-20T00:00:00Z"}' \
  --expiration 2025-03-20 \
  --proof-type Ed25519Signature2018
```

## Credential Structure

A verifiable credential in our system follows this structure:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/security/suites/ed25519-2018/v1",
    "https://fuse.stream/credentials/v1"
  ],
  "id": "urn:uuid:12345678-1234-1234-1234-123456789012",
  "type": ["VerifiableCredential", "CreatorVerificationCredential"],
  "issuer": "did:fuse:issuer123",
  "issuanceDate": "2024-03-20T00:00:00Z",
  "expirationDate": "2025-03-20T00:00:00Z",
  "credentialSubject": {
    "id": "did:fuse:123456789abcdef",
    "creatorType": "verified",
    "verificationDate": "2024-03-20T00:00:00Z",
    "contentCategories": ["spark", "video"],
    "followerCount": 10000
  },
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2024-03-20T00:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:fuse:issuer123#keys-1",
    "jws": "..."
  },
  "credentialStatus": {
    "id": "https://fuse.stream/credentials/status/123",
    "type": "RevocationList2020",
    "statusListIndex": "0",
    "statusListCredential": "https://fuse.stream/credentials/status/2024"
  }
}
```

## Credential Types

Our system supports several credential types:

1. **CreatorVerificationCredential**

   - Verifies creator status
   - Includes follower count and content categories
   - Valid for 1 year

2. **AgeVerificationCredential**

   - Verifies user age
   - Supports different age tiers
   - Valid for 5 years

3. **ContentRightsCredential**

   - Specifies content usage rights
   - Includes licensing terms
   - Valid for specified duration

4. **ModerationCredential**
   - Community moderation status
   - Trust score
   - Valid for 6 months

## Issuing Credentials

### Basic Issuance

```typescript
const credential = await client.issue({
  type: 'CreatorVerificationCredential',
  holder: holderDid,
  claims: {
    creatorType: 'verified',
    verificationDate: new Date().toISOString(),
  },
});
```

### Batch Issuance

```typescript
const credentials = await client.issueBatch({
  type: 'AgeVerificationCredential',
  holders: [holderDid1, holderDid2],
  claims: {
    ageTier: 'adult',
    verificationMethod: 'government_id',
  },
});
```

## Credential Status Management

### Checking Status

```typescript
const status = await client.checkStatus(credentialId);
```

### Revoking Credentials

```typescript
await client.revoke(credentialId, {
  reason: 'violation_of_terms',
  revocationDate: new Date().toISOString(),
});
```

## Security Considerations

1. **Issuer Authentication**

   - Verify issuer identity
   - Use secure key storage
   - Implement key rotation

2. **Credential Protection**

   - Encrypt sensitive claims
   - Implement proper access controls
   - Monitor for abuse

3. **Compliance**
   - Follow data minimization
   - Implement proper retention policies
   - Maintain audit logs

## Best Practices

1. **Credential Design**

   - Minimize required claims
   - Use appropriate expiration dates
   - Implement proper revocation

2. **Issuance Process**

   - Verify holder identity
   - Validate claims
   - Implement proper error handling

3. **Status Management**
   - Regular status checks
   - Prompt revocation when needed
   - Maintain status history

## Troubleshooting

Common issues and solutions:

1. **Issuance Fails**

   - Check issuer authorization
   - Verify holder DID
   - Validate claim format

2. **Verification Issues**

   - Check credential status
   - Verify proof validity
   - Validate expiration

3. **Status Management**
   - Check revocation list
   - Verify status endpoint
   - Validate status format

## API Reference

For detailed API documentation, including all available methods, parameters, and response formats, refer to our [API Reference](https://docs.fuse.stream/api/credentials).

## Support

If you need assistance with credential implementation or encounter any issues, our support team is here to help:

- Technical issues: support@fuse.stream
- Security concerns: security@fuse.stream
- Documentation feedback: docs@fuse.stream
