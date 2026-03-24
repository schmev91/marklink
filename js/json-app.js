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

    // Wire editor input to preview rendering (debounced)
    const editor = JsonEditor.getElement();
    let renderTimer;
    if (editor) {
      editor.addEventListener('input', () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
          const val = JsonEditor.getValue().trim();
          if (val) {
            JsonPreview.render(val);
          }
        }, 300);
      });
    }

    // Wire load file button
    const loadBtn = document.getElementById('json-load-file-btn');
    const fileInput = document.getElementById('json-file-input');
    if (loadBtn && fileInput) {
      loadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileLoad);
    }

    // Load content: URL shared > default
    const sharedContent = JsonShare.loadFromUrl();
    if (sharedContent) {
      JsonEditor.setValue(sharedContent);
    } else {
      JsonEditor.setValue(DEFAULT_JSON);
    }
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
