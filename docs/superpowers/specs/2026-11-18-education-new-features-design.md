# Education App — Four-Block Pedagogy for the Six New Features

**Date:** 2026-11-18
**Scope:** `education/src/render-edu.mjs`, `education/src/ui.mjs`, `education/tests/render-edu.test.mjs` (+ its fixtures). No new engine work — every calc/aggregate/parse function this spec needs already exists in the byte-synced `education/src/{calc,aggregate,parse}.mjs`.
**Parent specs:**
- `2026-10-29-education-app-design.md` (education app v1 — original 20-ish pages)
- `2026-11-06-summary-calculator-template-gaps-design.md` §8.1 (this is the follow-on it names)

## 1. Problem

The summary calculator now renders six deck pages the education app does not:

| Feature                | Summary calc page (shipped)      | Education app page (missing) |
|------------------------|----------------------------------|------------------------------|
| Area_Summary           | `renderAreaSummarySheet`         | —                            |
| TC_PATH                | `renderTcPathSheet`              | —                            |
| PEAK_DISCHARGE (SDA)   | `renderPeakDischargeSdaSheet`    | —                            |
| PEAK_DISCHARGE (CDA)   | `renderPeakDischargeCdaSheet`    | —                            |
| DOEE_DETENTION_BMP     | `renderDoeeDetentionBmpSheet`    | —                            |
| EISA Direct Timestep   | `renderEisaTimestepSheet`        | —                            |

Users learning the DOEE/DDOT/EISA 438 process from the education deck see a gap: the production summary deck cites numbers (Tc, peak Q, 2020-methodology adjusted CN, timestep-integrated EISA volume) with no pedagogical grounding for where they come from.

## 2. Non-goals

- **No engine work.** Every function referenced below is already byte-identical between `summary_calculator/src/` and `education/src/`.
- **No re-architecture.** Mirror the existing education page cadence: one `render…EduPage(project, …)` function per feature; ordered insertion in `ui.mjs`; one unit test per page in `render-edu.test.mjs`.
- **No calculator mode.** Pages are static narrative over the loaded fixture's values. No sliders, no "what-if" inputs.
- **No new chapters.** Tc, Peak, and Detention-BMP narratives slot into the existing flow (see §5). We do not introduce a "Peak Discharge chapter" with its own cover.

## 3. Four-block pedagogy pattern

Each new page follows the shipped convention from `narrative.mjs`:

1. **Overview** (`renderOverview`) — one sentence, plain English, what this computation produces.
2. **Why it matters** (`renderWhy`) — regulatory anchor + physical reasoning, 2–3 short paragraphs.
3. **Formula + Derivation** (`renderFormula`) — the equations with every variable defined, in the form already used across the deck.
4. **Worked application** (`renderWorked`) — substitution against the loaded fixture's values. Match the step cadence of `renderEisaDirectEduPage` (§798 of render-edu.mjs).

Where a page has repeated per-entity structure (e.g., one trace per BMP, one row per SDA), the Worked block uses `renderDataTable` (summary table) or stacked `renderBlock` + `renderKvTable` (per-entity trace) — pick whichever matches the shipped summary-calc page's density.

## 4. Pages to add

For each page, "Engine" lists the already-existing functions it wires to. "Summary-calc mirror" is the summary calculator file to study for layout cues (not to copy — the education page adds the four narrative blocks).

### 4.1 Area_Summary

- **Function name:** `renderAreaSummaryEduPage(project, areaSummary)`
- **Caller computes:** `areaSummary = areaSummaryRollup(parsed.sdaExisting, parsed.sdaProposed, parsed.cdaExisting, parsed.cdaProposed, swrvBySda)` inside `ui.mjs` (mirrors `summary_calculator/src/ui.mjs:130`).
- **Where in deck:** after `renderSiteDaPage` (page 4-ish), before `renderSdaCdaExplainedPage`. Area_Summary is how the project *rolls up* to the SDA/CDA split the next page explains.
- **Engine:** `areaSummaryRollup` from `aggregate.mjs` (line 117).
- **Summary-calc mirror:** `summary_calculator/src/render.mjs` → `renderAreaSummarySheet`.
- **Overview:** Area_Summary cross-checks that every land-cover row in `_Existing` has a matching row in `_Proposed` for the same SDA/CDA + land use, and totals Pre vs. Post + SWRv per SDA.
- **Why:** 21 DCMR §599 requires the SWRv target be met *within each SDA independently*. Area_Summary is the audit trail — if existing and proposed areas don't add up per SDA, the SWRv on paper doesn't match the LOD, and the submission bounces.
- **Formula:** Area totals are `Σ(A_pre)` and `Σ(A_post)` per SDA/CDA grouped by land use. "Area Match" = `|A_pre − A_post| < tolerance` (typically 1 sf rounding).
- **Worked:** one data table — columns `SDA | Pre Imp | Pre Comp | Pre Nat | Post Imp | Post Comp | Post Nat | Post BMP | SWRv (cf) | Match?` — one row per SDA, last row Totals.

### 4.2 TC_PATH (Time of Concentration)

- **Function name:** `renderTcPathEduPage(project, tcPaths)`
- **Caller computes:** `tcPaths = (parsed.tcPaths || []).map(p => ({ ...p, tcMin: tcFinalMin(p.tcDirectMin, p.segments) }))` in `ui.mjs` (mirrors `summary_calculator/src/ui.mjs:146-149`).
- **Where in deck:** immediately before `renderDetentionEduPage` (Tc feeds the peak discharge the detention page already references).
- **Engine:** `tcSheetFlow`, `tcShallowFlow`, `tcChannelFlow`, `timeOfConcentration`, `tcFinalMin` from `calc.mjs` (lines 458-496).
- **Summary-calc mirror:** `renderTcPathSheet`.
- **Overview:** Tc is the time it takes for runoff to travel from the hydraulically most distant point of a drainage area to its outlet — needed as input to TR-55 peak discharge.
- **Why:** TR-55 unit peak discharge `qu` is a function of Tc and Ia/P (Fig. 4-3, TR-55). A longer Tc flattens the hydrograph and lowers peak flow. If Tc is wrong, peak is wrong, and downstream pipe/detention sizing is wrong. DOEE caps the computed Tc at a minimum (typically 0.1 hr) to avoid inflated peaks on tiny sites.
- **Formula:**
  - Sheet: `Tt = 0.007 · (n·L)^0.8 / (P2^0.5 · s^0.4)` — Manning's kinematic for ≤100 ft of sheet flow.
  - Shallow: `V = k · √s`, `Tt = L / (3600·V)` with `k` from paved/unpaved table.
  - Channel: `Tt = L / (3600·V)` with user-supplied V.
  - `Tc = Σ Tt`, final `Tc = max(Tc, 0.1 hr)`.
- **Worked:** one data table per Tc path in the fixture — columns `Segment | Type | L (ft) | s | n or k | Tt (hr)` — then a footer row `Tc (sum) | ... | ... | ... | ... | TcFinal`.

### 4.3 Peak Discharge (SDA + CDA)

- **Function names:** `renderPeakDischargeSdaEduPage(project, peakSda)` and `renderPeakDischargeCdaEduPage(project, peakCda)`.
- **Caller computes (ui.mjs, mirrors summary_calculator/src/ui.mjs:152-161):**
  ```js
  const peakSda = (parsed.params.tr55 && parsed.params.tr55.length >= 2)
    ? peakDischargeRollup(parsed.sdaExisting, parsed.sdaProposed, parsed.tcPaths || [], parsed.params)
    : [];
  const peakCda = (parsed.params.tr55 && parsed.params.tr55.length >= 2)
    ? peakDischargeRollup(parsed.cdaExisting, parsed.cdaProposed, parsed.tcPaths || [], parsed.params, 'cdaId')
    : [];
  ```
- **Where in deck:** immediately after the TC_PATH page, SDA first then CDA.
- **Engine:** `tr55UnitPeakDischarge(tcHr, iaOverP, paramsTr55)`, `tr55PeakDischargeCfs(qu, areaMi2, runoffIn)` from `calc.mjs` (lines 546-575), plus `peakDischargeRollup(existingRows, proposedRows, tcPaths, params, idKey)` from `aggregate.mjs`.
- **Summary-calc mirrors:** `renderPeakDischargeSdaSheet`, `renderPeakDischargeCdaSheet`.
- **Overview:** Peak Discharge is the design flow rate (cfs) for the 2-, 15-, and 100-year storms, used to size pipes, check downstream capacity, and trigger DOEE's detention requirement when post exceeds pre.
- **Why (SDA):** DOEE compares pre- vs post-project peak at the SDA level to decide whether detention is required. If Post Qp > Pre Qp for the 15-yr storm, detention is triggered. The SDA is the compliance unit — a project may trigger detention on one SDA and not another.
- **Why (CDA):** CDA-level peak is the input the detention BMP must *accept*. The CDA page shows why a BMP's Sv (storage volume) matters: Sv shaves Q from the post hydrograph, lowering the adjusted post Q seen by the detention CN calculation.
- **Formula:**
  - Composite CN per SDA/CDA: `CN_c = Σ(A_i · CN_i) / Σ A_i`.
  - SCS runoff: `S = 1000/CN − 10`; `Ia = 0.2·S`; `Q = (P − Ia)² / (P + 0.8·S)` for P > Ia else 0.
  - Ia/P look up `C0, C1, C2` from `PARAMS_TR55` (bracketed, no interpolation inside education v1).
  - `log(qu) = C0 + C1·log(Tc) + C2·log²(Tc)` ⇒ `qu = 10^(…)` in csm/in.
  - `Qp = qu · A_mi2 · Q_in` (cfs).
- **Worked:** one data table per rollup — columns for SDA:  `SDA | Tc | CN_pre | CN_post | Ia/P | qu | Q_pre_2yr | Q_post_2yr | Q_pre_15 | Q_post_15 | Trigger?`. For CDA: same columns keyed on CDA id. Keep decimals tight (2-3 places) to match the summary-calc page.

### 4.4 DOEE Detention-BMP (2020 Methodology)

- **Function name:** `renderDoeeDetentionBmpEduPage(project, detentionBmp)`
- **Caller computes:** `detentionBmp = detentionBmpRollup(parsed.cdaExisting, parsed.cdaProposed, parsed.bmps, parsed.params)` in `ui.mjs` (mirrors summary calc).
- **Where in deck:** between `renderPeakDischargeCdaEduPage` and `renderDetentionEduPage`. (DetentionEduPage already exists and explains *why detention exists*; this new page shows the per-BMP 2020 adjusted-CN math.)
- **Engine:** `detentionBmpAdjustedQ`, `detentionBmpAdjustedCn`, `detentionBmpRequired` from `calc.mjs` (lines 578-620), plus `detentionBmpRollup` from `aggregate.mjs`.
- **Summary-calc mirror:** `renderDoeeDetentionBmpSheet`.
- **Overview:** DOEE's 2020 methodology credits a BMP's retention volume (Sv) toward reducing the effective post-development runoff *depth*, which then yields an adjusted CN that gets compared against the pre CN for the 2-yr and 15-yr storm trigger.
- **Why:** Without the 2020 methodology, every BMP's Sv was "wasted" on detention accounting (retention credit counted separately from peak-flow trigger). The 2020 change let BMP storage directly offset the trigger — so a project meeting its SWRv target often no longer triggers detention. Regulatorily significant: it reduced the number of projects that need a separate detention facility.
- **Formula:**
  - Adjusted Q (in): `Q_adj = max(0, Q_post_in − Sv_bmp / A_cda · 12)`.
  - Adjusted CN: solve SCS backward — `S_adj` from `Q_adj = (P − 0.2·S_adj)² / (P + 0.8·S_adj)` ⇒ `CN_adj = 1000 / (S_adj + 10)`.
  - Trigger: `required = CN_adj > CN_pre` for either the 2-yr or 15-yr storm.
- **Worked:** one data block per BMP — KV table with `CDA | Pre CN | Post CN (unadjusted) | BMP Sv (cf) | Q_post | Q_adj | CN_adj | 2-yr required? | 15-yr required?`. Summary table at bottom: count BMPs where detention is required vs. not.

### 4.5 EISA Direct Timestep

- **Function name:** `renderEisaTimestepEduPage(project, eisaTimestep)`
- **Caller computes:** `eisaTimestep = eisaTimestepTrace({ sdas: parsed.sdas, bmps: bmpStorage, params: parsed.params, P: project.rainfallEisa || 1.7, lossModel: 'horton' })` in `ui.mjs` (mirrors `summary_calculator/src/ui.mjs:136-142`).
- **Where in deck:** immediately after the existing `renderEisaDirectEduPage`. The existing page covers EISA Direct with the single-storm Horton + depression-storage model; this new page covers the *timestep-integrated* version the summary calc now ships.
- **Engine:** `scsType2Hyetograph`, `hortonInfilRate`, `eisaTimestepTrace` from `calc.mjs` (lines 644-792), plus Horton params from parse.
- **Summary-calc mirror:** `renderEisaTimestepSheet`.
- **Overview:** The timestep engine distributes the 1.7″ EISA storm over 24 hours using the SCS Type-II hyetograph, runs Horton infiltration minute-by-minute (with SCS-CN loss as fallback), and sums excess runoff to a project volume.
- **Why:** The single-storm Direct Determination assumes the whole 1.7″ arrives instantaneously and compares against 24-hr integrated infiltration. The timestep version resolves the storm's intensity profile — during the Type-II peak (~hour 12), rainfall rate briefly exceeds Horton's declining infiltration capacity, producing excess even on HSG A/B soils that the single-storm model treats as fully infiltrating. Timestep EISA is therefore more conservative (and more physically honest) for mixed-HSG sites. DOEE accepts either method on federal projects — the summary deck now shows both so reviewers can compare.
- **Formula:**
  - Hyetograph: `P_t = SCS_Type_II_curve(t/24) · P_total` for t ∈ [0, 24 hr] at 6-minute steps.
  - Horton rate: `f(t) = fc + (f0 − fc)·e^(−k·t)` (in/hr).
  - Excess at step: `max(0, i_t − f_t) · Δt`, where `i_t` = rainfall rate that step.
  - Volume: `Σ excess_t · A_pervious`.
- **Worked:** one summary data table — `HSG group | Area (sf) | Horton params (f0, fc, k) | 24-hr Horton loss (in) | Excess (in) | Excess (cf)`. Optional: a small inline sparkline or ASCII mini-chart of rainfall vs. infiltration rate — defer to §8.3 timestep rendering expansion; v1 is table-only.

## 5. Deck page order

New insertions in `ui.mjs` deck builder (existing pages omitted for brevity):

```
... renderSiteDaPage(project, agg) ...
+ renderAreaSummaryEduPage(project, areaSummary)              // NEW §4.1
... renderSdaCdaExplainedPage(project) ...
...
... renderEisaDirectEduPage(project, pre, post) ...
+ renderEisaTimestepEduPage(project, eisaTimestep)            // NEW §4.5
... renderEisaTr55EduPage(project, pre, post) ...
... renderEisaTr16EduPage(project, parsed, params) ...
... renderEisaComparisonEduPage(...) ...
+ renderTcPathEduPage(project, tcPaths)                       // NEW §4.2
+ renderPeakDischargeSdaEduPage(project, peakSda)             // NEW §4.3 (SDA)
+ renderPeakDischargeCdaEduPage(project, peakCda)             // NEW §4.3 (CDA)
+ renderDoeeDetentionBmpEduPage(project, detentionBmp)        // NEW §4.4
... renderDetentionEduPage(project, summary, p2In, p15In) ... // existing, unchanged
... renderSiteComplianceEduPage(...) ...
...
```

The rollup computations go in the education `ui.mjs` deck-builder — same pattern the summary calculator uses. No new rollup logic; just wire the existing byte-synced `aggregate.mjs` + `calc.mjs` helpers.

The Cover page's TOC labels are auto-generated from the pages array — no manual sync needed.

## 6. Tests

One `node --test` describe-block per new page in `education/tests/render-edu.test.mjs`. Pattern:

```js
describe('renderAreaSummaryEduPage', () => {
  it('emits all four narrative blocks + a per-SDA table', () => {
    const html = renderAreaSummaryEduPage(fixtureProject, fixtureParsed, fixtureAgg);
    assert.match(html, /Overview/);
    assert.match(html, /Why it matters/);
    assert.match(html, /Formula/);
    assert.match(html, /Worked/);
    assert.match(html, /<table/);
  });
  it('handles missing SWRv-by-SDA input gracefully', () => { /* ... */ });
});
```

Each test needs a minimal fixture object (project + parsed slice + agg slice). Share one fixture builder across the six new tests — `education/tests/fixtures/edu-fixture.mjs`.

**Playwright smoke** (`education/tests/browser-smoke.mjs`) already iterates all pages and asserts no console errors — once the six pages are wired into `ui.mjs`, the smoke test automatically covers them.

**Engine-parity test** (`education/tests/engine-parity.test.mjs`) is unaffected — no engine edits.

## 7. Risks

- **Rendering density vs. the summary calc.** The summary-calc pages are print-dense (lots of rows, tight margins). Education pages drop the density by adding ~40 lines of narrative per page. The loaded fixture may have >15 SDAs — if the worked table overflows a page, split across two pages with `page-break-before` CSS (already used elsewhere in render-edu.mjs; grep for `cs-page-break`).
- **"Why" narrative drift.** The six "Why" paragraphs encode current DOEE/DDOT regulatory stance. Any future rule change (e.g., DOEE updating the 2020 methodology trigger comparison) needs a corresponding narrative edit. Flag in commit message when a "Why" block is changed so reviewers notice.

## 8. Out of scope for this spec

- **Timestep rendering expansion** — the inline hyetograph/infiltration chart from parent spec §8.3 stays deferred.
- **Populator follow-on** — covered by a separate spec (see §8.1 of the parent).
- **Formula-drift validators** — covered by its own spec (see §8.2 of the parent).

## 9. Done definition

- Six new `render…EduPage` functions exist in `render-edu.mjs` and are exported.
- Wired into `ui.mjs` in the order described in §5.
- `education/tests/render-edu.test.mjs` adds a describe-block per new page; all tests green.
- Education Playwright smoke test green against both bundled fixtures (Minnesota Ave and Trail).
- Byte-diff of `calc.mjs` / `aggregate.mjs` / `parse.mjs` between `summary_calculator/` and `education/` still clean.
- `node education/build.js` emits a single-file `education.html` that opens offline with the new pages visible in the TOC.
