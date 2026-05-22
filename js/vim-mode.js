/**
 * MarkLink — VIM Mode Module
 * Lazily mounts CodeMirror 5 with the vim keymap over a <textarea>.
 * Callers receive a handle: enable / disable / getValue / setValue / focus.
 */
const MarkLinkVim = (() => {
  const CM_VERSION = '5.65.16';
  const CM_BASE = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CM_VERSION}`;
  let loadPromise = null;

  function _loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-marklink-cm="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.dataset.marklinkCm = src;
      s.addEventListener('load', () => { s.dataset.loaded = '1'; resolve(); }, { once: true });
      s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(s);
    });
  }

  function _loadStyle(href) {
    if (document.querySelector(`link[data-marklink-cm="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.dataset.marklinkCm = href;
    document.head.appendChild(l);
  }

  function _modeAddons(mode) {
    if (mode === 'markdown') return [`${CM_BASE}/mode/markdown/markdown.min.js`];
    if (mode === 'json')     return [`${CM_BASE}/mode/javascript/javascript.min.js`];
    return [];
  }

  function _cmModeName(mode) {
    if (mode === 'markdown') return 'markdown';
    if (mode === 'json')     return { name: 'javascript', json: true };
    return null;
  }

  function _loadCodeMirror(mode) {
    if (loadPromise) return loadPromise.then(() => _loadAddons(mode));
    _loadStyle(`${CM_BASE}/codemirror.min.css`);
    loadPromise = _loadScript(`${CM_BASE}/codemirror.min.js`).then(() => {
      return _loadScript(`${CM_BASE}/keymap/vim.min.js`);
    });
    return loadPromise.then(() => _loadAddons(mode));
  }

  function _loadAddons(mode) {
    const addons = _modeAddons(mode);
    return Promise.all(addons.map(_loadScript));
  }

  function attach({ textareaEl, mode, onModeChange, onContentChange }) {
    let cm = null;
    let enabled = false;

    function enable() {
      if (enabled && cm) return Promise.resolve();
      return _loadCodeMirror(mode).then(() => {
        if (typeof CodeMirror === 'undefined') {
          throw new Error('CodeMirror failed to load.');
        }
        const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'material-darker';
        cm = CodeMirror.fromTextArea(textareaEl, {
          keyMap: 'vim',
          mode: _cmModeName(mode),
          lineNumbers: true,
          lineWrapping: true,
          showCursorWhenSelecting: true,
          indentUnit: 2,
          tabSize: 2,
          theme: 'marklink',
        });
        // Apply a CSS class so we can theme via our existing variables.
        const wrapper = cm.getWrapperElement();
        wrapper.classList.add('marklink-cm');

        cm.on('vim-mode-change', (ev) => {
          if (typeof onModeChange === 'function') {
            onModeChange(ev.mode || 'normal');
          }
        });
        cm.on('change', () => {
          // Sync back to the underlying <textarea> so existing
          // Editor.getValue() / Share / autosave paths see fresh content.
          try { cm.save(); } catch (_) { /* ignore */ }
          if (typeof onContentChange === 'function') {
            onContentChange(cm.getValue());
          }
        });
        enabled = true;
        // Fire an initial mode indicator (CodeMirror vim starts in normal).
        if (typeof onModeChange === 'function') onModeChange('normal');
      });
    }

    function disable() {
      if (!enabled || !cm) return;
      try {
        cm.toTextArea();
      } catch (_) {
        // ignore
      }
      cm = null;
      enabled = false;
    }

    function getValue() {
      if (enabled && cm) return cm.getValue();
      return textareaEl ? textareaEl.value : '';
    }

    function setValue(content) {
      if (enabled && cm) {
        cm.setValue(content == null ? '' : String(content));
      } else if (textareaEl) {
        textareaEl.value = content == null ? '' : String(content);
        textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function focus() {
      if (enabled && cm) cm.focus();
      else if (textareaEl) textareaEl.focus();
    }

    function isEnabled() { return enabled; }

    return { enable, disable, getValue, setValue, focus, isEnabled };
  }

  return { attach };
})();
