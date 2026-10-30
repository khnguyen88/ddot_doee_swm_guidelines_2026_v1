# SWM Education — DOEE / EISA 438 Walkthrough

Standalone offline webpage that walks through the full DC stormwater
compliance process (DOEE / EISA 438 / DDOT MEP) with pedagogical
narration on every page.

## Usage

1. Open `education.html` in Chrome or Edge (no server required — opens
   from `file://`).
2. Either click **Load Minnesota Ave demo** to walk the bundled fixture,
   or **Click to choose an .xlsx file** to load your own filled template.
3. Click **Print** to produce a letter-portrait PDF (landscape pages
   auto-rotate for the TR-16 appendix and Three-Method Comparison).

## Deck

~22 pages following a four-block educational pattern per page:
Overview · Why it matters · Formula & Derivation · Worked Application.

**EISA §438 is covered in four pages** showing all three methods:
Direct Determination (depression + Horton), TR-55 formula (S/Ia/Q
derivation), TR-16 Exhibit 2-7A (HTML lookup tables), and three-method
comparison with BMP storage credit. Appendix A reproduces the full
TR-16 Exhibit (12 CN tables, landscape).

## Development

```bash
cd education
npm install
npm run sync-engines      # syncs calc.mjs / aggregate.mjs / parse.mjs from summary_calculator
node build.js             # builds education.html from src/
npm test                  # runs all unit + parity + TR-16 tests
npm run smoke             # runs Playwright full-walkthrough smoke
```

## Engine sync

`calc.mjs`, `aggregate.mjs`, and `parse.mjs` are byte-identical copies
of the files in `summary_calculator/src/`. A parity test
(`tests/engine-parity.test.mjs`) fails if they drift. To re-sync:

```bash
bash ../scripts/sync-education-engines.sh
```

## Non-goals (v1)

- Live-editing calculator (user types values and sees updates).
- Non-DC regional 95th-percentile data.
- BMP sizing design (we only *explain* existing BMPs; we don't
  size them from a target).
