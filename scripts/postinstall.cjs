#!/usr/bin/env node

/**
 * Postinstall script to ensure better-sqlite3 native bindings are built.
 *
 * When zrup is installed as a dependency, package managers skip better-sqlite3's
 * own install scripts (security). This forces them to run FROM THE CONSUMING PROJECT.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== ZRUP POSTINSTALL DEBUG ===');
console.log('Script location:', __dirname);

// Find the root of the consuming project (where package.json with zrup dependency lives)
function findProjectRoot() {
    let dir = path.join(__dirname, '..');  // Start from zrup's root
    console.log('Starting search from:', dir);

    // Walk up looking for the real project root (has node_modules with zrup in it)
    for (let i = 0; i < 10; i++) {
        const parentNodeModules = path.join(dir, '..', 'node_modules');
        const zrupInParent = path.join(parentNodeModules, 'zrup');

        console.log(`  [${i}] Checking:`, parentNodeModules);
        console.log(`      zrup path:`, zrupInParent);
        console.log(`      exists:`, fs.existsSync(zrupInParent));

        // If parent has node_modules/zrup, we found consuming project
        if (fs.existsSync(zrupInParent)) {
            const root = path.dirname(parentNodeModules);
            console.log('Found project root:', root);
            return root;
        }

        dir = path.dirname(dir);
        if (dir === path.dirname(dir)) {
            console.log('Hit filesystem root, stopping');
            break;
        }
    }

    console.log('Could not find project root');
    return null;
}

const projectRoot = findProjectRoot();

if (!projectRoot) {
    console.log('Skipping better-sqlite3 rebuild (development mode)');
    process.exit(0);
}

// Check if better-sqlite3 exists in consuming project
const betterSqlitePath = path.join(projectRoot, 'node_modules', 'better-sqlite3');
console.log('Looking for better-sqlite3 at:', betterSqlitePath);
console.log('Exists:', fs.existsSync(betterSqlitePath));

if (!fs.existsSync(betterSqlitePath)) {
    console.log('better-sqlite3 not found, skipping rebuild');
    process.exit(0);
}

// Check if bindings already exist
const possibleBindings = [
    path.join(betterSqlitePath, 'build/Release/better_sqlite3.node'),
    path.join(betterSqlitePath, 'build/Debug/better_sqlite3.node'),
];

console.log('Checking for existing bindings:');
possibleBindings.forEach(p => {
    console.log(`  ${p}: ${fs.existsSync(p) ? 'EXISTS' : 'MISSING'}`);
});

const bindingsExist = possibleBindings.some(p => fs.existsSync(p));

if (bindingsExist) {
    console.log('better-sqlite3 bindings already exist, skipping rebuild');
    process.exit(0);
}

// Rebuild from project root
console.log(`\n=== Building better-sqlite3 native bindings ===`);
console.log(`Project root: ${projectRoot}`);

try {
    // Detect package manager from lockfiles
    const lockfiles = {
        'bun.lockb': 'bun rebuild better-sqlite3',
        'bun.lock': 'bun rebuild better-sqlite3',
        'pnpm-lock.yaml': 'pnpm rebuild better-sqlite3',
        'yarn.lock': 'yarn rebuild better-sqlite3',
        'package-lock.json': 'npm rebuild better-sqlite3'
    };

    let rebuildCmd = 'npm rebuild better-sqlite3';  // default

    for (const [lockfile, cmd] of Object.entries(lockfiles)) {
        const lockpath = path.join(projectRoot, lockfile);
        if (fs.existsSync(lockpath)) {
            console.log(`Detected ${lockfile}`);
            rebuildCmd = cmd;
            break;
        }
    }

    console.log(`Running: ${rebuildCmd}`);
    console.log(`CWD: ${projectRoot}\n`);

    execSync(rebuildCmd, {
        cwd: projectRoot,
        stdio: 'inherit'
    });

    console.log('\n✓ better-sqlite3 rebuilt successfully');
    process.exit(0);
} catch (error) {
    console.error('\n✗ Build failed!');
    console.error('Error:', error.message);
    console.error('\n⚠ Warning: Could not build better-sqlite3 native bindings automatically.');
    console.error(`Please run this command from ${projectRoot}:`);
    console.error('  bun rebuild better-sqlite3');
    console.error('  OR');
    console.error('  npm rebuild better-sqlite3\n');
    process.exit(0);  // Don't fail the install
}
