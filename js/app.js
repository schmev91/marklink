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

    // Wire editor input to preview rendering
    const editor = Editor.getElement();
    if (editor) {
      editor.addEventListener('input', () => {
        Preview.render(Editor.getValue());
      });
    }

    // Wire load file button
    const loadBtn = document.getElementById('load-file-btn');
    const fileInput = document.getElementById('file-input');
    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileLoad);
    }

    // Load content: URL shared content > default markdown
    const sharedContent = Share.loadFromUrl();
    if (sharedContent) {
      Editor.setValue(sharedContent);
    } else {
      Editor.setValue(DEFAULT_MARKDOWN);
    }
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
