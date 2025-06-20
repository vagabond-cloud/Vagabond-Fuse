#!/usr/bin/env ts-node

import { Wallet } from 'xrpl';
import { XRPLOnChainCredentials } from '../src/adapters/xrpl-onchain-credentials';
import * as fs from 'fs';

async function retryOnChainCredential() {
  try {
    // Check if accounts exist and are funded
    if (!fs.existsSync('test-accounts.json')) {
      console.log('❌ No test-accounts.json found. Run ./fund-and-test.sh first.');
      return;
    }

    if (!fs.existsSync('credential-data.json')) {
      console.log('❌ No credential-data.json found. Run the main demo first.');
      return;
    }

    const accountData = JSON.parse(fs.readFileSync('test-accounts.json', 'utf8'));
    const credentialData = JSON.parse(fs.readFileSync('credential-data.json', 'utf8'));
    
    console.log('🔗 Attempting to create on-chain NFT credential...');
    console.log(`👤 Issuer: ${accountData.issuer.address}`);
    console.log(`👤 Holder: ${accountData.holder.address}`);
    
    // Create the on-chain credential system
    const credentialSystem = new XRPLOnChainCredentials('wss://s.altnet.rippletest.net:51233');
    const issuerWallet = Wallet.fromSeed(accountData.issuer.seed);
    credentialSystem.setWallet(issuerWallet);
    
    await credentialSystem.connect();
    console.log('✅ Connected to XRPL testnet');
    
    // Check funding status
    const issuerInfo = await credentialSystem.getAccountInfo();
    if (!issuerInfo.exists) {
      console.log('❌ Issuer account not found on network');
      return;
    }
    
    if (issuerInfo.balance < 2) {
      console.log(`⚠️  Insufficient funding: ${issuerInfo.balance} XRP (need 2+ XRP minimum)`);
      console.log('💡 Fund at: https://faucet.altnet.rippletest.net/accounts');
      return;
    }
    
    console.log(`💰 Issuer funded with ${issuerInfo.balance} XRP - proceeding...`);
    
    // Create the driving license NFT credential
    const result = await credentialSystem.issueCredential(
      {
        type: 'DrivingLicense',
        credentialSubject: {
          id: `did:xrpl:${accountData.holder.address}`,
          ...credentialData
        },
      },
      accountData.holder.address,
      { taxon: 98765 } // Unique taxon for driving licenses
    );
    
    console.log('🎉 SUCCESS! Driving license NFT minted on XRPL!');
    console.log(`🔗 Transaction: ${result.transactionHash}`);
    console.log(`🎫 NFT Token ID: ${result.nftTokenId}`);
    console.log(`👤 Issued by: ${issuerWallet.address}`);
    console.log(`👤 Owned by: ${accountData.holder.address}`);
    console.log(`🌐 Verify at: https://testnet.xrpl.org/transactions/${result.transactionHash}`);
    
    // Save the on-chain credential info
    const onChainCred = {
      type: 'OnChainDrivingLicense',
      nftTokenId: result.nftTokenId,
      transactionHash: result.transactionHash,
      issuer: issuerWallet.address,
      holder: accountData.holder.address,
      explorer: `https://testnet.xrpl.org/transactions/${result.transactionHash}`
    };
    fs.writeFileSync('onchain-credential.json', JSON.stringify(onChainCred, null, 2));
    console.log('📄 On-chain credential details saved to: onchain-credential.json');
    
    await credentialSystem.disconnect();
    
  } catch (error: any) {
    console.error('❌ Error creating on-chain credential:', error.message);
    if (error.message.includes('timeout')) {
      console.log('💡 This might be a network timeout. Try running the script again.');
    }
  }
}

if (require.main === module) {
  retryOnChainCredential().catch(console.error);
}
