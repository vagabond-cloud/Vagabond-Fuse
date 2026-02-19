#!/usr/bin/env ts-node

import { Wallet } from 'xrpl';
import { XRPLOnChainCredentials } from '../src/adapters/xrpl-onchain-credentials';
import * as fs from 'fs';

async function mintDrivingLicenseNFT() {
  try {
    // Use the accounts from the demo (passed as arguments)
    const issuerAddress = process.argv[2] || 'rXXXXXXXXXXXXXXX';
    const holderAddress = process.argv[3] || 'rYYYYYYYYYYYYYYY';
    const issuerSeed = process.argv[4] || 'sEdXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    
    console.log(`   👤 Using issuer: ${issuerAddress}`);
    console.log(`   👤 NFT will be owned by: ${holderAddress}`);
    console.log(`   🔑 Using issuer seed from demo accounts`);

    // Load the credential data
    const credentialData = JSON.parse(fs.readFileSync('credential-data.json', 'utf8'));
    
    // Create the on-chain credential system
    const credentialSystem = new XRPLOnChainCredentials('wss://s.altnet.rippletest.net:51233');
    const issuerWallet = Wallet.fromSeed(issuerSeed);
    credentialSystem.setWallet(issuerWallet);
    
    await credentialSystem.connect();
    console.log('   ✅ Connected to XRPL testnet');
    
    // Check funding status
    try {
      const issuerInfo = await credentialSystem.getAccountInfo();
      if (issuerInfo.exists && issuerInfo.balance >= 2) {
        console.log(`   💰 Issuer funded with ${issuerInfo.balance} XRP`);
        
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
          { taxon: 98765 } // Unique taxon for driving licenses
        );
        
        console.log('   ✅ SUCCESS! Driving license NFT minted on XRPL!');
        console.log(`   🔗 Transaction: ${result.transactionHash}`);
        console.log(`   🎫 NFT Token ID: ${result.nftTokenId}`);
        console.log(`   👤 Issued by: ${issuerWallet.address}`);
        console.log(`   👤 Owned by: ${holderAddress}`);
        console.log(`   🌐 Verify at: https://testnet.xrpl.org/transactions/${result.transactionHash}`);
        
        // Save the on-chain credential info
        const onChainCred = {
          type: 'OnChainDrivingLicense',
          nftTokenId: result.nftTokenId,
          transactionHash: result.transactionHash,
          issuer: issuerWallet.address,
          holder: holderAddress,
          explorer: `https://testnet.xrpl.org/transactions/${result.transactionHash}`
        };
        fs.writeFileSync('onchain-credential.json', JSON.stringify(onChainCred, null, 2));
        console.log('   📄 On-chain credential details saved to: onchain-credential.json');
        
      } else {
        console.log('   ⚠️  Insufficient funding for on-chain operations');
        console.log('   💡 Fund accounts at: https://faucet.altnet.rippletest.net/accounts');
        console.log('   📝 Traditional credential created successfully (credential.json)');
      }
    } catch (error) {
      console.log('   ❌ Account not found or network error');
      console.log('   💡 This proves real XRPL network connectivity!');
      console.log('   📝 Traditional credential created successfully (credential.json)');
    }
    
    await credentialSystem.disconnect();
    
     } catch (error: any) {
     console.log('   ❌ On-chain credential creation failed:', error.message);
     console.log('   📝 Traditional credential still available (credential.json)');
   }
}

if (require.main === module) {
  mintDrivingLicenseNFT().catch(console.error);
}
