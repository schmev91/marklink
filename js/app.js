/**
 * MarkLink — App Module
 * Main orchestration: initializes all modules and wires them together
 */
const App = (() => {
  const DEFAULT_MARKDOWN = `# 🔗 Welcome to MarkLink

A beautiful **Markdown editor** with live preview, **Mermaid diagram** support, and shareable links.

## Features

- ✏️ **Rich Toolbar** — Bold, italic, headings, lists, code blocks, and more
- 🎨 **Syntax Highlighting** — Powered by highlight.js
- 📊 **Mermaid Diagrams** — Flowcharts, sequences, and more
- 🌗 **Dark & Light Mode** — Toggle with the theme button
- 🔗 **Share via URL** — Compress and share your markdown
- 📱 **Responsive** — Works on desktop and mobile

---

## Code Example

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate first 10 Fibonacci numbers
const result = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log(result); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

## Mermaid Diagram

\`\`\`mermaid
graph TD
    A[📝 Write Markdown] --> B{Has Mermaid?}
    B -->|Yes| C[🎨 Render Diagram]
    B -->|No| D[📄 Render Text]
    C --> E[👁️ Live Preview]
    D --> E
    E --> F[🔗 Share Link]

    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style E fill:#22c55e,stroke:#16a34a,color:#fff
    style F fill:#f59e0b,stroke:#d97706,color:#fff
\`\`\`

## Table

| Feature | Status | Notes |
| --- | --- | --- |
| Markdown Parsing | ✅ Done | Using marked.js |
| Syntax Highlighting | ✅ Done | Using highlight.js |
| Mermaid Support | ✅ Done | Using mermaid.js |
| Dark Mode | ✅ Done | CSS variables |
| Share via URL | ✅ Done | lz-string compression |

## Blockquote

> "The best way to predict the future is to invent it."
> — *Alan Kay*

## Task List

- [x] Set up the application
- [x] Implement markdown parsing
- [x] Add Mermaid diagram support
- [ ] Write even more markdown!

---

*Built with ❤️ using vanilla HTML, CSS, and JavaScript*
`;

  const MODE = 'markdown';
  let savesUI = null;
  let vimHandle = null;
  let autosaveTimer = null;
  let autosaveHardFlushTimer = null;
  const AUTOSAVE_DEBOUNCE_MS = 1500;
  const AUTOSAVE_HARD_FLUSH_MS = 15000;

  function init() {
    // Initialize modules
    Theme.init();
    Splitter.init();
    Editor.init();
    Preview.init();
    Share.init();

    // Wire theme changes to preview re-rendering
    Theme.onChange((theme) => {
      Preview.onThemeChange(theme);
    });

    const editor = Editor.getElement();

    // VIM handle (attaches lazily on first enable())
    if (editor && typeof MarkLinkVim !== 'undefined') {
      vimHandle = MarkLinkVim.attach({
        textareaEl: editor,
        mode: MODE,
        onModeChange: setVimIndicator,
        onContentChange: (val) => {
          Preview.render(val);
          scheduleAutosave();
        },
      });
    }

    // Wire editor input to preview rendering and autosave
    if (editor) {
      editor.addEventListener('input', () => {
        Preview.render(getCurrentValue());
        scheduleAutosave();
      });
    }

    // Wire load file button
    const loadBtn = document.getElementById('load-file-btn');
    const fileInput = document.getElementById('file-input');
    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileLoad);
    }

    // Storage / Saves wiring
    initStorageFeatures();

    // Load content: URL shared > autosave restore > default markdown
    const sharedContent = Share.loadFromUrl();
    if (sharedContent) {
      setCurrentValue(sharedContent);
    } else {
      const restored = tryRestoreAutosave();
      if (!restored) {
        setCurrentValue(DEFAULT_MARKDOWN);
      }
    }

    // Apply persisted VIM preference (default OFF)
    applyInitialVimPreference();

    // Flush autosave on tab close
    window.addEventListener('beforeunload', flushAutosave);
  }

  function getCurrentValue() {
    if (vimHandle && vimHandle.isEnabled()) return vimHandle.getValue();
    return Editor.getValue();
  }

  function setCurrentValue(text) {
    if (vimHandle && vimHandle.isEnabled()) {
      vimHandle.setValue(text);
      Preview.render(text);
    } else {
      Editor.setValue(text);
    }
    if (savesUI) savesUI.setLoadedSnapshot(text);
  }

  function initStorageFeatures() {
    if (typeof MarkLinkStorage === 'undefined') return;

    const savesBtn = document.getElementById('saves-btn');
    const vimBtn = document.getElementById('vim-toggle-btn');

    if (!MarkLinkStorage.isAvailable()) {
      if (savesBtn) savesBtn.disabled = true;
      if (vimBtn) vimBtn.disabled = true;
      const banner = document.createElement('div');
      banner.className = 'storage-unavailable-banner';
      banner.textContent = 'Local storage unavailable — saves and preferences are disabled in this browser session.';
      document.body.insertBefore(banner, document.body.firstChild);
      return;
    }

    if (typeof MarkLinkSavesUI !== 'undefined') {
      savesUI = MarkLinkSavesUI.mount({
        mode: MODE,
        getContent: getCurrentValue,
        setContent: setCurrentValue,
      });
      if (savesBtn) savesBtn.addEventListener('click', () => savesUI.open());
    }

    if (vimBtn && vimHandle) {
      vimBtn.addEventListener('click', toggleVim);
    }
  }

  function applyInitialVimPreference() {
    if (typeof MarkLinkStorage === 'undefined') return;
    if (!MarkLinkStorage.isAvailable()) return;
    const prefs = MarkLinkStorage.readPreferences(MODE);
    if (prefs.vim && vimHandle) {
      enableVim();
    }
  }

  function toggleVim() {
    if (!vimHandle) return;
    if (vimHandle.isEnabled()) {
      disableVim();
    } else {
      enableVim();
    }
  }

  function enableVim() {
    const vimBtn = document.getElementById('vim-toggle-btn');
    vimHandle.enable().then(() => {
      MarkLinkStorage.writePreferences(MODE, { vim: true });
      if (vimBtn) vimBtn.classList.add('vim-active');
      showVimIndicator(true);
    }).catch((err) => {
      console.error('VIM enable failed', err);
      MarkLinkStorage.writePreferences(MODE, { vim: false });
      if (vimBtn) vimBtn.classList.remove('vim-active');
      showVimIndicator(false);
      alert('Failed to load VIM mode (CodeMirror). Check your network connection.');
    });
  }

  function disableVim() {
    const vimBtn = document.getElementById('vim-toggle-btn');
    const content = vimHandle.getValue();
    vimHandle.disable();
    MarkLinkStorage.writePreferences(MODE, { vim: false });
    if (vimBtn) vimBtn.classList.remove('vim-active');
    showVimIndicator(false);
    // Re-bind textarea input listener was lost when CM took over; re-attach.
    const editor = Editor.getElement();
    if (editor) {
      editor.value = content;
      editor.addEventListener('input', editorInputHandler);
    }
  }

  function editorInputHandler() {
    Preview.render(getCurrentValue());
    scheduleAutosave();
  }

  function setVimIndicator(modeName) {
    const ind = document.getElementById('vim-mode-indicator');
    if (!ind) return;
    ind.dataset.vimMode = modeName || 'normal';
    ind.textContent = (modeName || 'normal').toUpperCase();
  }

  function showVimIndicator(visible) {
    const ind = document.getElementById('vim-mode-indicator');
    if (!ind) return;
    if (visible) ind.classList.add('visible');
    else ind.classList.remove('visible');
  }

  function scheduleAutosave() {
    if (typeof MarkLinkStorage === 'undefined' || !MarkLinkStorage.isAvailable()) return;
    const prefs = MarkLinkStorage.readPreferences(MODE);
    if (!prefs.autosaveEnabled) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(flushAutosave, AUTOSAVE_DEBOUNCE_MS);
    if (!autosaveHardFlushTimer) {
      autosaveHardFlushTimer = setTimeout(() => {
        autosaveHardFlushTimer = null;
        flushAutosave();
      }, AUTOSAVE_HARD_FLUSH_MS);
    }
  }

  function flushAutosave() {
    if (typeof MarkLinkStorage === 'undefined' || !MarkLinkStorage.isAvailable()) return;
    const prefs = MarkLinkStorage.readPreferences(MODE);
    if (!prefs.autosaveEnabled) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (autosaveHardFlushTimer) { clearTimeout(autosaveHardFlushTimer); autosaveHardFlushTimer = null; }
    MarkLinkStorage.writeAutosave(MODE, getCurrentValue());
  }

  function tryRestoreAutosave() {
    if (typeof MarkLinkStorage === 'undefined' || !MarkLinkStorage.isAvailable()) return false;
    const rec = MarkLinkStorage.readAutosave(MODE);
    if (!rec) return false;
    setCurrentValue(rec.content);
    if (savesUI) savesUI.showRestoredToast(rec.lastModified);
    return true;
  }

  function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      Editor.setValue(e.target.result);
      Preview.render(e.target.result);
      showToast(`Loaded: ${file.name}`);
    };
    reader.onerror = () => {
      showToast('Error reading file!');
    };
    reader.readAsText(file, 'UTF-8');

    // Reset input to allow loading the same file again
    event.target.value = '';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => { toast.classList.remove('visible'); }, 2500);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
