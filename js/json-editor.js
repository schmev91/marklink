/**
 * MarkLink — JSON Editor Module
 * JSON textarea editor with validation and formatting
 */
const JsonEditor = (() => {
  let textarea;
  let validationEl;
  let isValid = true;
  let validateTimer;

  function init() {
    textarea = document.getElementById('json-editor');
    validationEl = document.getElementById('json-validation');
    if (!textarea) return;

    textarea.addEventListener('keydown', handleKeydown);
    textarea.addEventListener('input', debouncedValidate);
  }

  function debouncedValidate() {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(validate, 300);
  }

  function handleKeydown(e) {
    // Tab inserts two spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
      return;
    }

    // Ctrl+Shift+F — format/prettify
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      formatJson();
      return;
    }

    // Auto-close brackets
    const pairs = { '{': '}', '[': ']', '"': '"' };
    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        textarea.value = before + e.key + pairs[e.key] + after;
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        fireInput();
      }
    }
  }

  function formatJson() {
    const val = textarea.value.trim();
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      textarea.value = JSON.stringify(parsed, null, 2);
      fireInput();
      validate();
    } catch (_) {
      // can't format invalid JSON
    }
  }

  function validate() {
    const val = textarea.value.trim();
    if (!val) {
      setValidation(null);
      return;
    }
    try {
      JSON.parse(val);
      isValid = true;
      setValidation(true);
    } catch (err) {
      isValid = false;
      setValidation(false, err.message);
    }
  }

  function setValidation(state, msg) {
    if (!validationEl) return;
    if (state === null) {
      validationEl.className = 'json-validation';
      validationEl.textContent = '';
    } else if (state) {
      validationEl.className = 'json-validation valid';
      validationEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Valid JSON';
    } else {
      validationEl.className = 'json-validation invalid';
      const shortMsg = msg ? msg.replace(/^JSON\.parse:\s*/, '').substring(0, 60) : 'Invalid';
      validationEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${escapeHtml(shortMsg)}`;
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

  function getIsValid() {
    return isValid;
  }

  return { init, getValue, setValue, getElement, getIsValid, formatJson };
})();
