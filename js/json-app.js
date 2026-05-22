/**
 * MarkLink — JSON App Module
 * Main orchestration for JSON editor page
 */
const JsonApp = (() => {
  const DEFAULT_JSON = `{
  "name": "MarkLink",
  "version": "2.0.0",
  "description": "A beautiful Markdown & JSON editor with live preview and shareable links",
  "features": [
    "Markdown Editor",
    "JSON Tree View",
    "JSON Nodes View",
    "Search & Highlight",
    "Shareable URLs",
    "Dark & Light Mode"
  ],
  "author": {
    "name": "schmev91",
    "github": "https://github.com/schmev91",
    "skills": ["JavaScript", "CSS", "HTML"]
  },
  "settings": {
    "theme": "dark",
    "fontSize": 14,
    "autoFormat": true,
    "tabSize": 2
  },
  "stats": {
    "stars": 42,
    "forks": 7,
    "openIssues": 3,
    "isPublic": true,
    "license": null
  },
  "tags": ["editor", "markdown", "json", "viewer", "open-source"],
  "links": [
    {
      "label": "Homepage",
      "url": "https://schmev91.github.io/marklink",
      "active": true
    },
    {
      "label": "Documentation",
      "url": "https://schmev91.github.io/marklink/docs",
      "active": false
    }
  ]
}`;

  const MODE = 'json';
  let savesUI = null;
  let vimHandle = null;
  let autosaveTimer = null;
  let autosaveHardFlushTimer = null;
  const AUTOSAVE_DEBOUNCE_MS = 1500;
  const AUTOSAVE_HARD_FLUSH_MS = 15000;
  let renderTimer = null;

  function init() {
    // Initialize modules
    Theme.init();
    Splitter.init();
    JsonEditor.init();
    JsonPreview.init();
    JsonShare.init();

    // Wire format button
    const formatBtn = document.getElementById('json-format-btn');
    if (formatBtn) {
      formatBtn.addEventListener('click', () => {
        JsonEditor.formatJson();
      });
    }

    // Wire theme changes
    Theme.onChange((theme) => {
      JsonPreview.onThemeChange(theme);
    });

    const editor = JsonEditor.getElement();

    if (editor && typeof MarkLinkVim !== 'undefined') {
      vimHandle = MarkLinkVim.attach({
        textareaEl: editor,
        mode: MODE,
        onModeChange: setVimIndicator,
        onContentChange: (val) => {
          scheduleRender();
          scheduleAutosave();
        },
      });
    }

    if (editor) {
      editor.addEventListener('input', () => {
        scheduleRender();
        scheduleAutosave();
      });
    }

    // Wire load file button
    const loadBtn = document.getElementById('json-load-file-btn');
    const fileInput = document.getElementById('json-file-input');
    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileLoad);
    }

    initStorageFeatures();

    // Load content: URL shared > autosave restore > default
    const sharedContent = JsonShare.loadFromUrl();
    if (sharedContent) {
      setCurrentValue(sharedContent);
    } else {
      const restored = tryRestoreAutosave();
      if (!restored) {
        setCurrentValue(DEFAULT_JSON);
      }
    }

    applyInitialVimPreference();
    window.addEventListener('beforeunload', flushAutosave);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const val = getCurrentValue().trim();
      if (val) JsonPreview.render(val);
    }, 300);
  }

  function getCurrentValue() {
    if (vimHandle && vimHandle.isEnabled()) return vimHandle.getValue();
    return JsonEditor.getValue();
  }

  function setCurrentValue(text) {
    if (vimHandle && vimHandle.isEnabled()) {
      vimHandle.setValue(text);
      const v = (text || '').trim();
      if (v) JsonPreview.render(v);
    } else {
      JsonEditor.setValue(text);
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
    if (typeof MarkLinkStorage === 'undefined' || !MarkLinkStorage.isAvailable()) return;
    const prefs = MarkLinkStorage.readPreferences(MODE);
    if (prefs.vim && vimHandle) enableVim();
  }

  function toggleVim() {
    if (!vimHandle) return;
    if (vimHandle.isEnabled()) disableVim();
    else enableVim();
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
    const editor = JsonEditor.getElement();
    if (editor) {
      editor.value = content;
      editor.addEventListener('input', () => { scheduleRender(); scheduleAutosave(); });
    }
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
      JsonEditor.setValue(e.target.result);
      JsonPreview.render(e.target.result.trim());
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
