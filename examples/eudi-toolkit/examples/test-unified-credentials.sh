#!/bin/bash

# Test Unified Credential Issuance
# This demonstrates creating both traditional and on-chain credentials in one step

set -e

echo "🔄 UNIFIED CREDENTIAL ISSUANCE TEST"
echo "=================================="
echo "Creating both traditional W3C AND on-chain NFT credentials simultaneously"
echo ""

# Load funded account details
if [ ! -f "test-accounts.json" ]; then
  echo "❌ Error: test-accounts.json not found"
  echo "💡 Run ./fund-and-test.sh to generate funded accounts"
  exit 1
fi

ISSUER_DID=$(cat test-accounts.json | grep '"did"' | head -1 | cut -d'"' -f4)
HOLDER_DID=$(cat test-accounts.json | grep '"did"' | tail -1 | cut -d'"' -f4)

echo "👤 Issuer DID: $ISSUER_DID"
echo "👤 Holder DID: $HOLDER_DID"
echo ""

# Create credential data
mkdir -p examples
cat > examples/unified-credential-data.json << EOL
{
  "firstName": "Alice",
  "lastName": "Smith",
  "dateOfBirth": "1985-03-15",
  "placeOfBirth": "Munich",
  "issueDate": "$(date +%Y-%m-%d)",
  "expiryDate": "$(date -v+5y +%Y-%m-%d 2>/dev/null || date -d '+5 years' +%Y-%m-%d)",
  "issuingAuthority": "EU Driving Authority",
  "licenseNumber": "DL-987654321",
  "categories": ["A", "B"],
  "restrictions": [],
  "address": {
    "streetAddress": "456 Tech Street",
    "locality": "Munich",
    "postalCode": "80331",
    "country": "DE"
  }
}
EOL

echo "📄 1. Creating traditional W3C verifiable credential..."
npm run start -- issue -t DrivingLicense -i "$ISSUER_DID" -s "$HOLDER_DID" -d examples/unified-credential-data.json -o unified-traditional.json

echo ""
echo "🔗 2. Creating on-chain NFT credential on XRPL..."

# Create on-chain credential script
cat > create-onchain-unified.ts << 'EOF'
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
EOF

# Run the on-chain creation
ts-node create-onchain-unified.ts

# Clean up
rm -f create-onchain-unified.ts

echo ""
echo "✅ UNIFIED CREDENTIAL ISSUANCE COMPLETE!"
echo "========================================"

if [ -f "unified-traditional.json" ]; then
  echo "📄 Traditional credential: unified-traditional.json"
fi

if [ -f "unified-onchain.json" ]; then
  echo "🔗 On-chain credential: unified-onchain.json"
  echo ""
  echo "🎉 BOTH FORMATS CREATED SUCCESSFULLY!"
  echo "📄 Privacy-preserving traditional credential available locally"
  echo "🔗 Immutable on-chain credential publicly verifiable on XRPL"
  echo ""
  
  # Show the live transaction link
  TX_HASH=$(cat unified-onchain.json | grep '"transactionHash"' | cut -d'"' -f4)
  if [ -n "$TX_HASH" ]; then
    echo "🌐 Live verification: https://testnet.xrpl.org/transactions/$TX_HASH"
  fi
else
  echo "📄 Traditional credential created successfully"
  echo "⚠️  On-chain credential creation may have failed (check funding or network)"
fi

echo ""
echo "🔄 This demonstrates the UNIFIED approach where:"
echo "   ✅ Single issuance process creates BOTH formats"
echo "   ✅ Traditional credential for privacy and ZK proofs"  
echo "   ✅ On-chain credential for immutability and public verification"
echo "   ✅ Same credential data, different storage/verification methods"
echo "   ✅ User can choose verification method based on use case" 