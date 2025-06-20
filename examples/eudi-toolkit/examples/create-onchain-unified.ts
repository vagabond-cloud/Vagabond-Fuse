#!/usr/bin/env ts-node

import { Wallet } from 'xrpl';
import { XRPLOnChainCredentials } from '../src/adapters/xrpl-onchain-credentials';
import * as fs from 'fs';

async function createUnifiedOnChainCredential() {
  try {
    // Load test accounts
    const accountData = JSON.parse(fs.readFileSync('test-accounts.json', 'utf8'));
    const issuerSeed = accountData.issuer.seed;
    const holderAddress = accountData.holder.address;
    
    console.log(`   👤 Issuer: ${accountData.issuer.address}`);
    console.log(`   👤 Holder: ${holderAddress}`);
    
    // Load the credential data
    const credentialData = JSON.parse(fs.readFileSync('examples/unified-credential-data.json', 'utf8'));
    
    // Create the on-chain credential system
    const credentialSystem = new XRPLOnChainCredentials('wss://s.altnet.rippletest.net:51233');
    const issuerWallet = Wallet.fromSeed(issuerSeed);
    credentialSystem.setWallet(issuerWallet);
    
    await credentialSystem.connect();
    console.log('   ✅ Connected to XRPL testnet');
    
    // Check funding status
    const issuerInfo = await credentialSystem.getAccountInfo();
    console.log(`   💰 Issuer Balance: ${issuerInfo.balance} XRP`);
    
    if (issuerInfo.balance > 5) {
      // Create the driving license NFT credential
      const result = await credentialSystem.issueCredential(
        {
          type: 'DrivingLicense',
          credentialSubject: {
            id: `did:xrpl:${holderAddress}`,
            ...credentialData
          },
        },
        holderAddress,
        { taxon: 55555 } // Unique taxon for unified test
      );
      
      console.log('   ✅ SUCCESS! On-chain credential created!');
      console.log(`   🔗 Transaction: ${result.transactionHash}`);
      console.log(`   🎫 NFT Token ID: ${result.nftTokenId}`);
      console.log(`   👤 Issued by: ${issuerWallet.address}`);
      console.log(`   👤 Owned by: ${holderAddress}`);
      console.log(`   🌐 Verify: https://testnet.xrpl.org/transactions/${result.transactionHash}`);
      
      // Save the on-chain credential info
      const onChainCred = {
        type: 'UnifiedOnChainDrivingLicense',
        nftTokenId: result.nftTokenId,
        transactionHash: result.transactionHash,
        issuer: issuerWallet.address,
        holder: holderAddress,
        explorer: `https://testnet.xrpl.org/transactions/${result.transactionHash}`,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync('unified-onchain.json', JSON.stringify(onChainCred, null, 2));
      console.log('   📄 On-chain credential saved to: unified-onchain.json');
      
    } else {
      console.log('   ⚠️  Insufficient funding for on-chain operations');
    }
    
    await credentialSystem.disconnect();
    
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
}

if (require.main === module) {
  createUnifiedOnChainCredential().catch(console.error);
}
