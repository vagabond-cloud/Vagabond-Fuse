/**
 * EU Digital ID Wallet Simulation
 *
 * This simulation demonstrates the cross-border use case shown in the image:
 * A Spanish citizen (Alma, 29 years old) living in Portugal uses her EU Digital Identity Wallet
 * to update her address in the Portuguese National Population Register.
 *
 * The simulation uses the XRPL testnet for DID operations and verifiable credentials.
 */

import { Client, Wallet } from 'xrpl';

// Mock EUDI wallet for simulation
class EUDIWallet {
  private connected = false;
  private wallet: Wallet;
  private client: Client;
  private userName: string;
  private userCountry: string;

  constructor(config: {
    userName: string;
    userCountry: string;
    privateKey?: string;
    networkUrl: string;
  }) {
    this.userName = config.userName;
    this.userCountry = config.userCountry;
    const seed = config.privateKey || Wallet.generate().seed || '';
    this.wallet = Wallet.fromSeed(seed);
    this.client = new Client(config.networkUrl);
  }

  async connect(): Promise<boolean> {
    console.log(
      `Connecting to EUDI Wallet for ${this.userName} from ${this.userCountry}...`
    );
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    console.log(`Disconnecting from EUDI Wallet for ${this.userName}...`);
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAddress(): string {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    return this.wallet.address;
  }

  async signAndSubmitTransaction(transaction: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }
    console.log(
      `${this.userName} is signing a transaction with their EUDI wallet...`
    );

    // Prepare, sign and submit the transaction
    const prepared = await this.client.autofill(transaction);
    const signed = this.wallet.sign(prepared);
    const result = await this.client.submitAndWait(signed.tx_blob);

    return result;
  }
}

// Mock DID Document for XRPL
class XrplDID {
  private did: string;
  private document: any;

  constructor(address: string) {
    this.did = `did:xrpl:${address}`;
    this.document = {
      id: this.did,
      verificationMethod: [
        {
          id: `${this.did}#key-1`,
          type: 'Ed25519VerificationKey2020',
          controller: this.did,
          publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      service: [
        {
          id: `${this.did}#service-1`,
          type: 'EUDIWalletService',
          serviceEndpoint: 'https://eudi-wallet.vaga.solutions',
        },
      ],
    };
  }

  getDID(): string {
    return this.did;
  }

  getDocument(): any {
    return this.document;
  }
}

// Mock service provider class for Portuguese National Population Register
class PopulationRegisterService {
  private countryCode: string;
  private serviceName: string;

  constructor(countryCode: string) {
    this.countryCode = countryCode;
    this.serviceName = `${countryCode} National Population Register`;
  }

  async verifyIdentity(did: string, credential: any): Promise<boolean> {
    console.log(`${this.serviceName} is verifying identity for DID: ${did}`);

    // In a real implementation, this would verify the credential cryptographically
    if (credential && credential.credentialSubject.id === did) {
      console.log(`Identity verified successfully for ${did}`);
      return true;
    }

    console.error(`Failed to verify identity for ${did}`);
    return false;
  }

  async updateAddress(
    did: string,
    newAddress: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    }
  ): Promise<boolean> {
    console.log(`${this.serviceName} is updating address for DID: ${did}`);

    // In a real implementation, this would update the address in the database
    console.log(`Address updated to: ${JSON.stringify(newAddress)}`);

    return true;
  }
}

// Mock credential issuer for Spanish identification
class SpanishIdentificationAuthority {
  private authorityDid: string;

  constructor() {
    const wallet = Wallet.generate();
    this.authorityDid = `did:xrpl:${wallet.address}`;
  }

  issueIdentificationCredential(
    subjectDid: string,
    personalInfo: {
      name: string;
      dateOfBirth: string;
      nationality: string;
      documentNumber: string;
    }
  ): any {
    console.log(
      `Spanish Identification Authority issuing credential to ${subjectDid}`
    );

    // Create a verifiable credential
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
      ],
      id: `urn:uuid:${Date.now()}`,
      type: ['VerifiableCredential', 'EUIdentificationCredential'],
      issuer: this.authorityDid,
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,
        name: personalInfo.name,
        dateOfBirth: personalInfo.dateOfBirth,
        nationality: personalInfo.nationality,
        documentNumber: personalInfo.documentNumber,
      },
    };

    console.log(`Credential issued: ${JSON.stringify(credential, null, 2)}`);
    return credential;
  }
}

// Main simulation function
async function runSimulation() {
  console.log('Starting EU Digital ID Wallet Simulation');
  console.log('----------------------------------------');

  const XRPL_TESTNET = 'wss://s.altnet.rippletest.net:51233';

  try {
    // Step 1: Create Alma's EUDI wallet
    console.log('\n🔹 STEP 1: Alma opens her EU Digital Identity Wallet');
    const almaWallet = new EUDIWallet({
      userName: 'Alma',
      userCountry: 'Spain',
      networkUrl: XRPL_TESTNET,
    });

    await almaWallet.connect();
    const almaAddress = almaWallet.getAddress();

    // Step 2: Create Alma's DID
    console.log("\n🔹 STEP 2: Creating Alma's digital identity");
    const almaDID = new XrplDID(almaAddress);
    console.log(`Alma's DID: ${almaDID.getDID()}`);

    // In a real implementation, this would register the DID on the XRPL
    console.log(
      'DID Document:',
      JSON.stringify(almaDID.getDocument(), null, 2)
    );

    // Step 3: Spanish authority issues identification credential
    console.log(
      '\n🔹 STEP 3: Spanish authority issues identification credential to Alma'
    );
    const spanishAuthority = new SpanishIdentificationAuthority();

    const identificationCredential =
      spanishAuthority.issueIdentificationCredential(almaDID.getDID(), {
        name: 'Alma',
        dateOfBirth: '1994-05-15',
        nationality: 'Spanish',
        documentNumber: 'ES123456789',
      });

    // Step 4: Alma opens the Portuguese National Population Register app
    console.log(
      '\n🔹 STEP 4: Alma opens the Portuguese National Population Register app'
    );
    const portugueseRegister = new PopulationRegisterService('PT');

    // Step 5: Alma authenticates with her Spanish identification
    console.log(
      '\n🔹 STEP 5: Alma authenticates with her Spanish identification'
    );
    const verified = await portugueseRegister.verifyIdentity(
      almaDID.getDID(),
      identificationCredential
    );

    if (!verified) {
      throw new Error('Authentication failed');
    }

    // Step 6: Alma updates her address
    console.log(
      '\n🔹 STEP 6: Alma updates her address in the Portuguese National Population Register'
    );
    const addressUpdated = await portugueseRegister.updateAddress(
      almaDID.getDID(),
      {
        street: 'Rua da Liberdade 123',
        city: 'Lisbon',
        postalCode: '1250-096',
        country: 'Portugal',
      }
    );

    if (addressUpdated) {
      console.log(
        "\n✅ Alma's address is now updated on the Portuguese National Population Register"
      );
      console.log(
        '✅ The process was completed seamlessly across EU countries using the EUDI wallet'
      );
    }

    // Disconnect wallet
    await almaWallet.disconnect();
  } catch (error) {
    console.error('Simulation failed:', error);
  }
}

// Run the simulation
if (require.main === module) {
  runSimulation()
    .then(() => console.log('\nSimulation completed successfully'))
    .catch((error) => console.error('Simulation failed:', error))
    .finally(() => process.exit(0));
}

export {
  runSimulation,
  EUDIWallet,
  XrplDID,
  PopulationRegisterService,
  SpanishIdentificationAuthority,
};
