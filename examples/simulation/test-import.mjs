#!/usr/bin/env node

/**
 * Test script to verify direct importing of the real XRPL adapter
 */

console.log('Starting import test...');

// Try to import the real adapter using different paths
const paths = [
  '../real-xrpl-adapter.mjs',
  '../../examples/real-xrpl-adapter.mjs',
  './real-xrpl-adapter.mjs',
  '/Users/navidlarijani/Github/Vagabond-Fuse/examples/real-xrpl-adapter.mjs'
];

async function testImport() {
  for (const path of paths) {
    try {
      console.log(`Trying to import from: ${path}`);
      const module = await import(path);
      console.log('Import successful!');
      console.log('Module content:', Object.keys(module));
      
      if (module.XRPLAdapter) {
        console.log('XRPLAdapter found in the module!');
        const adapter = new module.XRPLAdapter();
        console.log('Adapter instance created:', adapter);
      } else if (module.default) {
        console.log('Default export found in the module!');
        const adapter = new module.default();
        console.log('Adapter instance created:', adapter);
      } else {
        console.log('No XRPLAdapter or default export found in the module');
      }
    } catch (error) {
      console.error(`Failed to import from ${path}: ${error.message}`);
    }
  }
}

testImport(); 