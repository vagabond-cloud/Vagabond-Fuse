#!/bin/bash

# XRPL Account Funding and Testing Script
# This script helps fund test accounts and run fully funded demonstrations

set -e

echo "🎫 XRPL Testnet Account Funding Helper"
echo "====================================="
echo ""

# Generate or use existing test addresses
echo "📍 Generating test addresses for funding..."

# Create issuer DID
echo "Creating issuer DID..."
ISSUER_OUTPUT=$(npm run start -- did create -m xrpl)
ISSUER_SEED=$(echo "$ISSUER_OUTPUT" | grep "Seed:" | awk '{print $2}')
ISSUER_DID=$(echo "$ISSUER_OUTPUT" | grep -o "did:xrpl:[a-zA-Z0-9]*" | head -1)
ISSUER_ADDRESS=$(echo "$ISSUER_DID" | sed 's/did:xrpl://')

# Create holder DID
echo "Creating holder DID..."
HOLDER_OUTPUT=$(npm run start -- did create -m xrpl)
HOLDER_SEED=$(echo "$HOLDER_OUTPUT" | grep "Seed:" | awk '{print $2}')
HOLDER_DID=$(echo "$HOLDER_OUTPUT" | grep -o "did:xrpl:[a-zA-Z0-9]*" | head -1)
HOLDER_ADDRESS=$(echo "$HOLDER_DID" | sed 's/did:xrpl://')

# Save account info
cat > test-accounts.json << EOL
{
  "issuer": {
    "did": "$ISSUER_DID",
    "address": "$ISSUER_ADDRESS",
    "seed": "$ISSUER_SEED"
  },
  "holder": {
    "did": "$HOLDER_DID", 
    "address": "$HOLDER_ADDRESS",
    "seed": "$HOLDER_SEED"
  }
}
EOL

echo ""
echo "🏦 Accounts created and saved to test-accounts.json:"
echo "=================================================="
echo "Issuer Address:  $ISSUER_ADDRESS"
echo "Holder Address:  $HOLDER_ADDRESS"
echo ""

echo "💰 FUNDING INSTRUCTIONS:"
echo "========================"
echo "1. Visit the XRPL Testnet Faucet:"
echo "   👉 https://faucet.altnet.rippletest.net/accounts"
echo ""
echo "2. Fund these addresses (copy and paste):"
echo "   📍 Issuer:  $ISSUER_ADDRESS"
echo "   📍 Holder:  $HOLDER_ADDRESS"
echo ""
echo "3. Each account needs at least 10-20 XRP for testing"
echo "4. Wait 30-60 seconds for funding to complete"
echo ""

# Function to check if account is funded
check_funding() {
    local address=$1
    local name=$2
    echo "Checking $name account funding: $address"
    
    # Use our existing proof script to check balance
    if command -v ts-node >/dev/null 2>&1; then
        ts-node -e "
        import { Client } from 'xrpl';
        
        async function checkBalance() {
            const client = new Client('wss://s.altnet.rippletest.net:51233');
            await client.connect();
            
            try {
                const response = await client.request({
                    command: 'account_info',
                    account: '$address'
                });
                
                const balance = parseInt(response.result.account_data.Balance) / 1000000;
                console.log('✅ $name funded with', balance, 'XRP');
                await client.disconnect();
                return true;
            } catch (error) {
                console.log('❌ $name not funded yet');
                await client.disconnect();
                return false;
            }
        }
        
        checkBalance();
        "
    else
        echo "❓ Cannot check balance - TypeScript tools not available"
    fi
}

echo "⏳ Waiting for you to fund the accounts..."
echo "Press any key after funding both accounts to continue..."
read -n 1 -s -r

echo ""
echo "🔍 Checking account funding status..."
check_funding "$ISSUER_ADDRESS" "Issuer"
check_funding "$HOLDER_ADDRESS" "Holder"

echo ""
echo "🚀 Ready to run funded tests!"
echo "Use the following commands:"
echo ""
echo "💡 Basic funded test:"
echo "   ts-node test-funded-onchain.ts"
echo ""
echo "🎯 Full demo with funded accounts:"
echo "   FUNDED_ISSUER='$ISSUER_ADDRESS' FUNDED_HOLDER='$HOLDER_ADDRESS' ISSUER_SEED='$ISSUER_SEED' HOLDER_SEED='$HOLDER_SEED' bash demo.sh"
echo ""

echo "📋 Account details saved in test-accounts.json for reference"
echo "✅ Setup complete!" 