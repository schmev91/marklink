# Quickstart: Manual Verification Script

Run a static server from the repo root, then walk these checks in a fresh browser profile (or after clearing site data for `localhost`).

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

Checks are grouped by feature area; each cites the requirement / success criterion it exercises.

## A. Local storage save & restore (User Story 1)

1. **Save a named entry — Markdown** (FR-001, FR-003, SC-001)
   - Open `index.html`. Type "hello from marklink".
   - Click **Saves** → enter name `note-1` → **Save current as**.
   - Reload the page. Open **Saves**, click `note-1` → **Load**. Verify content matches.
2. **Per-mode scoping** (FR-005, edge case "saved as JSON, loaded in CSV")
   - Save a JSON document on `json.html` named `note-1`.
   - Open `csv.html` → **Saves**. Verify the JSON `note-1` does NOT appear.
3. **Overwrite on name collision** (Scenario 3)
   - On `index.html`, save again as `note-1` with new content. Confirm overwrite prompt.
   - Reload, load `note-1`, verify the new content is what's stored.
4. **Rename and delete** (FR-004)
   - From **Saves**, rename `note-1` → `archived-note`. Delete it. Reload — list is empty.
5. **Quota error** (FR-006, R5)
   - In devtools, fill localStorage to near quota (`for (let i=0;i<50;i++) localStorage.setItem('pad'+i, 'x'.repeat(100000))`).
   - Try to save a large document. Expect a non-blocking error banner; in-memory content remains intact.

## B. Autosave & restore-on-load (User Story 1, Clarifications Q1+Q2)

1. **Autosave on by default** (FR-008)
   - In a fresh profile, open `index.html`, type for ~3 seconds.
   - In devtools, inspect `localStorage.getItem("marklink.markdown.autosave")` → should be non-empty with recent `lastModified`.
2. **Silent restore on next load** (FR-008a, SC-003)
   - Close the tab without saving. Reopen `index.html`. Verify content is restored automatically and a small "Restored last session" toast appears briefly.
3. **Share URL takes precedence** (FR-008a)
   - With an autosave present, open a share-URL link (use the existing Share feature to generate one with different content). Verify the URL content loads and the autosave slot is preserved untouched until the next edit.
4. **Autosave toggle off** (FR-008)
   - In **Saves**, uncheck **Autosave**. Type new content, close the tab, reopen. Verify nothing is restored.

## C. VIM mode (User Story 2)

1. **Off by default** (FR-013)
   - In a fresh profile, open each of `index.html`, `json.html`, `csv.html`. Verify the editor is a plain textarea and the VIM mode chip is not visible.
2. **Toggle on, mode indicator** (FR-009, FR-010)
   - Click **VIM**. After CodeMirror loads, editor enters NORMAL mode; chip reads "NORMAL".
3. **Core motions and edits** (FR-011, SC-004)
   - Press `i` → chip reads "INSERT"; type text.
   - `Esc` → "NORMAL". `dd` deletes a line. `yy`, then move cursor, `p` pastes. `gg` jumps to top, `G` to bottom.
   - `/foo` finds first match; `n` / `N` cycle.
4. **Focus scoping** (FR-012)
   - Click into the preview pane. Press `dd` — must NOT delete a line in the editor. Click back into the editor — keybindings resume.
5. **Toggle preserves content and persists** (FR-013, FR-014, SC-005)
   - With non-empty content, toggle VIM off — content unchanged. Reload — VIM preference persists per mode (still off in modes you didn't toggle).
6. **Typing latency unchanged when VIM off** (SC-006)
   - In a fresh profile, in `index.html`, type a few lines and confirm no perceptible lag vs. main branch. (No CodeMirror script should be loaded; verify via Network tab.)

## D. Cross-cutting

1. **Theme integration** (FR-015)
   - Toggle dark/light theme with the **Saves** panel open and with VIM mode on. All new chrome reflects the theme.
2. **Keyboard-only operation** (FR-016)
   - Tab through the toolbar. Verify both **Saves** and **VIM** controls are reachable and activatable with Enter/Space.

## Pass criteria

All items above complete with the documented outcome. Any failure is a regression against the FR/SC noted at the start of the step.
