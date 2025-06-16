#!/usr/bin/env tsx
/**
 * FuseStream Social Network Simulation
 *
 * This example demonstrates a complete real-world simulation of the FuseStream social network
 * platform using all components of the Vagabond-Fuse project:
 *
 * 1. Wallet Kit - For managing user identities and keys
 * 2. DID Gateway - For creating and managing decentralized identifiers
 * 3. Policy Utils - For defining and enforcing content policies
 * 4. Credential Hub - For issuing and verifying creator credentials
 *
 * The simulation demonstrates:
 * - User onboarding with DIDs and verifiable credentials
 * - Content creation with policy-based access control
 * - Creator verification and reputation management
 * - Privacy-preserving content sharing
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Import mock implementations for standalone execution
import { WalletKit, KeyType, KeyFormat } from '../mocks/wallet-kit.js';
import { DIDGateway, DIDMethod } from '../mocks/did-gateway.js';
import { PolicyCompiler } from '../mocks/policy-utils.js';

// Simulation constants
const REGIONS = ['US', 'EU', 'ASIA', 'OTHER'];
const CONTENT_TYPES = ['TEXT', 'VIDEO', 'IMAGE', 'AUDIO'];
const VISIBILITY_TYPES = ['PUBLIC', 'FOLLOWERS', 'PRIVATE'];

// User class representing a FuseStream user
class User {
  id: string;
  username: string;
  wallet: any;
  did: string;
  didDocument: any;
  credentials: any[];
  sparks: string[];
  followers: string[];
  following: string[];
  region: string;
  age: number;
  sharingConsent: boolean;

  constructor(username: string, age: number, region: string) {
    this.id = uuidv4();
    this.username = username;
    this.wallet = null;
    this.did = '';
    this.didDocument = null;
    this.credentials = [];
    this.sparks = [];
    this.followers = [];
    this.following = [];
    this.region = region;
    this.age = age;
    this.sharingConsent = true;
  }

  async setupIdentity(walletKit: WalletKit, didGateway: DIDGateway) {
    console.log(`Setting up identity for ${this.username}...`);

    // Create a wallet for the user
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

    // Create a DID for the user
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

    console.log(`Identity setup complete for ${this.username}`);
    console.log(`DID: ${this.did}`);

    return {
      did: this.did,
      didDocument: this.didDocument,
    };
  }

  follow(user: User) {
    if (!this.following.includes(user.id)) {
      this.following.push(user.id);
      user.followers.push(this.id);
      console.log(`${this.username} is now following ${user.username}`);
    }
  }

  unfollow(user: User) {
    this.following = this.following.filter((id) => id !== user.id);
    user.followers = user.followers.filter((id) => id !== this.id);
    console.log(`${this.username} unfollowed ${user.username}`);
  }
}

// Spark class representing a FuseStream content post
class Spark {
  id: string;
  creatorId: string;
  title: string;
  content: string;
  contentType: string;
  visibility: string;
  minAge: number;
  hasPrivacyRestrictions: boolean;
  allowedRegions: string[];
  allowedViewers: string[];
  createdAt: Date;
  engagement: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };

  constructor(
    creatorId: string,
    title: string,
    content: string,
    contentType: string,
    visibility: string,
    minAge: number = 0
  ) {
    this.id = uuidv4();
    this.creatorId = creatorId;
    this.title = title;
    this.content = content;
    this.contentType = contentType;
    this.visibility = visibility;
    this.minAge = minAge;
    this.hasPrivacyRestrictions = false;
    this.allowedRegions = [...REGIONS];
    this.allowedViewers = [];
    this.createdAt = new Date();
    this.engagement = {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
    };
  }

  setPrivacyRestrictions(hasRestrictions: boolean, allowedRegions: string[]) {
    this.hasPrivacyRestrictions = hasRestrictions;
    this.allowedRegions = allowedRegions;
    return this;
  }

  addAllowedViewer(userId: string) {
    if (!this.allowedViewers.includes(userId)) {
      this.allowedViewers.push(userId);
    }
    return this;
  }

  view(userId: string) {
    this.engagement.views++;
    console.log(`Spark ${this.id} viewed by user ${userId}`);
  }

  like(userId: string) {
    this.engagement.likes++;
    console.log(`Spark ${this.id} liked by user ${userId}`);
  }
}

// FuseStream platform class
class FuseStreamPlatform {
  users: Map<string, User>;
  sparks: Map<string, Spark>;
  walletKit: WalletKit;
  didGateway: DIDGateway;
  policyCompiler: PolicyCompiler;
  contentPolicy: any;

  constructor() {
    this.users = new Map();
    this.sparks = new Map();
    this.walletKit = new WalletKit({
      storageOptions: {
        secureStorage: true,
        biometricProtection: false,
        backupEnabled: true,
      },
    });
    this.didGateway = new DIDGateway();
    this.policyCompiler = new PolicyCompiler();

    // Define the content sharing policy
    this.contentPolicy = {
      id: 'content-sharing-policy',
      name: 'Content Sharing Policy',
      description:
        'Controls who can view content based on age, privacy settings, and relationships',
      version: '1.0.0',
      rules: [
        {
          and: [
            { '>=': [{ var: 'viewer.age' }, { var: 'content.minAge' }] },
            {
              or: [
                { '==': [{ var: 'content.visibility' }, 'PUBLIC'] },
                {
                  and: [
                    { '==': [{ var: 'content.visibility' }, 'FOLLOWERS'] },
                    {
                      in: [
                        { var: 'viewer.id' },
                        { var: 'content.creator.followers' },
                      ],
                    },
                  ],
                },
                {
                  and: [
                    { '==': [{ var: 'content.visibility' }, 'PRIVATE'] },
                    {
                      in: [
                        { var: 'viewer.id' },
                        { var: 'content.allowedViewers' },
                      ],
                    },
                  ],
                },
              ],
            },
            { '==': [{ var: 'content.creator.sharingConsent' }, true] },
            {
              or: [
                { '==': [{ var: 'content.hasPrivacyRestrictions' }, false] },
                {
                  in: [
                    { var: 'viewer.region' },
                    { var: 'content.allowedRegions' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  async registerUser(
    username: string,
    age: number,
    region: string
  ): Promise<User> {
    const user = new User(username, age, region);
    await user.setupIdentity(this.walletKit, this.didGateway);
    this.users.set(user.id, user);
    console.log(`User ${username} registered with ID: ${user.id}`);
    return user;
  }

  createSpark(
    creatorId: string,
    title: string,
    content: string,
    contentType: string,
    visibility: string,
    minAge: number = 0
  ): Spark {
    const creator = this.users.get(creatorId);
    if (!creator) {
      throw new Error(`Creator with ID ${creatorId} not found`);
    }

    const spark = new Spark(
      creatorId,
      title,
      content,
      contentType,
      visibility,
      minAge
    );
    this.sparks.set(spark.id, spark);
    creator.sparks.push(spark.id);

    console.log(`Spark "${title}" created by ${creator.username}`);
    return spark;
  }

  async canViewSpark(
    viewerId: string,
    sparkId: string
  ): Promise<{ allowed: boolean; reasons: string[] }> {
    const viewer = this.users.get(viewerId);
    const spark = this.sparks.get(sparkId);

    if (!viewer || !spark) {
      return { allowed: false, reasons: ['User or content not found'] };
    }

    const creator = this.users.get(spark.creatorId);
    if (!creator) {
      return { allowed: false, reasons: ['Content creator not found'] };
    }

    // Prepare input for policy evaluation
    const input = {
      viewer: {
        id: viewerId,
        age: viewer.age,
        region: viewer.region,
      },
      content: {
        id: sparkId,
        minAge: spark.minAge,
        visibility: spark.visibility,
        hasPrivacyRestrictions: spark.hasPrivacyRestrictions,
        allowedRegions: spark.allowedRegions,
        allowedViewers: spark.allowedViewers,
        creator: {
          id: creator.id,
          sharingConsent: creator.sharingConsent,
          followers: creator.followers,
        },
      },
    };

    // Evaluate against the policy
    const result = await this.policyCompiler.evaluate(
      this.contentPolicy,
      input
    );

    // Generate reasons based on evaluation
    const reasons: string[] = result.reasons || [];

    // Add additional reasons if not provided by the policy compiler
    if (reasons.length === 0) {
      if (viewer.age >= spark.minAge) {
        reasons.push('Age requirement satisfied');
      } else {
        reasons.push('Age requirement not satisfied');
      }

      if (spark.visibility === 'PUBLIC') {
        reasons.push('Content is public');
      } else if (spark.visibility === 'FOLLOWERS') {
        if (creator.followers.includes(viewerId)) {
          reasons.push('Viewer is a follower');
        } else {
          reasons.push(
            'Content is for followers only and viewer is not a follower'
          );
        }
      } else if (spark.visibility === 'PRIVATE') {
        if (spark.allowedViewers.includes(viewerId)) {
          reasons.push('Viewer is explicitly allowed');
        } else {
          reasons.push('Content is private and viewer not allowed');
        }
      }

      if (creator.sharingConsent) {
        reasons.push('Creator has consented to sharing');
      } else {
        reasons.push('Creator has not consented to sharing');
      }

      if (spark.hasPrivacyRestrictions) {
        if (spark.allowedRegions.includes(viewer.region)) {
          reasons.push('Viewer is in allowed region');
        } else {
          reasons.push('Viewer is not in an allowed region');
        }
      } else {
        reasons.push('Content has no privacy restrictions');
      }
    }

    return {
      allowed: result.allowed,
      reasons,
    };
  }

  async viewSpark(viewerId: string, sparkId: string): Promise<boolean> {
    const accessResult = await this.canViewSpark(viewerId, sparkId);

    if (accessResult.allowed) {
      const spark = this.sparks.get(sparkId);
      if (spark) {
        spark.view(viewerId);
        return true;
      }
    } else {
      console.log(`Access denied for user ${viewerId} to spark ${sparkId}`);
      console.log(`Reasons: ${accessResult.reasons.join(', ')}`);
    }

    return false;
  }

  issueCreatorCredential(userId: string, level: string): void {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const credential = {
      id: uuidv4(),
      type: 'CreatorCredential',
      issuer: 'did:ion:fusestream',
      subject: user.did,
      issuanceDate: new Date().toISOString(),
      claims: {
        level,
        verified: true,
        followers: user.followers.length,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: 'did:ion:fusestream#key-1',
        proofValue: crypto.randomBytes(64).toString('hex'),
      },
    };

    user.credentials.push(credential);
    console.log(
      `Creator credential issued to ${user.username} with level ${level}`
    );
  }
}

// Run the simulation
async function runSimulation() {
  console.log('Starting FuseStream simulation...');

  // Initialize the platform
  const platform = new FuseStreamPlatform();

  // Register users
  console.log('\n1. Registering users...');
  const alice = await platform.registerUser('Alice', 25, 'US');
  const bob = await platform.registerUser('Bob', 17, 'EU');
  const charlie = await platform.registerUser('Charlie', 30, 'ASIA');
  const diana = await platform.registerUser('Diana', 22, 'US');

  // Create social connections
  console.log('\n2. Creating social connections...');
  bob.follow(alice);
  charlie.follow(alice);
  diana.follow(alice);
  alice.follow(charlie);

  // Issue creator credentials
  console.log('\n3. Issuing creator credentials...');
  platform.issueCreatorCredential(alice.id, 'VERIFIED');
  platform.issueCreatorCredential(charlie.id, 'PARTNER');

  // Create content
  console.log('\n4. Creating content...');
  const publicSpark = platform.createSpark(
    alice.id,
    'Welcome to FuseStream!',
    'This is my first public Spark. #HelloWorld',
    'TEXT',
    'PUBLIC'
  );

  const followersSpark = platform.createSpark(
    alice.id,
    'Followers Only Content',
    'This content is only for my followers.',
    'VIDEO',
    'FOLLOWERS'
  );
  followersSpark.setPrivacyRestrictions(true, ['US', 'EU']);

  const privateSpark = platform.createSpark(
    alice.id,
    'Private Content',
    'This is private content for specific users.',
    'IMAGE',
    'PRIVATE'
  );
  privateSpark.addAllowedViewer(diana.id);

  const ageRestrictedSpark = platform.createSpark(
    charlie.id,
    'Age Restricted Content',
    'This content is age-restricted.',
    'VIDEO',
    'PUBLIC',
    18
  );

  // Test access scenarios
  console.log('\n5. Testing access scenarios...');

  const scenarios = [
    {
      name: 'Public content access',
      viewer: bob.id,
      content: publicSpark.id,
      expected: true,
    },
    {
      name: 'Followers-only content access by follower',
      viewer: bob.id,
      content: followersSpark.id,
      expected: true,
    },
    {
      name: 'Followers-only content access by non-follower',
      viewer: alice.id, // Alice doesn't follow herself
      content: followersSpark.id,
      expected: false,
    },
    {
      name: 'Private content access by allowed viewer',
      viewer: diana.id,
      content: privateSpark.id,
      expected: true,
    },
    {
      name: 'Private content access by non-allowed viewer',
      viewer: bob.id,
      content: privateSpark.id,
      expected: false,
    },
    {
      name: 'Age-restricted content access by adult',
      viewer: charlie.id, // 30 years old
      content: ageRestrictedSpark.id,
      expected: true,
    },
    {
      name: 'Age-restricted content access by minor',
      viewer: bob.id, // 17 years old
      content: ageRestrictedSpark.id,
      expected: false,
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\nScenario: ${scenario.name}`);
    const result = await platform.canViewSpark(
      scenario.viewer,
      scenario.content
    );

    console.log(`Access allowed: ${result.allowed}`);
    console.log(`Reasons: ${result.reasons.join(', ')}`);

    if (result.allowed === scenario.expected) {
      console.log('✅ Result matches expected outcome');
    } else {
      console.log(
        `❌ Result does not match expected outcome (${scenario.expected})`
      );
    }

    // If access is allowed, simulate viewing the content
    if (result.allowed) {
      await platform.viewSpark(scenario.viewer, scenario.content);
    }
  }

  console.log('\nSimulation completed successfully!');
}

// Run the simulation if this file is executed directly
const isMainModule = import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  runSimulation().catch((error) => {
    console.error('Simulation failed:', error);
  });
}

export { User, Spark, FuseStreamPlatform, runSimulation };
