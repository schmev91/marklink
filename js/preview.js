/**
 * MarkLink — Preview Module
 * Renders markdown with syntax highlighting and Mermaid diagrams
 * Optimized for large documents with debouncing and selective Mermaid re-rendering
 */
const Preview = (() => {
  let previewEl;
  let debounceTimer;
  let mermaidIdCounter = 0;
  let lastMermaidSources = new Map(); // cache mermaid source to avoid re-rendering unchanged diagrams
  let isRenderPending = false;
  let pendingMarkdown = '';

  function init() {
    previewEl = document.getElementById('preview-content');
    if (!previewEl) return;

    configureMermaid();
    configureMarked();
  }

  function configureMermaid() {
    const isDark = Theme.get() === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      logLevel: 'error',
    });
  }

  function configureMarked() {
    const renderer = new marked.Renderer();

    renderer.code = function(codeObj) {
      const text = typeof codeObj === 'object' ? codeObj.text : codeObj;
      const lang = typeof codeObj === 'object' ? codeObj.lang : arguments[1];

      if (lang === 'mermaid') {
        mermaidIdCounter++;
        return `<div class="mermaid-container" data-mermaid-id="mermaid-${mermaidIdCounter}" data-mermaid-source="${encodeURIComponent(text)}">${escapeHtml(text)}</div>`;
      }

      // Syntax highlighting with known language
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(text, { language: lang }).value;
          return `<pre data-lang="${escapeHtml(lang)}"><code class="hljs language-${escapeHtml(lang)}">${highlighted}</code></pre>`;
        } catch (_) {}
      }

      // Auto-detect fallback
      try {
        const highlighted = hljs.highlightAuto(text).value;
        return `<pre><code class="hljs">${highlighted}</code></pre>`;
      } catch (_) {
        return `<pre><code>${escapeHtml(text)}</code></pre>`;
      }
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true,
    });
  }

  function render(markdown) {
    clearTimeout(debounceTimer);
    pendingMarkdown = markdown;
    debounceTimer = setTimeout(() => {
      if (!isRenderPending) {
        isRenderPending = true;
        requestAnimationFrame(() => {
          doRender(pendingMarkdown);
          isRenderPending = false;
        });
      }
    }, 300);
  }

  function renderImmediate(markdown) {
    clearTimeout(debounceTimer);
    isRenderPending = false;
    doRender(markdown);
  }

  async function doRender(markdown) {
    if (!previewEl) return;

    if (!markdown.trim()) {
      previewEl.innerHTML = `
        <div class="preview-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <p>Start typing in the editor to see your markdown rendered here.</p>
        </div>
      `;
      lastMermaidSources.clear();
      return;
    }

    mermaidIdCounter = 0;

    // Save scroll position
    const scrollTop = previewEl.scrollTop;

    try {
      const html = marked.parse(markdown);
      previewEl.innerHTML = html;
    } catch (err) {
      previewEl.innerHTML = `<p style="color:var(--error)">Error rendering markdown: ${escapeHtml(err.message)}</p>`;
      return;
    }

    // Restore scroll position
    previewEl.scrollTop = scrollTop;

    // Render mermaid diagrams (only changed ones)
    await renderMermaidDiagrams();
  }

  async function renderMermaidDiagrams() {
    const containers = previewEl.querySelectorAll('.mermaid-container');
    if (containers.length === 0) {
      lastMermaidSources.clear();
      return;
    }

    const newSources = new Map();

    for (const container of containers) {
      const id = container.dataset.mermaidId;
      const source = decodeURIComponent(container.dataset.mermaidSource || '');
      newSources.set(id, source);

      // Check if this diagram's source is unchanged from last render
      const prevSvg = lastMermaidSources.get(source);
      if (prevSvg) {
        container.innerHTML = prevSvg;
        continue;
      }

      try {
        const { svg } = await mermaid.render(id, source);
        container.innerHTML = svg;
        // Cache rendered SVG keyed by source content
        lastMermaidSources.set(source, svg);
      } catch (err) {
        container.innerHTML = `<div class="mermaid-error">⚠️ Mermaid Error: ${escapeHtml(err.message || 'Failed to render diagram')}</div>`;
      }
    }
  }

  function onThemeChange(theme) {
    // Clear mermaid cache since theme changed
    lastMermaidSources.clear();
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
      logLevel: 'error',
    });
    const content = Editor.getValue();
    if (content) {
      renderImmediate(content);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { init, render, renderImmediate, onThemeChange };
})();
