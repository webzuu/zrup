#!/usr/bin/env node
// Ensure blake3 native binding works with the current Node.js version

try {
    require('blake3');
    console.log('blake3 native binding is compatible');
} catch (e) {
    console.log('blake3 native binding incompatible, rebuilding for current Node.js version...');
    const { spawnSync } = require('child_process');
    const result = spawnSync('node', ['node_modules/blake3/dist/build/install.js'], {
        stdio: 'inherit'
    });

    if (result.error || result.status !== 0) {
        console.error('Warning: blake3 rebuild failed. Native hashing will not be available.');
        process.exit(0); // Don't fail the install
    }

    console.log('blake3 rebuild complete');
}
