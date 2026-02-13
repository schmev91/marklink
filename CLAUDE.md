# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The project is a static Markdown editor built with plain HTML, CSS, and JavaScript. There is no build step or package manager defined in this repository.

- **Serve locally**: Use a simple HTTP server to preview the editor.
  - `python -m http.server 8000` (then open http://localhost:8000)
  - `npx serve .` (if Node is available)
  - `open index.html` (on macOS) or double-click the file in a file explorer.

- **Running tests**: This repository does not include an automated test suite. Manual verification can be done by opening the app in a web browser and testing core features (editor toolbar, preview rendering, Mermaid diagrams, theme switching, sharing links).

- **Linting**: No formal linting configuration is provided. Code style follows general best practices and can be checked with external tools if desired (e.g., `eslint` for JavaScript).

## Project Architecture

- **Entry Point**: `index.html` loads the application, includes CSS, and scripts to `js/app.js` which orchestrates the modules.
- **Core Modules** (located in `/js/`):
  - `theme.js`: Handles dark/light mode.
  - `splitter.js`: Implements resizable panels.
  - `editor.js`: Manages the Markdown editor toolbar and input.
  - `preview.js`: Renders Markdown to HTML and processes Mermaid diagrams.
  - `share.js`: Implements URL compression/sharing functionality.
  - `app.js`: Glue code that ties the above modules together and handles UI interactions.
- **Assets**:
  - `css/style.css`: Styling for both editor and preview.
  - CDN libraries: marked.js, highlight.js, mermaid.js, lz-string.js.

## Commonly Used Files

- **Editor logic**: `/js/editor.js`
- **Preview logic**: `/js/preview.js`
- **Theme handling**: `/js/theme.js`
- **Resizable splitter**: `/js/splitter.js`
- **Share via URL**: `/js/share.js`
- **Main orchestration**: `/js/app.js`

## Development Workflow

1. Edit the relevant JavaScript or CSS file.
2. Save changes.
3. Refresh the browser to see the effect (or use a live-reload server if set up).
4. Test functionality: editing markdown, applying formatting, toggling themes, rendering diagrams.
5. For quick local testing, use a simple static server or directly open `index.html`.

## Notes

- Because there is no build step, all dependencies are loaded from CDNs at runtime.
- Any additions of new features (e.g., additional toolbar actions) should be reflected in the relevant module(s) and potentially updated tests (if they exist).
- Future contributors can rely on this documentation for setting up a development environment quickly.