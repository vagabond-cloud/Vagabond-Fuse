/**
 * SIM Registration Use Case
 * 
 * This module provides functionality for SIM card registration
 * using verifiable credentials.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface SIMRegistrationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  identificationNumber: string;
  idType: string; // passport, national ID, etc.
  address: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  contactEmail?: string;
  contactPhone?: string;
}

export interface SIMCardData {
  iccid: string; // Integrated Circuit Card Identifier
  msisdn: string; // Mobile Station International Subscriber Directory Number (phone number)
  imsi?: string; // International Mobile Subscriber Identity
  carrier: string;
  activationDate: string;
  expiryDate?: string;
  planType: string;
  planDetails?: {
    dataAllowance?: string;
    voiceAllowance?: string;
    smsAllowance?: string;
    roaming?: boolean;
  };
}

export class SIMRegistrationUseCase {
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
   * Issue a SIM registration credential
   * @param data The SIM registration data
   * @param issuerId The ID of the issuer (telecom authority)
   * @param subjectId The ID of the subject (SIM card holder)
   * @returns The issued credential
   */
  async issueSIMRegistration(
    data: SIMRegistrationData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/sim-registration/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'SIMRegistrationCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
      credentialSubject: {
        id: subjectId,
        type: 'SIMRegistration',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        identificationNumber: data.identificationNumber,
        idType: data.idType,
        address: data.address,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone
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

    console.log('SIM Registration Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a SIM card credential
   * @param data The SIM card data
   * @param issuerId The ID of the issuer (telecom provider)
   * @param subjectId The ID of the subject (SIM card holder)
   * @returns The issued credential
   */
  async issueSIMCard(
    data: SIMCardData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/sim-card/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'SIMCardCredential'],
      issuer: issuerId,
      issuanceDate: data.activationDate,
      expirationDate: data.expiryDate,
      credentialSubject: {
        id: subjectId,
        type: 'SIMCard',
        iccid: data.iccid,
        msisdn: data.msisdn,
        imsi: data.imsi,
        carrier: data.carrier,
        activationDate: data.activationDate,
        expiryDate: data.expiryDate,
        planType: data.planType,
        planDetails: data.planDetails
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

    console.log('SIM Card Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a SIM registration credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifySIMRegistration(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a SIM registration credential
    if (!credential.type.includes('SIMRegistrationCredential')) {
      return {
        verified: false,
        error: 'Not a SIM registration credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type SIMRegistrationCredential',
          },
        ],
      };
    }

    // Check if the registration has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'SIM registration has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'SIM registration expiration date has passed',
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
   * Generate a SIM registration proof for a new SIM card
   * @param registrationCredential The SIM registration credential
   * @returns A proof for SIM card registration
   */
  async generateSIMRegistrationProof(
    registrationCredential: VerifiableCredential
  ): Promise<any> {
    // For SIM registration, we need to reveal identity details
    return this.zkpManager.generateProof(
      registrationCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: registrationCredential.id,
        type: 'SIMRegistrationProof',
        circuit: 'selective-disclosure',
        revealAttributes: [
          'firstName',
          'lastName',
          'dateOfBirth',
          'identificationNumber',
          'idType',
          'address'
        ]
      }
    );
  }

  /**
   * Process a SIM card registration request
   * @param registrationCredential The SIM registration credential
   * @param msisdn The phone number to assign
   * @param carrier The telecom carrier
   * @returns The result of the SIM card registration process
   */
  async processSIMCardRegistration(
    registrationCredential: VerifiableCredential,
    msisdn: string,
    carrier: string
  ): Promise<{success: boolean; message: string; simData?: SIMCardData}> {
    // First verify the registration credential
    const verificationResult = await this.verifySIMRegistration(registrationCredential);
    
    if (!verificationResult.verified) {
      return {
        success: false,
        message: `SIM registration verification failed: ${verificationResult.error}`
      };
    }
    
    // For demo purposes, create a mock SIM card
    const simData: SIMCardData = {
      iccid: `89${Math.floor(10000000000000000000 + Math.random() * 90000000000000000000)}`,
      msisdn,
      imsi: `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
      carrier,
      activationDate: new Date().toISOString(),
      planType: 'Prepaid',
      planDetails: {
        dataAllowance: '5GB',
        voiceAllowance: '100 minutes',
        smsAllowance: '100 SMS',
        roaming: false
      }
    };
    
    return {
      success: true,
      message: 'SIM card registered successfully',
      simData
    };
  }
} 