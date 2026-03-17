import fs from 'fs';

const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

const failures = [];

for (const [combo, targets] of Object.entries(results.combinations)) {
    for (const [tgt, res] of Object.entries(targets)) {
        if (!res.part1.success || !res.part2.success) {
            failures.push({
                combo,
                target: tgt,
                part1Success: res.part1.success,
                part2Success: res.part2.success,
                part1RebuildErrors: res.part1.rebuildErrors || [],
                part2RebuildErrors: res.part2.rebuildErrors || []
            });
        }
    }
}

console.log(`Total failures: ${failures.length}\n`);

// Show first 10 failures
failures.slice(0, 10).forEach((f, i) => {
    console.log(`${i + 1}. ${f.combo}/${f.target}`);
    console.log(`   Part1: ${f.part1Success ? '✓' : '✗'}, Part2: ${f.part2Success ? '✓' : '✗'}`);
    if (f.part1RebuildErrors.length > 0) {
        console.log(`   Part1 errors: ${f.part1RebuildErrors.join('; ')}`);
    }
    if (f.part2RebuildErrors.length > 0) {
        console.log(`   Part2 errors: ${f.part2RebuildErrors.join('; ')}`);
    }
    console.log('');
});
