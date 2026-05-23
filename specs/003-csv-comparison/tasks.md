# Tasks: CSV Comparison

**Input**: Design documents from `/specs/003-csv-comparison/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Manual browser testing (no automated test suite per CLAUDE.md)

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Prepare CSV comparison feature structure and integrate into existing CSV mode

- [x] T001 Create `/js/csv-comparison.js` with module skeleton (empty functions for parseCSV, compareCSVs, showComparisonModal, formatDiffReport)
- [x] T002 [P] Load csv-comparison.js in `csv.html` after csv-app.js script tag
- [x] T003 Add comparison modal HTML structure to `/js/csv-comparison.js` (createModal function with textarea, buttons, result div)
- [x] T004 [P] Add CSS styling for comparison modal to `/css/style.css` (modal overlay, modal-content, badge, diff-report classes)

---

## Phase 2: Foundational (Core Comparison Engine)

**Purpose**: Implement CSV parsing and comparison logic that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement `parseCSV(csvText)` function in `/js/csv-comparison.js` to parse CSV text into 2D array (reuse logic from csv-editor.js if available, handle quoted fields and commas)
- [x] T006 Implement `compareCSVs(editorCSV, referenceCSV)` function in `/js/csv-comparison.js` to return DiffResult object with match status and differences
- [x] T007 Implement comparison algorithm in `/js/csv-comparison.js` for row-by-row, column-by-column strict comparison (per data-model.md)
- [x] T008 Implement DiffResult data structure in `/js/csv-comparison.js` with matchStatus, addedRows, removedRows, modifiedRows, rowCountDiff, columnCountDiff, timestamp, comparisonTime
- [x] T009 Add validation in `/js/csv-comparison.js` for CSV data (check for empty, column count matching, row parsing errors)
- [x] T010 Integrate csv-comparison.js with existing CSV mode by exporting `CSVComparison` object with public API (parseCSV, compareCSVs, showComparisonModal, formatDiffReport, closeComparisonModal)

**Checkpoint**: Comparison engine ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - Quick CSV Validation Against Reference (Priority: P1) 🎯 MVP

**Goal**: Users can paste a reference CSV, click Compare, and see an immediate Match/No-Match result with visual indication

**Independent Test**: 
1. Click "Compare CSV" button in CSV mode
2. Paste a reference CSV in modal
3. Click "Compare"
4. See green "Match" badge for identical CSVs OR red "No Match" badge for different CSVs
5. Close modal and return to editing

### Implementation for User Story 1

- [x] T011 [US1] Implement `showComparisonModal(element)` function in `/js/csv-comparison.js` to create and display comparison modal with textarea for reference input and Compare button
- [x] T012 [P] [US1] Implement result display function in `/js/csv-comparison.js` to render match/no-match badge with colors (green for match, red for no-match)
- [x] T013 [US1] Implement modal close functionality in `/js/csv-comparison.js` (closeComparisonModal function and close button handler)
- [x] T014 [US1] Wire up Compare button click handler in `/js/csv-comparison.js` to:
  - Get current editor CSV from csv-preview.js or csv-editor.js
  - Parse reference CSV via parseCSV()
  - Call compareCSVs()
  - Display result via result display function
- [x] T015 [US1] Add "Compare CSV" button to CSV mode toolbar in `/js/csv-app.js` with click event listener calling `CSVComparison.showComparisonModal(document.body)`
- [x] T016 [US1] Update `/css/style.css` with modal styling: overlay opacity, modal-content background and positioning, badge colors and styling, textarea styling (font-family monospace for CSV), button styling
- [x] T017 [US1] Test US1 in browser:
  - Open csv.html with sample CSV data (e.g., name,age\\nAlice,30\\nBob,25)
  - Click "Compare CSV" button
  - Paste identical CSV in modal → Click Compare → Verify green "Match" badge
  - Click "Compare CSV" again
  - Paste different CSV (e.g., change Alice to Amy) → Click Compare → Verify red "No Match" badge
  - Verify modal closes on close button
  - Verify can return to editing normally

**Checkpoint**: User Story 1 complete - Match/No-Match validation fully functional and independently testable ✅

---

## Phase 4: User Story 2 - View Detailed Differences Report (Priority: P2)

**Goal**: When CSVs don't match, show detailed diff report listing added rows, removed rows, modified rows with column-level changes

**Independent Test**:
1. Paste two non-matching CSVs and trigger comparison
2. See red "No Match" badge
3. See detailed diff report below badge showing:
   - Rows only in reference (removed)
   - Rows only in editor (added)
   - Rows that differ (modified) with column-by-column changes showing old/new values

### Implementation for User Story 2

- [x] T018 [US2] Implement `formatDiffReport(diffResult)` function in `/js/csv-comparison.js` to generate HTML showing:
  - Removed rows section (reference rows not in editor) with row data and row index
  - Added rows section (editor rows not in reference) with row data and row index
  - Modified rows section with row index and column-level changes showing column index, old value, new value
  - Column count difference warning if columnCountDiff.isDifferent is true
  - Row count difference summary if rowCountDiff.isDifferent is true
- [x] T019 [P] [US2] Add CSS styling for diff report to `/css/style.css`:
  - .diff-section for section grouping (margin, padding)
  - .added-row with green background tint
  - .removed-row with red background tint
  - .modified-row with orange background tint
  - .change for individual cell changes (display, margin)
  - .old-value styling (strikethrough, red color)
  - .new-value styling (bold, green color)
- [x] T020 [US2] Update `showComparisonModal()` in `/js/csv-comparison.js` to display diff report in modal when compareCSVs() returns no-match result (set innerHTML of #diff-report div with formatDiffReport output)
- [x] T021 [US2] Test US2 in browser:
  - Open csv.html with editor CSV: name,age\\nAlice,30
  - Click Compare, paste reference CSV: name,age\\nAlice,30\\nBob,25
  - Verify red "No Match" badge
  - Verify diff report shows Bob,25 in "Removed rows" section (was in reference but not in editor)
  - Test with added rows: editor has Alice,30\\nBob,25 but reference only has Alice,30 → Verify Bob,25 in "Added rows" section
  - Test with modified rows: editor has Alice,30 but reference has Alice,25 → Verify modified row with column 1 change shown: old=25, new=30
  - Test with different column counts: editor has name,age,city but reference has name,age → Verify column count warning displayed
  - Verify colors and layout match design (added=green, removed=red, modified=orange)

**Checkpoint**: User Stories 1 AND 2 complete - Detailed diff report fully functional and independently testable ✅

---

## Phase 5: User Story 3 - Multiple Reference Sources (Priority: P3)

**Goal**: Users can load reference CSV via paste, file upload, or URL in addition to paste-only from US1

**Independent Test**:
1. Open comparison modal and see tabs/buttons for "Paste", "Upload File", "Load from URL"
2. Upload a CSV file from disk → Comparison works
3. Paste a URL to a CSV → Comparison works
4. All three input methods produce same comparison results as paste method

### Implementation for User Story 3

- [x] T022 [US3] Update modal HTML in `showComparisonModal()` in `/js/csv-comparison.js` to add input method selection:
  - Radio buttons or tabs for "Paste Text", "Upload File", "Load from URL"
  - Textarea for paste mode (existing from US1)
  - File input `<input type="file" accept=".csv">` for file mode
  - Text input for URL mode
  - Show/hide appropriate input based on selected method
- [x] T023 [P] [US3] Implement file upload handler in `/js/csv-comparison.js`:
  - FileReader API to read uploaded file
  - Parse file content via parseCSV()
  - Call compareCSVs() and display result (reuse US1/US2 result display)
- [x] T024 [P] [US3] Implement URL loader in `/js/csv-comparison.js`:
  - fetch() to load CSV from provided URL (handle CORS if needed, show error if fails)
  - Parse response text via parseCSV()
  - Call compareCSVs() and display result
- [x] T025 [US3] Update modal CSS in `/css/style.css` for input method UI:
  - Tab styling (active/inactive) or radio button styling
  - File input styling to match paste textarea
  - URL input styling to match paste textarea
  - Hidden class for inactive input methods
- [x] T026 [US3] Add error handling in `/js/csv-comparison.js` for:
  - File read errors (show user-friendly message in modal)
  - URL fetch errors (show user-friendly message, catch CORS issues)
  - Invalid CSV format (show parse error message)
  - Display error in modal below input area
- [x] T027 [US3] Test US3 in browser:
  - Test "Paste" method: Paste CSV text → Compare → Verify result (retest from US1/US2)
  - Test "Upload File" method:
    - Create test CSV file (e.g., test.csv with name,age\\nAlice,30\\nBob,25)
    - In modal select "Upload File"
    - Upload test.csv → See file loaded in input
    - Click Compare → Verify comparison result matches paste method with same data
  - Test "Load from URL" method:
    - Use a public CSV URL (or create test scenario with local CSV file served via python -m http.server)
    - In modal select "Load from URL"
    - Paste URL → Click Compare → Verify comparison result
  - Test error cases:
    - Try to upload non-CSV file → Verify error message shown
    - Try to load from invalid URL → Verify error message shown
    - Try to paste invalid CSV → Verify parse error shown
  - Verify all three methods produce same comparison results with identical data

**Checkpoint**: All user stories 1, 2, and 3 complete - Full feature functional with all input methods ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and browser testing

- [x] T028 [P] Browser compatibility testing:
  - Test in Chrome, Firefox, Safari, Edge
  - Verify modal displays correctly in all browsers
  - Verify CSV parsing handles edge cases (quoted fields, escaped quotes, newlines in cells)
  - Verify colors display correctly (badge colors, diff colors)
- [x] T029 [P] Performance testing (from SC-002):
  - Create test CSV with ~1000 rows × 50 columns (~1MB equivalent)
  - Measure comparison time → Verify <1 second result display
  - Verify no browser UI freezing during comparison
  - Test with very large CSV (>5MB) → Note performance limitations in docs if needed
- [x] T030 Edge case testing:
  - Empty editor CSV vs non-empty reference CSV → Verify all reference rows shown as removed
  - Non-empty editor CSV vs empty reference CSV → Verify all editor rows shown as added
  - CSV with whitespace differences (e.g., "Alice " vs "Alice") → Verify treated as difference (strict comparison)
  - CSV with different column headers → Verify treated as different columns
  - CSV with Unicode characters → Verify comparison works correctly
- [x] T031 Accessibility improvements (optional):
  - Add aria-labels to modal buttons and inputs
  - Ensure keyboard navigation works (Tab to navigate, Enter to submit)
  - Ensure color contrast meets WCAG standards (badge colors readable)
- [x] T032 Code cleanup in `/js/csv-comparison.js`:
  - Remove console.log debug statements
  - Ensure consistent naming (camelCase for functions, UPPER_CASE for constants)
  - Add clear function comments explaining parameters and return values
  - Verify no unused variables or functions
- [x] T033 Update documentation:
  - Update CLAUDE.md to reference csv-comparison.js module in CSV Mode Modules section
  - Verify quickstart.md matches actual implementation
  - Update any relevant README or user-facing docs about CSV comparison feature
- [x] T034 Final manual QA test (comprehensive user workflow):
  - Open csv.html with initial CSV data
  - Go through complete user workflow for all three stories:
    - US1: Quick validation (paste + compare)
    - US2: View details (compare and inspect diff report)
    - US3: Try all input methods (paste, upload, URL)
  - Verify no errors in browser console (F12 Developer Tools)
  - Verify feature works correctly with actual CSV data from real-world use case
  - Test that normal CSV editing still works (edit textarea, use preview table, save to localStorage)
  - Verify Compare button is always accessible in CSV toolbar

**Final Checkpoint**: Feature complete and ready for user testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - CRITICAL GATE - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - MVP can stop here
- **Phase 4 (US2)**: Depends on Phase 2 (not US1) - Can run in parallel with US1
- **Phase 5 (US3)**: Depends on Phase 2 (not US1/US2) - Can run in parallel with US1 and US2
- **Phase 6 (Polish)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start immediately after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start immediately after Phase 2 - Independent of US1 but extends same modal
- **User Story 3 (P3)**: Can start immediately after Phase 2 - Independent of US1/US2 but extends same modal

### Within Phases

**Phase 1**:
- T001 → T002, T003, T004 (T002-T004 can run in parallel after T001 is done)

**Phase 2**:
- T005 → T006, T007 (T006-T007 depend on T005)
- T008 → rest (T008 independent, but T009 validates using it)
- Linear due to interdependencies between parsing and comparison

**Phase 3 (US1)**:
- T011 → T012, T013 (modal first, then display)
- T014 → T015 (handler before wiring)
- T016 (CSS independent)
- T017 (testing last)

**Phase 4 (US2)**:
- T018 → T019 (formatting first, then styling)
- T020 → T021 (implementation before testing)

**Phase 5 (US3)**:
- T022 → T023, T024 (modal update first, then handlers)
- T025 (CSS independent)
- T026 (error handling)
- T027 (testing last)

**Phase 6**:
- T028, T029, T030, T031 can run in parallel
- T032, T033 sequential (cleanup then docs)
- T034 final validation

### Parallel Opportunities

**Across Phases**:
- Phase 1 tasks T002-T004 can run in parallel (all file modifications)
- Phase 3, 4, 5 can start after Phase 2 in parallel if team capacity allows:
  - Developer A: Phase 3 (US1 - Quick validation)
  - Developer B: Phase 4 (US2 - Detailed diff)
  - Developer C: Phase 5 (US3 - Multiple input methods)

**Within Phase 3**:
- T012, T013, T016 can run in parallel (independent file changes)

**Within Phase 4**:
- T023, T024 can run in parallel after T022 (file upload and URL handlers)

**Within Phase 5**:
- T023, T024 same files as Phase 4 - must serialize

**Within Phase 6**:
- T028, T029, T030, T031 can run in parallel (different testing aspects)

---

## Parallel Example: User Story 1

```
After Phase 2 completion:
  Task T011: Create showComparisonModal() in /js/csv-comparison.js
  Task T016: Update /css/style.css with modal styling

  Execute in parallel:
    Task T012: Implement result display function
    Task T013: Implement modal close functionality

  Execute sequentially:
    Task T014: Wire up Compare button handler (after T012 complete)
    Task T015: Add Compare button to csv-app.js toolbar (after T011 complete)

  Execute last:
    Task T017: Manual testing in browser
```

---

## Parallel Example: All User Stories

```
Phase 2 complete, now start all user stories in parallel:

Team A (US1):        Team B (US2):           Team C (US3):
T011 (modal)         T018 (formatDiffReport) T022 (multi input)
T012 (result)        T019 (CSS)              T023 (file handler)
T013 (close)         T020 (modal update)     T024 (URL handler)
T014 (handler)       T021 (testing)          T025 (CSS)
T015 (button)                                T026 (errors)
T016 (CSS)                                   T027 (testing)
T017 (testing)

Teams converge → Phase 6 (Polish)
```

---

## Implementation Strategy

### MVP First: User Story 1 Only (Recommended)

Estimated effort: **3-4 hours**

1. ✅ Complete Phase 1: Setup (30 min)
   - Create csv-comparison.js skeleton
   - Load in html
   - Add CSS framework
2. ✅ Complete Phase 2: Foundational (90 min)
   - Implement parseCSV, compareCSVs, DiffResult
   - Setup core comparison engine
3. ✅ Complete Phase 3: User Story 1 (60 min)
   - Implement showComparisonModal, result display
   - Wire up Compare button
   - Test Match/No-Match validation
4. **STOP AND VALIDATE**: Test User Story 1 independently
   - Paste CSV, compare, see result ✓
   - Ready to deploy as MVP

**At this point, users get core value**: Quick CSV validation without manual inspection

### Incremental Delivery

1. **MVP (Phase 1-3)**: Deploy with US1 (Match/No-Match only)
2. **Enhancement 1 (Phase 4)**: Add US2 (Detailed diff report)
   - Users now see WHY CSVs don't match
3. **Enhancement 2 (Phase 5)**: Add US3 (File upload, URL loading)
   - Users get more flexible workflows
4. **Refinement (Phase 6)**: Polish, optimization, accessibility

### Parallel Team Strategy (3+ developers)

With multiple developers:

1. Team completes Phase 1 + Phase 2 together (2 hours)
2. Once Phase 2 done:
   - **Developer A**: Phase 3 (US1 - 60 min) → Can deploy
   - **Developer B**: Phase 4 (US2 - 90 min) → Extends Phase 3
   - **Developer C**: Phase 5 (US3 - 90 min) → Extends Phases 3+4
3. All merge into main after each phase with independent testing
4. Phase 6 (Polish): Team together or assign to one developer

---

## Task Completion Checklist

Use this to track progress:

### Phase 1: Setup
- [ ] All tasks T001-T004 complete
- [ ] csv-comparison.js loads in csv.html
- [ ] Modal HTML and CSS ready

### Phase 2: Foundational
- [ ] All tasks T005-T010 complete
- [ ] parseCSV() working with sample CSV
- [ ] compareCSVs() returning correct DiffResult
- [ ] CSVComparison module exported and accessible in browser console

### Phase 3: User Story 1
- [ ] All tasks T011-T017 complete
- [ ] Compare button visible in CSV toolbar
- [ ] Modal opens/closes correctly
- [ ] Match result shows green badge
- [ ] No-match result shows red badge
- [ ] Manual test cases all pass (from T017)

### Phase 4: User Story 2
- [ ] All tasks T018-T021 complete
- [ ] Diff report shows added rows correctly
- [ ] Diff report shows removed rows correctly
- [ ] Diff report shows modified cells with column details
- [ ] Colors and layout match design (T019)
- [ ] Manual test cases all pass (from T021)

### Phase 5: User Story 3
- [ ] All tasks T022-T027 complete
- [ ] File upload input appears in modal
- [ ] URL input appears in modal
- [ ] File upload handler reads CSV from disk
- [ ] URL handler fetches CSV from URL
- [ ] Errors display user-friendly messages
- [ ] All three input methods produce same results
- [ ] Manual test cases all pass (from T027)

### Phase 6: Polish
- [ ] All tasks T028-T034 complete
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Performance <1s for 1MB files verified
- [ ] Edge cases tested (empty CSV, whitespace, Unicode, etc.)
- [ ] Code cleanup done (no console.log, consistent naming)
- [ ] Documentation updated
- [ ] Final QA comprehensive test passed

---

## Notes

- [P] after task ID = can run in parallel (different files, no blocking dependencies)
- [US1], [US2], [US3] = task belongs to specific user story for traceability
- Each user story fully testable independently at its checkpoint
- Verify browser console has no errors during testing (F12 Developer Tools)
- Commit after each task or logical group of [P] tasks
- Can stop at Phase 1-3 checkpoint to validate US1 MVP independently before proceeding to US2/US3
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Testing is manual per CLAUDE.md (no automated test framework)
