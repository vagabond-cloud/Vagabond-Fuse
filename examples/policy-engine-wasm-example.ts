/**
 * Example demonstrating how to use the Policy Engine with OPA WASM integration in TypeScript
 *
 * This example shows how to:
 * 1. Define a GDPR policy in Rego
 * 2. Compile the policy to WASM
 * 3. Evaluate data against the policy using a simulated evaluator
 * 4. Understand policy decisions and reasons
 *
 * Note: Full WebAssembly integration with OPA requires implementing all OPA builtins,
 * which is beyond the scope of this example. For a production implementation,
 * consider using the @open-policy-agent/opa-wasm package.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import { PolicyCompiler } from './mocks/policy-utils';

// Define TypeScript interfaces for our data structures
interface PolicyInput {
  user: {
    consent: boolean;
    allowed_purposes: string[];
  };
  purpose: string | null;
}

interface PolicyResult {
  allow: boolean;
  reasons: string[];
}

// Class for handling OPA WASM evaluation
class WasmPolicyEvaluator {
  private wasmDir: string;

  constructor(wasmDir: string) {
    this.wasmDir = wasmDir;
  }

  // Extract WASM module from OPA bundle
  private extractWasmFromBundle(
    bundlePath: string,
    outputDir: string
  ): string | null {
    try {
      // Create a temporary directory for extraction
      const extractDir = path.join(os.tmpdir(), 'opa_extract_' + Date.now());
      fs.mkdirSync(extractDir, { recursive: true });

      // Check if the file is gzipped
      const fileContent = fs.readFileSync(bundlePath);
      const isGzipped = fileContent[0] === 0x1f && fileContent[1] === 0x8b;

      // If gzipped, extract it first
      if (isGzipped) {
        console.log(`File ${bundlePath} is gzipped, decompressing...`);
        const decompressed = zlib.gunzipSync(fileContent);
        fs.writeFileSync(path.join(extractDir, 'bundle.tar'), decompressed);
      } else {
        // If it's a tar file directly
        console.log(`File ${bundlePath} is not gzipped, assuming tar format`);
        fs.copyFileSync(bundlePath, path.join(extractDir, 'bundle.tar'));
      }

      // Extract the tar file
      execSync(`tar -xf bundle.tar`, { cwd: extractDir });

      // Look for the wasm file in the extracted directory
      const wasmFiles = fs
        .readdirSync(extractDir)
        .filter((file) => file.endsWith('.wasm'));

      if (wasmFiles.length === 0) {
        console.error('No WASM file found in the bundle');
        return null;
      }

      // Copy the WASM file to the output directory
      const wasmFile = wasmFiles[0];
      const wasmPath = path.join(extractDir, wasmFile);
      const outputPath = path.join(outputDir, wasmFile);
      fs.copyFileSync(wasmPath, outputPath);

      // Clean up the extraction directory
      fs.rmSync(extractDir, { recursive: true, force: true });

      return outputPath;
    } catch (error) {
      console.error(`Error extracting WASM from bundle: ${error}`);
      return null;
    }
  }

  // Inspect a WASM file to understand its structure
  async inspectWasmFile(
    policyName: string,
    entrypoint: string = 'allow'
  ): Promise<void> {
    // Determine the WASM file path
    let wasmPath: string;
    if (entrypoint === 'allow') {
      wasmPath = path.join(this.wasmDir, `${policyName}.wasm`);
    } else {
      wasmPath = path.join(this.wasmDir, `${policyName}_${entrypoint}.wasm`);
    }

    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM module not found: ${wasmPath}`);
    }

    try {
      // Read the WASM file
      const wasmBytes = fs.readFileSync(wasmPath);

      // Debug: Print the first few bytes to understand the format
      console.log(
        `First bytes of ${wasmPath}:`,
        Array.from(wasmBytes.slice(0, 16))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')
      );

      // Check if this is an OPA bundle (tar.gz)
      if (wasmBytes[0] === 0x1f && wasmBytes[1] === 0x8b) {
        console.log('Detected gzipped file, attempting to extract WASM...');
        // Create a temporary directory for the extracted WASM
        const extractDir = path.join(os.tmpdir(), 'wasm_extract_' + Date.now());
        fs.mkdirSync(extractDir, { recursive: true });

        // Extract the WASM from the bundle
        const extractedWasmPath = this.extractWasmFromBundle(
          wasmPath,
          extractDir
        );

        if (!extractedWasmPath) {
          throw new Error('Failed to extract WASM from bundle');
        }

        // Read the extracted WASM
        const extractedWasmBytes = fs.readFileSync(extractedWasmPath);

        // Debug: Print the first few bytes of the extracted file
        console.log(
          `First bytes of extracted WASM:`,
          Array.from(extractedWasmBytes.slice(0, 16))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' ')
        );

        // Clean up
        fs.rmSync(extractDir, { recursive: true, force: true });

        console.log(
          `Successfully inspected WASM module: ${policyName}/${entrypoint}`
        );
        console.log(
          `Note: Full WebAssembly integration requires implementing all OPA builtins.`
        );
      } else {
        console.log(`File ${wasmPath} appears to be a raw WASM file`);
      }
    } catch (error) {
      console.error(`Error inspecting WASM module: ${error}`);
      throw error;
    }
  }

  // Evaluate data against a policy using a simulated evaluator
  async evaluate(policyName: string, data: any): Promise<PolicyResult> {
    console.log(`Simulating evaluation for policy: ${policyName}`);

    // Simulate policy evaluation based on GDPR rules
    const input = data as PolicyInput;

    // Check if user has consented
    const userConsent = input.user?.consent === true;

    // Check if purpose is specified
    const purposeSpecified =
      input.purpose !== null && input.purpose !== undefined;

    // Check if purpose is allowed
    const purposeAllowed =
      purposeSpecified &&
      input.user?.allowed_purposes?.includes(input.purpose as string);

    // Determine if the request is allowed
    const allowed = userConsent && purposeSpecified && purposeAllowed;

    // Collect reasons
    const reasons: string[] = [];

    if (userConsent) {
      reasons.push('User has provided consent');
    } else {
      reasons.push('User has not provided consent');
    }

    if (purposeSpecified) {
      reasons.push('Purpose is specified');
    } else {
      reasons.push('Purpose is not specified');
    }

    if (purposeSpecified) {
      if (purposeAllowed) {
        reasons.push('Purpose is allowed');
      } else {
        reasons.push('Purpose is not allowed');
      }
    }

    return {
      allow: allowed,
      reasons,
    };
  }
}

// Define the GDPR policy in Rego
const GDPR_POLICY = `
package gdpr

import future.keywords

# Default deny
default allow = false

# Allow if the user has consented to data processing
allow if {
    # Check if consent exists and is valid
    input.user.consent == true
    
    # Check if the purpose is specified
    input.purpose != null
    
    # Check if the purpose is allowed
    input.purpose in input.user.allowed_purposes
}

# Provide reasons for the decision
reasons contains "User has provided consent" if {
    input.user.consent == true
}

reasons contains "Purpose is specified" if {
    input.purpose != null
}

reasons contains "Purpose is allowed" if {
    input.purpose in input.user.allowed_purposes
}

reasons contains "User has not provided consent" if {
    input.user.consent != true
}

reasons contains "Purpose is not specified" if {
    input.purpose == null
}

reasons contains "Purpose is not allowed" if {
    input.purpose != null
    not input.purpose in input.user.allowed_purposes
}
`;

// Helper function to compile Rego to WASM
function compileRegoToWasm(regoContent: string, outputDir: string): string {
  // Create a temporary Rego file
  const tempDir = os.tmpdir();
  const regoPath = path.join(tempDir, 'gdpr.rego');
  fs.writeFileSync(regoPath, regoContent);

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Compile the allow rule - without the --disable-gzip flag
    const allowWasmPath = path.join(outputDir, 'gdpr.wasm');
    execSync(`opa build -t wasm -e gdpr/allow ${regoPath} -o ${allowWasmPath}`);

    // Compile the reasons rule - without the --disable-gzip flag
    const reasonsWasmPath = path.join(outputDir, 'gdpr_reasons.wasm');
    execSync(
      `opa build -t wasm -e gdpr/reasons ${regoPath} -o ${reasonsWasmPath}`
    );

    console.log(`Successfully compiled Rego to WASM in ${outputDir}`);
    return outputDir;
  } catch (error) {
    console.error(`Error compiling Rego to WASM: ${error}`);
    throw error;
  } finally {
    // Clean up the temporary Rego file
    fs.unlinkSync(regoPath);
  }
}

// Main function
async function main() {
  console.log('Policy Engine WASM Example (TypeScript)');
  console.log('--------------------------------------');

  // 1. Check if OPA is installed
  try {
    execSync('opa version', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: OPA CLI is not installed or not in PATH.');
    console.error(
      'Please install OPA from https://www.openpolicyagent.org/docs/latest/#1-download-opa'
    );
    process.exit(1);
  }

  // 2. Compile the GDPR policy to WASM
  console.log('\n1. Compiling GDPR policy to WASM...');
  const wasmDir = path.join(os.tmpdir(), 'policy_wasm_' + Date.now());

  try {
    compileRegoToWasm(GDPR_POLICY, wasmDir);
  } catch (error) {
    console.error('Failed to compile Rego to WASM. Exiting.');
    process.exit(1);
  }

  // 3. Create a policy evaluator
  console.log('\n2. Creating policy evaluator with the compiled WASM...');
  const evaluator = new WasmPolicyEvaluator(wasmDir);

  try {
    // Inspect the WASM modules
    await evaluator.inspectWasmFile('gdpr', 'allow');
    await evaluator.inspectWasmFile('gdpr', 'reasons');

    console.log(
      '\nNote: Full WebAssembly integration with OPA requires implementing all OPA builtins.'
    );
    console.log(
      'For a production implementation, consider using the @open-policy-agent/opa-wasm package.'
    );
    console.log('This example will use a simulated evaluator instead.');
  } catch (error) {
    console.error(`Error inspecting WASM modules: ${error}`);
  }

  // 4. Define test cases
  console.log('\n3. Defining test cases for GDPR policy evaluation...');
  const testCases = [
    {
      name: 'Valid consent and purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'marketing',
      },
    },
    {
      name: 'No consent',
      data: {
        user: {
          consent: false,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'marketing',
      },
    },
    {
      name: 'Missing purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: null,
      },
    },
    {
      name: 'Disallowed purpose',
      data: {
        user: {
          consent: true,
          allowed_purposes: ['marketing', 'analytics'],
        },
        purpose: 'profiling',
      },
    },
  ];

  // 5. Evaluate each test case
  console.log('\n4. Evaluating test cases...');

  for (const testCase of testCases) {
    console.log(`\nScenario: ${testCase.name}`);

    try {
      const result = await evaluator.evaluate('gdpr', testCase.data);

      console.log(`Access allowed: ${result.allow}`);
      console.log(`Reasons: ${result.reasons.join(', ')}`);

      // Explain the decision
      if (result.allow) {
        console.log(
          'Explanation: The request is allowed because the user has provided consent, ' +
            'the purpose is specified, and the purpose is allowed.'
        );
      } else {
        if (result.reasons.includes('User has not provided consent')) {
          console.log(
            'Explanation: The request is denied because the user has not provided consent.'
          );
        } else if (result.reasons.includes('Purpose is not specified')) {
          console.log(
            'Explanation: The request is denied because the purpose is not specified.'
          );
        } else if (result.reasons.includes('Purpose is not allowed')) {
          console.log(
            'Explanation: The request is denied because the purpose is not in the list of allowed purposes.'
          );
        }
      }
    } catch (error) {
      console.error(`Error evaluating policy: ${error}`);
    }
  }

  // 6. Clean up
  console.log('\n5. Cleaning up temporary files...');
  try {
    fs.rmSync(wasmDir, { recursive: true, force: true });
    console.log(`Removed temporary directory: ${wasmDir}`);
  } catch (error) {
    console.error(`Error cleaning up: ${error}`);
  }

  console.log('\nExample completed successfully!');
}

// Run the example
main().catch(console.error);
