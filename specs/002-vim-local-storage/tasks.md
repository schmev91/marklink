# Tasks: VIM Editing Mode & Local Storage Save

**Input**: Design documents from `/specs/002-vim-local-storage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated test harness exists in this repo. Verification follows the manual `quickstart.md` script — no test-task entries are generated.

**Organization**: Tasks are grouped by user story so each can be implemented and shipped independently. US1 (local-storage save/load + autosave) is the MVP; US2 (VIM mode) is additive.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files, no dependency on incomplete tasks — safe to run in parallel.
- **[Story]**: US1 = local storage; US2 = VIM mode.
- Paths are repository-relative to `/root/harbor/marklink/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the new module files and load the existing libraries; touch the three HTML entry points.

- [X] T001 [P] Create empty module `js/storage.js` with a top banner comment and an immediately-invoked function attaching `window.MarkLinkStorage = {}` for later expansion.
- [X] T002 [P] Create empty module `js/vim-mode.js` with an IIFE attaching `window.MarkLinkVim = {}`.
- [X] T003 [P] Create empty module `js/saves-ui.js` with an IIFE attaching `window.MarkLinkSavesUI = {}`.
- [X] T004 Wire new modules into `index.html`: add `<script src="js/storage.js"></script>`, `<script src="js/saves-ui.js"></script>`, `<script src="js/vim-mode.js"></script>` in that order, immediately before the existing `js/app.js` tag.
- [X] T005 Wire new modules into `json.html`: same three `<script>` additions, immediately before `js/json-app.js`.
- [X] T006 Wire new modules into `csv.html`: same three `<script>` additions, immediately before `js/csv-app.js`.

**Checkpoint**: All three pages load the new (still empty) modules without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared storage layer and the shared Saves UI shell. Both user stories depend on `storage.js`; US1 also depends on `saves-ui.js`.

- [X] T007 Implement `MarkLinkStorage.isAvailable()` in `js/storage.js` per `contracts/storage.md` — try/setItem/removeItem probe with try/catch, returns boolean, runs once and caches result.
- [X] T008 Implement key-builder helper `_key(mode, suffix)` in `js/storage.js` returning `"marklink." + mode + "." + suffix`; throws on invalid mode (`markdown|json|csv`).
- [X] T009 Implement `MarkLinkStorage.listSaves(mode)` and `MarkLinkStorage.upsertSave(mode, {id?, name, content})` in `js/storage.js` — JSON parse with try/catch fallback to `[]`, generate id when absent, overwrite on name collision (same mode), update `lastModified`, sort by `lastModified` desc on read, rethrow `QuotaExceededError`.
- [X] T010 Implement `MarkLinkStorage.deleteSave(mode, id)` and `MarkLinkStorage.renameSave(mode, id, newName)` in `js/storage.js`, reusing the helpers from T009.
- [X] T011 Implement `MarkLinkStorage.readAutosave(mode)`, `writeAutosave(mode, content)`, and `clearAutosave(mode)` in `js/storage.js` — empty content clears the slot (not an empty object); `writeAutosave` swallows `QuotaExceededError` with `console.warn`.
- [X] T012 Implement `MarkLinkStorage.readPreferences(mode)` and `writePreferences(mode, partial)` in `js/storage.js` — shallow-merge over defaults `{ vim: false, autosaveEnabled: true }`, parse failures return defaults.
- [X] T013 Add Saves panel markup template to `js/saves-ui.js`: build DOM nodes (overlay + dialog with a save-list table, "Save current as…" input, autosave checkbox, restore-banner toast container). Function: `MarkLinkSavesUI.mount({ mode, getContent, setContent, onAutosaveToggle })` returns `{ open(), close(), showQuotaError(message), showRestoredToast(timestamp), refresh() }`.
- [X] T014 Add Saves panel styles to `css/style.css` (overlay, dialog, save-row layout, danger button for delete, autosave checkbox, restore-toast). Use existing CSS variables so dark/light theming works automatically (FR-015).
- [X] T015 Implement `saves-ui.js` actions: rename, load (calls `setContent`), delete, save-current-as (calls `getContent` and `MarkLinkStorage.upsertSave`; if `upsertSave` throws `QuotaExceededError`, call `showQuotaError`); confirm-prompt on name collision and on load-while-dirty (passed in via `onLoadDirty` callback).

**Checkpoint**: Storage API and Saves panel exist and can be exercised from devtools, but no editor wires them up yet.

---

## Phase 3: User Story 1 — Save and Restore via Local Storage (Priority: P1) MVP

**Goal**: All three editor modes (Markdown, JSON, CSV) can save named entries to localStorage, list/rename/delete them, autosave the current document, and silently restore the autosave on next load when no share-URL content is present.

**Independent Test**: For each of `index.html`, `json.html`, `csv.html` — open, type, save as "x", reload, open Saves, load "x", verify content matches. Then close tab mid-edit, reopen, verify autosave restores. Run `quickstart.md` sections A and B.

### Markdown mode (`index.html`)

- [X] T016 [US1] Add "Saves" toolbar button to `index.html` markup (next to existing toolbar actions); no behavior yet.
- [X] T017 [US1] In `js/app.js`, after existing initialization, call `MarkLinkSavesUI.mount({ mode: "markdown", getContent: () => editorTextarea.value, setContent: (s) => { editorTextarea.value = s; triggerPreviewRender(); }, onAutosaveToggle: (on) => MarkLinkStorage.writePreferences("markdown", { autosaveEnabled: on }) })`. Bind the toolbar Saves button to `open()`.
- [X] T018 [US1] In `js/editor.js` (or `js/app.js` if cleaner), add debounced autosave: on every textarea `input`, schedule a 1500 ms debounce that calls `MarkLinkStorage.writeAutosave("markdown", textarea.value)`. Add a hard-flush interval at 15 s of continuous typing and a `window.addEventListener("beforeunload", flush)`. Gate the entire mechanism behind `MarkLinkStorage.readPreferences("markdown").autosaveEnabled`.
- [X] T019 [US1] In `js/app.js`, restore-on-load: after share-URL parsing (existing `share.js` logic) completes — if no URL content was applied AND `MarkLinkStorage.readAutosave("markdown")` returns a non-empty record, set textarea value, trigger preview render, and call `MarkLinkSavesUI.showRestoredToast(record.lastModified)`. If URL content was applied, leave autosave untouched until the next edit (do NOT call `clearAutosave`).
- [X] T020 [US1] Surface storage-unavailable state in `js/app.js`: if `MarkLinkStorage.isAvailable()` is false, disable the Saves button and show a one-time banner "Local storage unavailable — saves disabled in this browser session".

### JSON mode (`json.html`)

- [X] T021 [P] [US1] Add "Saves" toolbar button to `json.html` markup.
- [X] T022 [P] [US1] In `js/json-app.js`, mount `MarkLinkSavesUI` with `mode: "json"` and the JSON-specific `getContent`/`setContent` (calling `triggerJsonPreviewRender` after set).
- [X] T023 [P] [US1] In `js/json-editor.js`, add the same debounced autosave + hard-flush + beforeunload flow for `mode: "json"`, gated on `readPreferences("json").autosaveEnabled`.
- [X] T024 [P] [US1] In `js/json-app.js`, restore-on-load mirroring T019 for the JSON mode.
- [X] T025 [P] [US1] In `js/json-app.js`, storage-unavailable handling mirroring T020.

### CSV mode (`csv.html`)

- [X] T026 [P] [US1] Add "Saves" toolbar button to `csv.html` markup.
- [X] T027 [P] [US1] In `js/csv-app.js`, mount `MarkLinkSavesUI` with `mode: "csv"` and CSV `getContent`/`setContent` (calling the CSV preview-render trigger after set).
- [X] T028 [P] [US1] In `js/csv-editor.js`, add the debounced autosave + hard-flush + beforeunload flow for `mode: "csv"`.
- [X] T029 [P] [US1] In `js/csv-app.js`, restore-on-load mirroring T019.
- [X] T030 [P] [US1] In `js/csv-app.js`, storage-unavailable handling mirroring T020.

### Cross-cutting US1

- [X] T031 [US1] Wire load-while-dirty confirmation: in `saves-ui.js` `load()`, before calling `setContent`, if `getContent()` differs from the last-loaded snapshot, prompt the user (`window.confirm`); on cancel, abort the load.
- [X] T032 [US1] Walk through `quickstart.md` sections A and B in a real browser; fix any failures discovered.

**Checkpoint**: US1 ships independently. The repo is shippable as MVP after T032.

---

## Phase 4: User Story 2 — VIM Keybindings (Priority: P2)

**Goal**: Each editor mode offers an opt-in VIM toggle. Toggling on lazy-loads CodeMirror 5 + vim keymap, wraps the textarea, displays a mode indicator, and exposes the full FR-011 keybinding surface. The preference persists per mode. Off by default for new users (FR-013).

**Independent Test**: Run `quickstart.md` section C. VIM toggle works in each mode; core motions/edits/search behave; preference survives reload; focus is scoped to the editor.

### Shared VIM module

- [X] T033 [US2] Implement `MarkLinkVim.attach({ textareaEl, mode, onModeChange, onContentChange })` in `js/vim-mode.js` per `contracts/vim-mode.md` — return a handle with `enable`, `disable`, `getValue`, `setValue`, `focus`.
- [X] T034 [US2] Implement lazy CDN loader in `js/vim-mode.js`: on first `enable()` call, inject CodeMirror 5.65.16 core CSS+JS and `keymap/vim.min.js` from cdnjs; cache the load promise; resolve on `load` events; reject on `error`. Map `mode` → CodeMirror syntax mode (`markdown` addon, `javascript` for JSON, plain for CSV) and inject the corresponding mode addon script.
- [X] T035 [US2] In `enable()`: call `CodeMirror.fromTextArea(textareaEl, { keyMap: "vim", mode: <mapped>, lineNumbers: true, theme: <theme matching current page> })`; install `cm.on("vim-mode-change", ev => onModeChange(ev.mode))`; install `cm.on("change", () => onContentChange(cm.getValue()))`.
- [X] T036 [US2] In `disable()`: call `cm.toTextArea()` to restore the original `<textarea>`; clear stored CodeMirror reference. Note that callers must re-bind their own textarea listeners afterwards.
- [X] T037 [US2] Implement `getValue()`/`setValue()`/`focus()` to delegate to CodeMirror when enabled and to the textarea otherwise.

### Markdown mode wiring (`index.html` / `js/app.js` / `js/editor.js`)

- [X] T038 [US2] Add "VIM" toggle button and a hidden mode-indicator chip (`<span class="vim-mode-indicator">`) to `index.html` toolbar.
- [X] T039 [US2] Add CSS rules for the VIM toggle's active state and `.vim-mode-indicator` (text colors per mode label) in `css/style.css`. Ensure CodeMirror surface inherits the dark/light theme via the same CSS variables.
- [X] T040 [US2] In `js/app.js`, create the VIM handle on init: `const vim = MarkLinkVim.attach({ textareaEl, mode: "markdown", onModeChange: setIndicator, onContentChange: (s) => { scheduleAutosave(); triggerPreviewRender(); } })`. Read `MarkLinkStorage.readPreferences("markdown").vim`; if true, call `vim.enable()` and show the chip.
- [X] T041 [US2] In `js/app.js`, bind the VIM toggle button: on click, flip preference via `MarkLinkStorage.writePreferences("markdown", { vim: !current })`, then call `vim.enable()`/`vim.disable()` and show/hide the chip. On `enable()` rejection, revert the preference and show an error banner.
- [X] T042 [US2] In `js/editor.js` (and the autosave wiring from T018), replace direct `textarea.value` reads with `vim.getValue()` and direct `textarea.value =` writes with `vim.setValue(...)` so save/load/share/preview all work whether VIM is on or off.

### JSON mode wiring

- [X] T043 [P] [US2] Add VIM toggle and indicator chip to `json.html` toolbar.
- [X] T044 [P] [US2] In `js/json-app.js`, mirror T040 with `mode: "json"` and the JSON preview-render trigger.
- [X] T045 [P] [US2] In `js/json-app.js`, mirror T041 (toggle binding).
- [X] T046 [P] [US2] In `js/json-editor.js`, replace textarea reads/writes with `vim.getValue()`/`vim.setValue()` per T042.

### CSV mode wiring

- [X] T047 [P] [US2] Add VIM toggle and indicator chip to `csv.html` toolbar.
- [X] T048 [P] [US2] In `js/csv-app.js`, mirror T040 with `mode: "csv"`.
- [X] T049 [P] [US2] In `js/csv-app.js`, mirror T041 (toggle binding).
- [X] T050 [P] [US2] In `js/csv-editor.js`, replace textarea reads/writes with `vim.getValue()`/`vim.setValue()` per T042.

### Cross-cutting US2

- [X] T051 [US2] Walk through `quickstart.md` section C in a real browser across all three modes; specifically verify FR-012 focus scoping by clicking the preview pane and confirming vim commands don't fire.

**Checkpoint**: US2 ships on top of US1. Both stories are fully functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T052 [P] Run `quickstart.md` section D (theme integration with both panels open; keyboard-only operation through toolbar) and fix any regressions.
- [X] T053 [P] Measure typing latency in `index.html` with VIM off vs. main branch (devtools Performance recording, 30s of continuous typing) and confirm SC-006 (≤100 ms additional input latency). If exceeded, investigate the autosave debounce or lazy-load preload behavior.
- [X] T054 Update `CLAUDE.md` "Project Architecture" section to list the three new modules (`storage.js`, `vim-mode.js`, `saves-ui.js`) and note CodeMirror 5 as a lazy-loaded CDN dependency.
- [X] T055 Sanity-check storage key cleanup: from devtools, manually corrupt a value (`localStorage.setItem("marklink.markdown.saves", "{not json")`), reload, confirm UI shows empty list and does not throw.

---

## Dependencies

```text
Phase 1 (T001–T006)
        │
        ▼
Phase 2 (T007–T015)   ← Foundational — must complete before US1 or US2
        │
        ├──────────────► Phase 3 US1 (T016–T032)   ← MVP
        │                       │
        │                       ▼
        └──────────────► Phase 4 US2 (T033–T051)   ← additive
                                │
                                ▼
                        Phase 5 Polish (T052–T055)
```

- T007–T012 are sequential within `js/storage.js` (single file).
- T013–T015 are sequential within `js/saves-ui.js` and `css/style.css`.
- US1 Markdown wiring (T016–T020) is sequential because the same `js/app.js` is repeatedly edited.
- US1 JSON wiring (T021–T025) and US1 CSV wiring (T026–T030) are independent of each other and of the Markdown set after the Markdown set is done — marked [P].
- US2 shared module (T033–T037) is sequential (one file: `js/vim-mode.js`).
- US2 JSON wiring (T043–T046) and CSV wiring (T047–T050) are independent of Markdown US2 wiring and of each other — marked [P].
- T032 and T051 are walkthrough/QA passes — they gate their respective checkpoints.

## Parallel Execution Examples

After T020 lands (Markdown US1 complete), the JSON and CSV US1 tracks can run side-by-side:

```
agent A: T021 → T022 → T023 → T024 → T025
agent B: T026 → T027 → T028 → T029 → T030
```

After T042 lands (Markdown US2 complete), the JSON and CSV US2 tracks can run side-by-side:

```
agent A: T043 → T044 → T045 → T046
agent B: T047 → T048 → T049 → T050
```

The setup-file creates in Phase 1 (T001–T003) are pure [P] — three different new files.

## Implementation Strategy

- **MVP cut**: Ship Phase 1 + Phase 2 + Phase 3 (T001–T032). That delivers User Story 1 — local-storage save/load + autosave — across all three modes without introducing CodeMirror or any new runtime dependency. Total: 32 tasks.
- **Full delivery**: Add Phase 4 (T033–T051) for the VIM keybindings; Phase 5 polishes both. Total: 55 tasks.
- **Per-story shippability**: US1 stands alone (no dependency on VIM). US2 depends only on Phase 2's storage layer to persist its preference, so it could theoretically ship before US1 — but doing so leaves SC-003 (≤30s data loss) unmet, so the MVP order above is preferred.
