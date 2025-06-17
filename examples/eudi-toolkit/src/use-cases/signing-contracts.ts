/**
 * Signing Contracts Use Case
 * 
 * This module provides functionality for digitally signing contracts
 * using verifiable credentials and DIDs.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';
import { DIDManager } from '../core/did';

export interface SignatureAuthorityData {
  name: string;
  role: string;
  organization: string;
  email?: string;
  phone?: string;
  delegatedPowers?: string[];
}

export interface ContractData {
  title: string;
  description: string;
  parties: string[];
  contractHash: string; // Hash of the contract document
  validFrom: string;
  validUntil?: string;
  jurisdiction?: string;
  contractType?: string;
}

export interface SignatureData {
  signerDid: string;
  contractId: string;
  timestamp: string;
  signatureValue: string;
}

export class SigningContractsUseCase {
  private credentialManager: CredentialManager;
  private zkpManager: ZKProofManager;
  private statusManager: StatusManager;
  private didManager: DIDManager;

  constructor(
    credentialManager: CredentialManager,
    zkpManager: ZKProofManager,
    statusManager: StatusManager,
    didManager: DIDManager
  ) {
    this.credentialManager = credentialManager;
    this.zkpManager = zkpManager;
    this.statusManager = statusManager;
    this.didManager = didManager;
  }

  /**
   * Issue a signature authority credential
   * @param data The signature authority data
   * @param issuerId The ID of the issuer (organization)
   * @param subjectId The ID of the subject (person with signing authority)
   * @returns The issued credential
   */
  async issueSignatureAuthority(
    data: SignatureAuthorityData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/signature-authority/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'SignatureAuthorityCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      credentialSubject: {
        id: subjectId,
        type: 'SignatureAuthority',
        name: data.name,
        role: data.role,
        organization: data.organization,
        email: data.email,
        phone: data.phone,
        delegatedPowers: data.delegatedPowers || []
      },
      // Add a simple mock proof for demonstration purposes
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${issuerId}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_for_demo_purposes_only',
      }
    };

    // Add credential status
    const statusEntry = this.statusManager.createStatus(credential.id, StatusType.ACTIVE);
    credential.credentialStatus = this.statusManager.createCredentialStatus(
      `https://eudi-wallet.eu/status/${uuidv4()}`,
      'StatusList2021Entry',
      statusEntry.id
    );

    console.log('Signature Authority Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a contract credential
   * @param data The contract data
   * @param issuerId The ID of the issuer (contract creator)
   * @returns The issued credential
   */
  async issueContract(
    data: ContractData,
    issuerId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const contractId = `contract:${uuidv4()}`;
    
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/contract/v1',
      ],
      id: contractId,
      type: ['VerifiableCredential', 'ContractCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: data.validUntil,
      credentialSubject: {
        id: contractId,
        type: 'Contract',
        title: data.title,
        description: data.description,
        parties: data.parties,
        contractHash: data.contractHash,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        jurisdiction: data.jurisdiction,
        contractType: data.contractType,
        signatures: []
      },
      // Add a simple mock proof for demonstration purposes
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${issuerId}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_for_demo_purposes_only',
      }
    };

    // Add credential status
    const statusEntry = this.statusManager.createStatus(credential.id, StatusType.ACTIVE);
    credential.credentialStatus = this.statusManager.createCredentialStatus(
      `https://eudi-wallet.eu/status/${uuidv4()}`,
      'StatusList2021Entry',
      statusEntry.id
    );

    console.log('Contract Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Sign a contract
   * @param contractCredential The contract credential to sign
   * @param signerDid The DID of the signer
   * @param privateKey The private key to sign with
   * @returns The updated contract credential with the signature
   */
  async signContract(
    contractCredential: VerifiableCredential,
    signerDid: string,
    privateKey: string
  ): Promise<VerifiableCredential> {
    // Check if this is a contract credential
    if (!contractCredential.type.includes('ContractCredential')) {
      throw new Error('Not a contract credential');
    }

    // Create a signature
    const timestamp = new Date().toISOString();
    const message = `${contractCredential.id}|${signerDid}|${timestamp}`;
    
    // In a real implementation, we would use the private key to sign the message
    // For demo purposes, we'll create a mock signature
    const signatureValue = `mock_signature_${uuidv4()}`;

    // Add the signature to the contract
    const signature: SignatureData = {
      signerDid,
      contractId: contractCredential.id,
      timestamp,
      signatureValue
    };

    // Add the signature to the contract credential
    if (!contractCredential.credentialSubject.signatures) {
      contractCredential.credentialSubject.signatures = [];
    }
    contractCredential.credentialSubject.signatures.push(signature);

    return contractCredential;
  }

  /**
   * Verify a signature authority credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifySignatureAuthority(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a signature authority credential
    if (!credential.type.includes('SignatureAuthorityCredential')) {
      return {
        verified: false,
        error: 'Not a signature authority credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type SignatureAuthorityCredential',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'expiry', valid: true },
        { check: 'status', valid: true }
      ],
    };
  }

  /**
   * Verify a contract credential and its signatures
   * @param contractCredential The contract credential to verify
   * @returns The verification result
   */
  async verifyContract(contractCredential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a contract credential
    if (!contractCredential.type.includes('ContractCredential')) {
      return {
        verified: false,
        error: 'Not a contract credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type ContractCredential',
          },
        ],
      };
    }

    // Check if the contract has expired
    if (contractCredential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(contractCredential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Contract has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Contract expiration date has passed',
            },
          ],
        };
      }
    }

    // For a complete implementation, we would verify each signature
    // For demo purposes, we'll just check if there are signatures
    const signatures = contractCredential.credentialSubject.signatures || [];
    if (signatures.length === 0) {
      return {
        verified: false,
        error: 'Contract has no signatures',
        checks: [
          {
            check: 'signatures',
            valid: false,
            error: 'Contract has no signatures',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'expiry', valid: true },
        { check: 'status', valid: true },
        { check: 'signatures', valid: true, error: `${signatures.length} valid signatures` }
      ],
    };
  }

  /**
   * Generate a proof of contract signing authority
   * @param authorityCredential The signature authority credential
   * @returns A proof that the person has signing authority
   */
  async generateSigningAuthorityProof(
    authorityCredential: VerifiableCredential
  ): Promise<any> {
    // For signing authority, we need to reveal the name, role, and organization
    return this.zkpManager.generateProof(
      authorityCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: authorityCredential.id,
        type: 'SignatureAuthorityProof',
        circuit: 'selective-disclosure',
        revealAttributes: ['name', 'role', 'organization', 'delegatedPowers']
      }
    );
  }
} 