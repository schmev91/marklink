# Research: CSV Comparison Feature

**Status**: ✅ Complete  
**Date**: 2026-05-23  
**Feature**: CSV Comparison for data validation in CSV mode

## Summary

All technical decisions are clear from the feature specification and project context. No unknowns or clarifications required.

## Decision Log

### 1. Comparison Algorithm

**Decision**: Row-by-row, column-by-column strict comparison by index.

**Rationale**: 
- Simplest, most intuitive for CSV validation use case
- Matches user expectation: "does this data match that data exactly?"
- No need for fuzzy matching or complex alignment logic
- Aligns with spec assumption: "Row order matters... column order matters"

**Alternatives considered**:
- Fuzzy matching (e.g., UUID-based row matching): Rejected—too complex, unclear intent, no requirement for reordered rows
- Heuristic alignment (e.g., matching by column names): Rejected—CSV may not have headers, over-engineered for validation task

### 2. Diff Report Format

**Decision**: Structured output showing:
- Match status (yes/no)
- Added rows (in editor but not reference)
- Removed rows (in reference but not editor)
- Modified rows (same index, different values) with column-level details

**Rationale**:
- Directly addresses spec FR-005: "show what is not match"
- Enables users to quickly locate and fix issues
- Browser-native data structures (arrays, objects) for easy rendering

**Alternatives considered**:
- Unified diff format (like git diff): Rejected—harder to parse in browser, less scannable
- HTML patch format: Rejected—not necessary, structured JSON easier to format

### 3. CSV Parser Strategy

**Decision**: Reuse existing CSV parser from `csv-editor.js` (or extract common utility).

**Rationale**:
- Avoids code duplication
- Leverages existing, tested parsing logic (handles quoted fields, escaped commas, etc.)
- No external dependencies required

**Alternatives considered**:
- Simple `split(',')`: Rejected—inadequate for real CSVs with quoted values, commas in cells
- External library (e.g., PapaParse): Rejected—project has no external dependencies, in-browser solution sufficient

### 4. Storage & Persistence

**Decision**: No persistence of comparison results. Store comparison state (modal open/closed) in memory only.

**Rationale**:
- Spec assumption: "No data is persisted from comparison"
- Comparison is transient validation task, not a saved workflow
- Reduces complexity (no localStorage key management)

**Alternatives considered**:
- localStorage for diff results: Rejected—adds complexity, no user need expressed
- Server-side history: Rejected—out of scope (browser-only architecture)

### 5. UI Implementation

**Decision**: Modal dialog for reference CSV input; inline result display; expandable diff report.

**Rationale**:
- Non-blocking interaction (modal doesn't interrupt editing)
- Clear visual hierarchy: result first, details on demand
- Consistent with existing CSV mode UI patterns (e.g., saves sidebar modal)

**Alternatives considered**:
- Comparison as separate tab: Rejected—more complex navigation, violates current single-mode design
- Inline text input: Rejected—poor UX for multi-line CSV paste

### 6. Performance Constraints

**Decision**: Target <1 second result display for files up to 1MB (SC-002).

**Rationale**:
- Browser can handle in-memory array comparison for this size without optimization
- Standard web app performance expectation
- Aligns with success criteria

**Alternatives considered**:
- Async processing (Web Workers): Rejected—unnecessary for typical CSV sizes, adds complexity
- Streaming comparison: Rejected—not applicable to in-memory arrays

## Technical Clearance

✅ **Browser Compatibility**: No special APIs required beyond ES6 (Array methods, String methods)  
✅ **Performance**: <1MB files comparable in <1s with standard JS (no optimization needed)  
✅ **Dependencies**: None new (reuse existing csv-editor.js parser)  
✅ **Testing**: Manual in-browser (consistent with project approach)

## Conclusion

Specification is ready for Phase 1 design. Technical context (JavaScript, browser-based, no dependencies) is clear. Proceed to Phase 1 to generate data model, contracts, and quickstart.
