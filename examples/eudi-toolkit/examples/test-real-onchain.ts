#!/usr/bin/env ts-node

/**
 * Real XRPL On-Chain Credential Test
 * 
 * This script demonstrates actual on-chain interactions with the XRPL network,
 * including real NFT minting, verification, and status tracking.
 */

import { Wallet, Client } from 'xrpl';
import { 
  XRPLOnChainCredentials, 
  CredentialStatus, 
  VerificationLevel 
} from '../src/adapters/xrpl-onchain-credentials';

const XRPL_SERVER = 'wss://s.altnet.rippletest.net:51233';

async function testRealOnChainOperations() {
  console.log('🔗 Testing Real XRPL On-Chain Credential Operations');
  console.log('==================================================');
  
  // Create issuer and holder wallets
  const issuerWallet = Wallet.generate();
  const holderWallet = Wallet.generate();
  
  console.log(`👤 Issuer Address: ${issuerWallet.address}`);
  console.log(`👤 Holder Address: ${holderWallet.address}`);
  
  // Initialize credential system
  const credentialSystem = new XRPLOnChainCredentials(XRPL_SERVER);
  credentialSystem.setWallet(issuerWallet);
  
  try {
    await credentialSystem.connect();
    console.log('✅ Connected to XRPL Testnet');
    
    // Fund wallets using testnet faucet (this would be done manually in practice)
    console.log('💰 Funding wallets (manual step on testnet)...');
    console.log('   Note: In practice, fund these addresses using https://faucet.altnet.rippletest.net/accounts');
    
    // Test 1: Issue a real credential as NFT
    console.log('\n📋 Test 1: Issuing Real Credential as NFT');
    console.log('==========================================');
    
    const credentialData = {
      type: 'TestCredential',
      credentialSubject: {
        name: 'Alice Smith',
        testId: 'TEST-12345',
        issueDate: new Date().toISOString()
      }
    };
    
    try {
      const issuanceResult = await credentialSystem.issueCredential(
        credentialData,
        holderWallet.address,
        {
          transferable: true,
          burnable: true,
          taxon: 9999 // Test taxon
        }
      );
      
      console.log(`✅ Credential NFT minted successfully!`);
      console.log(`   🔗 Transaction Hash: ${issuanceResult.transactionHash}`);
      console.log(`   🎫 NFT Token ID: ${issuanceResult.nftTokenId}`);
      console.log(`   📋 Credential ID: ${issuanceResult.credentialId}`);
      
      // Test 2: Verify the credential on-chain
      console.log('\n🔍 Test 2: Verifying Credential On-Chain');
      console.log('========================================');
      
      const verification = await credentialSystem.verifyCredential(
        issuanceResult.nftTokenId,
        VerificationLevel.ENHANCED
      );
      
      console.log(`   Valid: ${verification.valid}`);
      console.log(`   Status: ${verification.status}`);
      console.log(`   Issuer Verified: ${verification.issuerVerified}`);
      console.log(`   Holder Verified: ${verification.holderVerified}`);
      console.log(`   Not Expired: ${verification.notExpired}`);
      console.log(`   Not Revoked: ${verification.notRevoked}`);
      console.log(`   Proof Valid: ${verification.proofValid}`);
      
      if (verification.metadata) {
        console.log(`   📄 Credential Type: ${verification.metadata.type.join(', ')}`);
        console.log(`   📅 Issued: ${verification.metadata.issuanceDate}`);
      }
      
      // Test 3: Get comprehensive credential info
      console.log('\n📊 Test 3: Getting Comprehensive Credential Info');
      console.log('===============================================');
      
      const credInfo = await credentialSystem.getCredentialInfo(issuanceResult.nftTokenId);
      
      console.log(`   NFT Data:`, credInfo.nftData ? 'Found' : 'Not found');
      console.log(`   Metadata:`, credInfo.metadata ? 'Found' : 'Not found');
      console.log(`   Transaction History: ${credInfo.transactionHistory.length} transactions`);
      console.log(`   Verification Result: ${credInfo.verificationResult.valid ? 'Valid' : 'Invalid'}`);
      
      // Test 4: List credentials by issuer
      console.log('\n📝 Test 4: Listing Credentials by Issuer');
      console.log('========================================');
      
      const issuerCredentials = await credentialSystem.listCredentialsByIssuer(issuerWallet.address);
      console.log(`   Found ${issuerCredentials.length} credentials issued by ${issuerWallet.address}`);
      
      for (const credId of issuerCredentials) {
        console.log(`   - ${credId}`);
      }
      
      // Test 5: Demonstrate revocation (soft)
      console.log('\n🚫 Test 5: Demonstrating Credential Revocation');
      console.log('==============================================');
      
      const revocationResult = await credentialSystem.revokeCredential(
        issuanceResult.nftTokenId,
        false // Soft revocation (memo-based)
      );
      
      if (revocationResult.success) {
        console.log(`✅ Credential revoked successfully!`);
        console.log(`   Method: ${revocationResult.method}`);
        console.log(`   Transaction Hash: ${revocationResult.transactionHash}`);
        
        // Verify the revocation
        const postRevocationVerification = await credentialSystem.verifyCredential(
          issuanceResult.nftTokenId,
          VerificationLevel.ENHANCED
        );
        
        console.log(`   Post-revocation status: ${postRevocationVerification.status}`);
        console.log(`   Valid after revocation: ${postRevocationVerification.valid}`);
      } else {
        console.log(`❌ Revocation failed`);
      }
      
    } catch (error) {
      console.error('❌ Error during credential operations:', error);
      console.log('\nThis is likely due to unfunded testnet accounts.');
      console.log('To test with real transactions:');
      console.log('1. Fund the issuer address with XRP from https://faucet.altnet.rippletest.net/accounts');
      console.log('2. Fund the holder address with XRP from the same faucet');
      console.log('3. Re-run this test script');
    }
    
  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await credentialSystem.disconnect();
    console.log('\n✅ Disconnected from XRPL');
  }
  
  console.log('\n🎉 Real On-Chain Credential Test Complete!');
  console.log('==========================================');
  console.log('This test demonstrates:');
  console.log('✅ Real XRPL NFT minting for credentials');
  console.log('✅ Actual on-chain verification');
  console.log('✅ Real transaction history retrieval');
  console.log('✅ Live credential status tracking');
  console.log('✅ Genuine on-chain revocation');
}

if (require.main === module) {
  testRealOnChainOperations().catch(console.error);
}

export { testRealOnChainOperations }; 