# Feature Specification: VIM Editing Mode & Local Storage Save

**Feature Branch**: `002-vim-local-storage`
**Created**: 2026-05-22
**Status**: Draft
**Input**: User description: "Add VIM to editor. Have options to save to local storage"

## Clarifications

### Session 2026-05-22

- Q: Is autosave part of v1, or deferred? → A: Autosave in v1, ON by default — silently persists to a reserved "autosave" slot; offered alongside named saves.
- Q: Restore-on-open behavior when an autosave slot exists? → A: Auto-restore silently — load the autosave directly when no URL content is present.
- Q: Default state of VIM mode for first-time users? → A: OFF by default; VIM users opt in once and the preference persists.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save and Restore Work from Local Storage (Priority: P1)

A user is editing content (Markdown, JSON, or CSV) and wants to preserve their work between browser sessions without relying on URL-based sharing. They save their current document to the browser's local storage, close the tab, return later, and recover the exact content they left off with.

**Why this priority**: This addresses the most common user pain point — losing work when a tab is closed. Today the app only offers ephemeral editing plus URL-based sharing, which is inconvenient for routine drafting. Persisted local saves deliver immediate, universal value across all three editor modes.

**Independent Test**: Open any of the three editors (Markdown, JSON, CSV), type content, click "Save", reload the page or close and reopen the tab, and confirm the saved content is recoverable through a "Load" or autosave-restore action.

**Acceptance Scenarios**:

1. **Given** a user has typed content into the Markdown editor, **When** they trigger "Save to local storage" and reload the page, **Then** they can restore the exact content they saved.
2. **Given** a user has multiple saved documents in local storage, **When** they open the load/manage interface, **Then** they see a list of saved entries identified by name and last-modified time and can load any one of them.
3. **Given** a user saves content under a name that already exists, **When** they confirm the save, **Then** the prior entry is overwritten and the new content is retrievable.
4. **Given** a user wants to remove an old draft, **When** they delete the entry from the saved list, **Then** it is no longer present after reload.

---

### User Story 2 - VIM Keybindings in the Editor (Priority: P2)

A keyboard-power user familiar with VIM wants to edit Markdown, JSON, or CSV using modal VIM keybindings (normal/insert/visual modes, motions like `h j k l w b`, edits like `dd yy p`, search with `/`, `:w` style commands where appropriate) so they can edit faster without using the mouse.

**Why this priority**: Highly valued by a specific power-user segment, but optional for casual users. It depends on a stable editor area and benefits from the local-storage save (P1) being in place so VIM-style `:w` can hook into it naturally.

**Independent Test**: Enable VIM mode from a settings/toggle control in any editor mode, then verify a representative set of VIM commands work: enter/exit insert mode with `i`/`Esc`, navigate with `h j k l`, delete a line with `dd`, yank/paste with `yy`/`p`, and search with `/text`.

**Acceptance Scenarios**:

1. **Given** VIM mode is off, **When** the user toggles it on from the editor UI, **Then** the editor enters VIM normal mode and a visible indicator shows the current VIM mode (normal/insert/visual).
2. **Given** VIM mode is on and the user is in normal mode, **When** they press `i`, **Then** the editor enters insert mode and typed characters appear in the document.
3. **Given** VIM mode is on, **When** the user presses `dd` on a line, **Then** that line is removed and stored in the VIM register so it can be pasted with `p`.
4. **Given** VIM mode is on, **When** the user issues a `/term` search, **Then** the next match is highlighted and `n`/`N` cycle through matches.
5. **Given** the user has set VIM mode on and reloads the page, **Then** VIM mode remains enabled (preference persists).

---

### Edge Cases

- What happens when local storage is full or unavailable (e.g., private browsing)? The app must surface a clear error and not lose the current in-memory content.
- What happens when saved content exceeds practical browser local-storage limits (~5 MB)? The app must warn before saving and reject saves that would exceed the limit.
- What happens when a user loads a saved entry while unsaved changes exist in the current editor? The app must prompt before overwriting the in-memory content.
- What happens when VIM mode is enabled but the editor surface loses focus (e.g., user clicks the preview pane)? VIM keybindings must not intercept keys outside the editor.
- What happens when toggling VIM mode mid-edit? The current text is preserved and the cursor remains in a sensible position.
- What happens when a saved entry is from a different editor mode (e.g., saved as JSON, loaded in CSV)? The system must prevent cross-mode loading or warn explicitly.

## Requirements *(mandatory)*

### Functional Requirements

**Local Storage Save/Load**

- **FR-001**: Each editor mode (Markdown, JSON, CSV) MUST provide a visible "Save to local storage" action accessible from the editor toolbar or menu.
- **FR-002**: Each editor mode MUST provide a "Load from local storage" action that lists previously saved entries for that mode and allows selecting one to load into the editor.
- **FR-003**: Each saved entry MUST capture: a user-supplied name, the document content, the editor mode, and a last-modified timestamp.
- **FR-004**: Users MUST be able to overwrite, rename, and delete saved entries from the load/manage interface.
- **FR-005**: Saved entries MUST be scoped per editor mode so that, for example, a Markdown save does not appear in the CSV load list.
- **FR-006**: The system MUST detect and report local-storage unavailability or quota-exceeded errors without losing the user's current in-memory content.
- **FR-007**: When loading a saved entry while the editor has unsaved changes, the system MUST prompt the user to confirm before replacing the current content.
- **FR-008**: The system MUST provide autosave in v1, enabled by default per editor mode, that silently writes the current in-memory content to a reserved "autosave" slot at an interval consistent with SC-003 (no more than 30 seconds of work lost). Users MUST be able to disable autosave from the same UI that lists saved entries.
- **FR-008a**: On editor load, if a non-empty autosave slot exists for that mode and no content is being loaded from a share URL, the system MUST silently restore the autosaved content into the editor. If share-URL content is present, the URL content takes precedence and the autosave slot MUST NOT be overwritten until the user makes an edit.

**VIM Mode**

- **FR-009**: Each editor mode MUST provide a user-visible toggle to enable or disable VIM keybindings for the editor textarea/input.
- **FR-010**: When VIM mode is enabled, the editor MUST support modal editing with at least: normal, insert, and visual modes, and display the current mode in the UI.
- **FR-011**: VIM mode MUST support core motions (`h j k l w b e 0 $ gg G`), basic edits (`i a o O x dd yy p P u Ctrl+R`), and search (`/`, `?`, `n`, `N`).
- **FR-012**: VIM keybindings MUST only intercept keystrokes while the editor input is focused; they MUST NOT affect global page shortcuts (theme toggle, share, etc.) or the preview pane.
- **FR-013**: VIM mode MUST default to OFF for first-time users in every editor mode. The on/off preference MUST persist across reloads (per editor mode) using the same local-storage mechanism so users who opt in only do so once.
- **FR-014**: Toggling VIM mode on or off MUST preserve the current document content and place the cursor at a reasonable position.

**Cross-Cutting**

- **FR-015**: All new UI elements (toolbar buttons, dialogs, indicators) MUST follow the existing styling conventions and work in both light and dark themes.
- **FR-016**: All new actions MUST be operable via keyboard alone, in addition to mouse/touch.

### Key Entities *(include if feature involves data)*

- **Saved Document**: A persisted snapshot of an editor's content. Attributes: name, editor mode (markdown/json/csv), content, last-modified timestamp. Stored in browser local storage, scoped per editor mode.
- **Editor Preferences**: Per-mode user preferences. Attributes: vim-mode enabled (yes/no), autosave enabled (yes/no). Stored in browser local storage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can save and restore a document via local storage in under 10 seconds end-to-end (open save dialog, name, save, reload, load, see content).
- **SC-002**: 100% of saved documents are recoverable after a browser reload, provided local storage is available and within quota.
- **SC-003**: With autosave enabled, no more than 30 seconds of editing work is lost in the event of an unexpected reload or tab close.
- **SC-004**: Users with VIM proficiency can perform common editing operations (navigate, delete line, yank/paste, search) without leaving the keyboard, with at least 95% of the documented VIM command set working as expected.
- **SC-005**: Enabling or disabling VIM mode takes effect within 1 second and does not alter the document content.
- **SC-006**: New features add no perceptible delay (under 100 ms additional input latency) to typing in the editor when VIM mode is disabled.

## Assumptions

- Browser `localStorage` is the persistence target (no server, no IndexedDB), consistent with the app's static, no-backend architecture.
- Saved-entry size is constrained by the browser's local-storage quota (~5 MB total across origin); larger documents are out of scope for v1.
- The VIM keybinding layer will be provided by an established library loaded via CDN (consistent with how marked.js, highlight.js, mermaid.js, and lz-string.js are loaded today); specific library choice is a planning concern, not a spec concern.
- Multi-document tabs/workspaces are out of scope; the editor remains a single active document with a separate list of saved entries.
- Cloud sync, account-based persistence, and conflict resolution across devices are out of scope for v1.
- The existing URL-based sharing feature is preserved and unaffected.
