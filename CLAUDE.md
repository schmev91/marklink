# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project is a static Markdown, JSON, and CSV editor built with plain HTML, CSS, and JavaScript. There is no build step or package manager defined in this repository.

- **Serve locally**: Use a simple HTTP server to preview the editor.
  - `python -m http.server 8000` (then open http://localhost:8000)
  - `npx serve .` (if Node is available)
  - `open index.html` (on macOS) or double-click the file in a file explorer.

- **Running tests**: This repository does not include an automated test suite. Manual verification can be done by opening the app in a web browser and testing core features (editor toolbar, preview rendering, Mermaid diagrams, theme switching, sharing links, CSV table view, column sorting/filtering).

- **Linting**: No formal linting configuration is provided. Code style follows general best practices and can be checked with external tools if desired (e.g., `eslint` for JavaScript).

## Project Architecture

- **Entry Points**:
  - `index.html`: Markdown editor mode.
  - `json.html`: JSON editor/viewer mode.
  - `csv.html`: CSV editor/viewer mode.
- **Core Modules** (located in `/js/`):
  - `theme.js`: Handles dark/light mode (shared across all modes).
  - `splitter.js`: Implements resizable panels (shared across all modes).
  - `editor.js`: Manages the Markdown editor toolbar and input.
  - `preview.js`: Renders Markdown to HTML and processes Mermaid diagrams.
  - `share.js`: Implements URL compression/sharing for Markdown.
  - `app.js`: Glue code for the Markdown mode.
  - `json-editor.js`: JSON textarea editor with validation and formatting.
  - `json-preview.js`: Renders JSON as tree view and nodes view with search.
  - `json-share.js`: URL compression/sharing for JSON.
  - `json-app.js`: Glue code for the JSON mode.
  - `csv-editor.js`: CSV textarea editor with validation.
  - `csv-preview.js`: Renders CSV as interactive table (sorting, filtering, column visibility, search).
  - `csv-share.js`: URL compression/sharing for CSV.
  - `csv-app.js`: Glue code for the CSV mode.
  - `storage.js`: Shared `localStorage` API for named saves, autosave slot, and per-mode preferences (`marklink.<mode>.<saves|autosave|preferences>` keys).
  - `saves-ui.js`: Shared "Saves" panel UI (list/load/rename/delete + autosave toggle).
  - `vim-mode.js`: Lazy CodeMirror 5 mount with vim keymap; activated only when the user toggles VIM mode in a given editor.
- **Assets**:
  - `css/style.css`: Styling for all modes (Markdown, JSON, CSV) plus Saves panel and CodeMirror skin.
  - CDN libraries: marked.js, highlight.js, mermaid.js, lz-string.js. CodeMirror 5 (`codemirror.min.js` + `keymap/vim.min.js` + per-mode addon) is **lazy-loaded** only when VIM mode is first enabled in a session.

## Commonly Used Files

- **Markdown mode**: `/js/editor.js`, `/js/preview.js`, `/js/share.js`, `/js/app.js`
- **JSON mode**: `/js/json-editor.js`, `/js/json-preview.js`, `/js/json-share.js`, `/js/json-app.js`
- **CSV mode**: `/js/csv-editor.js`, `/js/csv-preview.js`, `/js/csv-share.js`, `/js/csv-app.js`
- **Shared modules**: `/js/theme.js`, `/js/splitter.js`

## Development Workflow

1. Edit the relevant JavaScript or CSS file.
2. Save changes.
3. Refresh the browser to see the effect (or use a live-reload server if set up).
4. Test functionality: editing markdown, applying formatting, toggling themes, rendering diagrams, CSV table sorting/filtering, JSON tree view.
5. For quick local testing, use a simple static server or directly open `index.html`, `json.html`, or `csv.html`.

## Notes

- Because there is no build step, all dependencies are loaded from CDNs at runtime.
- Any additions of new features (e.g., additional toolbar actions) should be reflected in the relevant module(s) and potentially updated tests (if they exist).
- Future contributors can rely on this documentation for setting up a development environment quickly.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
- `specs/002-vim-local-storage/plan.md`
<!-- SPECKIT END -->
