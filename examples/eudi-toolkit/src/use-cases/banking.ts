/**
 * Banking Use Case
 * 
 * This module provides functionality for banking-related use cases
 * such as opening bank accounts using verifiable credentials.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface KYCData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  identificationDocument: {
    type: string; // passport, national ID, etc.
    number: string;
    issuingCountry: string;
    issueDate: string;
    expiryDate: string;
  };
  contactInformation: {
    email: string;
    phone: string;
  };
  riskAssessment?: {
    score: number;
    level: 'low' | 'medium' | 'high';
    date: string;
  };
}

export interface BankAccountData {
  accountType: string;
  accountNumber: string;
  currency: string;
  openingDate: string;
  status: 'active' | 'inactive' | 'suspended' | 'closed';
  bankName: string;
  bankIdentifier: string; // BIC, routing number, etc.
  branch?: string;
}

export class BankingUseCase {
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
   * Issue a KYC credential
   * @param data The KYC data
   * @param issuerId The ID of the issuer (KYC provider or financial institution)
   * @param subjectId The ID of the subject (customer)
   * @returns The issued credential
   */
  async issueKYCCredential(
    data: KYCData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/kyc/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'KYCCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      credentialSubject: {
        id: subjectId,
        type: 'KYC',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        address: data.address,
        identificationDocument: data.identificationDocument,
        contactInformation: data.contactInformation,
        riskAssessment: data.riskAssessment
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

    console.log('KYC Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a bank account credential
   * @param data The bank account data
   * @param issuerId The ID of the issuer (bank)
   * @param subjectId The ID of the subject (account holder)
   * @returns The issued credential
   */
  async issueBankAccount(
    data: BankAccountData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/bank-account/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'BankAccountCredential'],
      issuer: issuerId,
      issuanceDate: data.openingDate,
      expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
      credentialSubject: {
        id: subjectId,
        type: 'BankAccount',
        accountType: data.accountType,
        accountNumber: data.accountNumber,
        currency: data.currency,
        openingDate: data.openingDate,
        status: data.status,
        bankName: data.bankName,
        bankIdentifier: data.bankIdentifier,
        branch: data.branch
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

    console.log('Bank Account Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a KYC credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyKYCCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a KYC credential
    if (!credential.type.includes('KYCCredential')) {
      return {
        verified: false,
        error: 'Not a KYC credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type KYCCredential',
          },
        ],
      };
    }

    // Check if the KYC credential has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'KYC credential has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'KYC credential expiration date has passed',
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
   * Generate a KYC proof for opening a bank account
   * @param kycCredential The KYC credential
   * @returns A proof that the person has passed KYC checks
   */
  async generateKYCProof(
    kycCredential: VerifiableCredential
  ): Promise<any> {
    // For KYC verification, we need to reveal the person's identity and risk assessment
    return this.zkpManager.generateProof(
      kycCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: kycCredential.id,
        type: 'KYCProof',
        circuit: 'selective-disclosure',
        revealAttributes: [
          'firstName', 
          'lastName', 
          'dateOfBirth', 
          'nationality', 
          'address',
          'identificationDocument.type',
          'identificationDocument.number',
          'riskAssessment.level'
        ]
      }
    );
  }

  /**
   * Process a bank account opening request
   * @param kycCredential The KYC credential of the applicant
   * @param accountType The type of account to open
   * @param currency The currency of the account
   * @returns The result of the account opening process
   */
  async processBankAccountOpening(
    kycCredential: VerifiableCredential,
    accountType: string,
    currency: string
  ): Promise<{success: boolean; message: string; accountData?: BankAccountData}> {
    // First verify the KYC credential
    const verificationResult = await this.verifyKYCCredential(kycCredential);
    
    if (!verificationResult.verified) {
      return {
        success: false,
        message: `KYC verification failed: ${verificationResult.error}`
      };
    }
    
    // Check risk assessment if available
    const riskLevel = kycCredential.credentialSubject.riskAssessment?.level;
    if (riskLevel === 'high') {
      return {
        success: false,
        message: 'Account opening rejected due to high risk assessment'
      };
    }
    
    // For demo purposes, create a mock bank account
    const accountData: BankAccountData = {
      accountType,
      accountNumber: `ACCT-${Math.floor(10000000 + Math.random() * 90000000)}`,
      currency,
      openingDate: new Date().toISOString(),
      status: 'active',
      bankName: 'EUDI Demo Bank',
      bankIdentifier: 'EUDIBANKXXX'
    };
    
    return {
      success: true,
      message: 'Bank account opened successfully',
      accountData
    };
  }
} 