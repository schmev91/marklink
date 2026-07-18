/**
 * MarkLink — CSV App Module
 * Main orchestration for CSV editor page
 */
const CsvApp = (() => {
  const DEFAULT_CSV = `Name,Age,City,Department,Salary,Status
Alice Johnson,32,New York,Engineering,95000,Active
Bob Smith,28,San Francisco,Design,82000,Active
Charlie Brown,45,Chicago,Marketing,78000,On Leave
Diana Ross,36,Los Angeles,Engineering,102000,Active
Eve Martinez,29,Seattle,Data Science,91000,Active
Frank Wilson,41,Boston,Management,115000,Active
Grace Lee,33,Austin,Engineering,97000,Active
Henry Davis,27,Denver,Design,76000,Active
Iris Chen,38,Portland,Data Science,88000,On Leave
Jack Thompson,31,Miami,Marketing,73000,Active
Karen White,44,Atlanta,Management,108000,Active
Leo Garcia,26,Phoenix,Engineering,85000,Active
Maria Lopez,35,Dallas,Design,79000,Active
Nathan Kim,30,Minneapolis,Data Science,93000,Active`;

  const MODE = 'csv';
  let savesUI = null;
  let vimHandle = null;
  let autosaveTimer = null;
  let autosaveHardFlushTimer = null;
  const AUTOSAVE_DEBOUNCE_MS = 1500;
  const AUTOSAVE_HARD_FLUSH_MS = 15000;
  let renderTimer = null;
  let currentDelimiter = 'csv';

  function applyDelimiter(key) {
    const delim = CsvDelimiters.get(key);
    if (!delim) return;
    currentDelimiter = key;
    const select = document.getElementById('csv-delimiter-select');
    if (select) select.value = key;
    if (CsvEditor.setDelimiter) CsvEditor.setDelimiter(delim.char);
    if (CsvPreview.setDelimiter) CsvPreview.setDelimiter(delim.char);
    scheduleRender();
  }

  function init() {
    // Initialize modules
    Theme.init();
    Splitter.init();
    CsvEditor.init();
    CsvPreview.init();
    CsvShare.init();

    // Initialize delimiter selector
    if (typeof CsvDelimiters !== 'undefined') {
      const delimiterSelect = document.getElementById('csv-delimiter-select');
      if (delimiterSelect) {
        CsvDelimiters.list().forEach(delim => {
          const option = document.createElement('option');
          option.value = delim.key;
          option.textContent = delim.label;
          delimiterSelect.appendChild(option);
        });
        delimiterSelect.value = currentDelimiter;
        delimiterSelect.addEventListener('change', (e) => {
          applyDelimiter(e.target.value);
        });
      }
    }

    // Wire theme changes
    Theme.onChange((theme) => {
      CsvPreview.onThemeChange(theme);
    });

    const editor = CsvEditor.getElement();

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

    // Wire Convert to JSON button
    const convertBtn = document.getElementById('csv-convert-json-btn');
    if (convertBtn) {
      convertBtn.addEventListener('click', convertToJson);
    }

    // Wire Download button
    const downloadBtn = document.getElementById('csv-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadCsv);
    }

    // Wire load file button
    const loadBtn = document.getElementById('csv-load-file-btn');
    const fileInput = document.getElementById('csv-file-input');
    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileLoad);
    }

    // Wire Compare CSV button
    const compareBtn = document.getElementById('csv-compare-btn');
    if (compareBtn && typeof CSVComparison !== 'undefined') {
      compareBtn.addEventListener('click', () => {
        CSVComparison.showComparisonModal(document.body);
      });
    }

    initStorageFeatures();

    // Load content: URL shared > autosave restore > default
    const sharedContent = CsvShare.loadFromUrl();
    if (sharedContent) {
      setCurrentValue(sharedContent);
    } else {
      const restored = tryRestoreAutosave();
      if (!restored) {
        setCurrentValue(DEFAULT_CSV);
      }
    }

    applyInitialVimPreference();
    window.addEventListener('beforeunload', flushAutosave);
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      CsvPreview.render(getCurrentValue().trim());
    }, 300);
  }

  function getCurrentValue() {
    if (vimHandle && vimHandle.isEnabled()) return vimHandle.getValue();
    return CsvEditor.getValue();
  }

  function setCurrentValue(text) {
    if (vimHandle && vimHandle.isEnabled()) {
      vimHandle.setValue(text);
      CsvPreview.render((text || '').trim());
    } else {
      CsvEditor.setValue(text);
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
    const editor = CsvEditor.getElement();
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

    const encodingSelect = document.getElementById('csv-encoding-select');
    const encoding = encodingSelect ? encodingSelect.value : 'UTF-8';

    // Auto-switch delimiter based on file extension
    if (typeof CsvDelimiters !== 'undefined') {
      const detectedDelimKey = CsvDelimiters.detectFromFilename(file.name);
      if (detectedDelimKey) {
        applyDelimiter(detectedDelimKey);
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      CsvEditor.setValue(e.target.result);
      CsvPreview.render(e.target.result.trim());
      showToast(`Loaded: ${file.name} (${encoding})`);
    };
    reader.onerror = () => {
      showToast('Error reading file!');
    };
    reader.readAsText(file, encoding);

    // Reset input to allow loading the same file again
    event.target.value = '';
  }

  function convertToJson() {
    const jsonData = CsvPreview.toJSON();
    if (!jsonData || jsonData.length === 0) {
      showToast('No CSV data to convert!');
      return;
    }
    const jsonStr = JSON.stringify(jsonData, null, 2);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    window.location.href = `json.html#content=${compressed}`;
  }

  function downloadCsv() {
    const content = CsvEditor.getValue();
    if (!content.trim()) {
      showToast('Nothing to download — paste some CSV first!');
      return;
    }

    let filename = 'marklink-data.csv';
    let mimeType = 'text/csv;charset=utf-8;';

    if (typeof CsvDelimiters !== 'undefined') {
      const delim = CsvDelimiters.get(currentDelimiter);
      if (delim) {
        filename = `marklink-data${delim.extension}`;
        mimeType = delim.mimeType;
      }
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filename} downloaded!`);
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

  return { init, applyDelimiter, getCurrentDelimiter: () => currentDelimiter };
})();
