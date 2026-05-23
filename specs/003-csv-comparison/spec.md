# Feature Specification: CSV Comparison

**Feature Branch**: `003-csv-comparison`  
**Created**: 2026-05-23  
**Status**: Draft  
**Input**: User description: "in csv mode, I want a feature to compare whether the the current csv data in the editor match the provided csv data, if not match then show details of what is not match"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick CSV Validation Against Reference (Priority: P1)

A user has a reference CSV (e.g., from a database export or shared document) and wants to verify that the CSV currently in the editor matches it exactly. They need to quickly confirm whether their data is up-to-date without manual inspection.

**Why this priority**: This is the core MVP value—users can validate data integrity in seconds instead of manually comparing files. It directly addresses the user's request for comparing "whether the current csv data in the editor match the provided csv data."

**Independent Test**: User can paste/load a reference CSV, trigger comparison, and receive a clear "Match" or "No Match" result. This alone provides immediate value for data validation workflows.

**Acceptance Scenarios**:

1. **Given** editor contains CSV data and user has a reference CSV, **When** user provides reference CSV (via paste or file) and clicks "Compare", **Then** system displays match result (green checkmark "Match" or red "No Match")
2. **Given** reference CSV is identical to editor CSV, **When** comparison is triggered, **Then** system shows "Match" status
3. **Given** reference CSV differs from editor CSV, **When** comparison is triggered, **Then** system shows "No Match" status

---

### User Story 2 - View Detailed Differences Report (Priority: P2)

When CSVs don't match, user needs to understand what is different—which rows changed, which columns are affected, and what the specific changes are. This helps them quickly locate and fix data issues.

**Why this priority**: Without detailed differences, the "No Match" result is unhelpful. Users need to see the diff to take corrective action. This directly supports "show details of what is not match."

**Independent Test**: User triggers comparison on non-matching CSVs and receives a structured diff report showing additions, deletions, and modifications with row/column details. This can be tested independently—users see the diff details even if they can't yet export or undo it.

**Acceptance Scenarios**:

1. **Given** CSVs don't match, **When** comparison completes with "No Match", **Then** system displays a detailed diff report below the result
2. **Given** diff is shown, **When** user inspects the report, **Then** they can identify:
   - Rows present in reference but missing from editor (deleted rows)
   - Rows present in editor but missing from reference (new rows)
   - Rows present in both but with different values (modified rows)
   - For modified rows, which columns differ and what the values are

---

### User Story 3 - Multiple Reference Sources (Priority: P3)

User can provide reference CSV via multiple methods: paste text, file upload, or URL/link. This flexibility supports different workflows (quick paste for small CSVs, file import for large datasets, collaboration via shared links).

**Why this priority**: Expands usability to different user workflows but is not required for MVP. The paste workflow in P1 covers the core need.

**Independent Test**: Can be tested as separate flows for each input method (paste, file, URL). Each can be validated independently.

**Acceptance Scenarios**:

1. **Given** user opens comparison dialog, **When** they select "Paste CSV text", **Then** they can paste reference CSV and proceed with comparison
2. **Given** user opens comparison dialog, **When** they select "Upload file", **Then** they can choose a CSV file from disk
3. **Given** user opens comparison dialog, **When** they select "Load from URL", **Then** they can paste a URL to a CSV file

---

### Edge Cases

- **Empty editor CSV**: System allows comparison. Result shows all reference rows as removed (not in editor).
- **Empty reference CSV**: System allows comparison. Result shows all editor rows as added (not in reference).
- **CSVs with different column orders**: If both CSVs have headers (first row), columns are matched by header name (order-independent). If only one CSV has headers or neither has headers, columns are compared by index (position-dependent).
- **Whitespace differences**: Strict comparison—any whitespace difference in cell values counts as a mismatch (e.g., "Alice " ≠ "Alice").
- **Very large CSVs (>1MB)**: Browser handles in-memory comparison with performance <1 second per SC-002. Larger files may cause UI freezing; document as a known limitation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a UI control in CSV mode to initiate comparison (e.g., "Compare CSV" button in toolbar or modal)
- **FR-002**: System MUST accept reference CSV input via text paste in a modal dialog
- **FR-003**: System MUST compare current editor CSV with reference CSV row-by-row and column-by-column
- **FR-004**: System MUST display a match/no-match result with visual indication (green for match, red for no-match)
- **FR-005**: System MUST show a detailed diff report when CSVs don't match, listing:
  - Rows added (in editor but not in reference)
  - Rows removed (in reference but not in editor)
  - Rows modified (same row index but different values)
  - For each modification, the column and before/after values
- **FR-006**: System MUST use strict comparison (exact value match, including whitespace)
- **FR-007**: System MUST handle CSVs with different row counts (show as diff, not error)
- **FR-008**: System MUST treat CSVs with different column counts as non-matching (not an error, but a type of difference)
- **FR-009**: System MUST reject CSVs with duplicate column header names and display a clear error message to the user
- **FR-010**: Users MUST be able to close the comparison result and return to normal editing

### Key Entities

- **Reference CSV**: The comparison baseline provided by user (source of truth)
- **Editor CSV**: The current CSV data in the editor (being validated)
- **Diff Report**: Structured output showing differences (added rows, removed rows, modified cells with row/column indices and values)
- **Comparison Result**: High-level outcome (Match or No Match) with visual indicator

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load a reference CSV and trigger comparison in under 5 seconds
- **SC-002**: Match/No-Match result is displayed within 1 second for CSV files up to 1MB
- **SC-003**: Detailed diff report clearly shows at least 90% of differences users would manually identify
- **SC-004**: Users can understand the diff without external documentation (visual clarity, intuitive layout)
- **SC-005**: Feature is fully testable by opening any two CSVs and comparing them

## Assumptions

- Reference CSV is provided by copy-paste of CSV text (P1 MVP); other input methods (file, URL) are P3
- Comparison is strict: cells must match exactly, including whitespace
- **Header detection**: The first row of every CSV is always treated as a header row containing column names
- **Column matching**: Columns are matched by header name (from row 1) rather than by position. This allows users to compare CSVs with columns in different orders. Header matching is case-sensitive (e.g., "Name" ≠ "name"). Data rows are compared starting from row 2.
- Row order matters: data rows are compared by index (first data row in editor vs. first data row in reference, etc.)
- CSV parsing uses the existing CSV parser in the application (e.g., handles quoted fields, escaped commas)
- Diff report displays in a modal or drawer below the main comparison button result
- No data is persisted from comparison (results are shown, not saved)
- Feature is scoped to browser-based comparison (no server-side processing)

## Clarifications

### Session 2026-05-23

- Q: How should the system handle CSVs with different column orders? → A: Match columns by header name if headers exist in both CSVs; otherwise fall back to index-based matching. This allows users to compare CSVs with reordered columns as long as they have matching headers.
- Q: How should the system detect whether a CSV has headers? → A: Always assume the first row is a header row. This is the simplest approach and aligns with common CSV conventions where column names appear in the first row.
- Q: How should the system handle CSVs with duplicate column names in headers? → A: Treat as an error and reject the CSV. Display a user-friendly error message indicating that duplicate column headers are not supported. This ensures unambiguous comparison and encourages users to fix CSV data quality issues.
- Q: Should header name matching be case-sensitive or case-insensitive? → A: Case-sensitive. Header names must match exactly, including capitalization (e.g., "Name" ≠ "name"). This encourages proper data governance and prevents accidental mismatches.
- Q: How should the system handle CSVs where header presence differs between editor and reference? → A: Compare anyway. Always treat the first row of both CSVs as headers, regardless of whether they appear to be actual column names or data. This allows flexible comparison of various CSV formats, though users may see unexpected results if structures differ significantly.
