// Simple test script for credential verification
import * as fs from 'fs';
import * as path from 'path';

// Import the necessary modules
import { CredentialManager, ZKProofManager, StatusManager } from './src/core';
import { DrivingLicenseUseCase } from './src/use-cases/driving-license';

async function main() {
  try {
    // Create instances of the managers
    const credentialManager = new CredentialManager();
    const zkpManager = new ZKProofManager('./circuits');
    const statusManager = new StatusManager();
    
    // Create the driving license use case
    const drivingLicenseUseCase = new DrivingLicenseUseCase(
      credentialManager,
      zkpManager,
      statusManager
    );
    
    // Register the verifier
    credentialManager.registerVerifier('DrivingLicenseCredential', {
      verify: async (credential) => drivingLicenseUseCase.verifyDrivingLicense(credential),
      verifyProof: async (proof, credential) => {
        const proofId = typeof proof === 'string' ? proof : (proof.proofValue || 'mock-proof-id');
        const result = await zkpManager.verifyProof(proofId);
        return result.verified;
      }
    });

    // Read the credential file
    const credentialPath = path.resolve('./credential.json');
    console.log(`Reading credential from ${credentialPath}`);
    const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    
    console.log('Credential loaded successfully');
    console.log(`Type: ${credential.type.join(', ')}`);
    
    // Verify the credential
    console.log('Verifying credential...');
    const result = await credentialManager.verify(credential);
    
    // Print the result
    console.log('Verification result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result.verified;
  } catch (error: any) {
    console.error('Error verifying credential:', error.message);
    return false;
  }
}

main()
  .then((verified) => {
    console.log(`Verification ${verified ? 'succeeded' : 'failed'}`);
    process.exit(verified ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 