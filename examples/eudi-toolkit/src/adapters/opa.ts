/**
 * OPA WASM Integration Adapter
 *
 * This adapter provides integration with Open Policy Agent (OPA) WASM modules
 * for policy evaluation.
 */

import { PolicyEvaluationResult } from '../core/types';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';

// In a real implementation, we would use the @open-policy-agent/opa-wasm package
// For this example, we'll simulate the functionality
interface OPAWasmInstance {
  evaluate(input: any): Promise<any>;
  setData(data: any): void;
}

export interface OPAConfig {
  opaPath: string;
  wasmDir: string;
  defaultPolicy?: string;
}

export class OPAAdapter {
  private config: OPAConfig;
  private wasmInstances: Map<string, OPAWasmInstance> = new Map();

  constructor(config: OPAConfig) {
    this.config = config;
  }

  /**
   * Initialize the OPA adapter
   */
  async initialize(): Promise<void> {
    try {
      // Create the WASM directory if it doesn't exist
      fs.mkdirSync(this.config.wasmDir, { recursive: true });

      // Load any existing WASM modules
      await this.loadWasmModules();

      console.log('OPA adapter initialized');
    } catch (error) {
      console.error('Error initializing OPA adapter:', error);
      throw error;
    }
  }

  /**
   * Load all WASM modules from the WASM directory
   */
  private async loadWasmModules(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.wasmDir);

      for (const file of files) {
        if (file.endsWith('.wasm')) {
          const policyId = file.replace('.wasm', '');
          await this.loadWasmModule(
            policyId,
            path.join(this.config.wasmDir, file)
          );
        }
      }
    } catch (error) {
      console.error('Error loading WASM modules:', error);
    }
  }

  /**
   * Load a specific WASM module
   * @param policyId The policy ID
   * @param wasmPath The path to the WASM file
   */
  private async loadWasmModule(
    policyId: string,
    wasmPath: string
  ): Promise<void> {
    try {
      // In a real implementation, this would use the @open-policy-agent/opa-wasm package
      // For this example, we'll create a simulated instance
      this.wasmInstances.set(
        policyId,
        this.createSimulatedWasmInstance(wasmPath)
      );
      console.log(`Loaded WASM module for policy: ${policyId}`);
    } catch (error) {
      console.error(`Error loading WASM module for policy ${policyId}:`, error);
    }
  }

  /**
   * Create a simulated WASM instance
   * @param wasmPath The path to the WASM file
   * @returns A simulated WASM instance
   */
  private createSimulatedWasmInstance(wasmPath: string): OPAWasmInstance {
    // In a real implementation, this would use the @open-policy-agent/opa-wasm package
    // For this example, we'll create a simulated instance that makes decisions based on file stats

    return {
      evaluate: async (input: any): Promise<any> => {
        // Get file stats to use for simulated evaluation
        const stats = fs.statSync(wasmPath);

        // Use the file size modulo 10 to determine the decision
        // (This is just for simulation purposes)
        const fileSize = stats.size;
        const allow = fileSize % 10 > 5;

        // Use the input to generate some reasons
        const reasons: string[] = [];

        if (input.user?.consent === true) {
          reasons.push('User has provided consent');
        } else {
          reasons.push('User has not provided consent');
        }

        if (input.purpose) {
          reasons.push(`Purpose "${input.purpose}" is specified`);

          if (
            Array.isArray(input.user?.allowed_purposes) &&
            input.user?.allowed_purposes.includes(input.purpose)
          ) {
            reasons.push(`Purpose "${input.purpose}" is allowed by user`);
          } else {
            reasons.push(`Purpose "${input.purpose}" is not allowed by user`);
          }
        } else {
          reasons.push('No purpose specified');
        }

        return {
          result: {
            allow,
            reasons,
          },
        };
      },
      setData: (data: any): void => {
        // In a real implementation, this would set policy data
        console.log(`Setting policy data for ${path.basename(wasmPath)}`);
      },
    };
  }

  /**
   * Compile a Rego policy to WASM
   * @param policyId The policy ID
   * @param regoContent The Rego policy content
   * @returns The path to the compiled WASM file
   */
  async compilePolicy(policyId: string, regoContent: string): Promise<string> {
    try {
      // Create a temporary file for the Rego policy
      const tempDir = path.join(this.config.wasmDir, 'temp');
      fs.mkdirSync(tempDir, { recursive: true });

      const regoFile = path.join(tempDir, `${policyId}.rego`);
      fs.writeFileSync(regoFile, regoContent);

      // Compile to WASM
      const wasmFile = path.join(this.config.wasmDir, `${policyId}.wasm`);

      execSync(
        `${this.config.opaPath} build -t wasm -o ${wasmFile} ${regoFile}`
      );

      // Load the compiled module
      await this.loadWasmModule(policyId, wasmFile);

      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });

      return wasmFile;
    } catch (error: any) {
      console.error('Error compiling policy:', error);
      throw new Error(`Error compiling policy: ${error.message}`);
    }
  }

  /**
   * Evaluate a policy
   * @param policy The policy content
   * @param input The input data
   * @returns The evaluation result
   */
  async evaluatePolicy(
    policy: string,
    input: any
  ): Promise<PolicyEvaluationResult> {
    try {
      // Create temporary files for policy and input
      const tempDir = path.join(this.config.wasmDir, 'temp');
      fs.mkdirSync(tempDir, { recursive: true });

      const policyFile = path.join(tempDir, 'policy.rego');
      const inputFile = path.join(tempDir, 'input.json');

      fs.writeFileSync(policyFile, policy);
      fs.writeFileSync(inputFile, JSON.stringify(input));

      // Extract the package name
      const packageName = this.extractPackageName(policy);

      // Evaluate using OPA CLI
      const result = await this.execOpa([
        'eval',
        '--format=json',
        `--data=${policyFile}`,
        `--input=${inputFile}`,
        `data.${packageName}`,
      ]);

      // Parse the result
      const parsedResult = JSON.parse(result);
      const allow =
        parsedResult.result?.[0]?.expressions?.[0]?.value?.allow === true;
      const reason =
        parsedResult.result?.[0]?.expressions?.[0]?.value?.reason ||
        (allow ? 'Policy evaluation succeeded' : 'Policy evaluation failed');

      return {
        allow,
        reason,
        data: parsedResult.result?.[0]?.expressions?.[0]?.value,
      };
    } catch (error: any) {
      return {
        allow: false,
        reason: `Error evaluating policy: ${error.message}`,
        data: {},
      };
    }
  }

  /**
   * Set policy data
   * @param policyId The policy ID
   * @param data The policy data
   */
  async setPolicyData(
    policyId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Get the WASM instance for the policy
      const instance = this.wasmInstances.get(policyId);

      if (!instance) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      // Set the data
      instance.setData(data);
    } catch (error: any) {
      console.error('Error setting policy data:', error);
      throw new Error(`Error setting policy data: ${error.message}`);
    }
  }

  /**
   * Get all available policies
   * @returns An array of policy IDs
   */
  getPolicyIds(): string[] {
    return Array.from(this.wasmInstances.keys());
  }

  /**
   * Check if a policy exists
   * @param policyId The policy ID
   * @returns True if the policy exists
   */
  hasPolicy(policyId: string): boolean {
    return this.wasmInstances.has(policyId);
  }

  /**
   * Delete a policy
   * @param policyId The policy ID
   * @returns True if the policy was deleted
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    try {
      // Remove the WASM instance
      this.wasmInstances.delete(policyId);

      // Delete the WASM file
      const wasmFile = path.join(this.config.wasmDir, `${policyId}.wasm`);
      if (fs.existsSync(wasmFile)) {
        fs.unlinkSync(wasmFile);
      }

      return true;
    } catch (error) {
      console.error('Error deleting policy:', error);
      return false;
    }
  }

  /**
   * Extract the package name from Rego content
   * @param regoContent The Rego content
   * @returns The package name
   */
  private extractPackageName(regoContent: string): string {
    const match = regoContent.match(/package\s+([a-zA-Z0-9_\.]+)/);
    return match ? match[1] : 'policy';
  }

  /**
   * Execute OPA CLI command
   * @param args The command arguments
   * @returns The command output
   */
  private async execOpa(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const opaPath = this.config.opaPath || 'opa';
      const child = spawn(opaPath, args);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data;
      });

      child.stderr.on('data', (data) => {
        stderr += data;
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`OPA command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }
}
