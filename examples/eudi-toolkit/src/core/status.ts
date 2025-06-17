/**
 * Credential Status Management
 * 
 * This module provides functionality for managing credential status,
 * including revocation, suspension, and status verification.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialStatus } from './types';
import axios from 'axios';

export enum StatusType {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired'
}

export interface StatusEntry {
  id: string;
  credentialId: string;
  status: StatusType;
  reason?: string;
  timestamp: string;
  expirationDate?: string;
}

export interface StatusList {
  id: string;
  type: string;
  statusPurpose: string;
  encodedList: string;
}

export interface StatusServiceConfig {
  serviceEndpoint: string;
  apiKey?: string;
}

export class StatusManager {
  private statusEntries: Map<string, StatusEntry> = new Map();
  private serviceConfig?: StatusServiceConfig;

  constructor(serviceConfig?: StatusServiceConfig) {
    this.serviceConfig = serviceConfig;
  }

  /**
   * Create a new status entry for a credential
   * @param credentialId The ID of the credential
   * @param status The initial status
   * @param expirationDate Optional expiration date
   * @returns The created status entry
   */
  createStatus(credentialId: string, status: StatusType = StatusType.ACTIVE, expirationDate?: string): StatusEntry {
    const statusId = `urn:uuid:${uuidv4()}`;
    const entry: StatusEntry = {
      id: statusId,
      credentialId,
      status,
      timestamp: new Date().toISOString(),
      expirationDate
    };

    this.statusEntries.set(statusId, entry);
    return entry;
  }

  /**
   * Get the status of a credential
   * @param credentialId The ID of the credential
   * @returns The status entry or null if not found
   */
  async getStatus(credentialId: string): Promise<StatusEntry | null> {
    // First check local cache
    for (const entry of this.statusEntries.values()) {
      if (entry.credentialId === credentialId) {
        return entry;
      }
    }

    // If not found locally, check the service
    if (this.serviceConfig) {
      try {
        const response = await axios.get(
          `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/status`,
          this.getAuthHeaders()
        );
        
        const statusData = response.data;
        
        // Convert service response to StatusEntry
        const entry: StatusEntry = {
          id: statusData.id || `urn:uuid:${uuidv4()}`,
          credentialId,
          status: statusData.status as StatusType,
          reason: statusData.reason,
          timestamp: statusData.timestamp || new Date().toISOString(),
          expirationDate: statusData.expirationDate
        };
        
        // Cache the result
        this.statusEntries.set(entry.id, entry);
        
        return entry;
      } catch (error) {
        console.error('Error getting credential status:', error);
      }
    }

    return null;
  }

  /**
   * Update the status of a credential
   * @param credentialId The ID of the credential
   * @param status The new status
   * @param reason Optional reason for the status change
   * @returns The updated status entry
   */
  async updateStatus(credentialId: string, status: StatusType, reason?: string): Promise<StatusEntry | null> {
    // Find the existing entry
    let entry: StatusEntry | null = null;
    for (const e of this.statusEntries.values()) {
      if (e.credentialId === credentialId) {
        entry = e;
        break;
      }
    }

    // If not found locally, get from service
    if (!entry && this.serviceConfig) {
      entry = await this.getStatus(credentialId);
    }

    // If still not found, create a new entry
    if (!entry) {
      entry = this.createStatus(credentialId, status);
    } else {
      // Update the entry
      entry.status = status;
      entry.reason = reason;
      entry.timestamp = new Date().toISOString();
      this.statusEntries.set(entry.id, entry);
    }

    // Update the status in the service if configured
    if (this.serviceConfig) {
      try {
        let endpoint = `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/status`;
        
        // Use specific endpoints for revocation and suspension
        if (status === StatusType.REVOKED) {
          endpoint = `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/revoke`;
        } else if (status === StatusType.SUSPENDED) {
          endpoint = `${this.serviceConfig.serviceEndpoint}/credentials/${credentialId}/suspend`;
        }
        
        const response = await axios.post(
          endpoint,
          { status, reason },
          this.getAuthHeaders()
        );
        
        // Update with service response
        const statusData = response.data;
        if (statusData.timestamp) {
          entry.timestamp = statusData.timestamp;
        }
      } catch (error) {
        console.error('Error updating credential status:', error);
      }
    }

    return entry;
  }

  /**
   * Revoke a credential
   * @param credentialId The ID of the credential to revoke
   * @param reason The reason for revocation
   * @returns The updated status entry
   */
  async revoke(credentialId: string, reason?: string): Promise<StatusEntry | null> {
    return this.updateStatus(credentialId, StatusType.REVOKED, reason);
  }

  /**
   * Suspend a credential
   * @param credentialId The ID of the credential to suspend
   * @param reason The reason for suspension
   * @returns The updated status entry
   */
  async suspend(credentialId: string, reason?: string): Promise<StatusEntry | null> {
    return this.updateStatus(credentialId, StatusType.SUSPENDED, reason);
  }

  /**
   * Reactivate a suspended credential
   * @param credentialId The ID of the credential to reactivate
   * @returns The updated status entry
   */
  async reactivate(credentialId: string): Promise<StatusEntry | null> {
    return this.updateStatus(credentialId, StatusType.ACTIVE);
  }

  /**
   * Create a status list credential
   * @param statusPurpose The purpose of the status list (e.g., 'revocation')
   * @param entries The status entries to include
   * @returns A status list
   */
  createStatusList(statusPurpose: string, entries: StatusEntry[]): StatusList {
    // Create a bit string representation of the status list
    // In a real implementation, this would be a compressed bitmap
    const encodedList = this.encodeStatusList(entries);
    
    return {
      id: `urn:uuid:${uuidv4()}`,
      type: 'StatusList2021',
      statusPurpose,
      encodedList
    };
  }

  /**
   * Encode a list of status entries as a bit string
   * @param entries The status entries to encode
   * @returns An encoded status list
   */
  private encodeStatusList(entries: StatusEntry[]): string {
    // In a real implementation, this would create a compressed bitmap
    // For simplicity, we'll just create a JSON representation
    const statusMap: Record<string, boolean> = {};
    
    for (const entry of entries) {
      // For revocation lists, true means revoked
      statusMap[entry.credentialId] = entry.status !== StatusType.ACTIVE;
    }
    
    // Base64 encode the JSON string
    return Buffer.from(JSON.stringify(statusMap)).toString('base64');
  }

  /**
   * Create a credential status object for a credential
   * @param statusListId The ID of the status list
   * @param statusPurpose The purpose of the status (e.g., 'revocation')
   * @param statusListIndex The index in the status list
   * @returns A credential status object
   */
  createCredentialStatus(statusListId: string, statusPurpose: string, statusListIndex: string): CredentialStatus {
    return {
      id: statusListId,
      type: 'StatusList2021Entry',
      statusListIndex,
      statusListCredential: statusListId
    };
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