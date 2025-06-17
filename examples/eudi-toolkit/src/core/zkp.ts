/**
 * Zero-Knowledge Proof Generation and Verification
 *
 * This module provides functionality for generating and verifying zero-knowledge proofs
 * using SnarkJS. It supports selective disclosure of credential attributes.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ZKProof,
  ZKProofRequest,
  ZKProofResult,
  VerifiableCredential,
} from './types';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Re-export ZKProofRequest from types
export { ZKProofRequest } from './types';

export interface CircuitConfig {
  id: string;
  wasmPath: string;
  zkeyPath: string;
  verificationKeyPath: string;
}

export class ZKProofManager {
  private circuits: Map<string, CircuitConfig> = new Map();
  private proofs: Map<string, ZKProof> = new Map();
  private circuitsDir: string;

  constructor(circuitsDir: string) {
    this.circuitsDir = circuitsDir;
  }

  /**
   * Register a circuit for a specific proof type
   * @param circuitId The circuit ID
   * @param config The circuit configuration
   */
  registerCircuit(circuitId: string, config: CircuitConfig): void {
    this.circuits.set(circuitId, config);
  }

  /**
   * Load all circuits from the circuits directory
   */
  async loadCircuits(): Promise<void> {
    try {
      const files = fs.readdirSync(this.circuitsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const configPath = path.join(this.circuitsDir, file);
          const configContent = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent) as CircuitConfig;

          // Validate the config
          if (
            config.id &&
            config.wasmPath &&
            config.zkeyPath &&
            config.verificationKeyPath
          ) {
            this.registerCircuit(config.id, {
              ...config,
              wasmPath: path.join(this.circuitsDir, config.wasmPath),
              zkeyPath: path.join(this.circuitsDir, config.zkeyPath),
              verificationKeyPath: path.join(
                this.circuitsDir,
                config.verificationKeyPath
              ),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading circuits:', error);
    }
  }

  /**
   * Generate a zero-knowledge proof for a credential
   * @param credential The credential to generate a proof for
   * @param request The proof request
   * @returns The generated proof
   */
  async generateProof(
    credential: VerifiableCredential,
    request: ZKProofRequest
  ): Promise<ZKProof> {
    try {
      // For demo purposes, we'll create a mock proof
      // In a real implementation, this would use snarkjs to generate the proof

      // Extract the attributes to be revealed
      const revealedAttributes: Record<string, any> = {};
      for (const attr of request.revealAttributes) {
        if (attr.includes('.')) {
          // Handle nested attributes
          const parts = attr.split('.');
          let value: any = credential.credentialSubject;
          for (const part of parts) {
            if (value && typeof value === 'object') {
              value = value[part];
            } else {
              value = null;
              break;
            }
          }
          if (value !== null) {
            revealedAttributes[attr] = value;
          }
        } else if (credential.credentialSubject[attr] !== undefined) {
          revealedAttributes[attr] = credential.credentialSubject[attr];
        }
      }

      // Create a mock proof
      const proofId = request.id || `proof-${uuidv4()}`;
      const zkProof: ZKProof = {
        id: proofId,
        type: request.type || 'SelectiveDisclosure',
        credentialId: credential.id,
        circuit: request.circuit || 'demo-circuit',
        proof: {
          pi_a: ['mock_pi_a_1', 'mock_pi_a_2', 'mock_pi_a_3'],
          pi_b: [
            ['mock_pi_b_1', 'mock_pi_b_2'],
            ['mock_pi_b_3', 'mock_pi_b_4'],
            ['mock_pi_b_5', 'mock_pi_b_6'],
          ],
          pi_c: ['mock_pi_c_1', 'mock_pi_c_2', 'mock_pi_c_3'],
          protocol: 'groth16',
        },
        publicSignals: ['mock_signal_1', 'mock_signal_2'],
        revealedAttributes,
        created: new Date().toISOString(),
      };

      // Store the proof in memory
      this.proofs.set(proofId, zkProof);

      // For demo purposes, output the proof JWT
      console.log('ZKP JWT:');
      console.log(JSON.stringify(zkProof));

      return zkProof;
    } catch (error: any) {
      throw new Error(`Error generating proof: ${error.message}`);
    }
  }

  /**
   * Verify a zero-knowledge proof
   * @param proofId The ID of the proof to verify
   * @returns The verification result
   */
  async verifyProof(proofId: string): Promise<ZKProofResult> {
    try {
      // For demo purposes, we'll create a mock verification result
      // In a real implementation, this would use snarkjs to verify the proof

      // Simulate finding the proof
      if (proofId.startsWith('demo-proof-')) {
        // Return a successful verification for demo proofs
        return {
          verified: true,
          revealedAttributes: {
            age: 33,
            // Add other revealed attributes as needed
          },
        };
      }

      // Get the proof from memory (if it exists)
      const proof = this.proofs.get(proofId);
      if (!proof) {
        throw new Error(`Proof not found: ${proofId}`);
      }

      // For demo purposes, always return success for proofs we have in memory
      return {
        verified: true,
        revealedAttributes: proof.revealedAttributes,
      };
    } catch (error: any) {
      return {
        verified: false,
        error: `Error verifying proof: ${error.message}`,
      };
    }
  }

  /**
   * Determine which circuit to use based on the credential and revealed attributes
   * @param credential The credential
   * @param revealAttributes The attributes to reveal
   * @returns The circuit ID to use
   */
  private determineCircuit(
    credential: VerifiableCredential,
    revealAttributes: string[]
  ): string {
    // Get the credential type
    const types = credential.type.filter((t) => t !== 'VerifiableCredential');
    const credentialType = types.length > 0 ? types[0] : 'VerifiableCredential';

    // Check if we have a specific circuit for this credential type
    for (const [id, _] of this.circuits.entries()) {
      if (id.toLowerCase().includes(credentialType.toLowerCase())) {
        return id;
      }
    }

    // Fall back to a generic circuit based on the number of revealed attributes
    const revealCount = revealAttributes.length;
    for (const [id, _] of this.circuits.entries()) {
      if (id.toLowerCase().includes(`generic-${revealCount}`)) {
        return id;
      }
    }

    // Default to the first available circuit
    const firstCircuit = Array.from(this.circuits.keys())[0];
    if (firstCircuit) {
      return firstCircuit;
    }

    throw new Error('No suitable circuit found');
  }

  /**
   * Hash a credential for use in proofs
   * @param credential The credential to hash
   * @returns The hash of the credential
   */
  private hashCredential(credential: VerifiableCredential): string {
    // Create a deterministic representation of the credential
    const credentialString = JSON.stringify({
      id: credential.id,
      type: credential.type,
      issuer: credential.issuer,
      issuanceDate: credential.issuanceDate,
      credentialSubject: credential.credentialSubject,
    });

    // Hash the credential
    return crypto.createHash('sha256').update(credentialString).digest('hex');
  }
}
