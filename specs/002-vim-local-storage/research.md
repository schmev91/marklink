# Phase 0 Research: VIM Mode & Local Storage

## R1 — VIM keybinding library

**Decision**: CodeMirror 5 + `keymap/vim.js` addon, loaded from cdnjs at runtime when VIM is first enabled.

**Rationale**:
- Pure script-tag load (no bundler, no ESM gymnastics) — matches the project's "no build step" constraint and the way marked/highlight/mermaid/lz-string are already loaded.
- `CodeMirror.fromTextArea(textareaEl, { keyMap: "vim" })` is a drop-in replacement that preserves the existing `<textarea>` value and integrates with the surrounding DOM and splitter without restructuring.
- The vim keymap covers the full FR-011 surface (motions `h j k l w b e 0 $ gg G`, edits `i a o O x dd yy p P u Ctrl-R`, search `/ ? n N`) out of the box, plus mode indicator hooks via `CodeMirror.Vim.handleEx` and `cm.on("vim-mode-change", …)`.
- CodeMirror 5 is in maintenance mode but stable; payload is ~250 KB gzipped including the vim keymap — acceptable for an opt-in power-user feature.

**Alternatives considered**:
- **CodeMirror 6 + @replit/codemirror-vim**: Modern but ESM-only; would force the project into a bundler or import-map, violating the no-build constraint.
- **Monaco + monaco-vim**: ~2 MB, heavy startup cost, overkill for a textarea replacement.
- **Hand-rolled vim layer over `<textarea>`**: A `<textarea>` cannot reliably express the cursor/visual state needed for normal/visual mode without effectively rebuilding CodeMirror — high risk and time cost.

**Operational notes**:
- Lazy-load: inject `<script>` tags only when `vim-mode.js` is asked to activate, then cache the promise so subsequent toggles are instant.
- When VIM is toggled off, call `cm.toTextArea()` to restore the original textarea and unbind keymap; the cached library stays in memory but consumes no event listeners.

## R2 — `localStorage` key scheme

**Decision**: Namespaced keys per editor mode, three keys per mode.

```
marklink.<mode>.saves        — JSON array of named save entries
marklink.<mode>.autosave     — JSON object: { content, lastModified }
marklink.<mode>.preferences  — JSON object: { vim: boolean, autosaveEnabled: boolean }
```

where `<mode>` ∈ `{ markdown, json, csv }`.

**Rationale**:
- Per-mode namespacing satisfies FR-005 (saves do not leak across modes) without inventing a discriminator field.
- Three keys (not one giant blob) means autosave writes — the most frequent operation — stay small and don't have to rewrite the entire saves array on every tick.
- The `marklink.` prefix avoids collisions with any future origin-mate or extension.

**Alternatives considered**:
- **One JSON blob per origin** (`marklink.v1` → `{ markdown: {...}, json: {...}, csv: {...} }`): single write point but every autosave rewrites everyone else's data, making quota errors and write-amplification worse.
- **IndexedDB**: Higher quota (~50 MB+) but async API and significant boilerplate; not justified for v1 where the spec's Assumptions explicitly target localStorage.

## R3 — Autosave cadence

**Decision**: Debounced write 1.5 s after the last keystroke, with a hard ceiling that forces a flush every 15 s during continuous typing. Also flush on `beforeunload`.

**Rationale**:
- SC-003 requires ≤30 s of data loss; the 15 s ceiling gives a 2× safety factor.
- 1.5 s debounce keeps quiet-period writes off the hot path and avoids hammering localStorage during bursty typing.
- `beforeunload` flush covers the common case of closing the tab between debounce ticks.

**Alternatives considered**:
- Fixed-interval write every N seconds: simpler, but writes during idle and skips the safety flush on close.
- Write-on-every-keystroke: synchronous localStorage writes per keystroke are a known input-latency hazard and would violate SC-006.

## R4 — Restore-on-load policy

**Decision**: On page load, after share-URL parsing completes, if no URL content was loaded and the autosave slot is non-empty, write the autosave content into the editor and re-render the preview. Show a small dismissible toast: "Restored last session (HH:MM)".

**Rationale**:
- Q2 clarification chose silent auto-restore, but a non-blocking toast keeps the action discoverable (avoids the "where did this come from?" support burden) without becoming a modal prompt.
- Sequencing matters: share-URL detection runs first because URL content is more recent intent than autosave (clarified in FR-008a). If a URL is present, autosave is left untouched until the user makes an edit.

**Alternatives considered**:
- No toast at all: matches "silent" most literally but is opaque; users may forget autosave exists.
- Modal prompt: explicitly rejected in Q2.

## R5 — Quota and error handling

**Decision**: Wrap every `localStorage.setItem` call. On `QuotaExceededError`, surface a non-blocking error banner with the offending action ("Save failed: storage full. Delete old entries or shorten content."). Never throw out of an autosave tick — log to `console.warn` and skip; the next tick may succeed once the user trims content.

**Rationale**:
- SC-001 / SC-002 promise reliable recovery only "within quota"; we must fail loudly for explicit saves and quietly for autosave.
- Detecting unavailable localStorage (private browsing in some Safari versions) is done once at boot with a try/setItem/removeItem probe; if it fails, the Save UI is disabled and a "Storage not available in this browser session" banner is shown (covers FR-006).

## R6 — Cross-cutting: where new UI controls land

**Decision**: Add two controls to the existing toolbar in each of `index.html`, `json.html`, `csv.html`:

1. A "Saves" button (opens a panel listing named saves with rename/load/delete actions, plus a "Save current as…" input and an "Autosave" on/off checkbox).
2. A "VIM" toggle button with a mode-indicator chip ("NORMAL" / "INSERT" / "VISUAL") that appears only when VIM is on.

Both controls follow the existing toolbar styling and theme variables defined in `css/style.css`, satisfying FR-015.

**Rationale**: Reusing the toolbar keeps the change shallow and respects the existing layout. The Saves panel is a single overlay/dialog shared by all three modes (`saves-ui.js`).
