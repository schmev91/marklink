# Implementation Plan: CSV Comparison

**Branch**: `003-csv-comparison` | **Date**: 2026-05-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-csv-comparison/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

CSV Comparison feature enables users in CSV mode to validate current editor data against a reference CSV by pasting reference data, triggering a comparison, and viewing detailed differences (rows added/removed/modified) when CSVs don't match. This is a browser-based, in-memory comparison with no server-side processing or data persistence. Implementation uses existing CSV parsing logic and modular JavaScript following marklink patterns (csv-comparison.js as new module, reusing csv-parser utilities, localStorage for UI state if needed).

## Technical Context

**Language/Version**: JavaScript (ES6) / Browser standard APIs
**Primary Dependencies**: None new (reuse existing CSV parser from csv-editor.js)  
**Storage**: localStorage (for comparison UI state if needed, e.g., modal state)
**Testing**: Manual in-browser (per CLAUDE.md; no automated test suite)  
**Target Platform**: Browser / Web (all modern browsers)
**Project Type**: Static web editor (Markdown/JSON/CSV)  
**Performance Goals**: <1 second result display for files up to 1MB (from SC-002)  
**Constraints**: In-memory processing only, no server-side APIs, no external dependencies, browser limits on memory (assume typical CSV sizes <5MB per SC-002)  
**Scale/Scope**: Single-browser-tab editor; CSV files typical < 1MB for comparison feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project constitution (`.specify/memory/constitution.md`) does not yet exist. Applying standard marklink architecture principles:

✅ **Modularity**: New feature will follow existing pattern (csv-comparison.js module, similar to editor.js/preview.js)  
✅ **No External Dependencies**: Comparison uses existing CSV parsing logic (no new CDN libraries)  
✅ **Browser-Based**: All processing in-memory on client (no server APIs)  
✅ **localStorage for State**: Can use if needed for UI persistence (consistent with existing storage.js pattern)  
✅ **Manual Testing**: Feature testable by opening CSV mode and triggering comparison (consistent with project testing approach)

**PASS**: No architectural violations. Feature aligns with marklink's static editor design.

## Project Structure

### Documentation (this feature)

```text
specs/003-csv-comparison/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - skip (no external APIs)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (Single Project - Static Web Editor)

```text
Root (marklink static files)
├── csv.html             # CSV editor entry point
├── js/
│   ├── csv-app.js       # CSV mode orchestrator (will integrate csv-comparison module)
│   ├── csv-editor.js    # CSV textarea editor and validation
│   ├── csv-preview.js   # CSV table view, sorting, filtering
│   ├── csv-comparison.js    # NEW: CSV comparison logic and UI (Phase 1)
│   ├── csv-parser.js        # [if extracted] CSV parsing utilities (reuse from csv-editor.js)
│   ├── storage.js       # localStorage API (existing)
│   ├── theme.js         # Dark/light mode (existing)
│   └── [other shared modules]
└── css/
    └── style.css        # Unified styling (will add CSS for comparison UI)
```

**Structure Decision**: Single-file feature module (`csv-comparison.js`) following marklink pattern. Compares CSV data in-memory using existing parser, stores comparison state in memory (no persistence). Integrates with csv-app.js orchestrator to add "Compare" button and modal UI. No separate API contracts needed (browser-only, in-memory).

## Phase 0: Research (Browser CSV Comparison)

**Status**: Ready to execute. No NEEDS CLARIFICATION markers remain from specification.

**Research Tasks** (if any unknowns identified):
- None identified - spec is clear, project constraints are documented

**Next**: Proceed to Phase 1 design once research complete (see below).

---

## Phase 1: Design & Contracts

### Data Model

**Entities from spec**:

1. **Reference CSV** (Data structure)
   - Rows: Array of arrays (parsed CSV rows)
   - Columns: Array of strings (column headers)
   - Metadata: { rowCount, columnCount, isEmpty }

2. **Editor CSV** (Data structure)
   - Same structure as Reference CSV (from existing csv-preview.js)

3. **Diff Result** (Comparison output)
   - matchStatus: "match" | "no-match"
   - addedRows: Array<{ rowIndex, values }>
   - removedRows: Array<{ rowIndex, values }>
   - modifiedRows: Array<{ rowIndex, changes: Array<{ columnIndex, oldValue, newValue }> }>
   - rowCountDiff: { editorCount, referenceCount }
   - columnCountDiff: { editorCount, referenceCount }

4. **Comparison UI State**
   - modalOpen: boolean
   - referenceCSVInput: string
   - comparisonResult: Diff Result
   - isComparing: boolean

### Module Interface

**New Module**: `/js/csv-comparison.js`

```javascript
// Public API
const CSVComparison = {
  parseCSV(csvText) -> Array<Array<string>>,
  compareCSVs(editorCSV, referenceCSV) -> DiffResult,
  formatDiffReport(diffResult) -> HTML string,
  showComparisonModal(element) -> void,
  closeComparisonModal() -> void
}
```

### Contracts

Skip: Feature has no external API contracts (browser-only, in-memory processing).

### Quickstart

To integrate CSV Comparison into CSV mode:

1. Load `csv-comparison.js` in `csv.html` (after `csv-app.js`)
2. In `csv-app.js`, wire up Compare button click to `CSVComparison.showComparisonModal()`
3. In comparison modal:
   - User pastes reference CSV text
   - System parses it via `CSVComparison.parseCSV()`
   - On "Compare" click, calls `CSVComparison.compareCSVs(editorCSV, referenceCSV)`
   - Displays result and diff report via `CSVComparison.formatDiffReport()`
4. Add CSS to `/css/style.css` for:
   - Modal styling (overlay, dialog box, close button)
   - Diff report layout (added/removed/modified rows, color indicators)
   - Button styling ("Compare CSV" button in toolbar)

**Testing**: Open `csv.html`, paste/load a CSV, click "Compare", paste reference CSV, verify match/diff results.

### Agent Context Update

The plan reference in `/root/harbor/marklink/CLAUDE.md` will be updated to point to this plan file during Phase 1 completion (by speckit-plan or manual update to the SPECKIT section).

---

## Phase 2: Implementation (Deferred)

Phase 2 (task generation and execution) is handled by `/speckit.tasks` command after Phase 1 design is complete.

**Next Step**: Run `/speckit.tasks` to generate actionable implementation tasks from this plan.
