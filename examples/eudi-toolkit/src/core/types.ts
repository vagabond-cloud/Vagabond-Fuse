/**
 * Core data types for the EUDI Toolkit
 */

// DID Types
export interface DIDDocument {
  '@context': string[];
  id: string;
  controller: string | string[];
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
    publicKeyJwk?: any;
  }>;
  authentication?: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
  deactivated?: boolean;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: JsonWebKey;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | string[] | Record<string, any>;
}

export interface DIDResolutionResult {
  didResolutionMetadata: DIDResolutionMetadata;
  didDocument: DIDDocument | null;
  didDocumentMetadata: DIDDocumentMetadata;
}

export interface DIDResolutionMetadata {
  contentType?: string;
  error?: string;
  message?: string;
  retrieved?: string;
}

export interface DIDDocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
  versionId?: string;
  nextVersionId?: string;
  txHash?: string;
}

// Credential Types
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string | { id: string; [key: string]: any };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id?: string;
    [key: string]: any;
  };
  credentialStatus?: {
    id: string;
    type: string;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
    jws?: string;
  };
}

export interface CredentialStatus {
  id: string;
  type: string;
  statusListIndex?: string;
  statusListCredential?: string;
  revocationListIndex?: string;
  revocationListCredential?: string;
}

export interface Proof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
  challenge?: string;
  domain?: string;
}

// ZKP Types
export interface ZKProof {
  id: string;
  type: string;
  credentialId: string;
  circuit: string;
  proof: any;
  publicSignals: string[];
  revealedAttributes: Record<string, any>;
  created: string;
}

export interface ZKProofRequest {
  id: string;
  credentialId: string;
  type: string;
  circuit: string;
  revealAttributes: string[];
}

export interface ZKProofResult {
  verified: boolean;
  revealedAttributes?: Record<string, any>;
  error?: string;
}

// Policy Types
export enum PolicyType {
  REGO = 'rego',
  WASM = 'wasm',
  JSON = 'json',
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  content: string;
  type: PolicyType;
  created: string;
  updated: string;
}

export interface PolicyEvaluationRequest {
  policyId: string;
  input: any;
}

export interface PolicyEvaluationResult {
  allow: boolean;
  reason?: string;
  data?: any;
}

// XRPL Integration Types
export interface XRPLTransaction {
  id: string;
  type: string;
  account: string;
  destination?: string;
  amount?: string | { currency: string; value: string; issuer: string };
  fee: string;
  sequence: number;
  lastLedgerSequence?: number;
  signingPubKey?: string;
  txnSignature?: string;
  date?: number;
  hash?: string;
  ledgerIndex?: number;
  meta?: any;
  validated?: boolean;
}

export interface XRPLCredentialNFT {
  id: string;
  issuer: string;
  owner: string;
  tokenId: string;
  uri: string;
  taxon: number;
  sequence: number;
  flags: number;
  transferFee?: number;
  metadata?: string;
}

// ClickHouse Statistics Types
export enum StatsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export interface CredentialStats {
  totalIssued: number;
  totalVerified: number;
  totalRevoked: number;
  activeCredentials: number;
  byType: Record<string, number>;
  byIssuer: Record<string, number>;
  verificationSuccess: number;
  verificationFailure: number;
  averageVerificationTime: number;
}

// Use Case Types
export interface UseCase {
  id: string;
  name: string;
  description: string;
  credentialType: string;
  credentialContext: string[];
  requiredAttributes: string[];
  optionalAttributes: string[];
  policies: string[];
} 