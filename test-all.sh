#!/bin/bash
set -e

# Full test suite: mocha + combination tests + failure analysis
# Output saved to .debug/ for inspection

echo "========================================="
echo "Creating .debug directory..."
echo "========================================="
mkdir -p .debug

echo ""
echo "========================================="
echo "Running Mocha test suite..."
echo "========================================="
if npm test 2>&1 | tee .debug/mocha-output.txt; then
    echo "✓ Mocha tests PASSED"
    MOCHA_RESULT="PASS"
else
    echo "✗ Mocha tests FAILED"
    MOCHA_RESULT="FAIL"
fi

echo ""
echo "========================================="
echo "Running combination tests..."
echo "========================================="
cd test/combination
if node test.mjs 2>&1 | tee ../../.debug/combination-output.txt; then
    echo "✓ Combination tests completed"
    COMBO_RESULT="DONE"
else
    echo "✗ Combination tests had errors"
    COMBO_RESULT="ERROR"
fi

echo ""
echo "========================================="
echo "Analyzing failures..."
echo "========================================="
if node analyze-failures.mjs 2>&1 | tee ../../.debug/analysis.txt; then
    echo "✓ Analysis complete"
else
    echo "✗ Analysis had errors"
fi

cd ../..

echo ""
echo "========================================="
echo "SUMMARY"
echo "========================================="
echo "Mocha tests:       $MOCHA_RESULT"
echo "Combination tests: $COMBO_RESULT"
echo ""
echo "Output files in .debug/:"
ls -lh .debug/
echo ""
echo "View analysis:"
echo "  cat .debug/analysis.txt"
