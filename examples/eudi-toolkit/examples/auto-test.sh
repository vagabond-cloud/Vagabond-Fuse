#!/bin/bash

# Automatic XRPL On-Chain Test Runner
# Detects funded accounts and runs appropriate tests

set -e

echo "🚀 XRPL On-Chain Credential Auto-Test"
echo "====================================="
echo ""

# Check if test accounts exist
if [ -f "test-accounts.json" ]; then
  echo "📄 Found test-accounts.json"
  
  # Extract addresses
  ISSUER_ADDRESS=$(cat test-accounts.json | grep -o '"address": "[^"]*"' | head -1 | cut -d'"' -f4)
  HOLDER_ADDRESS=$(cat test-accounts.json | grep -o '"address": "[^"]*"' | tail -1 | cut -d'"' -f4)
  
  echo "👤 Issuer:  $ISSUER_ADDRESS"
  echo "👤 Holder:  $HOLDER_ADDRESS"
  echo ""
  
  # Check if accounts are funded using TypeScript
  echo "💰 Checking account funding status..."
  
  FUNDED_STATUS=$(ts-node -e "
    import { Client } from 'xrpl';
    
    async function checkFunding() {
      const client = new Client('wss://s.altnet.rippletest.net:51233');
      await client.connect();
      
      let issuerFunded = false;
      let holderFunded = false;
      
      try {
        const issuerInfo = await client.request({
          command: 'account_info',
          account: '$ISSUER_ADDRESS'
        });
        const balance = parseInt(issuerInfo.result.account_data.Balance) / 1000000;
                 if (balance >= 9) issuerFunded = true;
        console.log('ISSUER_BALANCE=' + balance);
      } catch (error) {
        console.log('ISSUER_BALANCE=0');
      }
      
      try {
        const holderInfo = await client.request({
          command: 'account_info',
          account: '$HOLDER_ADDRESS'
        });
        const balance = parseInt(holderInfo.result.account_data.Balance) / 1000000;
                 if (balance >= 9) holderFunded = true;
        console.log('HOLDER_BALANCE=' + balance);
      } catch (error) {
        console.log('HOLDER_BALANCE=0');
      }
      
      console.log('BOTH_FUNDED=' + (issuerFunded && holderFunded));
      await client.disconnect();
    }
    
    checkFunding().catch(() => {
      console.log('ISSUER_BALANCE=0');
      console.log('HOLDER_BALANCE=0'); 
      console.log('BOTH_FUNDED=false');
    });
  ")
  
  # Parse the output
  eval "$FUNDED_STATUS"
  
  echo "   Issuer Balance: ${ISSUER_BALANCE:-0} XRP"
  echo "   Holder Balance: ${HOLDER_BALANCE:-0} XRP"
  echo ""
  
  if [ "$BOTH_FUNDED" = "true" ]; then
    echo "✅ ACCOUNTS ARE FUNDED! Running full test..."
    echo "==========================================="
    echo ""
    
    echo "🎯 Running funded NFT credential test..."
    ts-node test-funded-onchain.ts
    
  else
    echo "⚠️  ACCOUNTS NOT FUNDED"
    echo "======================"
    echo ""
    echo "📍 Fund these addresses at:"
    echo "   🌐 https://faucet.altnet.rippletest.net/accounts"
    echo ""
    echo "   Issuer:  $ISSUER_ADDRESS"
    echo "   Holder:  $HOLDER_ADDRESS"
    echo ""
    echo "🔍 Running proof-of-concept test (unfunded)..."
    ts-node proof-of-onchain.ts
    echo ""
    echo "💡 After funding, run: ./auto-test.sh again"
  fi
  
else
  echo "📝 No test accounts found. Generating new ones..."
  ./fund-and-test.sh
fi

echo ""
echo "✅ Test complete!" 