#!/usr/bin/env ts-node

import { Client } from 'xrpl';
import * as fs from 'fs';

async function checkFunding() {
  try {
    if (!fs.existsSync('test-accounts.json')) {
      console.log(
        '❌ No test-accounts.json found. Run ./fund-and-test.sh first.'
      );
      return;
    }

    const accountData = JSON.parse(
      fs.readFileSync('test-accounts.json', 'utf8')
    );
    const client = new Client('wss://s.altnet.rippletest.net:51233');

    console.log('🔗 Connecting to XRPL testnet...');
    await client.connect();

    console.log('\n💰 FUNDING STATUS:');
    console.log('==================');

    // Check issuer funding
    try {
      const issuerInfo = await client.request({
        command: 'account_info',
        account: accountData.issuer.address,
      });
      const issuerBalance =
        Number(issuerInfo.result.account_data.Balance) / 1000000;
      console.log(`👤 Issuer (${accountData.issuer.address})`);
      console.log(`   Balance: ${issuerBalance} XRP`);
      console.log(
        `   Status: ${issuerBalance >= 20 ? '✅ FUNDED' : '⚠️  NEEDS FUNDING'}`
      );
    } catch (error) {
      console.log(`👤 Issuer (${accountData.issuer.address})`);
      console.log(`   Status: ❌ NOT FUNDED (account not found)`);
    }

    console.log('');

    // Check holder funding
    try {
      const holderInfo = await client.request({
        command: 'account_info',
        account: accountData.holder.address,
      });
      const holderBalance =
        Number(holderInfo.result.account_data.Balance) / 1000000;
      console.log(`👤 Holder (${accountData.holder.address})`);
      console.log(`   Balance: ${holderBalance} XRP`);
      console.log(
        `   Status: ${holderBalance >= 10 ? '✅ FUNDED' : '⚠️  NEEDS FUNDING'}`
      );
    } catch (error) {
      console.log(`👤 Holder (${accountData.holder.address})`);
      console.log(`   Status: ❌ NOT FUNDED (account not found)`);
    }

    console.log('\n🌐 FUNDING LINK:');
    console.log('https://faucet.altnet.rippletest.net/accounts');
    console.log(
      '\n💡 TIP: Each account needs at least 20 XRP for NFT operations'
    );

    await client.disconnect();
  } catch (error: any) {
    console.error('❌ Error checking funding:', error.message);
  }
}

if (require.main === module) {
  checkFunding().catch(console.error);
}
