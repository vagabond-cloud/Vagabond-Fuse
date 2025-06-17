/**
 * Organizational Identity Use Case
 * 
 * This module provides functionality for organizational identity credentials
 * and proving organizational representation.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface OrganizationData {
  name: string;
  legalName: string;
  identifier: string; // Legal identifier (e.g., VAT number, company registration)
  identifierType: string; // Type of identifier (e.g., "EU_VAT", "US_EIN")
  jurisdiction: string;
  address: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  website?: string;
  industry?: string;
  foundingDate?: string;
  contactEmail?: string;
}

export interface OrganizationalRoleData {
  personName: string;
  role: string;
  department?: string;
  employeeId?: string;
  permissions?: string[];
  startDate: string;
  endDate?: string;
}

export class OrganizationalIdentityUseCase {
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
   * Issue an organizational identity credential
   * @param data The organization data
   * @param issuerId The ID of the issuer (typically a trusted authority)
   * @param organizationDid The DID of the organization
   * @returns The issued credential
   */
  async issueOrganizationalIdentity(
    data: OrganizationData,
    issuerId: string,
    organizationDid: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/organization/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'OrganizationalIdentityCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years
      credentialSubject: {
        id: organizationDid,
        type: 'Organization',
        name: data.name,
        legalName: data.legalName,
        identifier: data.identifier,
        identifierType: data.identifierType,
        jurisdiction: data.jurisdiction,
        address: data.address,
        website: data.website,
        industry: data.industry,
        foundingDate: data.foundingDate,
        contactEmail: data.contactEmail
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

    console.log('Organizational Identity Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue an organizational role credential
   * @param data The organizational role data
   * @param issuerId The ID of the issuer (the organization)
   * @param personDid The DID of the person holding the role
   * @returns The issued credential
   */
  async issueOrganizationalRole(
    data: OrganizationalRoleData,
    issuerId: string,
    personDid: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/organizational-role/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'OrganizationalRoleCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: data.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year default
      credentialSubject: {
        id: personDid,
        type: 'OrganizationalRole',
        personName: data.personName,
        role: data.role,
        department: data.department,
        employeeId: data.employeeId,
        permissions: data.permissions || [],
        startDate: data.startDate,
        endDate: data.endDate,
        organizationId: issuerId
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

    console.log('Organizational Role Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify an organizational identity credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyOrganizationalIdentity(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is an organizational identity credential
    if (!credential.type.includes('OrganizationalIdentityCredential')) {
      return {
        verified: false,
        error: 'Not an organizational identity credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type OrganizationalIdentityCredential',
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
   * Verify an organizational role credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyOrganizationalRole(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is an organizational role credential
    if (!credential.type.includes('OrganizationalRoleCredential')) {
      return {
        verified: false,
        error: 'Not an organizational role credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type OrganizationalRoleCredential',
          },
        ],
      };
    }

    // Check if the role is still valid (not expired)
    if (credential.credentialSubject.endDate) {
      const now = new Date();
      const endDate = new Date(credential.credentialSubject.endDate);
      if (endDate < now) {
        return {
          verified: false,
          error: 'Role has expired',
          checks: [
            {
              check: 'expiry',
              valid: false,
              error: 'Role end date has passed',
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
   * Generate a proof of organizational representation
   * @param roleCredential The organizational role credential
   * @returns A proof that the person represents the organization
   */
  async generateOrganizationalProof(
    roleCredential: VerifiableCredential
  ): Promise<any> {
    // For organizational representation, we need to reveal the role and organization
    return this.zkpManager.generateProof(
      roleCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: roleCredential.id,
        type: 'OrganizationalRoleProof',
        circuit: 'selective-disclosure',
        revealAttributes: ['personName', 'role', 'organizationId', 'permissions']
      }
    );
  }
} 