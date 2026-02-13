/**
 * MarkLink — Editor Module
 * Markdown toolbar actions and editor enhancements
 */
const Editor = (() => {
  let textarea;

  function init() {
    textarea = document.getElementById('editor');
    if (!textarea) return;

    // Bind toolbar buttons
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action) {
          performAction(action);
          textarea.focus();
        }
      });
    }

    // Tab key support
    textarea.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    // Tab inserts two spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
      return;
    }

    // Keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); performAction('bold'); break;
        case 'i': e.preventDefault(); performAction('italic'); break;
        case 'k': e.preventDefault(); performAction('link'); break;
      }
    }

    // Enter: auto-continue lists
    if (e.key === 'Enter') {
      const { selectionStart } = textarea;
      const text = textarea.value;
      const lineStart = text.lastIndexOf('\n', selectionStart - 1) + 1;
      const line = text.slice(lineStart, selectionStart);

      // Unordered list
      const ulMatch = line.match(/^(\s*)([-*+])\s/);
      if (ulMatch) {
        // If item is empty, remove the marker
        if (line.trim() === ulMatch[2]) {
          e.preventDefault();
          textarea.setSelectionRange(lineStart, selectionStart);
          insertAtCursor('\n');
          return;
        }
        e.preventDefault();
        insertAtCursor('\n' + ulMatch[1] + ulMatch[2] + ' ');
        return;
      }

      // Ordered list
      const olMatch = line.match(/^(\s*)(\d+)\.\s/);
      if (olMatch) {
        const num = parseInt(olMatch[2]) + 1;
        if (line.trim() === olMatch[2] + '.') {
          e.preventDefault();
          textarea.setSelectionRange(lineStart, selectionStart);
          insertAtCursor('\n');
          return;
        }
        e.preventDefault();
        insertAtCursor('\n' + olMatch[1] + num + '. ');
        return;
      }

      // Task list
      const taskMatch = line.match(/^(\s*)- \[[ x]\]\s/);
      if (taskMatch) {
        if (line.trim() === '- [ ]' || line.trim() === '- [x]') {
          e.preventDefault();
          textarea.setSelectionRange(lineStart, selectionStart);
          insertAtCursor('\n');
          return;
        }
        e.preventDefault();
        insertAtCursor('\n' + taskMatch[1] + '- [ ] ');
        return;
      }
    }
  }

  function performAction(action) {
    const actions = {
      bold: () => wrapSelection('**', '**', 'bold text'),
      italic: () => wrapSelection('*', '*', 'italic text'),
      strikethrough: () => wrapSelection('~~', '~~', 'strikethrough'),
      h1: () => prefixLine('# ', 'Heading 1'),
      h2: () => prefixLine('## ', 'Heading 2'),
      h3: () => prefixLine('### ', 'Heading 3'),
      ul: () => prefixLine('- ', 'List item'),
      ol: () => prefixLine('1. ', 'List item'),
      checklist: () => prefixLine('- [ ] ', 'Task'),
      quote: () => prefixLine('> ', 'Quote'),
      code: () => wrapSelection('`', '`', 'code'),
      codeblock: () => wrapSelection('\n```\n', '\n```\n', 'code here'),
      link: () => insertLink(),
      image: () => insertImage(),
      table: () => insertTable(),
      hr: () => insertAtCursor('\n\n---\n\n'),
      mermaid: () => insertMermaid(),
    };

    const fn = actions[action];
    if (fn) fn();
  }

  function wrapSelection(before, after, placeholder) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || placeholder;

    const text = before + selected + after;
    replaceSelection(text);

    // Select the inserted text (excluding wrappers)
    const newStart = start + before.length;
    const newEnd = newStart + selected.length;
    textarea.setSelectionRange(newStart, newEnd);
    fireInput();
  }

  function prefixLine(prefix, placeholder) {
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;

    textarea.setSelectionRange(lineStart, lineStart);
    insertAtCursor(prefix);

    if (textarea.value.slice(lineStart + prefix.length).trim() === '') {
      const pStart = lineStart + prefix.length;
      insertAtCursor(placeholder);
      textarea.setSelectionRange(pStart, pStart + placeholder.length);
    }
    fireInput();
  }

  function insertLink() {
    const selected = getSelection() || 'link text';
    const text = `[${selected}](url)`;
    replaceSelection(text);
    // Select "url"
    const start = textarea.selectionStart;
    const urlStart = start - 4; // before "url)"
    textarea.setSelectionRange(urlStart, urlStart + 3);
    fireInput();
  }

  function insertImage() {
    const selected = getSelection() || 'alt text';
    const text = `![${selected}](image-url)`;
    replaceSelection(text);
    const start = textarea.selectionStart;
    const urlStart = start - 10;
    textarea.setSelectionRange(urlStart, urlStart + 9);
    fireInput();
  }

  function insertTable() {
    const table = '\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n';
    insertAtCursor(table);
    fireInput();
  }

  function insertMermaid() {
    const template = '\n```mermaid\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]\n    C --> E[End]\n    D --> E\n```\n';
    insertAtCursor(template);
    fireInput();
  }

  function getSelection() {
    return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
  }

  function replaceSelection(text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
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
    }
  }

  function getElement() {
    return textarea;
  }

  return { init, getValue, setValue, getElement };
})();
