/**
 * EUDI Toolkit
 *
 * A comprehensive toolkit for implementing EU Digital Identity Wallet functionality
 * with XRPL integration.
 */

// Export core modules
export * from './core';

// Export adapters
export * from './adapters';

// Export use cases
export * from './use-cases/driving-license';

// Version information
export const version = '0.1.0';

// Toolkit information
export const info = {
  name: 'EUDI Toolkit',
  description: 'EU Digital Identity Wallet Toolkit with XRPL integration',
  version,
  license: 'MIT',
  repository: 'https://github.com/example/eudi-toolkit',
};
