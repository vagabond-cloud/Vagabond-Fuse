#!/usr/bin/env tsx

/**
 * Helper script to create the appropriate XRPL adapter
 * This will check if the XRPL package is available and create either
 * a real adapter or a mock adapter accordingly
 */

import { XRPLAdapter as MockXRPLAdapter } from '../mocks/xrpl-adapter.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAdapter() {
  let useRealXRPL = false;
  let adapter;

  try {
    // Try to import the XRPL package
    const xrpl = await import('xrpl');
    useRealXRPL = true;
    console.log('XRPL package found. Using real XRPL adapter.');

    // Try to import the real adapter
    // @ts-ignore - Ignore missing type definitions for the real adapter
    const { XRPLAdapter: RealAdapter } = await import(
      '../real-xrpl-adapter.mjs'
    );
    adapter = new RealAdapter();
    console.log('Real XRPL adapter created successfully.');
  } catch (error) {
    console.log('XRPL package or real adapter not found. Using mock adapter.');
    adapter = new MockXRPLAdapter();
    console.log('Mock XRPL adapter created successfully.');
  }

  // Return the adapter type and instance
  return {
    useRealXRPL,
    adapter,
  };
}

// Run if this script is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  createAdapter()
    .then((result) => {
      console.log(`Adapter type: ${result.useRealXRPL ? 'Real' : 'Mock'}`);
    })
    .catch((error) => {
      console.error('Error creating adapter:', error);
    });
}

export default createAdapter;
