# Combination Test Suite

This test suite comprehensively tests zrup's incremental build and hash algorithm migration capabilities.

## Test Structure

The test uses a simple buildspec with 3 rules and 6 artifacts:

```
Sources: B.txt, D.txt, F.txt
Built:   E.txt, C.txt, A.txt

Dependency graph:
A.txt: B.txt C.txt
C.txt: D.txt E.txt
E.txt: F.txt (always)
```

## What It Tests

### Part 1: Regular Incremental Builds
For all 64 combinations of which artifacts are changed (2^6 = 64):
- Clean build → verify correct initial build
- Change selected artifacts
- Rebuild → verify only affected targets rebuild

### Part 2: Hash Migration with Changes
For all 64 combinations:
- Clean build with md5
- Change selected artifacts
- Switch to blake3 and rebuild
- Verify correct rebuilds + migration of up-to-date targets
- Verify database fully upgraded to blake3

### Special Test: Partial Migration
Tests migration across algorithm boundaries:
1. Build A.txt (builds entire chain with md5)
2. Switch to blake3
3. Build E.txt (rebuilds due to always(), uses blake3)
4. Build C.txt (should NOT rebuild - E.txt content unchanged)

**Expected failure**: The special test is expected to fail currently, demonstrating a case where partial migration needs improvement.

## Running the Tests

```bash
cd test/combination
node test.mjs
```

The test will:
- Run 192 test scenarios (64 combinations × 3 targets)
- Plus 1 special test
- Report pass/fail for each
- Show summary at the end

## Expected Output

```
=== Testing: Target=A.txt, Changed=NONE ===
Part 1: Regular build and rebuild
Part 2: Hash migration with changes
✓ PASSED

=== Testing: Target=A.txt, Changed=B.txt ===
...

=== Special Test: Partial Migration ===
⚠️  FAILED (expected) with 1 errors:
   - Special test: C.txt should NOT rebuild (content unchanged)
⚠️  EXPECTED FAILURE: This test is known to fail currently

============================================================
Total tests: 193
Total errors: X
Success rate: XX.X%
```

## Test Artifacts

During testing, the suite creates and cleans up:
- `.zrup/` - Build state directory
- `.zrup.json` - Configuration file
- `*.txt` - Source and built files

All artifacts are cleaned up between tests and after completion.
