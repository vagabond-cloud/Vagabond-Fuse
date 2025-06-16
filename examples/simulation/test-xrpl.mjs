#!/usr/bin/env node

/**
 * Test script to verify XRPL installation and connection using ESM syntax
 */

console.log('Testing XRPL package installation and connection...');

try {
  import('xrpl').then(async (xrpl) => {
    console.log('XRPL package successfully imported!');
    console.log('XRPL version:', xrpl.Client.version);
    
    console.log('Attempting to connect to XRPL Testnet...');
    const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
    
    try {
      await client.connect();
      console.log('Successfully connected to XRPL Testnet!');
      
      // Get server info
      const serverInfo = await client.request({
        command: 'server_info'
      });
      
      console.log('Server info:', JSON.stringify(serverInfo, null, 2));
      
      await client.disconnect();
      console.log('Disconnected from XRPL Testnet');
      console.log('XRPL test completed successfully!');
    } catch (error) {
      console.error('Failed to connect to XRPL Testnet:', error.message);
      console.log('XRPL test failed!');
    }
  }).catch(error => {
    console.error('Failed to import XRPL package:', error.message);
    console.log('Make sure you have installed the XRPL package with: npm install xrpl');
  });
} catch (error) {
  console.error('Error:', error.message);
} 