/**
 * Verifiable Credential Issuance and Verification
 * 
 * This module provides functionality for issuing, verifying, and managing verifiable credentials.
 * It supports different credential formats (JWT, JSON-LD) and integrates with the credential-hub service.
 */

import { v4 as uuidv4 } from 'uuid';
import { VerifiableCredential, CredentialStatus, Proof } from './types';
import axios from 'axios';
import jsonwebtoken from 'jsonwebtoken';

export interface CredentialIssuer {
  issue(credential: Partial<VerifiableCredential>): Promise<VerifiableCredential>;
  generateProof(credential: VerifiableCredential): Promise<Proof>;
}

export interface CredentialVerifier {
  verify(credential: VerifiableCredential): Promise<VerificationResult>;
  verifyProof(proof: Proof, credential: VerifiableCredential): Promise<boolean>;
}

export interface VerificationResult {
  verified: boolean;
  error?: string;
  checks: VerificationCheck[];
}

export interface VerificationCheck {
  check: string;
  valid: boolean;
  error?: string;
}

export interface CredentialServiceConfig {
  serviceEndpoint: string;
  apiKey?: string;
}

export class CredentialManager {
  private issuers: Map<string, CredentialIssuer> = new Map();
  private verifiers: Map<string, CredentialVerifier> = new Map();
  private serviceConfig?: CredentialServiceConfig;

  constructor(serviceConfig?: CredentialServiceConfig) {
    this.serviceConfig = serviceConfig;
  }

  /**
   * Register a credential issuer for a specific credential type
   * @param type The credential type
   * @param issuer The issuer implementation
   */
  registerIssuer(type: string, issuer: CredentialIssuer): void {
    this.issuers.set(type, issuer);
  }

  /**
   * Register a credential verifier for a specific credential type
   * @param type The credential type
   * @param verifier The verifier implementation
   */
  registerVerifier(type: string, verifier: CredentialVerifier): void {
    this.verifiers.set(type, verifier);
  }

  /**
   * Issue a new credential
   * @param type The credential type
   * @param data The credential data
   * @returns The issued verifiable credential
   */
  async issue(type: string, data: any): Promise<VerifiableCredential> {
    // Check if we have a registered issuer for this type
    const issuer = this.issuers.get(type);
    if (issuer) {
      return await issuer.issue(data);
    }

    // Fall back to service if configured
    if (this.serviceConfig) {
      return await this.issueWithService(type, data);
    }

    throw new Error(`No issuer available for credential type: ${type}`);
  }

  /**
   * Verify a credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verify(credential: VerifiableCredential): Promise<VerificationResult> {
    // Determine the credential type
    const type = this.getCredentialType(credential);
    
    // Check if we have a registered verifier for this type
    const verifier = this.verifiers.get(type);
    if (verifier) {
      return await verifier.verify(credential);
    }

    // Fall back to service if configured
    if (this.serviceConfig) {
      return await this.verifyWithService(credential);
    }

    throw new Error(`No verifier available for credential type: ${type}`);
  }

  /**
   * Check the status of a credential
   * @param credentialId The ID of the credential to check
   * @returns The current status of the credential
   */
  async checkStatus(credentialId: string): Promise<{ status: string; timestamp: string }> {
    if (!this.serviceConfig) {
      throw new Error('Credential service not configured');
    }

    try {
      const response = await axios.get(
        `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/status`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Error checking credential status: ${error.message}`);
    }
  }

  /**
   * Revoke a credential
   * @param credentialId The ID of the credential to revoke
   * @param reason The reason for revocation
   * @returns The result of the revocation
   */
  async revoke(credentialId: string, reason: string): Promise<{ success: boolean; message: string }> {
    if (!this.serviceConfig) {
      throw new Error('Credential service not configured');
    }

    try {
      const response = await axios.post(
        `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/revoke`,
        { reason },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Error revoking credential: ${error.message}`);
    }
  }

  /**
   * Create a credential status
   * @param type The type of status (e.g., 'RevocationList2020Status')
   * @returns A credential status object
   */
  createCredentialStatus(type: string): CredentialStatus {
    const statusId = `urn:uuid:${uuidv4()}`;
    return {
      id: statusId,
      type,
    };
  }

  /**
   * Get the credential type from a credential
   * @param credential The credential
   * @returns The credential type
   */
  private getCredentialType(credential: VerifiableCredential): string {
    // Extract the main credential type (excluding 'VerifiableCredential')
    const types = credential.type.filter(t => t !== 'VerifiableCredential');
    return types.length > 0 ? types[0] : 'VerifiableCredential';
  }

  /**
   * Issue a credential using the credential service
   * @param type The credential type
   * @param data The credential data
   * @returns The issued credential
   */
  private async issueWithService(type: string, data: any): Promise<VerifiableCredential> {
    if (!this.serviceConfig) {
      throw new Error('Credential service not configured');
    }

    try {
      const response = await axios.post(
        `${this.serviceConfig.serviceEndpoint}/credentials/issue`,
        {
          ...data,
          type: Array.isArray(data.type) ? data.type : [type],
        },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Error issuing credential: ${error.message}`);
    }
  }

  /**
   * Verify a credential using the credential service
   * @param credential The credential to verify
   * @returns The verification result
   */
  private async verifyWithService(credential: VerifiableCredential): Promise<VerificationResult> {
    if (!this.serviceConfig) {
      throw new Error('Credential service not configured');
    }

    try {
      const response = await axios.post(
        `${this.serviceConfig.serviceEndpoint}/credentials/verify`,
        { credential },
        this.getAuthHeaders()
      );
      
      return response.data;
    } catch (error: any) {
      return {
        verified: false,
        error: `Error verifying credential: ${error.message}`,
        checks: [],
      };
    }
  }

  /**
   * Get authentication headers for API requests
   * @returns Headers object with authentication
   */
  private getAuthHeaders() {
    const headers: Record<string, string> = {};
    if (this.serviceConfig?.apiKey) {
      headers['Authorization'] = `Bearer ${this.serviceConfig.apiKey}`;
    }
    return { headers };
  }
} 