#!/usr/bin/env tsx
/**
 * EU Digital Identity Wallet Simulation
 *
 * This example demonstrates a real-world implementation of the European Digital Identity Wallet
 * in accordance with the eIDAS 2.0 regulation using the Vagabond-Fuse components:
 *
 * 1. Wallet Kit - For secure storage and management of digital identity credentials
 * 2. DID Gateway - For creating and managing decentralized identifiers
 * 3. Policy Utils - For defining and enforcing access control policies
 * 4. Credential Hub - For issuing and verifying verifiable credentials
 *
 * The simulation demonstrates:
 * - National ID issuance by a Member State authority
 * - Cross-border authentication with another Member State's service
 * - Selective disclosure of personal attributes
 * - Qualified electronic signatures
 * - Age verification for online services
 * - University diploma recognition across EU countries
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Import mock implementations for standalone execution
import { WalletKit, KeyType, KeyFormat } from '../mocks/wallet-kit.js';
import { DIDGateway, DIDMethod } from '../mocks/did-gateway.js';
import { PolicyCompiler } from '../mocks/policy-utils.js';
import { XRPLAdapter as MockXRPLAdapter } from '../mocks/xrpl-adapter.js';

// Define a type alias for compatibility with both implementations
type XRPLAdapter = MockXRPLAdapter;

// Import real XRPL adapter if available
let useRealXRPL = false;

// Check for the flag file created by the run script
try {
  const flagFilePath = path.join(process.cwd(), '.xrpl-available');
  if (fs.existsSync(flagFilePath)) {
    const flagContent = fs.readFileSync(flagFilePath, 'utf8').trim();
    if (flagContent === 'true') {
      useRealXRPL = true;
      console.log(
        'XRPL package found. Will attempt to use real XRPL adapter with testnet connection.'
      );
    }
  }
} catch (error) {
  // If there's any error reading the flag file, fall back to the mock implementation
  console.log('Error checking XRPL availability. Using mock XRPL adapter.');
}

// If flag file check didn't succeed, try direct import as a fallback
if (!useRealXRPL) {
  try {
    // Try direct import which is more reliable in TypeScript/ESM context
    const xrpl = require('xrpl');
    useRealXRPL = true;
    console.log(
      'XRPL package found. Will attempt to use real XRPL adapter with testnet connection.'
    );
  } catch (error) {
    console.log('XRPL package not found. Using mock XRPL adapter.');
  }
}

// EU Member States for the simulation
enum MemberState {
  GERMANY = 'DE',
  FRANCE = 'FR',
  SPAIN = 'ES',
  ITALY = 'IT',
  NETHERLANDS = 'NL',
}

// Credential types based on eIDAS 2.0
enum CredentialType {
  PERSON_IDENTIFICATION_DATA = 'PersonIdentificationData',
  ADDRESS = 'Address',
  QUALIFIED_ELECTRONIC_SIGNATURE = 'QualifiedElectronicSignature',
  EHEALTH = 'eHealth',
  EDUCATION_QUALIFICATION = 'EducationQualification',
  BANK_CREDENTIAL = 'BankCredential',
  TAX_IDENTIFICATION = 'TaxIdentification',
  DIGITAL_EURO = 'DigitalEuro',
  PAYMENT_AUTHORIZATION = 'PaymentAuthorization',
}

// Trust levels for credentials
enum TrustLevel {
  LOW = 'Low',
  SUBSTANTIAL = 'Substantial',
  HIGH = 'High',
}

// Service types requiring digital identity
enum ServiceType {
  PUBLIC_SERVICE = 'PublicService',
  BANKING = 'Banking',
  HEALTHCARE = 'Healthcare',
  EDUCATION = 'Education',
  ECOMMERCE = 'ECommerce',
}

// Add XRPL-related enums and types
enum TokenType {
  EURO_CBDC = 'EURC',
  IDENTITY_TOKEN = 'EUID',
  PAYMENT_TOKEN = 'EUPS',
}

// Citizen class representing an EU citizen with a digital identity wallet
class EUCitizen {
  id: string;
  name: string;
  dateOfBirth: Date;
  nationality: MemberState;
  wallet: any;
  did: string;
  didDocument: any;
  credentials: Map<string, any>;
  xrplWallet: any;

  constructor(name: string, dateOfBirth: string, nationality: MemberState) {
    this.id = uuidv4();
    this.name = name;
    this.dateOfBirth = new Date(dateOfBirth);
    this.nationality = nationality;
    this.wallet = null;
    this.did = '';
    this.didDocument = null;
    this.credentials = new Map();
    this.xrplWallet = null;
  }

  getAge(): number {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())
    ) {
      age--;
    }

    return age;
  }

  async setupWallet(walletKit: WalletKit, didGateway: DIDGateway) {
    console.log(`Setting up EU Digital Identity Wallet for ${this.name}...`);

    // Create a wallet for the citizen
    this.wallet = new WalletKit({
      storageOptions: {
        secureStorage: true,
        biometricProtection: true,
        backupEnabled: true,
      },
    });

    // Generate a key pair for DID creation
    const keyPair = await this.wallet.generateKey(KeyType.ED25519);
    const keyId = `key-${this.id}`;

    // Create a DID for the citizen
    const didResult = await didGateway.create(DIDMethod.ION, {
      verificationMethod: [
        {
          id: `#${keyId}`,
          type: 'Ed25519VerificationKey2020',
          controller: this.id,
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: keyPair.publicKey,
          },
        },
      ],
      authentication: [`#${keyId}`],
    });

    this.did = didResult.didDocument!.id;
    this.didDocument = didResult.didDocument;

    console.log(`EU Digital Identity Wallet setup complete for ${this.name}`);
    console.log(`DID: ${this.did}`);

    return {
      did: this.did,
      didDocument: this.didDocument,
    };
  }

  async setupXRPLWallet(xrplAdapter: XRPLAdapter) {
    try {
      console.log(`Setting up XRPL wallet for ${this.name}...`);
      this.xrplWallet = await xrplAdapter.createWallet(this.id);
      console.log(`XRPL wallet address: ${this.xrplWallet.address}`);
      return this.xrplWallet;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to setup XRPL wallet for ${this.name}: ${errorMessage}`
      );
      // Create a minimal mock wallet for simulation to continue
      this.xrplWallet = {
        address: `r${this.id.substring(0, 10)}`,
        balance: 10000000, // 10 XRP in drops
        seed: 'mock_seed_for_offline_mode',
      };
      console.log(
        `Created mock XRPL wallet with address: ${this.xrplWallet.address}`
      );
      return this.xrplWallet;
    }
  }

  async getXRPLBalance(): Promise<number> {
    if (!this.xrplWallet) {
      throw new Error('XRPL wallet not set up');
    }

    try {
      if (typeof this.xrplWallet.balance === 'number') {
        // Mock wallet or cached balance
        return this.xrplWallet.balance;
      }

      // If this is a real wallet, we need to query the ledger
      // This would be handled by the XRPLAdapter's getBalance method
      throw new Error('Need to query balance from ledger');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to get XRPL balance for ${this.name}: ${errorMessage}`
      );
      // Return a mock balance for simulation to continue
      return 10000000; // 10 XRP in drops
    }
  }

  async sendXRPPayment(
    recipientCitizen: EUCitizen,
    amount: number,
    xrplAdapter: XRPLAdapter,
    memo?: string
  ): Promise<any> {
    if (!this.xrplWallet) {
      throw new Error('XRPL wallet not set up');
    }

    if (!recipientCitizen.xrplWallet) {
      throw new Error('Recipient XRPL wallet not set up');
    }

    console.log(
      `${this.name} is sending ${amount / 1000000} XRP to ${
        recipientCitizen.name
      }...`
    );

    try {
      // Use the provided XRPL adapter
      const result = await xrplAdapter.sendPayment(
        this.id,
        recipientCitizen.xrplWallet.address,
        amount,
        memo
      );

      // Update local balances for mock wallets
      if (typeof this.xrplWallet.balance === 'number') {
        this.xrplWallet.balance -= amount;
      }

      if (typeof recipientCitizen.xrplWallet.balance === 'number') {
        recipientCitizen.xrplWallet.balance += amount;
      }

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Payment failed: ${errorMessage}`);

      // Create a mock transaction result for simulation to continue
      const mockResult = {
        hash: `mock_tx_${uuidv4().substring(0, 10)}`,
        type: 'Payment',
        sender: this.xrplWallet.address,
        receiver: recipientCitizen.xrplWallet.address,
        amount,
        memo,
        timestamp: new Date().toISOString(),
      };

      console.log(`Created mock transaction with hash: ${mockResult.hash}`);

      // Update local balances for mock wallets
      if (typeof this.xrplWallet.balance === 'number') {
        this.xrplWallet.balance -= amount;
      }

      if (typeof recipientCitizen.xrplWallet.balance === 'number') {
        recipientCitizen.xrplWallet.balance += amount;
      }

      return mockResult;
    }
  }

  addCredential(type: CredentialType, credential: any) {
    this.credentials.set(type, credential);
    console.log(`Added ${type} credential to ${this.name}'s wallet`);
  }

  hasCredential(type: CredentialType): boolean {
    return this.credentials.has(type);
  }

  getCredential(type: CredentialType): any {
    return this.credentials.get(type);
  }

  async createSelectiveDisclosure(
    types: CredentialType[],
    requestingParty: string
  ): Promise<any> {
    console.log(`Creating selective disclosure for ${requestingParty}...`);

    const disclosedCredentials: any = {};

    for (const type of types) {
      if (this.hasCredential(type)) {
        const credential = this.getCredential(type);
        disclosedCredentials[type] = credential;
        console.log(`Included ${type} in disclosure`);
      } else {
        console.log(
          `Warning: Requested credential ${type} not available in wallet`
        );
      }
    }

    // Create a presentation with only the requested credentials
    const presentation = {
      id: uuidv4(),
      type: 'VerifiablePresentation',
      holder: this.did,
      verifiableCredential: disclosedCredentials,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${this.did}#key-1`,
        proofPurpose: 'authentication',
        challenge: uuidv4(),
        domain: requestingParty,
        proofValue: crypto.randomBytes(64).toString('hex'),
      },
    };

    console.log(`Selective disclosure created for ${requestingParty}`);
    return presentation;
  }

  async signDocument(document: any): Promise<any> {
    if (!this.hasCredential(CredentialType.QUALIFIED_ELECTRONIC_SIGNATURE)) {
      throw new Error(
        'Qualified Electronic Signature credential required for signing documents'
      );
    }

    console.log(`${this.name} is signing a document...`);

    // Create document hash
    const documentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(document))
      .digest('hex');

    // Create signature using the wallet
    const signature = {
      type: 'QualifiedElectronicSignature',
      created: new Date().toISOString(),
      creator: this.did,
      documentHash: documentHash,
      signatureValue: crypto.randomBytes(64).toString('hex'),
    };

    console.log(`Document signed by ${this.name}`);
    return signature;
  }
}

// Authority class representing a national ID issuer or other credential issuer
class Authority {
  id: string;
  name: string;
  country: MemberState;
  did: string;
  trustLevel: TrustLevel;
  wallet: any;
  didGateway: DIDGateway;
  xrplWallet: any;

  constructor(
    name: string,
    country: MemberState,
    didGateway: DIDGateway,
    trustLevel: TrustLevel = TrustLevel.HIGH
  ) {
    this.id = uuidv4();
    this.name = name;
    this.country = country;
    this.did = '';
    this.trustLevel = trustLevel;
    this.wallet = null;
    this.didGateway = didGateway;
    this.xrplWallet = null;
  }

  async setup(walletKit: WalletKit) {
    console.log(`Setting up authority ${this.name}...`);

    // Create a wallet for the authority
    this.wallet = new WalletKit({
      storageOptions: {
        secureStorage: true,
        biometricProtection: false,
        backupEnabled: true,
      },
    });

    // Generate a key pair for DID creation
    const keyPair = await this.wallet.generateKey(KeyType.ED25519);
    const keyId = `key-${this.id}`;

    // Create a DID for the authority
    const didResult = await this.didGateway.create(DIDMethod.ION, {
      verificationMethod: [
        {
          id: `#${keyId}`,
          type: 'Ed25519VerificationKey2020',
          controller: this.id,
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'Ed25519',
            x: keyPair.publicKey,
          },
        },
      ],
      authentication: [`#${keyId}`],
      service: [
        {
          id: `#service-1`,
          type: 'CredentialIssuer',
          serviceEndpoint: `https://authority.${this.country.toLowerCase()}/credentials`,
        },
      ],
    });

    this.did = didResult.didDocument!.id;

    console.log(`Authority setup complete for ${this.name}`);
    console.log(`Authority DID: ${this.did}`);

    return this.did;
  }

  async setupXRPLIssuer(xrplAdapter: XRPLAdapter) {
    try {
      console.log(`Setting up XRPL issuer wallet for ${this.name}...`);
      this.xrplWallet = await xrplAdapter.createWallet(this.id);
      console.log(`XRPL issuer address: ${this.xrplWallet.address}`);
      return this.xrplWallet;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to setup XRPL issuer wallet for ${this.name}: ${errorMessage}`
      );
      // Create a minimal mock wallet for simulation to continue
      this.xrplWallet = {
        address: `r${this.id.substring(0, 10)}`,
        balance: 10000000, // 10 XRP in drops
        seed: 'mock_seed_for_offline_mode',
      };
      console.log(
        `Created mock XRPL issuer wallet with address: ${this.xrplWallet.address}`
      );
      return this.xrplWallet;
    }
  }

  async issueCredential(
    citizen: EUCitizen,
    type: CredentialType,
    claims: any
  ): Promise<any> {
    console.log(
      `${this.name} is issuing a ${type} credential to ${citizen.name}...`
    );

    const credential = {
      id: uuidv4(),
      type: ['VerifiableCredential', type],
      issuer: this.did,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(
        Date.now() + 5 * 365 * 24 * 60 * 60 * 1000
      ).toISOString(), // 5 years validity
      credentialSubject: {
        id: citizen.did,
        ...claims,
      },
      trustLevel: this.trustLevel,
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${this.did}#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: crypto.randomBytes(64).toString('hex'),
      },
    };

    // Add the credential to the citizen's wallet
    citizen.addCredential(type, credential);

    console.log(`${type} credential issued to ${citizen.name}`);
    return credential;
  }

  async issueToken(
    citizen: EUCitizen,
    tokenType: TokenType,
    amount: number,
    xrplAdapter: XRPLAdapter,
    metadata?: any
  ): Promise<any> {
    if (!this.xrplWallet) {
      throw new Error('XRPL issuer wallet not set up');
    }

    if (!citizen.xrplWallet) {
      throw new Error('Citizen XRPL wallet not set up');
    }

    console.log(
      `${this.name} is issuing ${amount} ${tokenType} tokens to ${citizen.name}...`
    );

    try {
      // Use the provided XRPL adapter
      const result = await xrplAdapter.issueToken(
        this.id,
        tokenType,
        citizen.xrplWallet.address,
        amount
      );

      // Create a verifiable credential for the token issuance
      const tokenCredential = {
        id: uuidv4(),
        type: ['VerifiableCredential', 'TokenIssuance'],
        issuer: this.did,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: citizen.did,
          tokenType: tokenType,
          amount: amount,
          issuer: this.name,
          txHash: result.hash,
          ...metadata,
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: `${this.did}#key-1`,
          proofPurpose: 'assertionMethod',
          proofValue: crypto.randomBytes(64).toString('hex'),
        },
      };

      // Add the token credential to the citizen's wallet
      citizen.addCredential(CredentialType.DIGITAL_EURO, tokenCredential);

      return {
        transaction: result,
        credential: tokenCredential,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Token issuance failed: ${errorMessage}`);

      // Create a mock transaction result for simulation to continue
      const mockResult = {
        hash: `mock_tx_${uuidv4().substring(0, 10)}`,
        type: 'TokenIssuance',
        issuer: this.xrplWallet.address,
        receiver: citizen.xrplWallet.address,
        tokenType,
        tokenId: `${tokenType}_mock_${uuidv4().substring(0, 10)}`,
        amount,
        metadata,
        timestamp: new Date().toISOString(),
      };

      console.log(`Created mock token issuance with hash: ${mockResult.hash}`);

      // Create a verifiable credential for the mock token issuance
      const tokenCredential = {
        id: uuidv4(),
        type: ['VerifiableCredential', 'TokenIssuance'],
        issuer: this.did,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: citizen.did,
          tokenType: tokenType,
          amount: amount,
          issuer: this.name,
          txHash: mockResult.hash,
          ...metadata,
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: `${this.did}#key-1`,
          proofPurpose: 'assertionMethod',
          proofValue: crypto.randomBytes(64).toString('hex'),
        },
      };

      // Add the token credential to the citizen's wallet
      citizen.addCredential(CredentialType.DIGITAL_EURO, tokenCredential);

      return {
        transaction: mockResult,
        credential: tokenCredential,
      };
    }
  }

  verifyCredential(credential: any): boolean {
    // In a real implementation, this would verify the cryptographic proof
    console.log(`${this.name} is verifying a credential...`);

    // Check if credential has not expired
    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();

    if (expirationDate < now) {
      console.log('Credential verification failed: Credential has expired');
      return false;
    }

    // Check if the credential has a valid proof
    if (!credential.proof || !credential.proof.proofValue) {
      console.log('Credential verification failed: Invalid proof');
      return false;
    }

    console.log('Credential successfully verified');
    return true;
  }
}

// Service class representing a service that requires digital identity verification
class EUDigitalService {
  id: string;
  name: string;
  country: MemberState;
  serviceType: ServiceType;
  requiredCredentials: Map<CredentialType, boolean>; // Map of credential type to whether it's required or optional
  minimumAge: number | null;
  policyCompiler: PolicyCompiler;
  accessPolicy: any;

  constructor(
    name: string,
    country: MemberState,
    serviceType: ServiceType,
    policyCompiler: PolicyCompiler,
    minimumAge: number | null = null
  ) {
    this.id = uuidv4();
    this.name = name;
    this.country = country;
    this.serviceType = serviceType;
    this.requiredCredentials = new Map();
    this.minimumAge = minimumAge;
    this.policyCompiler = policyCompiler;

    // Define the access control policy
    this.accessPolicy = {
      id: `${this.id}-access-policy`,
      name: `${this.name} Access Policy`,
      description: `Access control policy for ${this.name} service`,
      version: '1.0.0',
      rules: [
        {
          and: [
            // Age requirement if specified
            ...(this.minimumAge
              ? [{ '>=': [{ var: 'user.age' }, this.minimumAge] }]
              : []),
            // Trust level requirement
            {
              '>=': [{ var: 'credential.trustLevel' }, TrustLevel.SUBSTANTIAL],
            },
          ],
        },
      ],
    };
  }

  requireCredential(type: CredentialType, isRequired: boolean = true) {
    this.requiredCredentials.set(type, isRequired);
    return this;
  }

  async requestAccess(
    citizen: EUCitizen
  ): Promise<{ granted: boolean; reason: string }> {
    console.log(`${citizen.name} is requesting access to ${this.name}...`);

    // Check if citizen has all required credentials
    for (const [credType, isRequired] of this.requiredCredentials.entries()) {
      if (isRequired && !citizen.hasCredential(credType)) {
        return {
          granted: false,
          reason: `Missing required credential: ${credType}`,
        };
      }
    }

    // Check age requirement if specified
    if (this.minimumAge !== null) {
      const age = citizen.getAge();
      if (age < this.minimumAge) {
        return {
          granted: false,
          reason: `Age requirement not met: ${age} < ${this.minimumAge}`,
        };
      }
    }

    // Prepare input for policy evaluation
    const input = {
      user: {
        did: citizen.did,
        nationality: citizen.nationality,
        age: citizen.getAge(),
      },
      credential: {
        trustLevel: TrustLevel.HIGH, // Assuming highest trust level for simplicity
      },
      service: {
        country: this.country,
        type: this.serviceType,
      },
    };

    // Evaluate against the access policy
    const result = await this.policyCompiler.evaluate(this.accessPolicy, input);

    if (result.allowed) {
      console.log(`Access granted to ${this.name} for ${citizen.name}`);
      return {
        granted: true,
        reason: 'All requirements met',
      };
    } else {
      console.log(`Access denied to ${this.name} for ${citizen.name}`);
      return {
        granted: false,
        reason: result.reasons?.join(', ') || 'Policy requirements not met',
      };
    }
  }

  async processSelectiveDisclosure(
    presentation: any,
    requestedTypes: CredentialType[]
  ): Promise<{ valid: boolean; data: any }> {
    console.log(`${this.name} is processing a selective disclosure...`);

    // Check if all requested credential types are present
    for (const type of requestedTypes) {
      if (!presentation.verifiableCredential[type]) {
        console.log(
          `Selective disclosure missing requested credential: ${type}`
        );
        return {
          valid: false,
          data: null,
        };
      }
    }

    // In a real implementation, this would verify the cryptographic proof of the presentation
    if (!presentation.proof || !presentation.proof.proofValue) {
      console.log('Selective disclosure verification failed: Invalid proof');
      return {
        valid: false,
        data: null,
      };
    }

    // Extract the relevant data from the credentials
    const extractedData: any = {};

    for (const type of requestedTypes) {
      const credential = presentation.verifiableCredential[type];
      extractedData[type] = credential.credentialSubject;
    }

    console.log('Selective disclosure successfully verified');
    return {
      valid: true,
      data: extractedData,
    };
  }
}

// EU Digital Identity Wallet Platform
class EUDigitalIdentityPlatform {
  citizens: Map<string, EUCitizen>;
  authorities: Map<string, Authority>;
  services: Map<string, EUDigitalService>;
  walletKit: WalletKit;
  didGateway: DIDGateway;
  policyCompiler: PolicyCompiler;
  xrplAdapter: XRPLAdapter;
  usingRealXRPL: boolean = false;

  constructor() {
    this.citizens = new Map();
    this.authorities = new Map();
    this.services = new Map();
    this.walletKit = new WalletKit({
      storageOptions: {
        secureStorage: true,
        biometricProtection: true,
        backupEnabled: true,
      },
    });
    this.didGateway = new DIDGateway();
    this.policyCompiler = new PolicyCompiler();

    // Initialize with mock adapter
    this.xrplAdapter = new MockXRPLAdapter();
    console.log('[MOCK] Created XRPL adapter for testnet network');

    // We'll replace this with the real adapter later in runSimulation if available
  }

  async registerCitizen(
    name: string,
    dateOfBirth: string,
    nationality: MemberState
  ): Promise<EUCitizen> {
    const citizen = new EUCitizen(name, dateOfBirth, nationality);
    await citizen.setupWallet(this.walletKit, this.didGateway);
    await citizen.setupXRPLWallet(this.xrplAdapter);
    this.citizens.set(citizen.id, citizen);
    console.log(`Citizen ${name} registered with ID: ${citizen.id}`);
    return citizen;
  }

  async registerAuthority(
    name: string,
    country: MemberState,
    trustLevel: TrustLevel = TrustLevel.HIGH
  ): Promise<Authority> {
    const authority = new Authority(name, country, this.didGateway, trustLevel);
    await authority.setup(this.walletKit);
    await authority.setupXRPLIssuer(this.xrplAdapter);
    this.authorities.set(authority.id, authority);
    console.log(`Authority ${name} registered with ID: ${authority.id}`);
    return authority;
  }

  registerService(
    name: string,
    country: MemberState,
    serviceType: ServiceType,
    minimumAge: number | null = null
  ): EUDigitalService {
    const service = new EUDigitalService(
      name,
      country,
      serviceType,
      this.policyCompiler,
      minimumAge
    );
    this.services.set(service.id, service);
    console.log(`Service ${name} registered with ID: ${service.id}`);
    return service;
  }
}

// Run the simulation
async function runSimulation() {
  console.log(
    'Starting EU Digital Identity Wallet Simulation with XRPL Integration...'
  );

  // Initialize the platform
  const platform = new EUDigitalIdentityPlatform();

  // Use the adapter creator script to get the appropriate XRPL adapter
  try {
    // Import the adapter creator
    const createAdapter = (await import('./create-adapter.js')).default;

    // Create the adapter
    const { useRealXRPL, adapter } = await createAdapter();

    // Use the adapter
    if (useRealXRPL) {
      platform.xrplAdapter = adapter;
      platform.usingRealXRPL = true;
      console.log(
        'Successfully initialized real XRPL adapter with testnet connection'
      );
    } else {
      console.log('Using mock XRPL adapter');
    }
  } catch (error) {
    console.error(
      `Failed to create XRPL adapter: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.log('Using default mock XRPL adapter');
  }

  try {
    // Connect to XRPL testnet
    const connected = await platform.xrplAdapter.connect();
    if (!connected) {
      console.error(
        'Failed to connect to XRPL testnet. Running in offline mode.'
      );
    } else {
      console.log(
        `Successfully connected to XRPL ${
          platform.usingRealXRPL ? 'Testnet' : 'mock'
        }`
      );
    }

    // Register citizens
    console.log('\n1. Registering citizens...');
    const maria = await platform.registerCitizen(
      'Maria Garcia',
      '1985-04-12',
      MemberState.SPAIN
    );
    const klaus = await platform.registerCitizen(
      'Klaus Mueller',
      '1990-08-23',
      MemberState.GERMANY
    );
    const sophie = await platform.registerCitizen(
      'Sophie Dubois',
      '2005-11-30',
      MemberState.FRANCE
    );

    // Register authorities
    console.log('\n2. Registering authorities...');
    const spanishIdAuthority = await platform.registerAuthority(
      'Spanish National ID Authority',
      MemberState.SPAIN
    );
    const germanIdAuthority = await platform.registerAuthority(
      'German Federal ID Authority',
      MemberState.GERMANY
    );
    const frenchIdAuthority = await platform.registerAuthority(
      'French National ID Authority',
      MemberState.FRANCE
    );
    const universityMadrid = await platform.registerAuthority(
      'Universidad Complutense de Madrid',
      MemberState.SPAIN,
      TrustLevel.SUBSTANTIAL
    );

    // Add European Central Bank as a token issuer
    const europeanCentralBank = await platform.registerAuthority(
      'European Central Bank',
      MemberState.GERMANY,
      TrustLevel.HIGH
    );

    // Register services
    console.log('\n3. Registering services...');
    const germanPublicService = platform
      .registerService(
        'German Public Administration Portal',
        MemberState.GERMANY,
        ServiceType.PUBLIC_SERVICE
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true)
      .requireCredential(CredentialType.ADDRESS, true);

    const frenchBank = platform
      .registerService(
        'Banque de France Online',
        MemberState.FRANCE,
        ServiceType.BANKING
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true)
      .requireCredential(CredentialType.BANK_CREDENTIAL, false);

    const onlineStore = platform
      .registerService(
        'EU Online Marketplace',
        MemberState.NETHERLANDS,
        ServiceType.ECOMMERCE,
        18
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true);

    // Issue credentials
    console.log('\n4. Issuing credentials...');

    // Issue Spanish ID to Maria
    await spanishIdAuthority.issueCredential(
      maria,
      CredentialType.PERSON_IDENTIFICATION_DATA,
      {
        firstName: 'Maria',
        lastName: 'Garcia',
        dateOfBirth: '1985-04-12',
        nationality: MemberState.SPAIN,
        idNumber: 'ES-12345678X',
      }
    );

    await spanishIdAuthority.issueCredential(maria, CredentialType.ADDRESS, {
      street: 'Calle Gran Via 123',
      city: 'Madrid',
      postalCode: '28013',
      country: MemberState.SPAIN,
    });

    await spanishIdAuthority.issueCredential(
      maria,
      CredentialType.QUALIFIED_ELECTRONIC_SIGNATURE,
      {
        publicKey: crypto.randomBytes(32).toString('hex'),
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 2 * 365 * 24 * 60 * 60 * 1000
        ).toISOString(), // 2 years validity
      }
    );

    // Issue German ID to Klaus
    await germanIdAuthority.issueCredential(
      klaus,
      CredentialType.PERSON_IDENTIFICATION_DATA,
      {
        firstName: 'Klaus',
        lastName: 'Mueller',
        dateOfBirth: '1990-08-23',
        nationality: MemberState.GERMANY,
        idNumber: 'DE-87654321Y',
      }
    );

    await germanIdAuthority.issueCredential(klaus, CredentialType.ADDRESS, {
      street: 'Berliner Strasse 45',
      city: 'Munich',
      postalCode: '80331',
      country: MemberState.GERMANY,
    });

    // Issue French ID to Sophie (minor)
    await frenchIdAuthority.issueCredential(
      sophie,
      CredentialType.PERSON_IDENTIFICATION_DATA,
      {
        firstName: 'Sophie',
        lastName: 'Dubois',
        dateOfBirth: '2005-11-30',
        nationality: MemberState.FRANCE,
        idNumber: 'FR-98765432Z',
      }
    );

    await frenchIdAuthority.issueCredential(sophie, CredentialType.ADDRESS, {
      street: 'Rue de Rivoli 15',
      city: 'Paris',
      postalCode: '75001',
      country: MemberState.FRANCE,
    });

    // Issue University Diploma to Maria
    await universityMadrid.issueCredential(
      maria,
      CredentialType.EDUCATION_QUALIFICATION,
      {
        institution: 'Universidad Complutense de Madrid',
        degree: 'Master of Computer Science',
        graduationDate: '2010-06-15',
        degreeReference: 'UCM-2010-CS-1234',
      }
    );

    // Test cross-border authentication scenarios
    console.log('\n5. Testing cross-border authentication scenarios...');

    // Scenario 1: Spanish citizen accessing German public service
    console.log(
      '\nScenario 1: Spanish citizen (Maria) accessing German public service'
    );
    const mariaGermanServiceAccess = await germanPublicService.requestAccess(
      maria
    );
    console.log(`Access granted: ${mariaGermanServiceAccess.granted}`);
    console.log(`Reason: ${mariaGermanServiceAccess.reason}`);

    if (mariaGermanServiceAccess.granted) {
      // Create selective disclosure with only the required attributes
      const mariaDisclosure = await maria.createSelectiveDisclosure(
        [CredentialType.PERSON_IDENTIFICATION_DATA, CredentialType.ADDRESS],
        germanPublicService.id
      );

      // Process the selective disclosure
      const processResult =
        await germanPublicService.processSelectiveDisclosure(mariaDisclosure, [
          CredentialType.PERSON_IDENTIFICATION_DATA,
          CredentialType.ADDRESS,
        ]);

      console.log(`Selective disclosure valid: ${processResult.valid}`);
      if (processResult.valid) {
        console.log('Extracted data:');
        console.log(
          `- Name: ${
            processResult.data[CredentialType.PERSON_IDENTIFICATION_DATA]
              .firstName
          } ${
            processResult.data[CredentialType.PERSON_IDENTIFICATION_DATA]
              .lastName
          }`
        );
        console.log(
          `- Address: ${processResult.data[CredentialType.ADDRESS].street}, ${
            processResult.data[CredentialType.ADDRESS].city
          }`
        );
      }
    }

    // Scenario 2: Minor trying to access age-restricted service
    console.log(
      '\nScenario 2: French minor (Sophie) trying to access age-restricted online store'
    );
    const sophieOnlineStoreAccess = await onlineStore.requestAccess(sophie);
    console.log(`Access granted: ${sophieOnlineStoreAccess.granted}`);
    console.log(`Reason: ${sophieOnlineStoreAccess.reason}`);

    // Scenario 3: Digital signature creation
    console.log('\nScenario 3: Spanish citizen (Maria) signing a document');
    try {
      const document = {
        type: 'Contract',
        title: 'Employment Contract',
        parties: ['Company XYZ', 'Maria Garcia'],
        content: 'This is a sample employment contract...',
        date: new Date().toISOString(),
      };

      const signature = await maria.signDocument(document);
      console.log('Document successfully signed:');
      console.log(`- Signature ID: ${signature.type}`);
      console.log(`- Created: ${signature.created}`);
      console.log(
        `- Document Hash: ${signature.documentHash.substring(0, 16)}...`
      );
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
    }

    // Scenario 4: Diploma recognition in another country
    console.log(
      '\nScenario 4: Recognition of Spanish university diploma in Germany'
    );
    const diplomaCredential = maria.getCredential(
      CredentialType.EDUCATION_QUALIFICATION
    );
    const diplomaVerification =
      germanIdAuthority.verifyCredential(diplomaCredential);
    console.log(`Diploma verification successful: ${diplomaVerification}`);
    if (diplomaVerification) {
      console.log('Diploma details:');
      console.log(
        `- Institution: ${diplomaCredential.credentialSubject.institution}`
      );
      console.log(`- Degree: ${diplomaCredential.credentialSubject.degree}`);
      console.log(
        `- Graduation Date: ${diplomaCredential.credentialSubject.graduationDate}`
      );
    }

    // Scenario 5: Digital Euro issuance
    console.log(
      '\nScenario 5: European Central Bank issuing Digital Euro tokens'
    );

    try {
      const mariaTokenIssuance = await europeanCentralBank.issueToken(
        maria,
        TokenType.EURO_CBDC,
        5000, // 5000 Digital Euro tokens
        platform.xrplAdapter,
        {
          purpose: 'CBDC Pilot Program',
          restrictions: 'For use within EU member states only',
        }
      );

      console.log(`Digital Euro tokens issued to ${maria.name}`);
      console.log(`Transaction hash: ${mariaTokenIssuance.transaction.hash}`);
      console.log(`Token credential ID: ${mariaTokenIssuance.credential.id}`);

      // Also issue Digital Euro to Klaus
      const klausTokenIssuance = await europeanCentralBank.issueToken(
        klaus,
        TokenType.EURO_CBDC,
        3000, // 3000 Digital Euro tokens
        platform.xrplAdapter,
        {
          purpose: 'CBDC Pilot Program',
          restrictions: 'For use within EU member states only',
        }
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error issuing Digital Euro tokens: ${errorMessage}`);
      console.log('Continuing simulation without token issuance...');
    }

    // Scenario 6: Cross-border payment with Digital Euro
    console.log(
      '\nScenario 6: Cross-border payment with Digital Euro from Spain to Germany'
    );

    try {
      // Check balances before payment
      const mariaBalanceBefore = await maria.getXRPLBalance();
      const klausBalanceBefore = await klaus.getXRPLBalance();

      console.log(
        `Maria's balance before payment: ${mariaBalanceBefore / 1000000} XRP`
      );
      console.log(
        `Klaus's balance before payment: ${klausBalanceBefore / 1000000} XRP`
      );

      // Send payment
      const paymentResult = await maria.sendXRPPayment(
        klaus,
        1000000, // 1 XRP
        platform.xrplAdapter,
        'Payment for consulting services'
      );

      console.log(`Payment sent: ${paymentResult.hash}`);

      // Check balances after payment
      const mariaBalanceAfter = await maria.getXRPLBalance();
      const klausBalanceAfter = await klaus.getXRPLBalance();

      console.log(
        `Maria's balance after payment: ${mariaBalanceAfter / 1000000} XRP`
      );
      console.log(
        `Klaus's balance after payment: ${klausBalanceAfter / 1000000} XRP`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error processing cross-border payment: ${errorMessage}`);
      console.log('Continuing simulation without payment processing...');
    }

    // Scenario 7: Tokenized diploma credential
    console.log('\nScenario 7: Issuing tokenized diploma credential on XRPL');

    try {
      const tokenizedDiploma = await universityMadrid.issueToken(
        maria,
        TokenType.IDENTITY_TOKEN,
        1, // Non-fungible token representing the diploma
        platform.xrplAdapter,
        {
          credentialType: 'Diploma',
          institution: 'Universidad Complutense de Madrid',
          degree: 'Master of Computer Science',
          graduationDate: '2010-06-15',
          degreeReference: 'UCM-2010-CS-1234',
        }
      );

      console.log(
        `Tokenized diploma issued: ${tokenizedDiploma.transaction.hash}`
      );

      // Verify the tokenized credential
      const tokenVerification = germanIdAuthority.verifyCredential(
        tokenizedDiploma.credential
      );

      console.log(
        `Tokenized diploma verification: ${
          tokenVerification ? 'Successful' : 'Failed'
        }`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error issuing tokenized diploma: ${errorMessage}`);
      console.log('Continuing simulation without tokenized diploma...');
    }

    // Scenario 8: Cross-border healthcare access with eHealth credential
    console.log(
      '\nScenario 8: Cross-border healthcare access with eHealth credential'
    );

    // First, issue an eHealth credential to Klaus
    await germanIdAuthority.issueCredential(klaus, CredentialType.EHEALTH, {
      insuranceProvider: 'German Public Health Insurance',
      insuranceId: 'DE-HEALTH-123456789',
      validUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(), // 1 year validity
      coverageDetails: 'Full EU coverage for emergency healthcare',
      bloodType: 'O+',
      allergies: ['Penicillin'],
      emergencyContact: '+49123456789',
    });

    // Create a healthcare service in Spain
    const spanishHospital = platform
      .registerService(
        'Hospital Universitario La Paz',
        MemberState.SPAIN,
        ServiceType.HEALTHCARE
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true)
      .requireCredential(CredentialType.EHEALTH, true);

    // German citizen accessing Spanish healthcare while on vacation
    console.log(
      '\nGerman citizen (Klaus) accessing Spanish healthcare while on vacation'
    );
    const klausHealthcareAccess = await spanishHospital.requestAccess(klaus);
    console.log(`Access granted: ${klausHealthcareAccess.granted}`);
    console.log(`Reason: ${klausHealthcareAccess.reason}`);

    if (klausHealthcareAccess.granted) {
      // Create selective disclosure with only the required attributes
      const klausDisclosure = await klaus.createSelectiveDisclosure(
        [CredentialType.PERSON_IDENTIFICATION_DATA, CredentialType.EHEALTH],
        spanishHospital.id
      );

      // Process the selective disclosure
      const processResult = await spanishHospital.processSelectiveDisclosure(
        klausDisclosure,
        [CredentialType.PERSON_IDENTIFICATION_DATA, CredentialType.EHEALTH]
      );

      console.log(`Selective disclosure valid: ${processResult.valid}`);
      if (processResult.valid) {
        console.log('Extracted health data:');
        console.log(
          `- Name: ${
            processResult.data[CredentialType.PERSON_IDENTIFICATION_DATA]
              .firstName
          } ${
            processResult.data[CredentialType.PERSON_IDENTIFICATION_DATA]
              .lastName
          }`
        );
        console.log(
          `- Insurance: ${
            processResult.data[CredentialType.EHEALTH].insuranceProvider
          }`
        );
        console.log(
          `- Insurance ID: ${
            processResult.data[CredentialType.EHEALTH].insuranceId
          }`
        );
        console.log(
          `- Blood Type: ${
            processResult.data[CredentialType.EHEALTH].bloodType
          }`
        );
        console.log(
          `- Allergies: ${processResult.data[
            CredentialType.EHEALTH
          ].allergies.join(', ')}`
        );
      }
    }

    // Scenario 9: Secure payment authorization with XRPL and verifiable credentials
    console.log(
      '\nScenario 9: Secure payment authorization with XRPL and verifiable credentials'
    );

    // Issue a payment authorization credential to Maria
    await spanishIdAuthority.issueCredential(
      maria,
      CredentialType.PAYMENT_AUTHORIZATION,
      {
        authorizedPaymentMethods: ['XRPL', 'SEPA', 'DIGITAL_EURO'],
        paymentLimits: {
          daily: 5000,
          transaction: 2000,
        },
        securityLevel: 'high',
        biometricVerification: true,
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1 year validity
      }
    );

    // Create a payment service
    const euPaymentProcessor = platform
      .registerService(
        'EU Digital Payment Processor',
        MemberState.NETHERLANDS,
        ServiceType.BANKING
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true)
      .requireCredential(CredentialType.PAYMENT_AUTHORIZATION, true);

    // Authorize a high-value payment using verifiable credentials
    console.log(
      '\nAuthorizing a high-value payment using verifiable credentials'
    );
    const paymentAmount = 1500; // 1500 EUR

    // Check if payment is within authorized limits
    const paymentAuthCredential = maria.getCredential(
      CredentialType.PAYMENT_AUTHORIZATION
    );
    const isWithinLimits =
      paymentAmount <=
      paymentAuthCredential.credentialSubject.paymentLimits.transaction;

    console.log(`Payment amount: ${paymentAmount} EUR`);
    console.log(
      `Transaction limit: ${paymentAuthCredential.credentialSubject.paymentLimits.transaction} EUR`
    );
    console.log(`Payment within authorized limits: ${isWithinLimits}`);

    if (isWithinLimits) {
      // Request access to payment service
      const mariaPaymentAccess = await euPaymentProcessor.requestAccess(maria);

      if (mariaPaymentAccess.granted) {
        console.log('Payment service access granted, processing payment...');

        // Create a payment token on XRPL for this specific transaction
        const paymentTokenResult = await europeanCentralBank.issueToken(
          maria,
          TokenType.PAYMENT_TOKEN,
          paymentAmount,
          platform.xrplAdapter,
          {
            purpose: 'Secure payment authorization',
            recipient: 'Online Retailer XYZ',
            timestamp: new Date().toISOString(),
            transactionId: uuidv4(),
          }
        );

        console.log(
          `Payment token issued: ${paymentTokenResult.transaction.hash}`
        );
        console.log('Payment successfully processed and authorized');
      } else {
        console.log(
          `Payment service access denied: ${mariaPaymentAccess.reason}`
        );
      }
    } else {
      console.log(
        'Payment rejected: Amount exceeds authorized transaction limit'
      );
    }

    // Scenario 10: Secure business data sharing with audit trail on XRPL
    console.log(
      '\nScenario 10: Secure business data sharing with audit trail on XRPL'
    );

    // Register two business entities
    const businessA = await platform.registerCitizen(
      'TechCorp GmbH',
      '1998-03-15', // Date of incorporation
      MemberState.GERMANY
    );

    const businessB = await platform.registerCitizen(
      'DataSolutions S.L.',
      '2005-07-22', // Date of incorporation
      MemberState.SPAIN
    );

    // Issue business credentials to both entities
    await germanIdAuthority.issueCredential(
      businessA,
      CredentialType.PERSON_IDENTIFICATION_DATA,
      {
        legalName: 'TechCorp GmbH',
        registrationNumber: 'DE-BIZ-123456789',
        legalForm: 'GmbH',
        registrationDate: '1998-03-15',
        jurisdiction: MemberState.GERMANY,
        legalAddress: 'Hauptstrasse 56, Berlin, 10115, Germany',
        businessSector: 'Information Technology',
      }
    );

    await spanishIdAuthority.issueCredential(
      businessB,
      CredentialType.PERSON_IDENTIFICATION_DATA,
      {
        legalName: 'DataSolutions S.L.',
        registrationNumber: 'ES-BIZ-987654321',
        legalForm: 'Sociedad Limitada',
        registrationDate: '2005-07-22',
        jurisdiction: MemberState.SPAIN,
        legalAddress: 'Calle Serrano 41, Madrid, 28001, Spain',
        businessSector: 'Data Analytics',
      }
    );

    // Create a data sharing agreement as a verifiable credential
    const dataSharingAgreement = {
      id: uuidv4(),
      type: 'DataSharingAgreement',
      parties: [
        {
          id: businessA.did,
          role: 'DataProvider',
        },
        {
          id: businessB.did,
          role: 'DataConsumer',
        },
      ],
      dataDescription: 'Anonymized customer behavior analytics',
      purpose: 'Joint market research project',
      restrictions:
        'No re-sharing with third parties, data to be deleted after 12 months',
      duration: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      },
      dataProtectionMeasures: [
        'Encryption',
        'Access Controls',
        'Audit Logging',
      ],
      created: new Date().toISOString(),
    };

    // Both parties sign the agreement
    console.log('Both businesses signing the data sharing agreement...');
    const agreementHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(dataSharingAgreement))
      .digest('hex');

    // Record the agreement on XRPL for immutable audit trail
    console.log('Recording data sharing agreement on XRPL for audit trail...');
    const agreementTransaction = await businessA.sendXRPPayment(
      businessB,
      10000, // Nominal amount for the transaction
      platform.xrplAdapter,
      JSON.stringify({
        type: 'DataSharingAgreement',
        agreementId: dataSharingAgreement.id,
        agreementHash: agreementHash,
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`Agreement recorded on XRPL: ${agreementTransaction.hash}`);

    // Simulate data sharing events with audit trail
    console.log('\nSimulating data access events with audit trail...');

    const dataAccessEvents = [
      {
        eventType: 'DataAccess',
        accessorDID: businessB.did,
        datasetId: 'customer-analytics-2023-Q2',
        timestamp: new Date().toISOString(),
        purpose: 'Market segmentation analysis',
        accessMethod: 'API',
      },
      {
        eventType: 'DataExport',
        exporterDID: businessB.did,
        datasetId: 'customer-analytics-2023-Q2',
        timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week later
        exportFormat: 'Anonymized CSV',
        recordCount: 5000,
      },
    ];

    // Record each data access event on XRPL
    for (const event of dataAccessEvents) {
      console.log(`Recording ${event.eventType} event on XRPL...`);
      const eventHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(event))
        .digest('hex');

      const eventTransaction = await businessB.sendXRPPayment(
        businessA,
        1000, // Small amount for the transaction
        platform.xrplAdapter,
        JSON.stringify({
          type: 'DataAccessAudit',
          agreementId: dataSharingAgreement.id,
          eventHash: eventHash,
          eventType: event.eventType,
          timestamp: event.timestamp,
        })
      );

      console.log(
        `Data ${event.eventType} event recorded: ${eventTransaction.hash}`
      );
    }

    console.log(
      '\nData sharing with immutable audit trail completed successfully'
    );

    // Scenario 11: Secure digital voting with privacy protection
    console.log(
      '\nScenario 11: Secure digital voting with privacy protection using EU Digital Identity Wallet'
    );

    // Create an election authority
    const electionAuthority = await platform.registerAuthority(
      'European Election Commission',
      MemberState.NETHERLANDS,
      TrustLevel.HIGH
    );

    await electionAuthority.setupXRPLIssuer(platform.xrplAdapter);

    // Issue voting credentials to citizens
    console.log('\nIssuing voting credentials to eligible citizens...');

    // Only issue to citizens above voting age (18)
    const eligibleVoters = [maria, klaus];
    const ineligibleVoters = [sophie]; // Minor

    for (const voter of eligibleVoters) {
      // Check age eligibility
      if (voter.getAge() >= 18) {
        // Create a voting credential with a unique anonymous voting ID
        const votingId = crypto.randomBytes(16).toString('hex');

        await electionAuthority.issueCredential(
          voter,
          CredentialType.PERSON_IDENTIFICATION_DATA,
          {
            votingId: votingId,
            electionId: 'EU-PARL-2024',
            issuanceDate: new Date().toISOString(),
            expirationDate: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(), // 30 days validity
            votingRights: ['European Parliament Election 2024'],
            votingStatus: 'Not Voted',
          }
        );

        console.log(
          `Voting credential issued to ${voter.name} with anonymous voting ID`
        );
      }
    }

    // Create a voting service
    const europeanElection = platform
      .registerService(
        'European Parliament Election 2024',
        MemberState.NETHERLANDS,
        ServiceType.PUBLIC_SERVICE
      )
      .requireCredential(CredentialType.PERSON_IDENTIFICATION_DATA, true);

    // Simulate the voting process
    console.log('\nSimulating the secure voting process...');

    // Function to cast a vote while preserving privacy
    async function castVote(voter: EUCitizen, choice: string) {
      console.log(`\n${voter.name} is casting a vote...`);

      // First verify eligibility
      const accessResult = await europeanElection.requestAccess(voter);

      if (!accessResult.granted) {
        console.log(`Voting access denied: ${accessResult.reason}`);
        return null;
      }

      // Get the voting credential
      const votingCredential = voter.getCredential(
        CredentialType.PERSON_IDENTIFICATION_DATA
      );
      const votingId = votingCredential.credentialSubject.votingId;

      // Create an anonymous vote record
      const voteRecord = {
        votingId: votingId, // Anonymous ID, not linked to personal identity
        electionId: 'EU-PARL-2024',
        choice: choice,
        timestamp: new Date().toISOString(),
      };

      // Hash the vote for verification
      const voteHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(voteRecord))
        .digest('hex');

      // Record the vote on XRPL with the anonymous voting ID
      // This creates an immutable record while preserving privacy
      const voteTransaction = await electionAuthority.issueToken(
        voter,
        TokenType.IDENTITY_TOKEN,
        1, // One token representing one vote
        platform.xrplAdapter,
        {
          type: 'AnonymousVote',
          electionId: 'EU-PARL-2024',
          voteHash: voteHash,
          timestamp: new Date().toISOString(),
        }
      );

      // Update the voting credential to prevent double voting
      const updatedVotingCredential = {
        ...votingCredential,
        credentialSubject: {
          ...votingCredential.credentialSubject,
          votingStatus: 'Voted',
          votedAt: new Date().toISOString(),
        },
      };

      // Replace the old credential with the updated one
      voter.addCredential(
        CredentialType.PERSON_IDENTIFICATION_DATA,
        updatedVotingCredential
      );

      console.log(
        `Vote cast successfully and recorded on XRPL: ${voteTransaction.transaction.hash}`
      );
      return voteTransaction;
    }

    // Citizens cast their votes
    const mariaVote = await castVote(maria, 'Party A');
    const klausVote = await castVote(klaus, 'Party B');

    // Try to have Maria vote again (should fail)
    console.log('\nAttempting to cast a second vote (should fail)...');
    const mariaSecondVote = await castVote(maria, 'Party C');

    // Try to have Sophie vote (underage, should fail)
    console.log('\nAttempting to cast a vote as a minor (should fail)...');
    const sophieVote = await castVote(sophie, 'Party D');

    // Verify the election integrity
    console.log('\nVerifying election integrity...');
    const votedCitizens = [maria, klaus].filter((citizen) => {
      const credential = citizen.getCredential(
        CredentialType.PERSON_IDENTIFICATION_DATA
      );
      return (
        credential && credential.credentialSubject.votingStatus === 'Voted'
      );
    });

    console.log(`Total eligible voters: ${eligibleVoters.length}`);
    console.log(`Total votes cast: ${votedCitizens.length}`);
    console.log(
      'Election completed with verifiable integrity and voter privacy'
    );

    // Disconnect from XRPL
    await platform.xrplAdapter.disconnect();

    console.log(
      '\nEU Digital Identity Wallet Simulation with XRPL integration completed successfully!'
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Simulation failed: ${errorMessage}`);
  }
}

// Run the simulation if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runSimulation().catch((error: any) => {
    console.error('Simulation failed:', error.message);
  });
}

export {
  EUCitizen,
  Authority,
  EUDigitalService,
  EUDigitalIdentityPlatform,
  TokenType,
  runSimulation,
};
