#!/usr/bin/env node

/**
 * Postinstall script to ensure better-sqlite3 native bindings are built.
 * This runs when zrup is installed as a dependency in another project.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const betterSqlitePath = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');

// Check if better-sqlite3 exists
if (!fs.existsSync(betterSqlitePath)) {
    console.log('better-sqlite3 not found in node_modules, skipping rebuild');
    process.exit(0);
}

// Check if bindings already exist
const possibleBindings = [
    path.join(betterSqlitePath, 'build/Release/better_sqlite3.node'),
    path.join(betterSqlitePath, 'build/Debug/better_sqlite3.node'),
];

const bindingsExist = possibleBindings.some(p => fs.existsSync(p));

if (bindingsExist) {
    console.log('better-sqlite3 bindings already built, skipping rebuild');
    process.exit(0);
}

// Try to rebuild
console.log('Building better-sqlite3 native bindings...');

try {
    // Try npm rebuild first (works with npm, pnpm, yarn)
    try {
        execSync('npm rebuild better-sqlite3', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit'
        });
        console.log('better-sqlite3 rebuilt successfully');
        process.exit(0);
    } catch (npmError) {
        // If npm rebuild fails, try running its build script directly
        console.log('npm rebuild failed, trying direct build...');
        execSync('node-gyp rebuild', {
            cwd: betterSqlitePath,
            stdio: 'inherit'
        });
        console.log('better-sqlite3 built successfully');
        process.exit(0);
    }
} catch (error) {
    console.warn('Warning: Could not build better-sqlite3 native bindings.');
    console.warn('If you see errors about missing bindings, try running:');
    console.warn('  npm rebuild better-sqlite3');
    console.warn('  OR');
    console.warn('  bun rebuild better-sqlite3');
    // Don't fail the install - let the user handle it if needed
    process.exit(0);
}
