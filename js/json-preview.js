/**
 * MarkLink — JSON Preview Module
 * Tree View & Nodes View rendering with search
 */
const JsonPreview = (() => {
  let previewEl;
  let currentView = 'tree'; // 'tree' or 'nodes'
  let currentData = null;
  let searchQuery = '';
  let matchElements = [];
  let currentMatchIndex = -1;
  let debounceTimer;

  function init() {
    previewEl = document.getElementById('json-preview-content');
    if (!previewEl) return;

    // View tabs
    document.querySelectorAll('.json-view-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        if (view && view !== currentView) {
          currentView = view;
          document.querySelectorAll('.json-view-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          doRender();
        }
      });
    });

    // Search
    const searchInput = document.getElementById('json-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          doRender();
          if (searchQuery) {
            highlightMatches();
          }
        }, 200);
      });
    }

    // Search nav
    document.getElementById('json-search-prev')?.addEventListener('click', () => navigateMatch(-1));
    document.getElementById('json-search-next')?.addEventListener('click', () => navigateMatch(1));

    // Expand/collapse all
    document.getElementById('json-expand-all')?.addEventListener('click', () => expandAll(true));
    document.getElementById('json-collapse-all')?.addEventListener('click', () => expandAll(false));
  }

  function render(jsonString) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        currentData = JSON.parse(jsonString);
        doRender();
      } catch (err) {
        showError(err.message);
        currentData = null;
      }
    }, 300);
  }

  function renderImmediate(jsonString) {
    try {
      currentData = JSON.parse(jsonString);
      doRender();
    } catch (err) {
      showError(err.message);
      currentData = null;
    }
  }

  function doRender() {
    if (!previewEl) return;
    if (currentData === null && !previewEl.innerHTML) {
      showEmpty();
      return;
    }
    if (currentData === null) return;

    const scrollTop = previewEl.scrollTop;

    if (currentView === 'tree') {
      renderTreeView();
    } else {
      renderNodesView();
    }

    previewEl.scrollTop = scrollTop;

    if (searchQuery) {
      highlightMatches();
    }
  }

  // ============ TREE VIEW ============
  function renderTreeView() {
    const html = buildTreeNode(currentData, 'root', 0, true);
    previewEl.innerHTML = `<div class="json-tree">${html}</div>`;

    // Bind toggle events
    previewEl.querySelectorAll('.tree-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const node = toggle.closest('.tree-node');
        if (node) {
          node.classList.toggle('collapsed');
          const icon = toggle.querySelector('.toggle-icon');
          if (icon) icon.textContent = node.classList.contains('collapsed') ? '▶' : '▼';
        }
      });
    });
  }

  function buildTreeNode(data, key, depth, isRoot) {
    const indent = depth * 1;
    const type = getType(data);

    if (type === 'object') {
      const keys = Object.keys(data);
      const isEmpty = keys.length === 0;
      const keyLabel = isRoot ? '' : `<span class="tree-key">${escapeHtml(String(key))}</span><span class="tree-colon">:</span> `;
      if (isEmpty) {
        return `<div class="tree-node tree-leaf" style="--depth:${indent}">
          <span class="tree-indent"></span>
          ${keyLabel}<span class="tree-bracket">{}</span>
        </div>`;
      }
      let children = '';
      keys.forEach((k, i) => {
        children += buildTreeNode(data[k], k, depth + 1, false);
      });
      return `<div class="tree-node" style="--depth:${indent}">
        <div class="tree-toggle">
          <span class="toggle-icon">▼</span>
          ${keyLabel}<span class="tree-bracket">{</span> <span class="tree-count">${keys.length} ${keys.length === 1 ? 'key' : 'keys'}</span>
        </div>
        <div class="tree-children">${children}</div>
        <div class="tree-close" style="--depth:${indent}"><span class="tree-bracket">}</span></div>
      </div>`;
    }

    if (type === 'array') {
      const isEmpty = data.length === 0;
      const keyLabel = isRoot ? '' : `<span class="tree-key">${escapeHtml(String(key))}</span><span class="tree-colon">:</span> `;
      if (isEmpty) {
        return `<div class="tree-node tree-leaf" style="--depth:${indent}">
          <span class="tree-indent"></span>
          ${keyLabel}<span class="tree-bracket">[]</span>
        </div>`;
      }
      let children = '';
      data.forEach((item, i) => {
        children += buildTreeNode(item, i, depth + 1, false);
      });
      return `<div class="tree-node" style="--depth:${indent}">
        <div class="tree-toggle">
          <span class="toggle-icon">▼</span>
          ${keyLabel}<span class="tree-bracket">[</span> <span class="tree-count">${data.length} ${data.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div class="tree-children">${children}</div>
        <div class="tree-close" style="--depth:${indent}"><span class="tree-bracket">]</span></div>
      </div>`;
    }

    // Primitive
    const keyLabel = isRoot ? '' : `<span class="tree-key">${escapeHtml(String(key))}</span><span class="tree-colon">:</span> `;
    const valHtml = formatValue(data, type);
    return `<div class="tree-node tree-leaf" style="--depth:${indent}">
      <span class="tree-indent"></span>
      ${keyLabel}${valHtml}
    </div>`;
  }

  // ============ NODES VIEW ============
  function renderNodesView() {
    const html = buildNodesCards(currentData, '', 0);
    previewEl.innerHTML = `<div class="json-nodes">${html}</div>`;
  }

  function buildNodesCards(data, parentPath, depth) {
    const type = getType(data);

    if (type === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return `<div class="node-card node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(parentPath)}">
          <div class="node-header"><span class="node-type type-object">object</span><span class="node-path">${escapeHtml(parentPath || 'root')}</span></div>
          <div class="node-empty">Empty object</div>
        </div>`;
      }
      let cards = '';
      keys.forEach(k => {
        const path = parentPath ? `${parentPath}.${k}` : k;
        const childType = getType(data[k]);
        if (childType === 'object' || childType === 'array') {
          cards += `<div class="node-card node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(path)}">
            <div class="node-header">
              <span class="node-type type-${childType}">${childType}</span>
              <span class="node-key">${escapeHtml(k)}</span>
              <span class="node-meta">${childType === 'array' ? data[k].length + ' items' : Object.keys(data[k]).length + ' keys'}</span>
            </div>
            <div class="node-children">${buildNodesCards(data[k], path, depth + 1)}</div>
          </div>`;
        } else {
          cards += `<div class="node-card node-leaf node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(path)}">
            <div class="node-kv">
              <span class="node-key">${escapeHtml(k)}</span>
              <span class="node-type type-${childType}">${childType}</span>
              ${formatNodeValue(data[k], childType)}
            </div>
          </div>`;
        }
      });
      return cards;
    }

    if (type === 'array') {
      if (data.length === 0) {
        return `<div class="node-card node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(parentPath)}">
          <div class="node-header"><span class="node-type type-array">array</span><span class="node-path">${escapeHtml(parentPath || 'root')}</span></div>
          <div class="node-empty">Empty array</div>
        </div>`;
      }
      let cards = '';
      data.forEach((item, i) => {
        const path = parentPath ? `${parentPath}[${i}]` : `[${i}]`;
        const childType = getType(item);
        if (childType === 'object' || childType === 'array') {
          cards += `<div class="node-card node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(path)}">
            <div class="node-header">
              <span class="node-type type-${childType}">${childType}</span>
              <span class="node-key">${i}</span>
              <span class="node-meta">${childType === 'array' ? item.length + ' items' : Object.keys(item).length + ' keys'}</span>
            </div>
            <div class="node-children">${buildNodesCards(item, path, depth + 1)}</div>
          </div>`;
        } else {
          cards += `<div class="node-card node-leaf node-depth-${Math.min(depth, 4)}" data-path="${escapeHtml(path)}">
            <div class="node-kv">
              <span class="node-key">${i}</span>
              <span class="node-type type-${childType}">${childType}</span>
              ${formatNodeValue(item, childType)}
            </div>
          </div>`;
        }
      });
      return cards;
    }

    // Primitive root
    return `<div class="node-card node-leaf node-depth-0">
      <div class="node-kv">
        <span class="node-type type-${type}">${type}</span>
        ${formatNodeValue(data, type)}
      </div>
    </div>`;
  }

  // ============ SEARCH ============
  function highlightMatches() {
    matchElements = [];
    currentMatchIndex = -1;

    if (!searchQuery.trim()) {
      updateSearchCounter();
      return;
    }

    const query = searchQuery.toLowerCase();
    const allTextEls = previewEl.querySelectorAll('.tree-key, .tree-value, .node-key, .node-value');

    allTextEls.forEach(el => {
      el.classList.remove('search-match', 'search-active');
      const text = el.textContent.toLowerCase();
      if (text.includes(query)) {
        el.classList.add('search-match');
        matchElements.push(el);

        // Auto-expand collapsed parents in tree view
        let parent = el.closest('.tree-node.collapsed');
        while (parent) {
          parent.classList.remove('collapsed');
          const icon = parent.querySelector(':scope > .tree-toggle .toggle-icon');
          if (icon) icon.textContent = '▼';
          parent = parent.parentElement?.closest('.tree-node.collapsed');
        }
      }
    });

    if (matchElements.length > 0) {
      currentMatchIndex = 0;
      matchElements[0].classList.add('search-active');
      matchElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateSearchCounter();
  }

  function navigateMatch(direction) {
    if (matchElements.length === 0) return;

    matchElements[currentMatchIndex]?.classList.remove('search-active');
    currentMatchIndex = (currentMatchIndex + direction + matchElements.length) % matchElements.length;
    matchElements[currentMatchIndex]?.classList.add('search-active');
    matchElements[currentMatchIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    updateSearchCounter();
  }

  function updateSearchCounter() {
    const counter = document.getElementById('json-search-count');
    if (!counter) return;
    if (!searchQuery.trim() || matchElements.length === 0) {
      counter.textContent = searchQuery.trim() ? 'No matches' : '';
    } else {
      counter.textContent = `${currentMatchIndex + 1} of ${matchElements.length}`;
    }
  }

  // ============ EXPAND/COLLAPSE ALL ============
  function expandAll(expand) {
    if (currentView !== 'tree') return;
    previewEl.querySelectorAll('.tree-node').forEach(node => {
      if (!node.classList.contains('tree-leaf')) {
        if (expand) {
          node.classList.remove('collapsed');
        } else {
          node.classList.add('collapsed');
        }
        const icon = node.querySelector(':scope > .tree-toggle .toggle-icon');
        if (icon) icon.textContent = expand ? '▼' : '▶';
      }
    });
  }

  // ============ HELPERS ============
  function getType(val) {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function formatValue(val, type) {
    switch (type) {
      case 'string':
        return `<span class="tree-value type-string">"${escapeHtml(val)}"</span>`;
      case 'number':
        return `<span class="tree-value type-number">${val}</span>`;
      case 'boolean':
        return `<span class="tree-value type-boolean">${val}</span>`;
      case 'null':
        return `<span class="tree-value type-null">null</span>`;
      default:
        return `<span class="tree-value">${escapeHtml(String(val))}</span>`;
    }
  }

  function formatNodeValue(val, type) {
    switch (type) {
      case 'string':
        return `<span class="node-value type-string">"${escapeHtml(val)}"</span>`;
      case 'number':
        return `<span class="node-value type-number">${val}</span>`;
      case 'boolean':
        return `<span class="node-value type-boolean">${val}</span>`;
      case 'null':
        return `<span class="node-value type-null">null</span>`;
      default:
        return `<span class="node-value">${escapeHtml(String(val))}</span>`;
    }
  }

  function showError(msg) {
    if (!previewEl) return;
    previewEl.innerHTML = `<div class="json-error">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <p>Invalid JSON</p>
      <span>${escapeHtml(msg)}</span>
    </div>`;
  }

  function showEmpty() {
    if (!previewEl) return;
    previewEl.innerHTML = `<div class="preview-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
      <p>Paste or type JSON in the editor to see it visualized here.</p>
    </div>`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function onThemeChange() {
    if (currentData !== null) {
      doRender();
    }
  }

  return { init, render, renderImmediate, onThemeChange };
})();
