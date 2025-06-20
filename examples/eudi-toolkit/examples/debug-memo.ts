import { Client } from 'xrpl';
import * as fs from 'fs';

async function debugMemo() {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  // Check the latest credential we created
  const onChainCred = JSON.parse(
    fs.readFileSync('onchain-credential.json', 'utf8')
  );
  console.log(
    '🔍 Debugging memo for transaction:',
    onChainCred.transactionHash
  );

  try {
    // Get transaction details
    const tx = await client.request({
      command: 'tx',
      transaction: onChainCred.transactionHash,
    });

    const txData = tx.result as any;
    console.log('\n📄 Transaction Type:', txData.TransactionType);
    console.log('📄 Transaction Account:', txData.Account);

    if (txData.Memos) {
      console.log('✅ Found', txData.Memos.length, 'memo(s)');
      txData.Memos.forEach((memo: any, index: number) => {
        console.log(`\nMemo ${index + 1}:`);
        const memoType = Buffer.from(memo.Memo.MemoType, 'hex').toString();
        const memoData = Buffer.from(memo.Memo.MemoData, 'hex').toString();

        console.log('  Type:', memoType);
        console.log('  Data Length:', memoData.length, 'bytes');

        if (memoType === 'credential') {
          console.log('  Content:');
          const parsedData = JSON.parse(memoData);
          console.log(JSON.stringify(parsedData, null, 4));

          // GDPR compliance check
          const hasPersonalData =
            JSON.stringify(parsedData).toLowerCase().includes('jane') ||
            JSON.stringify(parsedData).toLowerCase().includes('doe') ||
            JSON.stringify(parsedData).toLowerCase().includes('berlin');

          console.log(
            '\n🔒 GDPR Status:',
            hasPersonalData ? '❌ Personal data found' : '✅ GDPR compliant'
          );
        }
      });
    } else {
      console.log('❌ No memos found');
    }

    // Also check if this is an NFTokenMint transaction
    if (txData.TransactionType === 'NFTokenMint') {
      console.log('\n🎫 This IS the mint transaction - memo should be here');
    } else {
      console.log(
        "\n🔄 This is NOT the mint transaction (it's a",
        txData.TransactionType,
        ')'
      );
      console.log('   Let me search for the actual mint transaction...');

      // Get account transactions to find the mint
      const accountTx = await client.request({
        command: 'account_tx',
        account: onChainCred.issuer,
        limit: 20,
      });

      const mintTx = accountTx.result.transactions.find(
        (tx: any) =>
          tx.tx?.TransactionType === 'NFTokenMint' &&
          tx.meta?.CreatedNode?.some(
            (node: any) => node.CreatedNode?.LedgerEntryType === 'NFToken'
          )
      );

      if (mintTx && mintTx.tx && (mintTx.tx as any).hash) {
        console.log('🎫 Found mint transaction:', (mintTx.tx as any).hash);

        const mintDetails = await client.request({
          command: 'tx',
          transaction: (mintTx.tx as any).hash,
        });

        const mintData = mintDetails.result as any;
        if (mintData.Memos) {
          console.log(
            '✅ Mint transaction has',
            mintData.Memos.length,
            'memo(s)'
          );
          mintData.Memos.forEach((memo: any, index: number) => {
            const memoType = Buffer.from(memo.Memo.MemoType, 'hex').toString();
            const memoData = Buffer.from(memo.Memo.MemoData, 'hex').toString();

            if (memoType === 'credential') {
              console.log('\n🔒 GDPR-COMPLIANT MEMO FROM MINT TRANSACTION:');
              const parsedData = JSON.parse(memoData);
              console.log(JSON.stringify(parsedData, null, 2));
            }
          });
        }
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  await client.disconnect();
}

debugMemo().catch(console.error);
