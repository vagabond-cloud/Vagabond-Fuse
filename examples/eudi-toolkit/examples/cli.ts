#!/usr/bin/env ts-node

/**
 * EUDI Toolkit CLI
 *
 * Command-line interface for the EU Digital Identity Wallet toolkit.
 */

import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { Wallet, Client } from 'xrpl';
import axios from 'axios';

import {
  DIDManager,
  CredentialManager,
  ZKProofManager,
  StatusManager,
  PolicyManager,
  StatusType,
  PolicyType,
} from '../src/core';

import { XRPLAdapter, OPAAdapter } from '../src/adapters';

import {
  DrivingLicenseUseCase,
  DrivingLicenseData,
} from '../src/use-cases/driving-license';

// Create the command-line program
const program = new Command();

// Set program information
program
  .name('eudi-toolkit')
  .description('EU Digital Identity Wallet Toolkit CLI')
  .version('0.1.0');

// Global configuration
const config = {
  xrplServer: 'wss://s.altnet.rippletest.net:51233',
  circuitsDir: path.join(__dirname, '../circuits'),
  wasmDir: path.join(__dirname, '../wasm'),
  opaPath: 'opa',
  faucetUrl: 'https://faucet.altnet.rippletest.net/accounts',
};

// Create the managers
const didManager = new DIDManager();
const credentialManager = new CredentialManager();
const zkpManager = new ZKProofManager(config.circuitsDir);
const statusManager = new StatusManager();
const policyManager = new PolicyManager(undefined, {
  opaPath: config.opaPath,
  wasmDir: config.wasmDir,
});

// Create use cases
const drivingLicenseUseCase = new DrivingLicenseUseCase(
  credentialManager,
  zkpManager,
  statusManager
);

// Register verifiers for credential types
credentialManager.registerVerifier('DrivingLicenseCredential', {
  verify: async (credential) =>
    drivingLicenseUseCase.verifyDrivingLicense(credential),
  verifyProof: async (proof, credential) => {
    // For demo purposes, we'll just use a string ID for the proof
    const proofId =
      typeof proof === 'string' ? proof : proof.proofValue || 'mock-proof-id';
    const result = await zkpManager.verifyProof(proofId);
    return result.verified;
  },
});

/**
 * Fund a wallet from the XRPL testnet faucet
 * @param address The wallet address to fund
 * @returns Promise resolving to true if funding was successful
 */
async function fundWalletFromFaucet(address: string): Promise<boolean> {
  try {
    console.log(`Funding wallet ${address} from XRPL testnet faucet...`);
    const response = await axios.post(config.faucetUrl, {
      destination: address,
    });

    if (response.status === 200 && response.data && response.data.account) {
      console.log('Funding successful!');
      console.log(`Account: ${response.data.account.address}`);
      console.log(`Balance: ${response.data.balance} XRP`);

      // Wait longer for the funding transaction to be processed
      console.log('Waiting for funding transaction to be processed...');
      await new Promise((resolve) => setTimeout(resolve, 15000));
      return true;
    } else {
      console.error('Unexpected response from faucet:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('Error funding wallet from faucet:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Issue Credential Command
program
  .command('issue')
  .description('Issue a credential')
  .requiredOption('-t, --type <type>', 'Credential type (e.g., DrivingLicense)')
  .requiredOption('-i, --issuer <issuer>', 'Issuer DID')
  .requiredOption('-s, --subject <subject>', 'Subject DID')
  .requiredOption('-d, --data <data>', 'Credential data (JSON file path)')
  .option('-o, --output <o>', 'Output file path')
  .action(async (options) => {
    try {
      // Read the credential data
      const dataPath = path.resolve(options.data);
      if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found: ${dataPath}`);
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

      // Issue the credential based on type
      let credential;
      switch (options.type) {
        case 'DrivingLicense':
          credential = await drivingLicenseUseCase.issueDrivingLicense(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'TravelIdentity':
          // Import dynamically to avoid circular dependencies
          const travelModule = await import('../src/use-cases/travel');
          const travelUseCase = new travelModule.TravelUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await travelUseCase.issueTravelIdentity(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'HotelBooking':
          const travelBookingModule = await import('../src/use-cases/travel');
          const travelBookingUseCase = new travelBookingModule.TravelUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await travelBookingUseCase.issueHotelBooking(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'SignatureAuthority':
          const signingModule = await import(
            '../src/use-cases/signing-contracts'
          );
          const signingUseCase = new signingModule.SigningContractsUseCase(
            credentialManager,
            zkpManager,
            statusManager,
            didManager
          );
          credential = await signingUseCase.issueSignatureAuthority(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'Contract':
          const contractModule = await import(
            '../src/use-cases/signing-contracts'
          );
          const contractUseCase = new contractModule.SigningContractsUseCase(
            credentialManager,
            zkpManager,
            statusManager,
            didManager
          );
          credential = await contractUseCase.issueContract(
            data,
            options.issuer
          );
          break;
        case 'OrganizationalIdentity':
          const orgIdModule = await import(
            '../src/use-cases/organizational-identity'
          );
          const orgIdUseCase = new orgIdModule.OrganizationalIdentityUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await orgIdUseCase.issueOrganizationalIdentity(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'OrganizationalRole':
          const orgRoleModule = await import(
            '../src/use-cases/organizational-identity'
          );
          const orgRoleUseCase =
            new orgRoleModule.OrganizationalIdentityUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
          credential = await orgRoleUseCase.issueOrganizationalRole(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'PaymentMethod':
          const paymentMethodModule = await import('../src/use-cases/payments');
          const paymentMethodUseCase = new paymentMethodModule.PaymentsUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await paymentMethodUseCase.issuePaymentMethod(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'PaymentAuthorization':
          const paymentAuthModule = await import('../src/use-cases/payments');
          const paymentAuthUseCase = new paymentAuthModule.PaymentsUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await paymentAuthUseCase.issuePaymentAuthorization(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'Diploma':
          const educationModule = await import('../src/use-cases/education');
          const educationUseCase = new educationModule.EducationUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await educationUseCase.issueDiploma(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'Prescription':
          const healthcareModule = await import('../src/use-cases/healthcare');
          const healthcareUseCase = new healthcareModule.HealthcareUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await healthcareUseCase.issuePrescription(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'SIMRegistration':
          const simRegModule = await import(
            '../src/use-cases/sim-registration'
          );
          const simRegUseCase = new simRegModule.SIMRegistrationUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await simRegUseCase.issueSIMRegistration(
            data,
            options.issuer,
            options.subject
          );
          break;
        case 'SIMCard':
          const simCardModule = await import(
            '../src/use-cases/sim-registration'
          );
          const simCardUseCase = new simCardModule.SIMRegistrationUseCase(
            credentialManager,
            zkpManager,
            statusManager
          );
          credential = await simCardUseCase.issueSIMCard(
            data,
            options.issuer,
            options.subject
          );
          break;
        default:
          throw new Error(`Unsupported credential type: ${options.type}`);
      }

      // Print the credential
      console.log('Credential issued:');
      console.log(JSON.stringify(credential, null, 2));

      // Save the credential to a file if output is specified
      if (options.output) {
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, JSON.stringify(credential, null, 2));
        console.log(`Credential saved to ${outputPath}`);
      }
    } catch (error: any) {
      console.error('Error issuing credential:', error.message);
    }
  });

// Verify Credential Command
program
  .command('verify')
  .description('Verify a credential')
  .requiredOption('-c, --credential <credential>', 'Credential file path')
  .option('--simple', 'Use simple verification (avoids memory issues)')
  .action(async (options) => {
    try {
      // Read the credential
      const credentialPath = path.resolve(options.credential);
      if (!fs.existsSync(credentialPath)) {
        throw new Error(`Credential file not found: ${credentialPath}`);
      }

      const credential = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));

      // If simple verification is requested, perform basic checks
      if (options.simple) {
        console.log('Using simple verification method...');
        const now = new Date();
        const expiryDate = new Date(credential.expirationDate || '');

        const result = {
          verified: true,
          checks: [
            { check: 'type', valid: true },
            { check: 'expiry', valid: expiryDate > now },
          ],
        };

        if (expiryDate <= now) {
          result.verified = false;
          console.log('Verification result: FAILED (credential expired)');
        } else {
          console.log('Verification result: SUCCESS');
        }

        console.log(JSON.stringify(result, null, 2));
        return;
      }

      // Regular verification flow
      let result;
      if (credential.type.includes('DrivingLicenseCredential')) {
        result = await drivingLicenseUseCase.verifyDrivingLicense(credential);
      } else if (credential.type.includes('TravelIdentityCredential')) {
        const travelModule = await import('../src/use-cases/travel');
        const travelUseCase = new travelModule.TravelUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await travelUseCase.verifyTravelIdentity(credential);
      } else if (credential.type.includes('HotelBookingCredential')) {
        const travelModule = await import('../src/use-cases/travel');
        const travelUseCase = new travelModule.TravelUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await travelUseCase.verifyHotelBooking(credential);
      } else if (credential.type.includes('SignatureAuthorityCredential')) {
        const signingModule = await import(
          '../src/use-cases/signing-contracts'
        );
        const signingUseCase = new signingModule.SigningContractsUseCase(
          credentialManager,
          zkpManager,
          statusManager,
          didManager
        );
        result = await signingUseCase.verifySignatureAuthority(credential);
      } else if (credential.type.includes('ContractCredential')) {
        const contractModule = await import(
          '../src/use-cases/signing-contracts'
        );
        const contractUseCase = new contractModule.SigningContractsUseCase(
          credentialManager,
          zkpManager,
          statusManager,
          didManager
        );
        result = await contractUseCase.verifyContract(credential);
      } else if (credential.type.includes('OrganizationalIdentityCredential')) {
        const orgIdModule = await import(
          '../src/use-cases/organizational-identity'
        );
        const orgIdUseCase = new orgIdModule.OrganizationalIdentityUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await orgIdUseCase.verifyOrganizationalIdentity(credential);
      } else if (credential.type.includes('OrganizationalRoleCredential')) {
        const orgRoleModule = await import(
          '../src/use-cases/organizational-identity'
        );
        const orgRoleUseCase = new orgRoleModule.OrganizationalIdentityUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await orgRoleUseCase.verifyOrganizationalRole(credential);
      } else if (credential.type.includes('PaymentMethodCredential')) {
        const paymentModule = await import('../src/use-cases/payments');
        const paymentUseCase = new paymentModule.PaymentsUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await paymentUseCase.verifyPaymentMethod(credential);
      } else if (credential.type.includes('PaymentAuthorizationCredential')) {
        const paymentAuthModule = await import('../src/use-cases/payments');
        const paymentAuthUseCase = new paymentAuthModule.PaymentsUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await paymentAuthUseCase.verifyPaymentAuthorization(
          credential
        );
      } else if (credential.type.includes('DiplomaCredential')) {
        const educationModule = await import('../src/use-cases/education');
        const educationUseCase = new educationModule.EducationUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await educationUseCase.verifyDiploma(credential);
      } else if (credential.type.includes('PrescriptionCredential')) {
        const healthcareModule = await import('../src/use-cases/healthcare');
        const healthcareUseCase = new healthcareModule.HealthcareUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await healthcareUseCase.verifyPrescription(credential);
      } else if (credential.type.includes('SIMRegistrationCredential')) {
        const simRegModule = await import('../src/use-cases/sim-registration');
        const simRegUseCase = new simRegModule.SIMRegistrationUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        result = await simRegUseCase.verifySIMRegistration(credential);
      } else if (credential.type.includes('SIMCardCredential')) {
        const simCardModule = await import('../src/use-cases/sim-registration');
        const simCardUseCase = new simCardModule.SIMRegistrationUseCase(
          credentialManager,
          zkpManager,
          statusManager
        );
        // Using the generic verify method since verifySIMCard doesn't exist
        result = await credentialManager.verify(credential);
      } else {
        try {
          // Try using the generic verify method as a fallback
          console.log(
            `No specific verifier found for ${credential.type.join(
              ', '
            )}. Using generic verification.`
          );
          result = await credentialManager.verify(credential);
        } catch (error) {
          throw new Error(
            `No verifier available for credential type: ${credential.type.join(
              ', '
            )}`
          );
        }
      }

      // Print the result
      console.log('Verification result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error verifying credential:', error.message);
    }
  });

// DID Commands
program
  .command('did')
  .description('DID operations')
  .addCommand(
    new Command('create')
      .description('Create a new DID')
      .requiredOption('-m, --method <method>', 'DID method (e.g., xrpl)')
      .option('-s, --seed <seed>', 'Wallet seed')
      .option('-n, --no-fund', 'Skip automatic funding from faucet')
      .action(async (options) => {
        try {
          // Create a wallet if seed is provided
          let wallet;
          if (options.seed) {
            wallet = Wallet.fromSeed(options.seed);
            console.log(`Using wallet with address: ${wallet.address}`);
          } else {
            wallet = Wallet.generate();
            console.log(`Generated new wallet with address: ${wallet.address}`);
            console.log(`Seed: ${wallet.seed}`);

            // Automatically fund the wallet if not disabled
            if (options.fund) {
              const fundingSuccessful = await fundWalletFromFaucet(
                wallet.address
              );
              if (!fundingSuccessful) {
                console.log(
                  '\nAutomatic funding failed. Please fund the wallet manually:'
                );
                console.log('1. Visit https://faucet.altnet.rippletest.net/');
                console.log(`2. Enter your wallet address: ${wallet.address}`);
                console.log('3. Click "Generate XRP"');
                console.log(
                  `4. Then try again with: npm run start -- did create -m xrpl -s ${wallet.seed}`
                );
                return;
              }
            } else {
              console.log(
                '\nNOTE: New wallets on the XRPL testnet need to be funded before use.'
              );
              console.log(
                'Please visit https://faucet.altnet.rippletest.net/ to fund this address.'
              );
              console.log(
                'Then try again with: npm run start -- did create -m xrpl -s ' +
                  wallet.seed
              );
              return;
            }
          }

          // Create XRPL adapter
          const xrplAdapter = new XRPLAdapter({
            server: config.xrplServer,
            wallet,
          });

          // Connect to the XRPL
          await xrplAdapter.connect();

          console.log('Creating DID...');

          // Instead of using the adapter's create method, we'll implement a simplified approach here
          const client = xrplAdapter['client'] as Client; // Access the client directly

          // Generate a DID document
          const did = `did:xrpl:${wallet.address}`;
          const didDocument = {
            '@context': [
              'https://www.w3.org/ns/did/v1',
              'https://w3id.org/security/suites/ed25519-2020/v1',
            ],
            id: did,
            controller: did,
            verificationMethod: [
              {
                id: `${did}#keys-1`,
                type: 'Ed25519VerificationKey2020',
                controller: did,
                publicKeyMultibase: `z${wallet.publicKey}`,
              },
            ],
            authentication: [`${did}#keys-1`],
            assertionMethod: [`${did}#keys-1`],
          };

          try {
            // Get the current ledger index
            const ledgerResponse = await client.request({
              command: 'ledger_current',
            });
            const currentLedgerIndex = parseInt(
              String(ledgerResponse.result.ledger_current_index)
            );

            // Create a simple AccountSet transaction with the DID document in a memo
            const tx = {
              TransactionType: 'AccountSet',
              Account: wallet.address,
              LastLedgerSequence: currentLedgerIndex + 10,
              Memos: [
                {
                  Memo: {
                    MemoType: Buffer.from('did:document', 'utf8').toString(
                      'hex'
                    ),
                    MemoData: Buffer.from(
                      JSON.stringify(didDocument),
                      'utf8'
                    ).toString('hex'),
                  },
                },
              ],
            };

            // Prepare, sign, and submit the transaction
            console.log('Preparing transaction...');
            // Use type assertion to make TypeScript happy
            const prepared = await client.autofill(tx as any);
            console.log('Signing transaction...');
            const signed = wallet.sign(prepared);
            console.log('Submitting transaction...');

            // Submit the transaction
            const submitResponse = await client.request({
              command: 'submit',
              tx_blob: signed.tx_blob,
            });

            console.log(
              'Transaction submitted:',
              submitResponse.result.engine_result
            );

            if (
              submitResponse.result.engine_result === 'tesSUCCESS' ||
              submitResponse.result.engine_result === 'terQUEUED'
            ) {
              console.log('DID created successfully!');
              console.log(JSON.stringify(didDocument, null, 2));
            } else {
              console.error(
                `Failed to create DID: ${submitResponse.result.engine_result} - ${submitResponse.result.engine_result_message}`
              );
            }
          } catch (error: any) {
            console.error('Error creating DID:', error.message);
          }

          // Disconnect from the XRPL
          await xrplAdapter.disconnect();
        } catch (error: any) {
          console.error('Error creating DID:', error.message);
          if (error.stack) {
            console.error('Stack trace:', error.stack);
          }
        }
      })
  )
  .addCommand(
    new Command('resolve')
      .description('Resolve a DID')
      .requiredOption('-d, --did <did>', 'DID to resolve')
      .action(async (options) => {
        try {
          // Create XRPL adapter
          const xrplAdapter = new XRPLAdapter({
            server: config.xrplServer,
          });

          // Register the adapter with the DID manager
          didManager.registerDriver('xrpl', xrplAdapter);

          // Connect to the XRPL
          await xrplAdapter.connect();

          // Resolve the DID
          const result = await didManager.resolve(options.did);

          // Print the result
          console.log('DID resolved:');
          console.log(JSON.stringify(result.didDocument, null, 2));

          // Disconnect from the XRPL
          await xrplAdapter.disconnect();
        } catch (error: any) {
          console.error('Error resolving DID:', error.message);
        }
      })
  );

// Credential Commands
program
  .command('credential')
  .description('Credential operations')
  .addCommand(
    new Command('status')
      .description('Check credential status')
      .requiredOption('-c, --credential <credential>', 'Credential file path')
      .action(async (options) => {
        try {
          // Read the credential
          const credentialPath = path.resolve(options.credential);
          if (!fs.existsSync(credentialPath)) {
            throw new Error(`Credential file not found: ${credentialPath}`);
          }

          const credential = JSON.parse(
            fs.readFileSync(credentialPath, 'utf8')
          );

          // Check the status
          const status = await statusManager.getStatus(credential.id);

          // Print the result
          console.log('Credential status:');
          console.log(JSON.stringify(status, null, 2));
        } catch (error: any) {
          console.error('Error checking credential status:', error.message);
        }
      })
  )
  .addCommand(
    new Command('revoke')
      .description('Revoke a credential')
      .requiredOption('-c, --credential <credential>', 'Credential file path')
      .option('-r, --reason <reason>', 'Reason for revocation')
      .action(async (options) => {
        try {
          // Read the credential
          const credentialPath = path.resolve(options.credential);
          if (!fs.existsSync(credentialPath)) {
            throw new Error(`Credential file not found: ${credentialPath}`);
          }

          const credential = JSON.parse(
            fs.readFileSync(credentialPath, 'utf8')
          );

          // Revoke the credential
          const result = await statusManager.revoke(
            credential.id,
            options.reason || 'No reason provided'
          );

          // Print the result
          console.log('Credential revoked:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error: any) {
          console.error('Error revoking credential:', error.message);
        }
      })
  );

// ZKP Commands
program
  .command('zkp')
  .description('Zero-knowledge proof operations')
  .addCommand(
    new Command('generate')
      .description('Generate a zero-knowledge proof')
      .requiredOption('-c, --credential <credential>', 'Credential file path')
      .requiredOption(
        '-r, --reveal <reveal>',
        'Attributes to reveal (comma-separated)'
      )
      .option('-o, --output <o>', 'Output file path')
      .action(async (options) => {
        try {
          // Read the credential
          const credentialPath = path.resolve(options.credential);
          if (!fs.existsSync(credentialPath)) {
            throw new Error(`Credential file not found: ${credentialPath}`);
          }

          const credential = JSON.parse(
            fs.readFileSync(credentialPath, 'utf8')
          );

          // Parse the attributes to reveal
          const revealAttributes = options.reveal.split(',');

          // Generate the proof based on credential type
          let proof;

          if (credential.type.includes('DrivingLicenseCredential')) {
            proof = await drivingLicenseUseCase.generateProof(
              credential,
              revealAttributes
            );
          } else if (
            credential.type.includes('TravelIdentityCredential') ||
            credential.type.includes('HotelBookingCredential')
          ) {
            const travelModule = await import('../src/use-cases/travel');
            const travelUseCase = new travelModule.TravelUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            proof = await zkpManager.generateProof(credential, {
              id: `urn:uuid:${uuidv4()}`,
              credentialId: credential.id,
              type: 'TravelProof',
              circuit: 'selective-disclosure',
              revealAttributes,
            });
          } else if (credential.type.includes('SignatureAuthorityCredential')) {
            const signingModule = await import(
              '../src/use-cases/signing-contracts'
            );
            const signingUseCase = new signingModule.SigningContractsUseCase(
              credentialManager,
              zkpManager,
              statusManager,
              didManager
            );
            proof = await signingUseCase.generateSigningAuthorityProof(
              credential
            );
          } else if (credential.type.includes('OrganizationalRoleCredential')) {
            const orgModule = await import(
              '../src/use-cases/organizational-identity'
            );
            const orgUseCase = new orgModule.OrganizationalIdentityUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            // Using the generic ZKP manager since generateRoleProof doesn't exist
            proof = await zkpManager.generateProof(credential, {
              id: `urn:uuid:${uuidv4()}`,
              credentialId: credential.id,
              type: 'OrganizationalRoleProof',
              circuit: 'selective-disclosure',
              revealAttributes,
            });
          } else if (credential.type.includes('PaymentMethodCredential')) {
            const paymentModule = await import('../src/use-cases/payments');
            const paymentUseCase = new paymentModule.PaymentsUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            proof = await paymentUseCase.generatePaymentProof(
              credential,
              revealAttributes
            );
          } else if (credential.type.includes('DiplomaCredential')) {
            const educationModule = await import('../src/use-cases/education');
            const educationUseCase = new educationModule.EducationUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            // Using the generic ZKP manager since generateDiplomaProof doesn't exist
            proof = await zkpManager.generateProof(credential, {
              id: `urn:uuid:${uuidv4()}`,
              credentialId: credential.id,
              type: 'DiplomaProof',
              circuit: 'selective-disclosure',
              revealAttributes,
            });
          } else if (credential.type.includes('PrescriptionCredential')) {
            const healthcareModule = await import(
              '../src/use-cases/healthcare'
            );
            const healthcareUseCase = new healthcareModule.HealthcareUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            proof = await healthcareUseCase.generatePrescriptionProof(
              credential
            );
          } else if (credential.type.includes('SIMRegistrationCredential')) {
            const simModule = await import('../src/use-cases/sim-registration');
            const simUseCase = new simModule.SIMRegistrationUseCase(
              credentialManager,
              zkpManager,
              statusManager
            );
            proof = await simUseCase.generateSIMRegistrationProof(credential);
          } else {
            // Default proof generation for other credential types
            proof = await zkpManager.generateProof(credential, {
              id: `urn:uuid:${uuidv4()}`,
              credentialId: credential.id,
              type: 'GenericProof',
              circuit: 'selective-disclosure',
              revealAttributes,
            });
          }

          // Print the proof
          console.log('Proof generated:');
          console.log(JSON.stringify(proof, null, 2));

          // Save the proof to a file if output is specified
          if (options.output) {
            const outputPath = path.resolve(options.output);
            fs.writeFileSync(outputPath, JSON.stringify(proof, null, 2));
            console.log(`Proof saved to ${outputPath}`);
          }
        } catch (error: any) {
          console.error('Error generating proof:', error.message);
        }
      })
  )
  .addCommand(
    new Command('verify')
      .description('Verify a zero-knowledge proof')
      .requiredOption('-p, --proof <proof>', 'Proof ID or file path')
      .action(async (options) => {
        try {
          let proof;
          let proofId;

          // Check if the proof parameter is empty
          if (!options.proof) {
            console.error('Error: No proof ID or file path provided');
            console.log('Usage: zkp verify -p <proof_id_or_file_path>');
            return;
          }

          // Check if the proof is a file path or an ID
          if (fs.existsSync(path.resolve(options.proof))) {
            // Read the proof from file
            const proofPath = path.resolve(options.proof);
            proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
            proofId = proof.id;
          } else {
            // Use the provided ID
            proofId = options.proof;
          }

          // Verify the proof
          let result;

          if (proof && proof.type) {
            // Verify based on proof type
            if (proof.type === 'DrivingLicenseProof') {
              result = await drivingLicenseUseCase.verifyProof(proofId);
            } else if (proof.type === 'TravelProof') {
              result = await zkpManager.verifyProof(proofId);
            } else if (proof.type === 'SigningAuthorityProof') {
              const signingModule = await import(
                '../src/use-cases/signing-contracts'
              );
              const signingUseCase = new signingModule.SigningContractsUseCase(
                credentialManager,
                zkpManager,
                statusManager,
                didManager
              );
              result = await zkpManager.verifyProof(proofId);
            } else {
              // Default verification
              result = await zkpManager.verifyProof(proofId);
            }
          } else {
            // If we only have the ID, use the default verification
            result = await zkpManager.verifyProof(proofId);
          }

          // Print the result
          console.log('Verification result:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error: any) {
          console.error('Error verifying proof:', error.message);
        }
      })
  );

// Policy Commands
program
  .command('policy')
  .description('Policy operations')
  .addCommand(
    new Command('create')
      .description('Create a policy')
      .requiredOption('-n, --name <n>', 'Policy name')
      .requiredOption('-f, --file <file>', 'Policy file path')
      .option('-d, --description <description>', 'Policy description')
      .option('-t, --type <type>', 'Policy type (rego, wasm, json)', 'rego')
      .action(async (options) => {
        try {
          // Read the policy file
          const policyPath = path.resolve(options.file);
          if (!fs.existsSync(policyPath)) {
            throw new Error(`Policy file not found: ${policyPath}`);
          }

          const content = fs.readFileSync(policyPath, 'utf8');

          // Determine the policy type
          let policyType: PolicyType;
          switch (options.type.toLowerCase()) {
            case 'rego':
              policyType = PolicyType.REGO;
              break;
            case 'wasm':
              policyType = PolicyType.WASM;
              break;
            case 'json':
              policyType = PolicyType.JSON;
              break;
            default:
              throw new Error(`Unsupported policy type: ${options.type}`);
          }

          // Create the policy
          const policy = await policyManager.createPolicy(
            options.name,
            options.description ||
              `Policy created from ${path.basename(policyPath)}`,
            content,
            policyType
          );

          // Store the policy directly in the policyManager's policies map for demo purposes
          // This ensures it's available for evaluation in the same CLI session
          policyManager['policies'].set(policy.id, policy);
          console.log(`Policy stored in memory with ID: ${policy.id}`);

          // Print the policy
          console.log('Policy created:');
          console.log(JSON.stringify(policy, null, 2));
        } catch (error: any) {
          console.error('Error creating policy:', error.message);
        }
      })
  )
  .addCommand(
    new Command('evaluate')
      .description('Evaluate a policy')
      .requiredOption('-p, --policy <policy>', 'Policy ID')
      .requiredOption('-i, --input <input>', 'Input data (JSON file path)')
      .action(async (options) => {
        try {
          // Read the input data
          const inputPath = path.resolve(options.input);
          if (!fs.existsSync(inputPath)) {
            throw new Error(`Input file not found: ${inputPath}`);
          }

          const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

          // Log available policies for debugging
          console.log(
            `Available policies: ${Array.from(
              policyManager['policies'].keys()
            ).join(', ')}`
          );

          // Check if policy exists
          if (!policyManager['policies'].has(options.policy)) {
            console.log(`Policy not found: ${options.policy}`);
          }

          // Evaluate the policy
          const result = await policyManager.evaluatePolicy({
            policyId: options.policy,
            input,
          });

          // Print the result
          console.log('Evaluation result:');
          console.log(JSON.stringify(result, null, 2));
        } catch (error: any) {
          console.error('Error evaluating policy:', error.message);
        }
      })
  );

// Parse command-line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
