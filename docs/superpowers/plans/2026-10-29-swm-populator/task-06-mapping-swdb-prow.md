# Task 06 — Mapping: SWDB PROW Import Template

**Goal:** Build `src/mappings/swdb-prow.mjs` + mapping test. Fills `Drainage Areas` and `BMPs` human-entry sheets. The `(Import)` tabs auto-populate via formulas; we don't touch them.

**Files:**
- Create: `populator/src/mappings/swdb-prow.mjs`
- Create: `populator/tests/mappings/swdb-prow.test.mjs`

---

- [ ] **Step 1: Investigate the blank**

Open `populator/blanks/swdb-prow.xlsx`. The file is "final locked" — most cells are protected. On the `Drainage Areas` sheet, find the unlocked input cells:

- Per-DA row: DA Number, Post-Project Natural, Compacted, Impervious, BMP, Vehicular Access, Pre-Project (same 4 covers), AWDZ, CSS, Major/Minor Drainage Area

On the `BMPs` sheet:

- Per-BMP row: BMP ID (auto), DA Number, BMP Number, BMP Group, BMP Sub-Type, Sv (CF), coordinates (left blank in v1)

Record input refs.

- [ ] **Step 2: Write mapping + test**

Same structure as `general-retention.mjs`. The `Drainage Areas` table source is unique-SDA rows (grouped). The `BMPs` table source is `parsed.bmps`.

Note the sheet-protection consideration: the surgical edit module writes into protected cells at the XML level without issue (verified in Task 02 preservation tests). The protection only blocks edits via Excel's UI, not file-level XML changes.

- [ ] **Step 3: Golden-cell assertions** (~10 cells covering DA land cover + BMP data)

- [ ] **Step 4: Commit**

```bash
git add populator/src/mappings/swdb-prow.mjs populator/tests/mappings/swdb-prow.test.mjs
git commit -m "populator: SWDB PROW mapping writing into protected cells at XML level"
```
