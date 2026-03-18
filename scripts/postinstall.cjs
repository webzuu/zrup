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

// Find the root of the consuming project (where package.json with zrup dependency lives)
function findProjectRoot() {
    let dir = path.join(__dirname, '..');  // Start from zrup's root

    // Walk up looking for the real project root (has node_modules with zrup in it)
    for (let i = 0; i < 10; i++) {  // Limit iterations to prevent infinite loop
        const parentNodeModules = path.join(dir, '..', 'node_modules');
        const zrupInParent = path.join(parentNodeModules, 'zrup');

        // If parent has node_modules/zrup, we found consuming project
        if (fs.existsSync(zrupInParent)) {
            return path.dirname(parentNodeModules);
        }

        dir = path.dirname(dir);
        if (dir === path.dirname(dir)) break;  // Hit root
    }

    // Fallback: if we can't find it, we're probably in dev mode
    return null;
}

const projectRoot = findProjectRoot();

if (!projectRoot) {
    // We're probably in zrup's own dev environment, not installed as dependency
    console.log('Skipping better-sqlite3 rebuild (development mode)');
    process.exit(0);
}

// Check if better-sqlite3 exists in consuming project
const betterSqlitePath = path.join(projectRoot, 'node_modules', 'better-sqlite3');
if (!fs.existsSync(betterSqlitePath)) {
    console.log('better-sqlite3 not found, skipping rebuild');
    process.exit(0);
}

// Check if bindings already exist
const possibleBindings = [
    path.join(betterSqlitePath, 'build/Release/better_sqlite3.node'),
    path.join(betterSqlitePath, 'build/Debug/better_sqlite3.node'),
];

const bindingsExist = possibleBindings.some(p => fs.existsSync(p));

if (bindingsExist) {
    console.log('better-sqlite3 bindings already exist');
    process.exit(0);
}

// Rebuild from project root
console.log(`Building better-sqlite3 native bindings from ${projectRoot}...`);

try {
    // Detect package manager from lockfiles
    let rebuildCmd;
    if (fs.existsSync(path.join(projectRoot, 'bun.lockb')) || fs.existsSync(path.join(projectRoot, 'bun.lock'))) {
        rebuildCmd = 'bun rebuild better-sqlite3';
    } else if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
        rebuildCmd = 'pnpm rebuild better-sqlite3';
    } else if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
        rebuildCmd = 'yarn rebuild better-sqlite3';
    } else {
        rebuildCmd = 'npm rebuild better-sqlite3';
    }

    console.log(`Running: ${rebuildCmd}`);
    execSync(rebuildCmd, {
        cwd: projectRoot,
        stdio: 'inherit'
    });

    console.log('✓ better-sqlite3 rebuilt successfully');
    process.exit(0);
} catch (error) {
    console.error('\n⚠ Warning: Could not build better-sqlite3 native bindings automatically.');
    console.error(`Please run this command from ${projectRoot}:`);
    console.error('  bun rebuild better-sqlite3');
    console.error('  OR');
    console.error('  npm rebuild better-sqlite3\n');
    // Don't fail - warn and continue
    process.exit(0);
}
