/**
 * Healthcare Use Case
 * 
 * This module provides functionality for healthcare-related use cases
 * such as prescriptions and health insurance.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface PrescriptionData {
  patientName: string;
  patientId: string;
  dateOfBirth: string;
  prescriptionId: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    quantity: string;
    instructions?: string;
  }>;
  prescribedBy: string;
  prescriptionDate: string;
  validUntil: string;
  dispensingInstructions?: string;
  refills?: number;
}

export interface HealthInsuranceData {
  holderName: string;
  holderId: string;
  dateOfBirth: string;
  insuranceProvider: string;
  policyNumber: string;
  validFrom: string;
  validUntil: string;
  coverageType: string;
  coverageDetails?: {
    hospitalCoverage: boolean;
    dentalCoverage: boolean;
    visionCoverage: boolean;
    prescriptionCoverage: boolean;
    emergencyCoverage: boolean;
    internationalCoverage: boolean;
  };
  contactInformation?: {
    phone: string;
    email?: string;
    website?: string;
  };
}

export class HealthcareUseCase {
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
   * Issue a prescription credential
   * @param data The prescription data
   * @param issuerId The ID of the issuer (healthcare provider)
   * @param subjectId The ID of the subject (patient)
   * @returns The issued credential
   */
  async issuePrescription(
    data: PrescriptionData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/healthcare/prescription/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'PrescriptionCredential'],
      issuer: issuerId,
      issuanceDate: data.prescriptionDate,
      expirationDate: data.validUntil,
      credentialSubject: {
        id: subjectId,
        type: 'Prescription',
        patientName: data.patientName,
        patientId: data.patientId,
        dateOfBirth: data.dateOfBirth,
        prescriptionId: data.prescriptionId,
        medications: data.medications,
        prescribedBy: data.prescribedBy,
        prescriptionDate: data.prescriptionDate,
        validUntil: data.validUntil,
        dispensingInstructions: data.dispensingInstructions,
        refills: data.refills
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

    console.log('Prescription Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a health insurance credential
   * @param data The health insurance data
   * @param issuerId The ID of the issuer (insurance provider)
   * @param subjectId The ID of the subject (insurance holder)
   * @returns The issued credential
   */
  async issueHealthInsurance(
    data: HealthInsuranceData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/healthcare/insurance/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'HealthInsuranceCredential'],
      issuer: issuerId,
      issuanceDate: data.validFrom,
      expirationDate: data.validUntil,
      credentialSubject: {
        id: subjectId,
        type: 'HealthInsurance',
        holderName: data.holderName,
        holderId: data.holderId,
        dateOfBirth: data.dateOfBirth,
        insuranceProvider: data.insuranceProvider,
        policyNumber: data.policyNumber,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        coverageType: data.coverageType,
        coverageDetails: data.coverageDetails,
        contactInformation: data.contactInformation
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

    console.log('Health Insurance Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a prescription credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyPrescription(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a prescription credential
    if (!credential.type.includes('PrescriptionCredential')) {
      return {
        verified: false,
        error: 'Not a prescription credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type PrescriptionCredential',
          },
        ],
      };
    }

    // Check if the prescription has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Prescription has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Prescription expiration date has passed',
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
   * Verify a health insurance credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyHealthInsurance(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a health insurance credential
    if (!credential.type.includes('HealthInsuranceCredential')) {
      return {
        verified: false,
        error: 'Not a health insurance credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type HealthInsuranceCredential',
          },
        ],
      };
    }

    // Check if the insurance has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Health insurance has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Health insurance expiration date has passed',
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
   * Generate a prescription proof for pharmacy
   * @param prescriptionCredential The prescription credential
   * @returns A proof for the pharmacy to dispense medication
   */
  async generatePrescriptionProof(
    prescriptionCredential: VerifiableCredential
  ): Promise<any> {
    // For prescription verification, we need to reveal the medication details
    // but minimize exposure of patient's personal information
    return this.zkpManager.generateProof(
      prescriptionCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: prescriptionCredential.id,
        type: 'PrescriptionProof',
        circuit: 'selective-disclosure',
        revealAttributes: [
          'patientName',
          'prescriptionId',
          'medications',
          'prescribedBy',
          'prescriptionDate',
          'validUntil',
          'refills'
        ]
      }
    );
  }

  /**
   * Generate a health insurance coverage proof
   * @param insuranceCredential The health insurance credential
   * @param serviceType The type of healthcare service being requested
   * @returns A proof of insurance coverage for the specific service
   */
  async generateInsuranceCoverageProof(
    insuranceCredential: VerifiableCredential,
    serviceType: 'hospital' | 'dental' | 'vision' | 'prescription' | 'emergency' | 'international'
  ): Promise<any> {
    // Map service type to coverage field
    const coverageField = `coverageDetails.${serviceType}Coverage`;
    
    // Generate a proof revealing only necessary information
    return this.zkpManager.generateProof(
      insuranceCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: insuranceCredential.id,
        type: 'InsuranceCoverageProof',
        circuit: 'selective-disclosure',
        revealAttributes: [
          'holderName',
          'insuranceProvider',
          'policyNumber',
          'validFrom',
          'validUntil',
          'coverageType',
          coverageField
        ]
      }
    );
  }

  /**
   * Process a prescription dispensing
   * @param prescriptionCredential The prescription credential
   * @param medicationIndex The index of the medication to dispense
   * @returns The result of the dispensing process
   */
  async dispenseMedication(
    prescriptionCredential: VerifiableCredential,
    medicationIndex: number
  ): Promise<{success: boolean; message: string; dispensed?: any}> {
    // First verify the prescription
    const verificationResult = await this.verifyPrescription(prescriptionCredential);
    
    if (!verificationResult.verified) {
      return {
        success: false,
        message: `Prescription verification failed: ${verificationResult.error}`
      };
    }
    
    // Check if the medication exists
    const medications = prescriptionCredential.credentialSubject.medications;
    if (!medications || !medications[medicationIndex]) {
      return {
        success: false,
        message: `Medication not found at index ${medicationIndex}`
      };
    }
    
    // Check if there are refills available
    const refills = prescriptionCredential.credentialSubject.refills;
    if (refills !== undefined && refills <= 0) {
      return {
        success: false,
        message: 'No refills remaining for this prescription'
      };
    }
    
    // For demo purposes, return a successful dispensing
    const medication = medications[medicationIndex];
    return {
      success: true,
      message: 'Medication dispensed successfully',
      dispensed: {
        medication: medication.name,
        dosage: medication.dosage,
        quantity: medication.quantity,
        dispensedDate: new Date().toISOString(),
        instructions: medication.instructions || 'Take as directed'
      }
    };
  }
} 