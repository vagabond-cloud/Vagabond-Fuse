#!/usr/bin/env node

/**
 * Simple script to check if the XRPL package is installed
 * This will be used by the run-eu-simulation.sh script
 */

try {
    require('xrpl');
    console.log('found');
    process.exit(0);
} catch (error) {
    console.log('not-found');
    process.exit(1);
} 