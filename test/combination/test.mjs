import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.join(__dirname, '../../js/front/runner.js');
const CACHE_FILE = path.join(__dirname, 'initial-state.tar.gz');

// Timing instrumentation
const timings = {
    cacheCreate: 0,
    cacheRestore: 0,
    builds: 0,
    buildCount: 0
};

function timeOperation(name, fn) {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;

    if (name === 'cacheCreate') timings.cacheCreate += elapsed;
    else if (name === 'cacheRestore') timings.cacheRestore += elapsed;
    else if (name === 'build') {
        timings.builds += elapsed;
        timings.buildCount++;
    }

    return result;
}

// Artifacts in the system
const ARTIFACTS = {
    sources: ['B.txt', 'D.txt', 'F.txt'],
    built: ['E.txt', 'C.txt', 'A.txt']
};

// Dependency graph: target -> [dependencies]
const DEPS = {
    'A.txt': ['B.txt', 'C.txt'],
    'C.txt': ['D.txt', 'E.txt'],
    'E.txt': ['F.txt']
};

// Always rules
const ALWAYS_RULES = new Set(['E.txt']);

// Helper: Reset environment
function reset() {
    const files = [...ARTIFACTS.sources, ...ARTIFACTS.built, '.zrup.json'];
    for (const file of files) {
        try { fs.unlinkSync(file); } catch {}
    }
    try { execSync('rm -rf .zrup', { cwd: __dirname }); } catch {}
}

// Helper: Create source files with original content
function createSources() {
    for (const source of ARTIFACTS.sources) {
        fs.writeFileSync(path.join(__dirname, source), `original ${source}\n`);
    }
}

// Helper: Change an artifact
function changeArtifact(artifact) {
    const filepath = path.join(__dirname, artifact);
    if (ARTIFACTS.sources.includes(artifact)) {
        // Source file: replace content
        fs.writeFileSync(filepath, `changed ${artifact}\n`);
    } else {
        // Built file: append to it
        fs.appendFileSync(filepath, 'changed\n');
    }
}

// Helper: Run zrup and capture output
function runBuild(target) {
    return timeOperation('build', () => {
        try {
            const output = execSync(`node ${RUNNER} combination+${target}`, {
                cwd: __dirname,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            return { success: true, output };
        } catch (error) {
            return { success: false, output: error.stdout + error.stderr, error: error.message };
        }
    });
}

// Helper: Initialize zrup
function initZrup() {
    try {
        execSync(`node ${RUNNER} --init`, {
            cwd: __dirname,
            encoding: 'utf8',
            stdio: 'pipe'
        });
    } catch (error) {
        throw new Error(`Init failed: ${error.message}`);
    }
}

// Helper: Check if database exists
function hasDatabaseFile() {
    const dbPath = path.join(__dirname, '.zrup/data/state.sqlite');
    return fs.existsSync(dbPath);
}

// Helper: Create initial state cache
function createInitialStateCache() {
    return timeOperation('cacheCreate', () => {
        reset();
        createSources();
        initZrup();

        // Check if DB was created
        if (!hasDatabaseFile()) {
            console.log('Database not created by --init, trying dummy build...');
            // Try building a dummy target to initialize DB
            runBuild('E.txt');
            if (!hasDatabaseFile()) {
                throw new Error('Cannot initialize database - please fix zrup initialization');
            }
        }

        // Create tar.gz of initial state
        execSync('tar czf initial-state.tar.gz .zrup .zrup.json *.txt', {
            cwd: __dirname
        });
    });
}

// Helper: Restore from cache
function restoreFromCache() {
    return timeOperation('cacheRestore', () => {
        reset();
        execSync(`tar xzf ${CACHE_FILE}`, { cwd: __dirname });
    });
}

// Helper: Change hash algorithm in config
function setHashAlgorithm(algo) {
    const configPath = path.join(__dirname, '.zrup.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.hashAlgorithm = algo;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

// Helper: Get file mtime (returns null if file doesn't exist)
function getMtime(filename) {
    try {
        const stats = fs.statSync(path.join(__dirname, filename));
        return stats.mtimeMs;
    } catch {
        return null;
    }
}

// Helper: Capture mtimes of all built artifacts
function captureTimestamps() {
    const timestamps = {};
    for (const artifact of ARTIFACTS.built) {
        timestamps[artifact] = getMtime(artifact);
    }
    return timestamps;
}

// Helper: Determine which artifacts were rebuilt by comparing timestamps
function getRebuiltArtifacts(beforeTimestamps, afterTimestamps) {
    const rebuilt = [];
    for (const artifact of ARTIFACTS.built) {
        const before = beforeTimestamps[artifact];
        const after = afterTimestamps[artifact];

        // If file didn't exist before but exists now, it was built
        if (before === null && after !== null) {
            rebuilt.push(artifact);
            continue;
        }

        // If file exists and mtime changed, it was rebuilt
        if (before !== null && after !== null && before !== after) {
            rebuilt.push(artifact);
        }
    }
    return rebuilt;
}

// Helper: Read file content
function readFile(filename) {
    try {
        return fs.readFileSync(path.join(__dirname, filename), 'utf8');
    } catch {
        return null;
    }
}

// Helper: Get expected content for a built file (recursively)
function getExpectedContent(filename, changedArtifacts) {
    const deps = DEPS[filename] || [];
    const changed = new Set(changedArtifacts);

    let content = '';
    for (const dep of deps) {
        if (ARTIFACTS.built.includes(dep)) {
            // Dependency is a built file - recurse to get its content
            content += getExpectedContent(dep, changedArtifacts);
        } else {
            // Dependency is a source file
            if (changed.has(dep)) {
                content += `changed ${dep}\n`;
            } else {
                content += `original ${dep}\n`;
            }
        }
    }

    return content;
}

// Helper: Get all artifacts in dependency chain of target
function getRelevantArtifacts(target) {
    const artifacts = new Set();
    const queue = [target];
    const visited = new Set();

    while (queue.length > 0) {
        const t = queue.shift();
        if (visited.has(t)) continue;
        visited.add(t);
        artifacts.add(t);

        const deps = DEPS[t] || [];
        for (const dep of deps) {
            queue.push(dep);
        }
    }

    return Array.from(artifacts);
}

// Helper: Verify hash algorithms for target and dependencies
function verifyHashAlgorithms(target, expectedAlgorithm) {
    const dbPath = path.join(__dirname, '.zrup/data/state.sqlite');
    if (!fs.existsSync(dbPath)) return { success: false, error: 'Database not found' };

    try {
        const db = new Database(dbPath, { readonly: true });

        // Get all artifacts in the dependency chain
        const relevantArtifacts = getRelevantArtifacts(target);

        // Get artifact keys for these artifacts
        const artifactKeys = [];
        for (const artifact of relevantArtifacts) {
            const rows = db.prepare('SELECT key FROM artifacts WHERE identity LIKE ?').all(`%${artifact}`);
            artifactKeys.push(...rows.map(r => r.key));
        }

        // Check all states records involving these artifacts
        const wrongAlgos = [];
        for (const key of artifactKeys) {
            // Check as target
            const targetRows = db.prepare(
                'SELECT target, target_algorithm, source, source_algorithm FROM states WHERE target = ?'
            ).all(key);

            for (const row of targetRows) {
                if (row.target_algorithm !== expectedAlgorithm) {
                    wrongAlgos.push({
                        role: 'target',
                        artifact: key.substring(0, 8),
                        algorithm: row.target_algorithm,
                        expected: expectedAlgorithm
                    });
                }
                if (row.source_algorithm !== expectedAlgorithm) {
                    wrongAlgos.push({
                        role: 'source',
                        artifact: row.source.substring(0, 8),
                        algorithm: row.source_algorithm,
                        expected: expectedAlgorithm
                    });
                }
            }

            // Check as source
            const sourceRows = db.prepare(
                'SELECT target, target_algorithm, source, source_algorithm FROM states WHERE source = ?'
            ).all(key);

            for (const row of sourceRows) {
                if (row.source_algorithm !== expectedAlgorithm) {
                    wrongAlgos.push({
                        role: 'source',
                        artifact: key.substring(0, 8),
                        algorithm: row.source_algorithm,
                        expected: expectedAlgorithm
                    });
                }
            }
        }

        db.close();

        if (wrongAlgos.length > 0) {
            return {
                success: false,
                error: `Found ${wrongAlgos.length} records with wrong algorithm`,
                details: wrongAlgos
            };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper: Compute which targets should rebuild given changes
function computeExpectedRebuilds(changedArtifacts, requestedTarget) {
    const changed = new Set(changedArtifacts);
    const shouldRebuild = new Set();
    const contentChanged = new Set(); // Artifacts whose content will actually change

    // Determine all targets in dependency chain of requested target (in reverse dependency order)
    const relevantTargets = [];
    const queue = [requestedTarget];
    const visited = new Set();

    while (queue.length > 0) {
        const target = queue.shift();
        if (visited.has(target)) continue;
        visited.add(target);

        if (ARTIFACTS.built.includes(target)) {
            relevantTargets.push(target);
        }

        const deps = DEPS[target] || [];
        for (const dep of deps) {
            queue.push(dep);
        }
    }

    // Reverse to process in dependency order (deepest first)
    relevantTargets.reverse();

    // For each relevant target, check if it should rebuild
    for (const target of relevantTargets) {
        // Always rules always rebuild
        if (ALWAYS_RULES.has(target)) {
            shouldRebuild.add(target);
            // But does the content actually change?
            const deps = DEPS[target] || [];
            let inputsChanged = false;
            for (const dep of deps) {
                // For sources, check if they were modified
                if (ARTIFACTS.sources.includes(dep) && changed.has(dep)) {
                    inputsChanged = true;
                    break;
                }
                // For built artifacts, check if their content changed
                if (ARTIFACTS.built.includes(dep) && contentChanged.has(dep)) {
                    inputsChanged = true;
                    break;
                }
            }
            if (inputsChanged) {
                contentChanged.add(target);
            }
            continue;
        }

        // Check if target itself was externally modified (zrup will rebuild to restore)
        if (changed.has(target)) {
            shouldRebuild.add(target);
            // Content only changes if inputs changed (otherwise it's a revert to original)
            const deps = DEPS[target] || [];
            for (const dep of deps) {
                if (contentChanged.has(dep) || (changed.has(dep) && ARTIFACTS.sources.includes(dep))) {
                    contentChanged.add(target);
                    break;
                }
            }
            continue;
        }

        // Check if any dependency's content changed
        const deps = DEPS[target] || [];
        for (const dep of deps) {
            if (contentChanged.has(dep) || (changed.has(dep) && ARTIFACTS.sources.includes(dep))) {
                shouldRebuild.add(target);
                contentChanged.add(target);
                break;
            }
        }
    }

    return Array.from(shouldRebuild);
}

// Main test for one combination and target
function testCombination(changedArtifacts, target) {
    // ===== PART 1: Regular build and rebuild =====
    restoreFromCache();

    // Initial build
    const build1 = runBuild(target);
    if (!build1.success) {
        return {
            part1: { success: false, error: `Initial build failed: ${build1.error}` },
            part2: { success: false, error: 'Skipped due to part 1 failure' }
        };
    }

    // Determine which targets were built
    const initiallyBuilt = new Set();
    const queue = [target];
    while (queue.length > 0) {
        const t = queue.shift();
        if (ARTIFACTS.built.includes(t) && !initiallyBuilt.has(t)) {
            initiallyBuilt.add(t);
            const deps = DEPS[t] || [];
            for (const d of deps) {
                queue.push(d);
            }
        }
    }

    // Check file content after initial build
    const part1InitialErrors = [];
    for (const file of Array.from(initiallyBuilt)) {
        const expected = getExpectedContent(file, []);
        const actual = readFile(file);
        if (actual !== expected) {
            part1InitialErrors.push(`${file} content mismatch`);
        }
    }

    // Apply changes
    for (const artifact of changedArtifacts) {
        changeArtifact(artifact);
    }

    // Capture timestamps before rebuild
    const beforeRebuild = captureTimestamps();

    // Rebuild
    const build2 = runBuild(target);
    if (!build2.success) {
        return {
            part1: { success: false, error: `Rebuild failed: ${build2.error}`, initialErrors: part1InitialErrors },
            part2: { success: false, error: 'Skipped due to part 1 failure' }
        };
    }

    // Capture timestamps after rebuild
    const afterRebuild = captureTimestamps();
    const actuallyRebuilt = getRebuiltArtifacts(beforeRebuild, afterRebuild);
    const expected2 = computeExpectedRebuilds(changedArtifacts, target);

    // Check rebuilds
    const part1RebuildErrors = [];
    const actuallyRebuiltSet = new Set(actuallyRebuilt);
    const expected2Set = new Set(expected2);

    for (const exp of expected2) {
        if (!actuallyRebuiltSet.has(exp)) {
            part1RebuildErrors.push(`Expected ${exp} to rebuild but it didn't`);
        }
    }

    for (const act of actuallyRebuilt) {
        if (!expected2Set.has(act) && !ALWAYS_RULES.has(act)) {
            part1RebuildErrors.push(`Unexpected rebuild of ${act}`);
        }
    }

    // Verify content after rebuild
    const part1ContentErrors = [];
    for (const file of Array.from(initiallyBuilt)) {
        const expected = getExpectedContent(file, changedArtifacts);
        const actual = readFile(file);
        if (actual !== expected) {
            part1ContentErrors.push(`${file} content mismatch after rebuild`);
        }
    }

    // ===== PART 2: Simultaneous rebuilds and hash upgrades =====
    restoreFromCache();

    // Initial build with md5
    runBuild(target);

    // Apply changes
    for (const artifact of changedArtifacts) {
        changeArtifact(artifact);
    }

    // Switch to blake3
    setHashAlgorithm('blake3');

    // Capture timestamps before blake3 rebuild
    const beforeBlake3 = captureTimestamps();

    // Rebuild with blake3
    const build3 = runBuild(target);
    if (!build3.success) {
        return {
            part1: {
                success: part1InitialErrors.length === 0 && part1RebuildErrors.length === 0 && part1ContentErrors.length === 0,
                initialErrors: part1InitialErrors,
                rebuildErrors: part1RebuildErrors,
                contentErrors: part1ContentErrors,
                actuallyRebuilt: actuallyRebuilt,
                expected: expected2
            },
            part2: { success: false, error: `Build failed: ${build3.error}` }
        };
    }

    // Capture timestamps after blake3 rebuild
    const afterBlake3 = captureTimestamps();
    const actuallyRebuilt3 = getRebuiltArtifacts(beforeBlake3, afterBlake3);
    const expected3 = computeExpectedRebuilds(changedArtifacts, target);

    // Check rebuilds
    const part2RebuildErrors = [];
    const actuallyRebuilt3Set = new Set(actuallyRebuilt3);
    const expected3Set = new Set(expected3);

    for (const exp of expected3) {
        if (!actuallyRebuilt3Set.has(exp)) {
            part2RebuildErrors.push(`Expected ${exp} to rebuild but it didn't`);
        }
    }

    for (const act of actuallyRebuilt3) {
        if (!expected3Set.has(act) && !ALWAYS_RULES.has(act)) {
            part2RebuildErrors.push(`Unexpected rebuild of ${act}`);
        }
    }

    // Verify algorithms upgraded to blake3
    const algoCheck = verifyHashAlgorithms(target, 'blake3');
    const part2AlgoErrors = algoCheck.success ? [] : [algoCheck.error];

    return {
        part1: {
            success: part1InitialErrors.length === 0 && part1RebuildErrors.length === 0 && part1ContentErrors.length === 0,
            initialErrors: part1InitialErrors,
            rebuildErrors: part1RebuildErrors,
            contentErrors: part1ContentErrors,
            actuallyRebuilt: actuallyRebuilt,
            expected: expected2
        },
        part2: {
            success: part2RebuildErrors.length === 0 && part2AlgoErrors.length === 0,
            rebuildErrors: part2RebuildErrors,
            algoErrors: part2AlgoErrors,
            actuallyRebuilt: actuallyRebuilt3,
            expected: expected3
        }
    };
}

// Special test: partial migration
function testPartialMigration() {
    restoreFromCache();

    // Build A.txt with md5
    const build1 = runBuild('A.txt');
    if (!build1.success) {
        return { success: false, error: `Initial build of A.txt failed` };
    }

    // Switch to blake3
    setHashAlgorithm('blake3');

    // Build E.txt - should rebuild (always rule)
    const beforeE = captureTimestamps();
    const build2 = runBuild('E.txt');
    if (!build2.success) {
        return { success: false, error: `Build of E.txt failed` };
    }

    const afterE = captureTimestamps();
    const rebuiltE = getRebuiltArtifacts(beforeE, afterE);
    if (!rebuiltE.includes('E.txt')) {
        return { success: false, error: `E.txt should rebuild (always) but didn't`, rebuilt: rebuiltE };
    }

    // Build C.txt - should NOT rebuild (E.txt content unchanged, just algorithm changed)
    const beforeC = captureTimestamps();
    const build3 = runBuild('C.txt');
    if (!build3.success) {
        return { success: false, error: `Build of C.txt failed` };
    }

    const afterC = captureTimestamps();
    const rebuiltC = getRebuiltArtifacts(beforeC, afterC);

    // E should rebuild (always), C should NOT
    if (rebuiltC.includes('C.txt')) {
        return {
            success: false,
            error: `C.txt should NOT rebuild (content unchanged)`,
            rebuilt: rebuiltC
        };
    }

    return { success: true, rebuiltE: rebuiltE, rebuiltC: rebuiltC };
}

// Generate all 64 combinations
function* generateCombinations() {
    const allArtifacts = [...ARTIFACTS.sources, ...ARTIFACTS.built];
    const count = allArtifacts.length; // 6

    for (let i = 0; i < (1 << count); i++) {
        const combination = [];
        for (let j = 0; j < count; j++) {
            if (i & (1 << j)) {
                combination.push(allArtifacts[j]);
            }
        }
        yield combination;
    }
}

// Format combination name
function formatCombinationName(artifacts) {
    if (artifacts.length === 0) return 'NONE';
    return artifacts.map(a => a.replace('.txt', '')).join(',');
}

// Main
async function main() {
    const targets = ['A.txt', 'C.txt', 'E.txt'];
    const results = {
        combinations: {},
        'incremental-hash-upgrade': {}
    };

    console.log('Creating initial state cache...');
    createInitialStateCache();

    // Test all combinations
    for (const combination of generateCombinations()) {
        const comboName = formatCombinationName(combination);
        results.combinations[comboName] = {};

        for (const target of targets) {
            const targetName = target.replace('.txt', '');
            const result = testCombination(combination, target);
            results.combinations[comboName][targetName] = result;

            const part1Ok = result.part1.success ? '✓' : '✗';
            const part2Ok = result.part2.success ? '✓' : '✗';
            console.log(`${comboName}/${targetName}: Part1=${part1Ok} Part2=${part2Ok}`);
        }
    }

    // Special test
    console.log('Running incremental hash upgrade test...');
    results['incremental-hash-upgrade'] = testPartialMigration();
    const specialOk = results['incremental-hash-upgrade'].success ? '✓' : '✗';
    console.log(`Incremental hash upgrade: ${specialOk}`);

    // Cleanup
    reset();
    try { fs.unlinkSync(CACHE_FILE); } catch {}

    // Write results
    const outputPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults written to ${outputPath}`);

    // Compute summary
    let totalTests = 0;
    let failedTests = 0;
    for (const combo of Object.values(results.combinations)) {
        for (const target of Object.values(combo)) {
            totalTests += 2; // part1 and part2
            if (!target.part1.success) failedTests++;
            if (!target.part2.success) failedTests++;
        }
    }
    if (!results['incremental-hash-upgrade'].success) failedTests++;
    totalTests++;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Passed: ${totalTests - failedTests}`);
    console.log(`Success rate: ${((totalTests - failedTests) / totalTests * 100).toFixed(1)}%`);

    console.log(`\n${'='.repeat(60)}`);
    console.log('TIMING BREAKDOWN:');
    console.log(`Cache create:    ${(timings.cacheCreate / 1000).toFixed(2)}s`);
    console.log(`Cache restore:   ${(timings.cacheRestore / 1000).toFixed(2)}s (${timings.cacheRestore / totalTests * timings.buildCount | 0} restores)`);
    console.log(`Builds:          ${(timings.builds / 1000).toFixed(2)}s (${timings.buildCount} builds, avg ${(timings.builds / timings.buildCount).toFixed(0)}ms/build)`);
    const total = timings.cacheCreate + timings.cacheRestore + timings.builds;
    console.log(`Total measured:  ${(total / 1000).toFixed(2)}s`);
    console.log(`\nBuilds are ${(timings.builds / total * 100).toFixed(1)}% of measured time`);
    console.log(`Cache restore is ${(timings.cacheRestore / total * 100).toFixed(1)}% of measured time`);

    process.exit(failedTests > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
