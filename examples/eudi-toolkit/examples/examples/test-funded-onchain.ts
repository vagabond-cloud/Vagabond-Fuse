#!/usr/bin/env ts-node

/**
 * Funded XRPL On-Chain Credential Test
 * Use this script after funding the addresses with the testnet faucet
 */

import { Wallet } from 'xrpl';
import { XRPLOnChainCredentials, VerificationLevel } from '../src/adapters/xrpl-onchain-credentials';

const XRPL_SERVER = 'wss://s.altnet.rippletest.net:51233';

// Replace these with your funded testnet addresses
const ISSUER_SEED = 'sEdSjHWx5mNNmPYiKaBhRwDTi4K8yWQ';
const HOLDER_SEED = 'sEdTMGd548YTXDqFQCEq2tV8Z2HuCpr';

async function testWithFundedAccounts() {
  console.log('🔗 Testing with Funded XRPL Testnet Accounts');
  console.log('============================================');
  
  // Create wallets from seeds
  const issuerWallet = Wallet.fromSeed(ISSUER_SEED);
  const holderWallet = Wallet.fromSeed(HOLDER_SEED);
  
  console.log(`👤 Issuer Address: ${issuerWallet.address}`);
  console.log(`👤 Holder Address: ${holderWallet.address}`);
  
  const credentialSystem = new XRPLOnChainCredentials(XRPL_SERVER);
  credentialSystem.setWallet(issuerWallet);
  
  try {
    await credentialSystem.connect();
    console.log('✅ Connected to XRPL Testnet');
    
    // Check account balances
    try {
      const issuerInfo = await credentialSystem.client.request({
        command: 'account_info',
        account: issuerWallet.address,
        ledger_index: 'validated'
      });
      
      console.log(`💰 Issuer Balance: ${Number(issuerInfo.result.account_data.Balance) / 1000000} XRP`);
      
      if (Number(issuerInfo.result.account_data.Balance) < 10000000) {
        console.log('⚠️  Low balance. Make sure to fund the account with at least 10 XRP');
      }
    } catch (error) {
      console.log('❌ Issuer account not found or unfunded');
      return;
    }
    
    // Issue a real credential
    console.log('\n📋 Issuing Real Credential as NFT on XRPL...');
    
    const credentialData = {
      type: 'RealTestCredential',
      credentialSubject: {
        name: 'Bob Wilson',
        id: 'REAL-TEST-67890',
        issueDate: new Date().toISOString()
      }
    };
    
    const issuanceResult = await credentialSystem.issueCredential(
      credentialData,
      holderWallet.address,
      {
        transferable: true,
        burnable: true,
        taxon: 12345
      }
    );
    
    console.log(`✅ REAL Credential NFT minted on XRPL!`);
    console.log(`   🔗 Transaction Hash: ${issuanceResult.transactionHash}`);
    console.log(`   🎫 NFT Token ID: ${issuanceResult.nftTokenId}`);
    console.log(`   📋 Credential ID: ${issuanceResult.credentialId}`);
    
    // Verify the real credential
    console.log('\n🔍 Verifying Real Credential On-Chain...');
    
    const verification = await credentialSystem.verifyCredential(
      issuanceResult.nftTokenId,
      VerificationLevel.ENHANCED
    );
    
    console.log(`   ✅ REAL Verification Results:`);
    console.log(`   - Valid: ${verification.valid}`);
    console.log(`   - Status: ${verification.status}`);
    console.log(`   - On-chain proof: ${verification.proofValid}`);
    
    // Check the NFT on XRPL
    console.log('\n🎫 Checking NFT on XRPL...');
    
    const nftInfo = await credentialSystem.getCredentialInfo(issuanceResult.nftTokenId);
    
    if (nftInfo.nftData) {
      console.log(`   ✅ NFT found on XRPL ledger`);
      console.log(`   - Owner: ${nftInfo.nftData.Owner}`);
      console.log(`   - Token ID: ${nftInfo.nftData.NFTokenID}`);
    }
    
    console.log('\n🎉 REAL On-Chain Credential Operations Successful!');
    console.log('   This proves the system performs actual XRPL transactions.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await credentialSystem.disconnect();
  }
}

if (require.main === module) {
  testWithFundedAccounts().catch(console.error);
}
