# Data Model: CSV Comparison

**Date**: 2026-05-23  
**Feature**: CSV Comparison module  
**Scope**: Data structures for CSV comparison, diff representation, and UI state

## Core Entities

### 1. CSV Data (both Reference and Editor)

**Purpose**: Parsed CSV representation for comparison

```typescript
interface CSVData {
  rows: Array<Array<string>>;      // 2D array of cell values
  headers?: Array<string>;         // Column headers if present (optional)
  rowCount: number;                // Number of data rows
  columnCount: number;             // Number of columns
  isEmpty: boolean;                // True if no data rows
}
```

**Validation Rules**:
- `rows` must not be null or undefined
- Each row must be an array of strings
- All rows must have same column count (enforced during parsing)
- Empty CSVs allowed (rowCount = 0, isEmpty = true)

**Source**:
- Editor CSV: Extracted from `csv-preview.js` or `csv-editor.js` using existing parser
- Reference CSV: Parsed from user input via `CSVComparison.parseCSV()`

---

### 2. Diff Result

**Purpose**: Structured comparison output showing what doesn't match

```typescript
interface DiffResult {
  matchStatus: 'match' | 'no-match';
  
  // Row-level differences
  addedRows: Array<{
    editorRowIndex: number;
    values: Array<string>;
  }>;
  
  removedRows: Array<{
    referenceRowIndex: number;
    values: Array<string>;
  }>;
  
  modifiedRows: Array<{
    rowIndex: number;
    changes: Array<{
      columnIndex: number;
      columnName?: string;    // Optional: header name if available
      oldValue: string;       // From reference
      newValue: string;       // From editor
    }>;
  }>;
  
  // Structural differences
  rowCountDiff: {
    editorCount: number;
    referenceCount: number;
    isDifferent: boolean;
  };
  
  columnCountDiff: {
    editorCount: number;
    referenceCount: number;
    isDifferent: boolean;
  };
  
  // Metadata
  timestamp: number;           // Epoch ms of comparison
  comparisonTime: number;      // Duration in ms
}
```

**Validation Rules**:
- If `matchStatus === 'match'`, all diff arrays must be empty
- If column counts differ, `columnCountDiff.isDifferent = true`
- If row counts differ but comparison succeeds, report differences in `addedRows` / `removedRows`
- `changes` array within `modifiedRows` must not be empty
- Column names optional; include if headers are available in CSVs

**State Transitions**:
- Initial: `null` or `undefined`
- Comparing: `{ matchStatus: null }` (intermediate, not exposed to UI)
- Complete: Full `DiffResult` object with status and diff arrays

---

### 3. Comparison Input

**Purpose**: User-provided reference CSV text

```typescript
interface ComparisonInput {
  csvText: string;         // Raw CSV text pasted by user
  parseError?: string;     // If parsing fails, error message
  isValid: boolean;        // True if successfully parsed
  parsedData?: CSVData;    // Parsed result if valid
}
```

**Validation Rules**:
- `csvText` must not be empty
- Must be valid CSV format (handled by parser)
- If parse fails, set `parseError` with user-friendly message
- `isValid = true` only if `parsedData` is present

---

### 4. UI State

**Purpose**: Modal and comparison state for UI

```typescript
interface ComparisonUIState {
  isModalOpen: boolean;
  referenceInput: ComparisonInput;
  comparisonResult?: DiffResult;
  isComparing: boolean;      // True during comparison (for loading state)
  errorMessage?: string;     // Display if comparison fails
}
```

**Validation Rules**:
- Only one of `comparisonResult` or `errorMessage` should be set at a time
- `isComparing` must be `false` before `comparisonResult` is populated
- Modal close should reset `referenceInput` (clear paste field)

---

## Relationships & Constraints

### Comparison Flow

```
User Input (CSVText)
  ↓
parseCSV()
  ↓
ComparisonInput { csvText, parsedData }
  ↓
compareCSVs(editorCSV, referenceCSV)
  ↓
DiffResult { matchStatus, addedRows, removedRows, modifiedRows, ... }
  ↓
formatDiffReport(diffResult)
  ↓
HTML UI (match badge, diff table)
```

### Size Constraints

- **File Size**: Up to 1MB per spec success criteria
- **Row Count**: Typical 1K-10K rows
- **Column Count**: Typical 5-50 columns
- **Cell Size**: Typical 1-1000 characters per cell

---

## Implementation Notes

### CSV Parsing

- Reuse existing logic from `csv-editor.js` or extract to `csv-parser.js`
- Handle:
  - Quoted fields (values containing commas, newlines)
  - Escaped quotes (e.g., `"a ""quoted"" value"`)
  - Headers (first row, optional)
  - Trailing/leading whitespace (preserve as part of cell value for strict comparison)
  - Empty rows (include in comparison)
  - Blank lines (treat as empty row)

### Comparison Algorithm

```
function compareCSVs(editor, reference):
  result = new DiffResult()
  
  // Check row counts
  if editor.rowCount !== reference.rowCount:
    result.matchStatus = 'no-match'
  
  // Check column counts
  if editor.columnCount !== reference.columnCount:
    result.matchStatus = 'no-match'
  
  // Compare rows by index
  for i = 0 to max(editor.rowCount, reference.rowCount):
    if reference has row i and editor doesn't:
      result.removedRows.push(reference[i])
    else if editor has row i and reference doesn't:
      result.addedRows.push(editor[i])
    else if editor[i] !== reference[i]:
      changes = []
      for j = 0 to max columns:
        if editor[i][j] !== reference[i][j]:
          changes.push({ columnIndex: j, oldValue: reference[i][j], newValue: editor[i][j] })
      if changes not empty:
        result.modifiedRows.push({ rowIndex: i, changes })
  
  // Final status
  if no differences found:
    result.matchStatus = 'match'
  
  return result
```

- Time Complexity: O(rows × columns)
- Space Complexity: O(rows × columns) for diff result
- Acceptable for up to 1MB files (~10K rows × 50 columns)

---

## Testing Data Contracts

### Test Case: Matching CSVs

```
Editor:
  name,age
  Alice,30
  Bob,25

Reference:
  name,age
  Alice,30
  Bob,25

Expected Result:
  matchStatus: 'match'
  addedRows: []
  removedRows: []
  modifiedRows: []
```

### Test Case: Different Row Count

```
Editor:
  name,age
  Alice,30

Reference:
  name,age
  Alice,30
  Bob,25

Expected Result:
  matchStatus: 'no-match'
  addedRows: []
  removedRows: [{ referenceRowIndex: 1, values: ['Bob', '25'] }]
  modifiedRows: []
```

### Test Case: Modified Cell

```
Editor:
  name,age
  Alice,30

Reference:
  name,age
  Alice,25

Expected Result:
  matchStatus: 'no-match'
  addedRows: []
  removedRows: []
  modifiedRows: [{ rowIndex: 0, changes: [{ columnIndex: 1, oldValue: '25', newValue: '30' }] }]
```

### Test Case: Different Column Count

```
Editor:
  name,age,city
  Alice,30,NY

Reference:
  name,age
  Alice,30

Expected Result:
  matchStatus: 'no-match'
  columnCountDiff: { editorCount: 3, referenceCount: 2, isDifferent: true }
  [diff details for column mismatch]
```
