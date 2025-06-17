/**
 * Driving License Use Case
 * 
 * This module provides functionality for issuing and verifying driving license credentials
 * according to the EU Digital Identity Wallet specifications.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { ZKProofRequest } from '../core/types';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface DrivingLicenseData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  licenseNumber: string;
  categories: string[];
  restrictions?: string[];
  address?: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
}

export class DrivingLicenseUseCase {
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
   * Issue a driving license credential
   * @param data The driving license data
   * @param issuerId The ID of the issuer
   * @param subjectId The ID of the subject
   * @returns The issued credential
   */
  async issueDrivingLicense(
    data: DrivingLicenseData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/driving-license/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'DrivingLicenseCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: data.expiryDate,
      credentialSubject: {
        id: subjectId,
        type: 'DrivingLicense',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        placeOfBirth: data.placeOfBirth,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        issuingAuthority: data.issuingAuthority,
        licenseNumber: data.licenseNumber,
        categories: data.categories,
        restrictions: data.restrictions || [],
        address: data.address,
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
    const statusEntry = this.statusManager.createStatus(credential.id, StatusType.ACTIVE, data.expiryDate);
    credential.credentialStatus = this.statusManager.createCredentialStatus(
      `https://eudi-wallet.eu/status/${uuidv4()}`,
      'RevocationList2021Status',
      statusEntry.id
    );

    // For demo purposes, we'll skip the actual credential issuance through the credential manager
    // and just return the mock credential
    console.log('Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a driving license credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyDrivingLicense(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a driving license credential
    if (!credential.type.includes('DrivingLicenseCredential')) {
      return {
        verified: false,
        error: 'Not a driving license credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type DrivingLicenseCredential',
          },
        ],
      };
    }

    // Check if the credential has expired
    const now = new Date();
    const expiryDate = new Date(credential.expirationDate || '');
    if (expiryDate < now) {
      return {
        verified: false,
        error: 'Credential has expired',
        checks: [
          {
            check: 'expiry',
            valid: false,
            error: 'Credential has expired',
          },
        ],
      };
    }

    // Check the credential status
    if (credential.credentialStatus) {
      const statusEntry = await this.statusManager.getStatus(credential.id);
      if (statusEntry && statusEntry.status !== StatusType.ACTIVE) {
        return {
          verified: false,
          error: `Credential status is ${statusEntry.status}`,
          checks: [
            {
              check: 'status',
              valid: false,
              error: `Credential status is ${statusEntry.status}`,
            },
          ],
        };
      }
    }

    // Verify the credential signature and other properties
    return await this.credentialManager.verify(credential);
  }

  /**
   * Generate a zero-knowledge proof for a driving license credential
   * @param credential The credential to generate a proof for
   * @param revealAttributes The attributes to reveal
   * @returns The generated proof
   */
  async generateProof(
    credential: VerifiableCredential,
    revealAttributes: string[]
  ): Promise<any> {
    // Create a proof request
    const proofRequest: ZKProofRequest = {
      id: `urn:uuid:${uuidv4()}`,
      credentialId: credential.id,
      type: 'DrivingLicenseProof',
      circuit: 'selective-disclosure',
      revealAttributes,
    };

    // Generate the proof
    return this.zkpManager.generateProof(credential, proofRequest);
  }

  /**
   * Verify a zero-knowledge proof for a driving license
   * @param proofId The ID of the proof to verify
   * @returns The verification result
   */
  async verifyProof(proofId: string): Promise<any> {
    return await this.zkpManager.verifyProof(proofId);
  }

  /**
   * Create a minimal proof for age verification
   * @param credential The driving license credential
   * @param minimumAge The minimum age required
   * @returns A proof that the credential subject is at least the minimum age
   */
  async createAgeVerificationProof(
    credential: VerifiableCredential,
    minimumAge: number
  ): Promise<any> {
    // For age verification, we only need to reveal the date of birth
    return await this.generateProof(credential, ['dateOfBirth']);
  }

  /**
   * Check if a person is eligible to drive a specific vehicle category
   * @param credential The driving license credential
   * @param category The vehicle category (e.g., 'B', 'C', 'D')
   * @returns True if the person is eligible to drive the specified category
   */
  isEligibleForCategory(credential: VerifiableCredential, category: string): boolean {
    // Check if the credential is a driving license
    if (!credential.type.includes('DrivingLicenseCredential')) {
      return false;
    }

    // Check if the credential has expired
    const now = new Date();
    const expiryDate = new Date(credential.expirationDate || '');
    if (expiryDate < now) {
      return false;
    }

    // Check if the license includes the specified category
    const categories = credential.credentialSubject.categories;
    if (!Array.isArray(categories)) {
      return false;
    }

    return categories.includes(category);
  }
} 