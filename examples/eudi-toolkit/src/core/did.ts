/**
 * DID Resolution and Management
 * 
 * This module provides functionality for creating, resolving, updating, and deactivating DIDs.
 * It supports multiple DID methods with a focus on XRPL integration.
 */

import { DIDDocument, DIDResolutionResult, DIDResolutionMetadata, DIDDocumentMetadata } from './types';

// Re-export DIDResolutionResult from types
export { DIDResolutionResult } from './types';

/**
 * DID Create Options interface
 */
export interface DIDCreateOptions {
  [key: string]: any;
}

/**
 * DID Adapter interface for implementing DID method drivers
 */
export interface DIDAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  create(options: DIDCreateOptions): Promise<DIDResolutionResult>;
  resolve(did: string): Promise<DIDResolutionResult>;
  update(did: string, document: DIDDocument): Promise<DIDResolutionResult>;
  delete(did: string): Promise<boolean>;
}

export interface DIDDriver {
  create(document?: Partial<DIDDocument>): Promise<DIDResolutionResult>;
  resolve(did: string): Promise<DIDResolutionResult>;
  update(did: string, document: Partial<DIDDocument>): Promise<DIDResolutionResult>;
  deactivate(did: string): Promise<DIDResolutionResult>;
  setWalletAdapter(adapter: any): void;
}

export interface DIDResolver {
  resolve(did: string): Promise<DIDResolutionResult>;
  supports(did: string): boolean;
}

export class DIDManager {
  private drivers: Map<string, DIDDriver> = new Map();
  private resolvers: Map<string, DIDResolver> = new Map();

  /**
   * Register a DID driver for a specific method
   * @param method The DID method (e.g., 'xrpl', 'ion', 'key')
   * @param driver The driver implementation
   */
  registerDriver(method: string, driver: DIDDriver): void {
    this.drivers.set(method, driver);
  }

  /**
   * Register a DID resolver for a specific method
   * @param method The DID method (e.g., 'xrpl', 'ion', 'key')
   * @param resolver The resolver implementation
   */
  registerResolver(method: string, resolver: DIDResolver): void {
    this.resolvers.set(method, resolver);
  }

  /**
   * Create a new DID with the specified method
   * @param method The DID method to use
   * @param document Optional partial DID document
   * @returns The resolution result with the created DID document
   */
  async create(method: string, document?: Partial<DIDDocument>): Promise<DIDResolutionResult> {
    const driver = this.drivers.get(method);
    if (!driver) {
      return this.createErrorResult(`Unsupported DID method: ${method}`);
    }

    try {
      return await driver.create(document);
    } catch (error: any) {
      return this.createErrorResult(`Error creating DID: ${error.message}`);
    }
  }

  /**
   * Resolve a DID to its DID document
   * @param did The DID to resolve
   * @returns The resolution result with the DID document
   */
  async resolve(did: string): Promise<DIDResolutionResult> {
    const method = this.extractMethod(did);
    if (!method) {
      return this.createErrorResult('Invalid DID format');
    }

    // First try using a registered resolver
    const resolver = this.resolvers.get(method);
    if (resolver && resolver.supports(did)) {
      try {
        return await resolver.resolve(did);
      } catch (error: any) {
        // If resolver fails, try with driver as fallback
      }
    }

    // Fall back to driver
    const driver = this.drivers.get(method);
    if (!driver) {
      return this.createErrorResult(`Unsupported DID method: ${method}`);
    }

    try {
      return await driver.resolve(did);
    } catch (error: any) {
      return this.createErrorResult(`Error resolving DID: ${error.message}`);
    }
  }

  /**
   * Update a DID document
   * @param did The DID to update
   * @param document The partial document with updates
   * @returns The resolution result with the updated DID document
   */
  async update(did: string, document: Partial<DIDDocument>): Promise<DIDResolutionResult> {
    const method = this.extractMethod(did);
    if (!method) {
      return this.createErrorResult('Invalid DID format');
    }

    const driver = this.drivers.get(method);
    if (!driver) {
      return this.createErrorResult(`Unsupported DID method: ${method}`);
    }

    try {
      return await driver.update(did, document);
    } catch (error: any) {
      return this.createErrorResult(`Error updating DID: ${error.message}`);
    }
  }

  /**
   * Deactivate a DID
   * @param did The DID to deactivate
   * @returns The resolution result with the deactivated DID document
   */
  async deactivate(did: string): Promise<DIDResolutionResult> {
    const method = this.extractMethod(did);
    if (!method) {
      return this.createErrorResult('Invalid DID format');
    }

    const driver = this.drivers.get(method);
    if (!driver) {
      return this.createErrorResult(`Unsupported DID method: ${method}`);
    }

    try {
      return await driver.deactivate(did);
    } catch (error: any) {
      return this.createErrorResult(`Error deactivating DID: ${error.message}`);
    }
  }

  /**
   * Set a wallet adapter for a specific DID method
   * @param method The DID method
   * @param adapter The wallet adapter to use
   */
  setWalletAdapter(method: string, adapter: any): void {
    const driver = this.drivers.get(method);
    if (driver) {
      driver.setWalletAdapter(adapter);
    }
  }

  /**
   * Extract the method from a DID
   * @param did The DID to extract the method from
   * @returns The method or null if invalid format
   */
  private extractMethod(did: string): string | null {
    const match = did.match(/^did:([a-zA-Z0-9]+):/);
    return match ? match[1] : null;
  }

  /**
   * Create an error result for DID resolution
   * @param message The error message
   * @returns A DID resolution result with error
   */
  private createErrorResult(message: string): DIDResolutionResult {
    return {
      didDocument: null,
      didResolutionMetadata: {
        error: 'notFound',
        message,
      },
      didDocumentMetadata: {},
    };
  }
} 