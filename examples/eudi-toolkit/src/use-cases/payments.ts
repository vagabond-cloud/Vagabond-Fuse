/**
 * Payments Use Case
 * 
 * This module provides functionality for payment-related use cases
 * using verifiable credentials and digital identity.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface PaymentMethodData {
  type: 'card' | 'account' | 'wallet';
  name: string;
  issuingInstitution: string;
  identifier: string; // Masked PAN for cards, masked IBAN for accounts
  expiryDate?: string; // For cards
  currency?: string;
  country?: string;
}

export interface PaymentAuthorizationData {
  paymentMethodId: string;
  merchantName: string;
  amount: string;
  currency: string;
  timestamp: string;
  orderId?: string;
  description?: string;
}

export class PaymentsUseCase {
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
   * Issue a payment method credential
   * @param data The payment method data
   * @param issuerId The ID of the issuer (financial institution)
   * @param subjectId The ID of the subject (account holder)
   * @returns The issued credential
   */
  async issuePaymentMethod(
    data: PaymentMethodData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/payment-method/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'PaymentMethodCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: data.expiryDate || new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years default
      credentialSubject: {
        id: subjectId,
        type: 'PaymentMethod',
        paymentType: data.type,
        name: data.name,
        issuingInstitution: data.issuingInstitution,
        identifier: data.identifier,
        expiryDate: data.expiryDate,
        currency: data.currency,
        country: data.country
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

    console.log('Payment Method Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a payment authorization credential
   * @param data The payment authorization data
   * @param issuerId The ID of the issuer (wallet provider)
   * @param subjectId The ID of the subject (merchant)
   * @returns The issued credential
   */
  async issuePaymentAuthorization(
    data: PaymentAuthorizationData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/payment-authorization/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'PaymentAuthorizationCredential'],
      issuer: issuerId,
      issuanceDate: data.timestamp,
      expirationDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      credentialSubject: {
        id: subjectId,
        type: 'PaymentAuthorization',
        paymentMethodId: data.paymentMethodId,
        merchantName: data.merchantName,
        amount: data.amount,
        currency: data.currency,
        timestamp: data.timestamp,
        orderId: data.orderId,
        description: data.description,
        authorizationId: `auth-${uuidv4()}`
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

    console.log('Payment Authorization Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a payment method credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyPaymentMethod(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a payment method credential
    if (!credential.type.includes('PaymentMethodCredential')) {
      return {
        verified: false,
        error: 'Not a payment method credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type PaymentMethodCredential',
          },
        ],
      };
    }

    // Check if the payment method has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Payment method has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Payment method expiration date has passed',
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
   * Verify a payment authorization credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyPaymentAuthorization(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a payment authorization credential
    if (!credential.type.includes('PaymentAuthorizationCredential')) {
      return {
        verified: false,
        error: 'Not a payment authorization credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type PaymentAuthorizationCredential',
          },
        ],
      };
    }

    // Check if the authorization has expired
    if (credential.expirationDate) {
      const now = new Date();
      const expiryDate = new Date(credential.expirationDate);
      if (expiryDate < now) {
        return {
          verified: false,
          error: 'Payment authorization has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Authorization expiration date has passed',
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
   * Generate a payment authorization proof
   * @param paymentMethodCredential The payment method credential
   * @param authorizationData The payment authorization data
   * @returns A proof that the payment is authorized
   */
  async generatePaymentProof(
    paymentMethodCredential: VerifiableCredential,
    authorizationData: PaymentAuthorizationData
  ): Promise<any> {
    // For payment authorization, we need to reveal minimal payment method details
    // and combine with the authorization details
    
    const paymentMethodProof = await this.zkpManager.generateProof(
      paymentMethodCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: paymentMethodCredential.id,
        type: 'PaymentMethodProof',
        circuit: 'selective-disclosure',
        // Only reveal the type of payment method and masked identifier
        revealAttributes: ['paymentType', 'identifier', 'issuingInstitution']
      }
    );
    
    // Create a combined proof for payment
    return {
      id: `payment-proof-${uuidv4()}`,
      type: 'PaymentProof',
      paymentMethodProof,
      authorization: {
        merchantName: authorizationData.merchantName,
        amount: authorizationData.amount,
        currency: authorizationData.currency,
        timestamp: authorizationData.timestamp,
        authorizationId: `auth-${uuidv4()}`
      },
      created: new Date().toISOString(),
      proofValue: `mock_payment_proof_${uuidv4()}`
    };
  }
} 