# Implementation Plan: VIM Editing Mode & Local Storage Save

**Branch**: `master` (working directly; spec lives at `specs/002-vim-local-storage/`)
**Date**: 2026-05-22
**Spec**: [spec.md](./spec.md)

## Summary

Add two coordinated capabilities to all three editor modes (Markdown, JSON, CSV):

1. **Local-storage persistence** — named save/load entries plus a per-mode autosave slot that silently restores on next load when no share-URL content is present.
2. **VIM keybindings** — opt-in modal editing in the editor surface, off by default, persisted per-mode.

Technical approach: introduce one shared `storage.js` module that mediates all `localStorage` reads/writes (keyed namespace per mode) and one shared `vim-mode.js` module that lazily upgrades the current `<textarea>` to a CodeMirror 5 instance with the `vim` keymap when the user toggles VIM on. All other modules remain unchanged in their non-VIM, in-memory behavior; new toolbar controls and a "Saves" panel are added per mode.

## Technical Context

**Language/Version**: JavaScript (ES2017+), HTML5, CSS3 — no build step
**Primary Dependencies** (CDN, runtime): existing — marked.js, highlight.js, mermaid.js, lz-string.js. New — CodeMirror 5 core + `keymap/vim.js` addon for VIM mode.
**Storage**: Browser `localStorage` (single origin, ~5 MB quota)
**Testing**: Manual smoke tests via `python -m http.server 8000`; no automated harness exists. A `quickstart.md` test script covers the FR/SC matrix.
**Target Platform**: Evergreen desktop browsers (Chrome, Firefox, Safari, Edge — last 2 versions)
**Project Type**: Static single-page web app (no backend, no bundler)
**Performance Goals**: Typing latency in plain textarea remains within current baseline (SC-006: ≤100 ms additional latency when VIM is off). VIM toggle takes effect <1 s.
**Constraints**: No build pipeline, no package manager, CDN-only deps. CodeMirror is lazy-loaded only when the user first enables VIM mode in a session, to avoid penalising non-VIM users.
**Scale/Scope**: Single-user, single-document app. Saved-entry list bounded by browser quota (~5 MB across all entries per origin). No multi-tab sync requirement for v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is empty — no project-specific principles are defined. Gate passes vacuously. No violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-vim-local-storage/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (manual test script)
├── contracts/
│   ├── storage.md       # Storage module API contract
│   └── vim-mode.md      # VIM module API contract
└── checklists/
    └── requirements.md  # From /speckit-specify
```

### Source Code (repository root)

```text
index.html               # Markdown mode — add VIM toggle + Saves menu in toolbar; add CodeMirror <script> tag (lazy)
json.html                # JSON mode — same toolbar additions
csv.html                 # CSV mode — same toolbar additions

css/
└── style.css            # Add styles for: Saves dialog, VIM mode indicator, mode banner

js/
├── theme.js             # (unchanged)
├── splitter.js          # (unchanged)
├── storage.js           # NEW — shared localStorage API (namespaced keys, quota handling)
├── vim-mode.js          # NEW — shared VIM controller (lazy CodeMirror mount, keymap toggle)
├── saves-ui.js          # NEW — shared "Saves" panel/dialog (list, load, rename, delete)
│
├── editor.js            # Markdown editor — wire VIM toggle, autosave hook, restore-on-load
├── preview.js           # (unchanged)
├── share.js             # (unchanged) — share-URL detection used by restore-on-load logic
├── app.js               # Markdown glue — initialize storage + vim-mode + saves-ui
│
├── json-editor.js       # JSON — wire VIM toggle, autosave hook, restore-on-load
├── json-preview.js      # (unchanged)
├── json-share.js        # (unchanged)
├── json-app.js          # JSON glue — initialize storage + vim-mode + saves-ui
│
├── csv-editor.js        # CSV — wire VIM toggle, autosave hook, restore-on-load
├── csv-preview.js       # (unchanged)
├── csv-share.js         # (unchanged)
└── csv-app.js           # CSV glue — initialize storage + vim-mode + saves-ui
```

**Structure Decision**: Single static project layout (Option 1 from template), extended with three new shared modules (`storage.js`, `vim-mode.js`, `saves-ui.js`) reused across the Markdown, JSON, and CSV pages. No new HTML pages. CodeMirror is loaded via CDN `<script>` tag injected at runtime by `vim-mode.js` on first activation, so the existing fast path (textarea only) is preserved.

## Complexity Tracking

> No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
