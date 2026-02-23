/**
 * MarkLink — CSV Editor Module
 * CSV textarea editor with validation and helpers
 */
const CsvEditor = (() => {
  let textarea;
  let validationEl;

  function init() {
    textarea = document.getElementById('csv-editor');
    validationEl = document.getElementById('csv-validation');
    if (!textarea) return;

    textarea.addEventListener('keydown', handleKeydown);
    textarea.addEventListener('input', validate);
  }

  function handleKeydown(e) {
    // Tab inserts two spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
      return;
    }
  }

  function validate() {
    const val = textarea.value.trim();
    if (!val) {
      setValidation(null);
      return;
    }
    const lines = val.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 1) {
      setValidation(null);
      return;
    }

    // Count columns in header
    const headerCols = countColumns(lines[0]);
    let inconsistent = false;
    for (let i = 1; i < lines.length; i++) {
      const cols = countColumns(lines[i]);
      if (cols !== headerCols) {
        inconsistent = true;
        break;
      }
    }

    if (inconsistent) {
      setValidation(false, 'Inconsistent column count');
    } else {
      setValidation(true, `${lines.length - 1} rows × ${headerCols} cols`);
    }
  }

  // Simple column counter that respects quoted fields
  function countColumns(line) {
    let count = 1;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) count++;
    }
    return count;
  }

  function setValidation(state, msg) {
    if (!validationEl) return;
    if (state === null) {
      validationEl.className = 'csv-validation';
      validationEl.textContent = '';
    } else if (state) {
      validationEl.className = 'csv-validation valid';
      validationEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> ${msg}`;
    } else {
      validationEl.className = 'csv-validation invalid';
      validationEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${escapeHtml(msg)}`;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function insertAtCursor(text) {
    const start = textarea.selectionStart;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(textarea.selectionEnd);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
  }

  function fireInput() {
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function getValue() {
    return textarea ? textarea.value : '';
  }

  function setValue(text) {
    if (textarea) {
      textarea.value = text;
      fireInput();
      validate();
    }
  }

  function getElement() {
    return textarea;
  }

  return { init, getValue, setValue, getElement, fireInput };
})();
