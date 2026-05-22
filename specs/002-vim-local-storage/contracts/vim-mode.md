# Contract: `js/vim-mode.js`

Shared module that lazily mounts CodeMirror over a `<textarea>` and toggles the vim keymap. The module is the only place CodeMirror is referenced; the rest of the codebase remains library-agnostic.

## Exposed API

```js
MarkLinkVim.attach({
  textareaEl,        // HTMLTextAreaElement to upgrade
  mode,              // "markdown" | "json" | "csv" — used for syntax mode
  onModeChange,      // (vimMode: "normal"|"insert"|"visual"|"replace") => void
  onContentChange,   // (content: string) => void — replaces existing textarea
                     //   "input" listener while CodeMirror is mounted
}): VimHandle

// Returns a handle whose lifecycle is:

VimHandle.enable(): Promise<void>
// First call lazy-loads CodeMirror + vim keymap from CDN (idempotent across
// calls/pages). Wraps the textarea via CodeMirror.fromTextArea with
// keyMap: "vim" and the appropriate syntax mode. Resolves once the editor
// surface is interactive. The pre-existing textarea value is preserved and
// becomes CodeMirror's initial doc.

VimHandle.disable(): void
// Calls cm.toTextArea(), restoring the original <textarea> with the latest
// content. Caller MUST re-bind any of its own listeners on the textarea
// after disable() returns.

VimHandle.getValue(): string
// Returns current content from CodeMirror if enabled, otherwise from the
// textarea. Callers (autosave, share-link encoder, preview) use this
// instead of textareaEl.value once VIM may be active.

VimHandle.setValue(content): void
// Writes content into CodeMirror if enabled, otherwise into the textarea.
// Used by restore-on-load and "Load from saves".

VimHandle.focus(): void
```

## Lazy-load contract

- `enable()` injects two `<script>` tags exactly once per page lifetime:
  1. `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js`
  2. `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/keymap/vim.min.js`
  Plus the matching `.css` and the mode addon for the current `mode`
  (`markdown`, `javascript` for JSON, `null`/plain for CSV).
- The promise returned by `enable()` is cached; subsequent calls await the same load.
- If script loading fails (offline, CDN blocked), the promise rejects and the caller MUST revert the toggle UI and show an error banner.

## Mode-indicator contract

- `onModeChange` is called synchronously by CodeMirror's `vim-mode-change` event with one of `"normal"`, `"insert"`, `"visual"`, `"replace"`. Callers update the toolbar mode chip from this callback.
- When VIM is disabled, the indicator chip is hidden by the caller; the module does no DOM mutation of the chip itself.

## Focus scoping

- CodeMirror's editor surface is the only place vim keybindings intercept keys; the preview pane, toolbar, and other page chrome are unaffected (FR-012). The module does not install any document-level keydown listener.
