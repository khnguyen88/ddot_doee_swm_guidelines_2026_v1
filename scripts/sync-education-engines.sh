#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cp "$ROOT/summary_calculator/src/calc.mjs"      "$ROOT/education/src/calc.mjs"
cp "$ROOT/summary_calculator/src/aggregate.mjs" "$ROOT/education/src/aggregate.mjs"
cp "$ROOT/summary_calculator/src/parse.mjs"     "$ROOT/education/src/parse.mjs"
echo "Education engine files synced from summary_calculator"
