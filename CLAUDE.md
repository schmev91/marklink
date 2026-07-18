# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project is a static Markdown, JSON, and CSV editor built with plain HTML, CSS, and JavaScript. There is no build step or package manager defined in this repository.

- **Serve locally**: Use a simple HTTP server to preview the editor.
  - `python -m http.server 8000` (then open http://localhost:8000)
  - `npx serve .` (if Node is available)
  - `open index.html` (on macOS) or double-click the file in a file explorer.

- **Running tests**: This repository does not include an automated test suite. Manual verification can be done by opening the app in a web browser and testing core features (editor toolbar, preview rendering, Mermaid diagrams, theme switching, sharing links, CSV table view, column sorting/filtering, VIM mode, local storage, and autosave).

- **Linting**: No formal linting configuration is provided. Code style follows general best practices and can be checked with external tools if desired (e.g., `eslint` for JavaScript).

## Project Architecture

- **Entry Points**:
  - `index.html`: Markdown editor mode.
  - `json.html`: JSON editor/viewer mode.
  - `csv.html`: CSV editor/viewer mode.
- **Core Modules** (located in `/js/`):
  - `theme.js`: Handles dark/light mode switching with system preference detection (shared across all modes).
  - `splitter.js`: Implements resizable editor/preview panels with drag-to-resize (shared across all modes).
  - `vim-mode.js`: Lazy-loads CodeMirror 5 with vim keymap when VIM mode is first enabled. Reduces initial load by deferring CodeMirror until needed.
  - `storage.js`: Unified `localStorage` API for named saves, autosave state, and per-mode preferences (keys: `marklink.<mode>.<saves|autosave|preferences>`).
  - `saves-ui.js`: Shared "Saves" sidebar panel with list/load/rename/delete/autosave toggle functionality.
  
  **Markdown Mode Modules**:
  - `editor.js`: Markdown editor textarea and toolbar (bold, italic, headings, lists, code blocks, tables, links, etc.).
  - `preview.js`: Renders Markdown to HTML via marked.js and processes Mermaid diagram syntax.
  - `share.js`: Compresses/decompresses Markdown content for URL sharing via lz-string.
  - `app.js`: Orchestrates Markdown mode (wires editor, preview, theme, storage, splitter, saves-ui, vim-mode, share).
  
  **JSON Mode Modules**:
  - `json-editor.js`: JSON textarea with real-time validation and formatting (Ctrl+Shift+F to prettify).
  - `json-preview.js`: Tree view and nodes view with expandable/collapsible JSON structure and search.
  - `json-share.js`: Compresses/decompresses JSON for URL sharing.
  - `json-app.js`: Orchestrates JSON mode.
  
  **CSV Mode Modules**:
  - `csv-editor.js`: CSV textarea with validation.
  - `csv-preview.js`: Interactive table with sticky headers, column sorting (asc/desc), per-column filtering, column visibility toggle, and search.
  - `csv-share.js`: Compresses/decompresses CSV for URL sharing.
  - `csv-comparison.js`: CSV comparison modal supporting paste, file upload, and URL loading with detailed diff reporting (added/removed/modified rows with cell-level changes).
  - `csv-app.js`: Orchestrates CSV mode; also includes CSV → JSON conversion, CSV export, and comparison feature integration.
- **Assets**:
  - `css/style.css`: Unified stylesheet for all modes (Markdown, JSON, CSV), Saves panel, and CodeMirror skin.
  - **CDN Libraries** (loaded at runtime):
    - `marked.js`: Markdown parsing and HTML rendering.
    - `highlight.js`: Code syntax highlighting in Markdown previews.
    - `mermaid.js`: Diagram rendering (flowcharts, sequence diagrams, etc.).
    - `lz-string.js`: URL compression for shareable links.
    - `CodeMirror 5`: (`codemirror.min.js` + `keymap/vim.min.js` + mode addons) is **lazy-loaded** only when VIM mode is first enabled. This keeps initial page load fast.

## Commonly Used Files

- **Markdown mode**: `index.html`, `/js/editor.js`, `/js/preview.js`, `/js/share.js`, `/js/app.js`
- **JSON mode**: `json.html`, `/js/json-editor.js`, `/js/json-preview.js`, `/js/json-share.js`, `/js/json-app.js`
- **CSV mode**: `csv.html`, `/js/csv-editor.js`, `/js/csv-preview.js`, `/js/csv-share.js`, `/js/csv-app.js`, `/js/csv-comparison.js` (CSV validation/comparison modal)
- **Shared features**: `/js/theme.js` (dark/light mode), `/js/splitter.js` (resizable panels), `/js/storage.js` (saves & autosave), `/js/saves-ui.js` (saves sidebar), `/js/vim-mode.js` (VIM keymap)
- **Styling**: `/css/style.css`

## Development Workflow

1. Edit the relevant JavaScript or CSS file.
2. Save changes.
3. Refresh the browser to see the effect (or use a live-reload server if set up).
4. Test functionality: 
   - **Markdown**: editing, toolbar actions, dark/light theme, Mermaid diagram rendering.
   - **JSON**: validation, tree/nodes view, search, prettify formatting.
   - **CSV**: table rendering, column sorting, filtering, visibility, CSV export, CSV comparison (paste/upload/URL).
   - **Shared**: resizable panels, dark/light mode, URL sharing, VIM mode toggle, local saves/autosave.
5. For quick local testing, use a simple static server: `python -m http.server 8000` then open http://localhost:8000, or directly open HTML files in a browser.

## Spec-Driven Development

This project uses **Speckit** for feature specification and planning. When implementing features:

- **Feature specifications** are stored in `specs/<feature-id>/spec.md`.
- **Implementation plans** are in `specs/<feature-id>/plan.md`.
- **Tasks** are defined in `specs/<feature-id>/tasks.md`.
- **Data models and contracts** are in `specs/<feature-id>/contracts/`.

Example: The VIM mode and local storage feature is documented in `specs/002-vim-local-storage/`.

## Development Tooling

This project uses several tools to support the development workflow:

- **Speckit** (`.specify/`): Specification workflow with templates for feature specs, plans, tasks, and checklists.
- **Serena** (`.serena/`): Language server providing code intelligence and refactoring tools.
- **Claude Skills** (`.claude/skills/`): Custom Claude Code skills for speckit workflows (speckit-specify, speckit-plan, speckit-implement, speckit-analyze, speckit-checklist, speckit-clarify).
- **Claude Settings** (`.claude/settings.local.json`): Project-local permissions and configuration for Claude Code.

## Notes

- **No build step**: All dependencies are loaded from CDNs at runtime, keeping the project lightweight and easy to deploy.
- **Manual testing**: Since there's no automated test suite, test new features by opening the app in a browser and verifying core workflows.
- **Module organization**: Each editor mode (Markdown, JSON, CSV) follows a consistent pattern: `*-app.js` (orchestrator), `*-editor.js`, `*-preview.js`, `*-share.js`.
- **Lazy loading**: CodeMirror is only loaded when VIM mode is first enabled, reducing initial page load time.
- **LocalStorage**: All saves, autosave state, and preferences are persisted to `localStorage` using keys prefixed with `marklink.<mode>`.
- **Shared vocabulary**: `CONCEPTS.md` defines core domain vocabulary (entities, named processes, status concepts) — relevant when orienting to the codebase or discussing domain concepts.

## References

For feature specifications, implementation plans, and task tracking, see:
- `specs/002-vim-local-storage/` — VIM mode and local storage feature documentation (spec, plan, tasks, data models, contracts)
- `specs/003-csv-comparison/` — CSV comparison feature documentation (spec, plan, research, data-model, quickstart, contracts)

For documented solutions to past problems (bugs, best practices, architectural patterns), see `docs/solutions/` — organized by category with YAML frontmatter fields like `module`, `tags`, and `problem_type` for searchability.

<!-- SPECKIT START -->
**Active Feature Plan**: [CSV Comparison](specs/003-csv-comparison/plan.md)  
Branch: `003-csv-comparison`  
Status: Phase 1 design complete (Phase 2 tasks pending via `/speckit.tasks`)
<!-- SPECKIT END -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
