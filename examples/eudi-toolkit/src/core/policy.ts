/**
 * Policy Management and Evaluation
 * 
 * This module provides functionality for managing and evaluating policies,
 * including CRUD operations and support for OPA WASM modules.
 */

import { v4 as uuidv4 } from 'uuid';
import { Policy, PolicyType, PolicyEvaluationRequest, PolicyEvaluationResult } from './types';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { execSync } from 'child_process';
import * as util from 'util';
import { exec as execCallback } from 'child_process';

// Promisify exec
const exec = util.promisify(execCallback);

export interface PolicyServiceConfig {
  serviceEndpoint: string;
  apiKey?: string;
}

export interface OPAWasmConfig {
  opaPath: string;
  wasmDir: string;
}

export class PolicyManager {
  private policies: Map<string, Policy> = new Map();
  private serviceConfig?: PolicyServiceConfig;
  private opaConfig?: OPAWasmConfig;

  constructor(serviceConfig?: PolicyServiceConfig, opaConfig?: OPAWasmConfig) {
    this.serviceConfig = serviceConfig;
    this.opaConfig = opaConfig;
  }

  /**
   * Create a policy
   * @param name The policy name
   * @param description The policy description
   * @param content The policy content
   * @param type The policy type
   * @returns The created policy
   */
  async createPolicy(
    name: string,
    description: string,
    content: string,
    type: PolicyType = PolicyType.REGO
  ): Promise<Policy> {
    const id = `policy-${uuidv4()}`;
    const now = new Date().toISOString();

    const policy: Policy = {
      id,
      name,
      description,
      content,
      type,
      created: now,
      updated: now,
    };

    // Store the policy
    this.policies.set(id, policy);
    
    // Log for debugging
    console.log(`Policy created and stored with ID: ${id}`);
    
    return policy;
  }

  /**
   * Get a policy by ID
   * @param id The policy ID
   * @returns The policy or null if not found
   */
  async getPolicy(id: string): Promise<Policy | null> {
    // Check local cache first
    if (this.policies.has(id)) {
      return this.policies.get(id) || null;
    }

    // If using service, get from there
    if (this.serviceConfig) {
      try {
        const response = await axios.get(
          `${this.serviceConfig.serviceEndpoint}/policies/${id}`,
          this.getAuthHeaders()
        );
        
        const policy = response.data;
        
        // Cache locally
        this.policies.set(id, policy);
        
        return policy;
      } catch (error) {
        console.error('Error getting policy:', error);
      }
    }

    return null;
  }

  /**
   * List all policies
   * @returns Array of policies
   */
  async listPolicies(): Promise<Policy[]> {
    // If using service, get from there
    if (this.serviceConfig) {
      try {
        const response = await axios.get(
          `${this.serviceConfig.serviceEndpoint}/policies`,
          this.getAuthHeaders()
        );
        
        const policies = response.data;
        
        // Cache locally
        for (const policy of policies) {
          this.policies.set(policy.id, policy);
        }
        
        return policies;
      } catch (error) {
        console.error('Error listing policies:', error);
      }
    }

    // Return from local cache
    return Array.from(this.policies.values());
  }

  /**
   * Update a policy
   * @param id The policy ID
   * @param updates The updates to apply
   * @returns The updated policy
   */
  async updatePolicy(
    id: string,
    updates: Partial<Policy>
  ): Promise<Policy> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Policy not found: ${id}`);
    }

    // Apply updates
    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      id: policy.id, // Ensure ID doesn't change
      updated: new Date().toISOString(),
    };

    // If content changed and the policy is in a service, update it
    if (updates.content && policy.type === PolicyType.REGO) {
      try {
        const servicePolicy = await this.updatePolicyInService(id, updatedPolicy.content);
        if (servicePolicy) {
          updatedPolicy.updated = servicePolicy.updated || updatedPolicy.updated;
        }
      } catch (error) {
        console.error(`Error updating policy in service: ${error}`);
      }
    }

    // Store the updated policy
    this.policies.set(id, updatedPolicy);
    return updatedPolicy;
  }

  /**
   * Delete a policy
   * @param id The policy ID
   * @returns True if deleted, false otherwise
   */
  async deletePolicy(id: string): Promise<boolean> {
    // If using service, delete there
    if (this.serviceConfig) {
      try {
        await axios.delete(
          `${this.serviceConfig.serviceEndpoint}/policies/${id}`,
          this.getAuthHeaders()
        );
      } catch (error) {
        console.error('Error deleting policy:', error);
        return false;
      }
    }

    // Delete from local cache
    return this.policies.delete(id);
  }

  /**
   * Evaluate a policy
   * @param request The evaluation request
   * @returns The evaluation result
   */
  async evaluatePolicy(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    // For demo purposes, we'll create a mock policy evaluation result
    // In a real implementation, this would use OPA to evaluate the policy
    
    try {
      // Try to get the policy (for demo, we'll just check if it exists)
      const policy = this.policies.get(request.policyId);
      if (!policy) {
        console.log(`Policy not found in map. Available policies: ${Array.from(this.policies.keys()).join(', ')}`);
        throw new Error(`Policy not found: ${request.policyId}`);
      }

      console.log(`Found policy: ${policy.name}`);

      // For demo purposes, implement some simple policy evaluation logic
      // This simulates a GDPR age verification policy
      if (request.input && request.input.purpose === 'age-verification') {
        const userConsent = request.input.user_consent === true;
        const age = request.input.data?.age;
        
        if (userConsent && age && typeof age === 'number' && age >= 18) {
          return {
            allow: true,
            reason: "Age verification passed and user consent given",
            data: { verified: true, age }
          };
        } else {
          return {
            allow: false,
            reason: !userConsent 
              ? "User consent not given" 
              : (!age 
                ? "Age not provided" 
                : "Age requirement not met"),
          };
        }
      }
      
      // Default response for demo purposes
      return {
        allow: true,
        reason: "Demo policy evaluation - allowed by default",
      };
    } catch (error: any) {
      return {
        allow: false,
        reason: `Error evaluating policy: ${error.message}`,
      };
    }
  }

  /**
   * Compile a Rego policy to WASM
   * @param policy The policy to compile
   * @returns The path to the compiled WASM file
   */
  private async compileRegoToWasm(policy: Policy): Promise<string | null> {
    if (!this.opaConfig) {
      throw new Error('OPA configuration not provided');
    }

    try {
      // Create a temporary file for the Rego policy
      const tempDir = path.join(this.opaConfig.wasmDir, 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      
      const regoFile = path.join(tempDir, `${policy.name.replace(/\s+/g, '_')}.rego`);
      fs.writeFileSync(regoFile, policy.content);

      // Compile to WASM
      const wasmFile = path.join(this.opaConfig.wasmDir, `${policy.id.replace(/:/g, '_')}.wasm`);
      
      execSync(`${this.opaConfig.opaPath} build -t wasm -o ${wasmFile} ${regoFile}`);
      
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return wasmFile;
    } catch (error: any) {
      console.error('Error compiling Rego to WASM:', error);
      return null;
    }
  }

  /**
   * Evaluate a Rego policy
   * @param policy The policy
   * @param input The input data
   * @returns The evaluation result
   */
  private async evaluateRegoPolicy(policy: Policy, input: any): Promise<PolicyEvaluationResult> {
    try {
      if (!this.opaConfig) {
        throw new Error('OPA configuration not provided');
      }

      // Create a temporary file for the input
      const tempDir = path.join(this.opaConfig.wasmDir, 'temp');
      fs.mkdirSync(tempDir, { recursive: true });
      
      const inputFile = path.join(tempDir, 'input.json');
      fs.writeFileSync(inputFile, JSON.stringify(input));
      
      // Create a temporary file for the policy
      const policyFile = path.join(tempDir, 'policy.rego');
      fs.writeFileSync(policyFile, policy.content);
      
      // Extract the package name
      const packageName = this.extractPackageName(policy.content);
      
      // Evaluate using OPA CLI
      const result = await exec(`${this.opaConfig.opaPath} eval --format=json --data=${policyFile} --input=${inputFile} "data.${packageName}"`);
      const parsedResult = JSON.parse(result.stdout);
      
      // Extract the result
      const allow = parsedResult.result?.[0]?.expressions?.[0]?.value?.allow === true;
      const reason = parsedResult.result?.[0]?.expressions?.[0]?.value?.reason || 
                    (allow ? 'Policy evaluation succeeded' : 'Policy evaluation failed');
      
      return {
        allow,
        reason,
        data: parsedResult.result?.[0]?.expressions?.[0]?.value || {}
      };
    } catch (error: any) {
      console.error('Error evaluating Rego policy:', error);
      return {
        allow: false,
        reason: `Error evaluating Rego policy: ${error.message}`,
        data: {}
      };
    }
  }

  /**
   * Evaluate a WASM policy
   * @param policy The policy
   * @param input The input data
   * @returns The evaluation result
   */
  private async evaluateWasmPolicy(policy: Policy, input: any): Promise<PolicyEvaluationResult> {
    // In a real implementation, this would use the @open-policy-agent/opa-wasm package
    // For this example, we'll simulate the evaluation
    
    console.log(`Simulating WASM policy evaluation for ${policy.id}`);
    
    // For demonstration, we'll parse the input and make a simple decision
    const userConsent = input.user?.consent === true;
    const purposeSpecified = input.purpose != null;
    const purposeAllowed = purposeSpecified && 
      Array.isArray(input.user?.allowed_purposes) && 
      input.user?.allowed_purposes.includes(input.purpose);
    
    const allow = userConsent && purposeSpecified && purposeAllowed;
    
    // Collect reasons
    const reasons: string[] = [];
    if (userConsent) {
      reasons.push('User has provided consent');
    } else {
      reasons.push('User has not provided consent');
    }
    
    if (purposeSpecified) {
      reasons.push(`Purpose "${input.purpose}" is specified`);
      if (purposeAllowed) {
        reasons.push(`Purpose "${input.purpose}" is allowed by user`);
      } else {
        reasons.push(`Purpose "${input.purpose}" is not allowed by user`);
      }
    } else {
      reasons.push('No purpose specified');
    }
    
    return {
      allow,
      reason: reasons.join(', '),
      data: {
        allow,
        userConsent,
        purposeSpecified,
        purposeAllowed
      }
    };
  }

  /**
   * Evaluate a JSON policy
   * @param policy The policy
   * @param input The input data
   * @returns The evaluation result
   */
  private async evaluateJsonPolicy(policy: Policy, input: any): Promise<PolicyEvaluationResult> {
    try {
      // Parse the policy content
      const policyRules = JSON.parse(policy.content);

      // Simple JSON policy evaluation logic
      // This is a placeholder implementation
      const allow = this.matchJsonPolicy(policyRules, input);

      return {
        allow,
        reason: allow ? 'Policy rules satisfied' : 'Policy rules not satisfied',
        data: { allow }
      };
    } catch (error: any) {
      return {
        allow: false,
        reason: `Error evaluating JSON policy: ${error.message}`,
        data: {}
      };
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

  /**
   * Match JSON policy against input
   * @param rules The policy rules
   * @param input The input data
   * @returns Whether the input matches the policy
   */
  private matchJsonPolicy(rules: any, input: any): boolean {
    // Implement the logic to match the JSON policy against the input
    // This is a placeholder and should be replaced with the actual implementation
    return false;
  }

  /**
   * Update a policy in the service
   * @param id The policy ID
   * @param content The updated content
   * @returns The updated policy or null if not found
   */
  private async updatePolicyInService(id: string, content: string): Promise<Policy | null> {
    // Implement the logic to update the policy in the service
    // This is a placeholder and should be replaced with the actual implementation
    return null;
  }
} 