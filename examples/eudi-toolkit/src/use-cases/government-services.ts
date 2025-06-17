/**
 * Government Services Use Case
 * 
 * This module provides functionality for accessing government services
 * using verifiable credentials and digital identity.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface IdentityCardData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  documentNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  personalNumber?: string;
  gender?: string;
  address?: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  portrait?: string; // Base64 encoded image
}

export interface ResidencePermitData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  documentNumber: string;
  permitType: string; // e.g., "Permanent", "Temporary", "Student"
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  address: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
}

export interface TaxIdentificationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  taxId: string;
  issuingCountry: string;
  issueDate: string;
}

export class GovernmentServicesUseCase {
  private credentialManager: CredentialManager;
  private zkpManager: ZKProofManager;
  private statusManager: StatusManager;

  constructor(
    credentialManager: CredentialManager,
    zkpManager: ZKProofManager,
    statusManager: StatusManager
  ) {
    this.credentialManager = credentialManager;
    this.zkpManager = zkpManager;
    this.statusManager = statusManager;
  }

  /**
   * Issue an identity card credential
   * @param data The identity card data
   * @param issuerId The ID of the issuer (government authority)
   * @param subjectId The ID of the subject (citizen)
   * @returns The issued credential
   */
  async issueIdentityCard(
    data: IdentityCardData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/identity-card/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'IdentityCardCredential'],
      issuer: issuerId,
      issuanceDate: data.issueDate,
      expirationDate: data.expiryDate,
      credentialSubject: {
        id: subjectId,
        type: 'IdentityCard',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
        nationality: data.nationality,
        documentNumber: data.documentNumber,
        issuingAuthority: data.issuingAuthority,
        personalNumber: data.personalNumber,
        gender: data.gender,
        address: data.address,
        portrait: data.portrait
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

    console.log('Identity Card Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a residence permit credential
   * @param data The residence permit data
   * @param issuerId The ID of the issuer (immigration authority)
   * @param subjectId The ID of the subject (resident)
   * @returns The issued credential
   */
  async issueResidencePermit(
    data: ResidencePermitData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/residence-permit/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'ResidencePermitCredential'],
      issuer: issuerId,
      issuanceDate: data.issueDate,
      expirationDate: data.expiryDate,
      credentialSubject: {
        id: subjectId,
        type: 'ResidencePermit',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        documentNumber: data.documentNumber,
        permitType: data.permitType,
        issuingAuthority: data.issuingAuthority,
        address: data.address
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

    console.log('Residence Permit Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a tax identification credential
   * @param data The tax identification data
   * @param issuerId The ID of the issuer (tax authority)
   * @param subjectId The ID of the subject (taxpayer)
   * @returns The issued credential
   */
  async issueTaxIdentification(
    data: TaxIdentificationData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/tax-id/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'TaxIdentificationCredential'],
      issuer: issuerId,
      issuanceDate: data.issueDate,
      expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
      credentialSubject: {
        id: subjectId,
        type: 'TaxIdentification',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        taxId: data.taxId,
        issuingCountry: data.issuingCountry
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

    console.log('Tax Identification Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify an identity card credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyIdentityCard(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is an identity card credential
    if (!credential.type.includes('IdentityCardCredential')) {
      return {
        verified: false,
        error: 'Not an identity card credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type IdentityCardCredential',
          },
        ],
      };
    }

    // Check if the identity card has expired
    const now = new Date();
    
    // Make sure expirationDate exists before creating a Date object
    if (credential.expirationDate) {
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Identity card has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Identity card expiration date has passed',
            },
          ],
        };
      }
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
   * Generate a minimal identity proof for government services
   * @param identityCredential The identity credential
   * @param requestedAttributes The attributes requested by the service
   * @returns A proof with only the requested attributes
   */
  async generateIdentityProof(
    identityCredential: VerifiableCredential,
    requestedAttributes: string[]
  ): Promise<any> {
    // Generate a selective disclosure proof with only the requested attributes
    return this.zkpManager.generateProof(
      identityCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: identityCredential.id,
        type: 'IdentityProof',
        circuit: 'selective-disclosure',
        revealAttributes: requestedAttributes
      }
    );
  }

  /**
   * Generate an age verification proof
   * @param identityCredential The identity credential
   * @param minimumAge The minimum age required
   * @returns A proof that the person is at least the minimum age
   */
  async generateAgeProof(
    identityCredential: VerifiableCredential,
    minimumAge: number
  ): Promise<any> {
    // For a real implementation, we would use a ZKP circuit to prove age >= minimumAge
    // without revealing the actual date of birth
    
    // For demo purposes, we'll create a simple proof
    const dateOfBirth = new Date(identityCredential.credentialSubject.dateOfBirth);
    const today = new Date();
    
    // Calculate age
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return {
      id: `age-proof-${uuidv4()}`,
      type: 'AgeVerificationProof',
      credentialId: identityCredential.id,
      minimumAge: minimumAge,
      ageVerified: age >= minimumAge,
      created: new Date().toISOString(),
      proofValue: `mock_age_proof_${uuidv4()}`
    };
  }
} 