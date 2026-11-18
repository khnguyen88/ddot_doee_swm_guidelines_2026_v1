# Education App — New-Features Pedagogy Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Four-Block pedagogy pages for Area_Summary, TC_PATH, PEAK_DISCHARGE (SDA + CDA), DOEE_DETENTION_BMP, and EISA Direct Timestep per the 2026-11-18 design spec.

**Architecture:** render + wire only. No engine edits — `calc.mjs`, `aggregate.mjs`, `parse.mjs` already byte-identical across apps (see `scripts/sync-education-engines.sh`).

**Spec:** `docs/superpowers/specs/2026-11-18-education-new-features-design.md`

**Shared fixture:** `education/tests/fixtures/edu-fixture.mjs` — small handcrafted inputs to the real `areaSummaryRollup` / `peakDischargeRollup` / `detentionBmpRollup` / `eisaTimestepTrace` / `tcFinalMin` helpers. The fixture runs them and exports the already-computed rollup outputs — matching what `ui.mjs` will pass to each render function. Does NOT re-parse any bundled xlsx. Keeps tests independent.

**Data flow (mirrors `summary_calculator/src/ui.mjs:130-163`):** the education `ui.mjs` deck-builder calls the existing rollup helpers once and passes their outputs to the render-edu pages. No new rollup logic; no changes to `parse.mjs` / `aggregate.mjs` / `calc.mjs`.

**Done-of-done:** all six pages render + test green, byte-diff clean, Playwright smoke clean for both bundled fixtures, single-file dist built.

---

## Task 7.0 — Shared edu-fixture

**Files:**
- Create: `education/tests/fixtures/edu-fixture.mjs`
- Reference: `education/src/parse.mjs` for the shape of `project`, `sdas`, `cdas`, `bmps`, `tcPaths`, `peakDischarge*`, `doeeDetentionBmp`, `eisaTimestep`.

- [ ] **Step 1: Inspect the current parsed shape**

Read the top of `education/src/parse.mjs` and the end of `summary_calculator/src/render.mjs` for the shape of `parsed.areaSummary`, `parsed.tcPaths`, `parsed.peakDischarge`, `parsed.doeeDetentionBmp`, `parsed.eisaTimestep`. Confirm which keys each render page in the summary calculator reads.

- [ ] **Step 2: Author `edu-fixture.mjs`**

Export a single `buildEduFixture()` that constructs small parsed-style inputs and runs the real rollup helpers:

```js
import { tcFinalMin, eisaTimestepTrace } from '../../src/calc.mjs';
import { areaSummaryRollup, peakDischargeRollup, detentionBmpRollup } from '../../src/aggregate.mjs';

export function buildEduFixture() {
  const project = { name: 'Edu Test Project', rainfallIn: 1.2, rainfallEisa: 1.7 };
  const params = { /* rv, bmpDesign, tr55 (≥2 rows with C0..C2), detention, hortonDefaults */ };
  const sdaExisting = [ /* small set of rows: sdaId, landUse, area, hsg, ... */ ];
  const sdaProposed = [ /* matching set with BMP rows */ ];
  const cdaExisting = [ /* ... */ ];
  const cdaProposed = [ /* ... */ ];
  const bmps = [ /* 1-2 BMPs with bio/pp fields populated */ ];
  const tcPaths = [ /* 1 path with sheet+shallow+channel segments */ ];

  // Compute what ui.mjs will pass each render function.
  const areaSummary = areaSummaryRollup(sdaExisting, sdaProposed, cdaExisting, cdaProposed, {});
  const tcPathsWithTc = tcPaths.map(p => ({ ...p, tcMin: tcFinalMin(p.tcDirectMin, p.segments) }));
  const peakSda = peakDischargeRollup(sdaExisting, sdaProposed, tcPaths, params);
  const peakCda = peakDischargeRollup(cdaExisting, cdaProposed, tcPaths, params, 'cdaId');
  const detentionBmp = detentionBmpRollup(cdaExisting, cdaProposed, bmps, params);
  const eisaTimestep = eisaTimestepTrace({ sdas: sdaProposed, bmps, params, P: 1.7, lossModel: 'horton' });

  return {
    project, params,
    parsed: { sdaExisting, sdaProposed, cdaExisting, cdaProposed, bmps, tcPaths, params },
    areaSummary, tcPaths: tcPathsWithTc, peakSda, peakCda, detentionBmp, eisaTimestep,
  };
}
```

Pick small round numbers that make the Worked tables easy to eyeball when debugging. Don't duplicate the full Minnesota Ave fixture — just enough to exercise each render path. Use the same param field shapes `parse.mjs` produces (grep `parseParams` in `education/src/parse.mjs` for the schema).

- [ ] **Step 3: Smoke-import the fixture**

Add a two-line temp test (`edu-fixture.smoke.test.mjs` or inline in `render-edu.test.mjs`) that imports `buildEduFixture()` and asserts the returned object has the expected top-level keys. Run `cd education && node --test tests/ 2>&1 | tail -5`. Delete the smoke after step 3 passes — it's not part of the committed suite.

- [ ] **Step 4: Commit**

```bash
git add education/tests/fixtures/edu-fixture.mjs
git commit -m "test(education): add shared edu-fixture for new pedagogy pages

Small hand-crafted fixture object with project / parsed / agg / params —
exercises every field the six upcoming render…EduPage functions read.
Keeps new-page tests independent of the bundled xlsx fixtures."
```

---

## Task 7.1 — `renderAreaSummaryEduPage`

**Files:**
- Modify: `education/src/render-edu.mjs` (add function + export)
- Modify: `education/src/ui.mjs` (insert in deck after `renderSiteDaPage`)
- Modify: `education/tests/render-edu.test.mjs` (new describe-block)
- Fixture: `education/tests/fixtures/edu-fixture.mjs` (from Task 7.0)

- [ ] **Step 1: Write failing render test**

```js
import { renderAreaSummaryEduPage } from '../src/render-edu.mjs';
import { buildEduFixture } from './fixtures/edu-fixture.mjs';

describe('renderAreaSummaryEduPage', () => {
  const { project, areaSummary } = buildEduFixture();
  const html = renderAreaSummaryEduPage(project, areaSummary);

  it('emits all four narrative blocks', () => {
    assert.match(html, /Overview/);
    assert.match(html, /Why it matters/);
    assert.match(html, /Formula/);
    assert.match(html, /Worked/);
  });
  it('renders a per-SDA table with pre+post+SWRv columns', () => {
    assert.match(html, /<table[\s\S]*SDA[\s\S]*Pre Imp[\s\S]*Post Imp[\s\S]*SWRv/);
  });
  it('includes a Match? column (area reconciliation)', () => {
    assert.match(html, /Match\?/);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd education && node --test tests/render-edu.test.mjs 2>&1 | tail -20
```
Expected: ImportError on `renderAreaSummaryEduPage`.

- [ ] **Step 3: Implement `renderAreaSummaryEduPage`**

In `render-edu.mjs` after `renderSdaCdaExplainedPage`:

```js
export function renderAreaSummaryEduPage(project, areaSummary) {
  const overview = renderOverview(
    'Area_Summary reconciles pre- vs post-development land cover per SDA and CDA, and rolls the SWRv requirement up to the site total.',
  );
  const why = renderWhy(`
    <p>21 DCMR §599 requires the SWRv target be met <b>within each SDA</b> — a project cannot average compliance across SDAs. Area_Summary is the audit trail: if existing and proposed areas don't tie out per SDA, the SWRv numbers don't match the LOD and the submission bounces at DOEE intake.</p>
    <p>The <b>BMP as land cover</b> column catches a subtlety: BMPs occupy land, so their footprint must be subtracted from Impervious or Compacted in the proposed condition — otherwise the SWRv is double-counted.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">A_pre_total(sda) = Σ A_pre_i    (summed over land uses i in that SDA)</div>
    <div class="cs-formula-line">A_post_total(sda) = Σ A_post_i + Σ A_bmp_j</div>
    <div class="cs-formula-line">Match(sda) = |A_pre_total − A_post_total| &lt; 1 sf</div>
    <div class="cs-formula-line">SWRv(sda) = (P / 12) · Σ (A_post_i · Rv_i)</div>
  `);
  // ... build rows from agg.areaSummary ...
  const worked = renderWorked(renderDataTable(
    ['SDA', 'Pre Imp', 'Pre Comp', 'Pre Nat', 'Post Imp', 'Post Comp', 'Post Nat', 'Post BMP', 'SWRv (cf)', 'Match?'],
    rows,
  ));
  return renderSheetShell({
    title: 'Area Summary — Pre vs Post Reconciliation',
    sub:   project.name || '',
    body:  overview + why + formula + worked,
    footer: '21 DCMR §599 · Summary Calculator sheet Area_Summary',
  });
}
```

Build rows from `areaSummary` (the existing `areaSummaryRollup` output). The caller in `ui.mjs` (see Step 5) is responsible for computing it — the render function is pure.

- [ ] **Step 4: Run test, verify green**

- [ ] **Step 5: Wire into `ui.mjs`**

Import the new function **and** `areaSummaryRollup` from aggregate. In the deck-builder, compute the rollup once (before the deck array), then insert the page **after** `renderSiteDaPage(project, agg)` and **before** `renderSdaCdaExplainedPage(project)`:

```js
const areaSummary = areaSummaryRollup(
  parsed.sdaExisting, parsed.sdaProposed,
  parsed.cdaExisting, parsed.cdaProposed, {});
// ...
{ label: 'Area Summary', html: renderAreaSummaryEduPage(project, areaSummary) },
```

- [ ] **Step 6: Run all three JS suites**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education         && npm test 2>&1 | tail -3
cd ../populator         && npm test 2>&1 | tail -3
```

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(education): add Area_Summary pedagogy page

Four-block narrative over the existing areaSummaryRollup. Inserted
immediately after Site DA, before SDA/CDA Explained — follows the
natural top-down flow: site DA → area reconciliation → SDA/CDA split."
```

---

## Task 7.2 — `renderTcPathEduPage`

**Files:**
- Modify: `education/src/render-edu.mjs`
- Modify: `education/src/ui.mjs`
- Modify: `education/tests/render-edu.test.mjs`

- [ ] **Step 1: Write failing render test**

Minimum assertions:
- Four narrative blocks present.
- Per-segment data table emitted (columns Segment / Type / L / s / n or k / Tt).
- Tc row at the bottom.
- Handles a path with only sheet-flow segments.
- Handles a path with all three segment types (sheet + shallow + channel).

- [ ] **Step 2: Run test, verify failure**

- [ ] **Step 3: Implement `renderTcPathEduPage`**

Pattern:

```js
export function renderTcPathEduPage(project, parsed) {
  const overview = renderOverview(
    'Time of concentration (Tc) is how long runoff takes to travel from the hydraulically most distant point of a drainage area to its outlet — the key TR-55 input for peak discharge.',
  );
  const why = renderWhy(`
    <p>Peak discharge <code>qu</code> drops as Tc grows. A short Tc on a small, heavily paved site inflates the peak — DOEE caps Tc at a minimum (0.1 hr) to prevent unrealistic design flows. On the long side there's no cap; a complex overland path legitimately earns a slower, lower peak.</p>
    <p>Tc is split into <b>three flow regimes</b>: sheet flow over short pervious stretches, shallow concentrated flow in rills or paved channels, and channel flow in pipes or defined watercourses. Each regime has its own velocity model.</p>
  `);
  const formula = renderFormula(`
    <div class="cs-formula-line">Sheet:   Tt = 0.007 · (n·L)^0.8 / (P2^0.5 · s^0.4)        <i>L ≤ 100 ft</i></div>
    <div class="cs-formula-line">Shallow: V = k · √s,   Tt = L / (3600·V)                <i>k from paved/unpaved table</i></div>
    <div class="cs-formula-line">Channel: Tt = L / (3600·V)                              <i>V user-supplied</i></div>
    <div class="cs-formula-line">Tc = Σ Tt                                               <i>then Tc = max(Tc, 0.1 hr)</i></div>
  `);
  const traces = (parsed.tcPaths || []).map(path => {
    // ... build one renderBlock per path with a renderDataTable of segments + Tc row ...
  }).join('');
  const worked = renderWorked(traces || '<p>No Tc paths defined in this project.</p>');
  // ... return sheet shell with DOEE footer ...
}
```

- [ ] **Step 4: Run test, verify green**

- [ ] **Step 5: Wire into `ui.mjs`**

Insert after `renderEisaComparisonEduPage` and before any detention/peak pages.

- [ ] **Step 6: Run all three JS suites**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(education): add TC_PATH pedagogy page"
```

---

## Task 7.3 — `renderPeakDischargeSdaEduPage` + `renderPeakDischargeCdaEduPage`

Two functions, one commit (they share pedagogy and only differ in the rollup key). TDD each separately but wire + commit together.

**Files:** same three.

- [ ] **Step 1: Write failing tests (both pages)**

For SDA page:
- Four narrative blocks.
- Data table with `SDA | Tc | CN_pre | CN_post | Ia/P | qu | Q_pre_2yr | Q_post_2yr | Q_pre_15 | Q_post_15 | Trigger?`.
- Trigger column shows `Yes` when `Q_post_15 > Q_pre_15`, `No` otherwise.

For CDA page:
- Same assertions, keyed on CDA id, and *adds* a column for BMP Sv at each CDA (feeds the detention-BMP page).

- [ ] **Step 2: Run tests, verify failure**

- [ ] **Step 3: Implement both functions**

Pedagogy copy — SDA Why block focuses on **detention trigger** (regulatory); CDA Why block focuses on **adjusted post Q that the BMP must accept** (physical).

Use `tr55UnitPeakDischarge` + `tr55PeakDischargeCfs` for row-level values if `parsed.peakDischarge.sda` doesn't already include computed `qu` / `Qp`. Pull Ia/P and C0..C2 from `params.tr55`.

Round outputs to 2 decimal places for cfs, 3 for Tc.

- [ ] **Step 4: Run tests, verify green**

- [ ] **Step 5: Wire into `ui.mjs`**

Insert in this order after the TC_PATH page:
```
renderPeakDischargeSdaEduPage(project, parsed, params)
renderPeakDischargeCdaEduPage(project, parsed, params)
```

- [ ] **Step 6: Run all three JS suites**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(education): add Peak Discharge SDA + CDA pedagogy pages

Two pages: SDA (per-SDA detention trigger comparison) and CDA (per-CDA
post-development Qp feeding the detention-BMP adjusted CN math)."
```

---

## Task 7.4 — `renderDoeeDetentionBmpEduPage`

**Files:** same three.

- [ ] **Step 1: Write failing render test**

- Four narrative blocks.
- Per-BMP KV block: `CDA | Pre CN | Post CN | Sv (cf) | Q_post | Q_adj | CN_adj | 2-yr req? | 15-yr req?`.
- Summary count table at the bottom: `Required count | Not required count`.
- Handles 0 BMPs gracefully (empty-state message).

- [ ] **Step 2: Run test, verify failure**

- [ ] **Step 3: Implement**

Pattern — use `detentionBmpAdjustedQ`, `detentionBmpAdjustedCn`, `detentionBmpRequired` per BMP. Narrative must call out that the 2020 methodology *reduces* the number of projects that trigger separate detention because BMP Sv now directly offsets the post-development runoff depth.

- [ ] **Step 4: Run test, verify green**

- [ ] **Step 5: Wire into `ui.mjs`**

Insert after the two peak discharge pages, before `renderDetentionEduPage` (the existing high-level detention page).

- [ ] **Step 6: Run all three JS suites**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(education): add DOEE Detention-BMP (2020 methodology) page"
```

---

## Task 7.5 — `renderEisaTimestepEduPage`

**Files:** same three.

- [ ] **Step 1: Write failing render test**

- Four narrative blocks.
- Per-HSG-group data table: `HSG | Area (sf) | f0 | fc | k | 24-hr Horton loss (in) | Excess (in) | Excess (cf)`.
- Total row at the bottom summing Excess (cf) to project volume.
- Narrative explicitly notes timestep is more conservative than the single-storm Direct method.

- [ ] **Step 2: Run test, verify failure**

- [ ] **Step 3: Implement**

Use `eisaTimestepTrace` output already shipped on `parsed.eisaTimestep`. If parsed has `groups`, iterate. Round losses to 2 decimal places (in), excess volumes to whole cf.

- [ ] **Step 4: Run test, verify green**

- [ ] **Step 5: Wire into `ui.mjs`**

Insert **immediately after** `renderEisaDirectEduPage` (the existing Direct page) and **before** `renderEisaTr55EduPage`. This places the two "Direct-family" methods next to each other.

- [ ] **Step 6: Run all three JS suites**

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(education): add EISA Direct Timestep pedagogy page"
```

---

## Task 7.6 — Integration pass

**Files:** none (verification only).

- [ ] **Step 1: Run every test suite from scratch**

```bash
cd summary_calculator && npm test 2>&1 | tail -3
cd ../education         && npm test 2>&1 | tail -3
cd ../populator         && npm test 2>&1 | tail -3
cd ..                   && python -m pytest tests/ -q 2>&1 | tail -3
```

- [ ] **Step 2: Byte-diff engines**

```bash
diff summary_calculator/src/parse.mjs     education/src/parse.mjs
diff summary_calculator/src/calc.mjs      education/src/calc.mjs
diff summary_calculator/src/aggregate.mjs education/src/aggregate.mjs
```
Expected: silent output on all three.

- [ ] **Step 3: Rebuild the education bundle**

```bash
node education/build.js
```

- [ ] **Step 4: Smoke-check the deck**

```bash
cd education && node tests/browser-smoke.mjs 2>&1 | tail -20
```
Expected: no console errors on either Minnesota Ave or Multi-Use Trail fixtures. Deck page count increases by 6.

- [ ] **Step 5: Spot-check pedagogy content**

Open `education/education.html` in a browser (or `python -m http.server`). Load Minnesota Ave. Confirm:
- New pages appear in the TOC in the order specified in spec §5.
- Each page shows all four narrative blocks visibly.
- No `undefined` / `NaN` / `[object Object]` in any visible cell.

- [ ] **Step 6: Commit the integration note**

```bash
git commit --allow-empty -m "chore(education): integration pass for new-feature pedagogy pages

All six pedagogy pages (Area_Summary, TC_PATH, Peak-SDA, Peak-CDA,
DOEE Detention-BMP, EISA Timestep) land cleanly in both bundled
fixtures. Engine byte-diff clean; full test matrix green."
```

- [ ] **Step 7: Push**

```bash
git push origin main
```
