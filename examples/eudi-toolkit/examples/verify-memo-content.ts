import { Client } from 'xrpl';
import * as fs from 'fs';

async function verifyMemoContent() {
  try {
    const onChainCred = JSON.parse(fs.readFileSync('onchain-credential.json', 'utf8'));
    const client = new Client('wss://s.altnet.rippletest.net:51233');
    
    console.log('🔍 VERIFYING ENHANCED MEMO CONTENT');
    console.log('==================================');
    console.log(`NFT Token ID: ${onChainCred.nftTokenId}`);
    console.log(`Transaction: ${onChainCred.transactionHash}`);
    console.log('');
    
    await client.connect();
    
    // Get the transaction details
    const tx = await client.request({
      command: 'tx',
      transaction: onChainCred.transactionHash
    });
    
    console.log('📄 TRANSACTION MEMOS:');
    console.log('==================');
    
    const txData = tx.result as any;
    if (txData.Memos && txData.Memos.length > 0) {
      txData.Memos.forEach((memo: any, index: number) => {
        const memoType = Buffer.from(memo.Memo.MemoType, 'hex').toString();
        const memoData = Buffer.from(memo.Memo.MemoData, 'hex').toString();
        const memoFormat = Buffer.from(memo.Memo.MemoFormat, 'hex').toString();
        
        console.log(`Memo ${index + 1}:`);
        console.log(`  Type: ${memoType}`);
        console.log(`  Format: ${memoFormat}`);
        console.log(`  Size: ${memoData.length} bytes`);
        
        if (memoType === 'credential') {
          console.log('  Content:');
          try {
            const parsedData = JSON.parse(memoData);
            console.log(JSON.stringify(parsedData, null, 4));
            
            console.log('');
            console.log('✅ ENHANCED MEMO VERIFICATION:');
            console.log(`  • Contains credential ID: ${!!parsedData.id}`);
            console.log(`  • Contains credential type: ${!!parsedData.type}`);
            console.log(`  • Contains issuer: ${!!parsedData.issuer}`);
            console.log(`  • Contains issuance date: ${!!parsedData.issuanceDate}`);
            console.log(`  • Contains expiration date: ${!!parsedData.expirationDate}`);
            console.log(`  • Contains credential subject: ${!!parsedData.credentialSubject}`);
            
            if (parsedData.credentialSubject) {
              const subject = parsedData.credentialSubject;
              console.log(`  • Subject ID: ${!!subject.id}`);
              console.log(`  • First Name: ${!!subject.firstName}`);
              console.log(`  • Last Name: ${!!subject.lastName}`);
              console.log(`  • Date of Birth: ${!!subject.dateOfBirth}`);
              console.log(`  • License Number: ${!!subject.licenseNumber}`);
              console.log(`  • License Categories: ${!!subject.categories}`);
              console.log(`  • Address: ${!!subject.address}`);
              console.log(`  • Issuing Authority: ${!!subject.issuingAuthority}`);
            }
          } catch (error) {
            console.log(`  Error parsing JSON: ${error}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('No memos found in transaction');
    }
    
    await client.disconnect();
    
  } catch (error: any) {
    console.error('Error verifying memo content:', error.message);
  }
}

if (require.main === module) {
  verifyMemoContent().catch(console.error);
}
