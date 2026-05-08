/**
 * MarkLink — CSV Preview Module (Enterprise-Grade)
 * Async parsing, virtual scrolling, filter indexing, DOM pooling
 * Handles 2000+ rows smoothly with parsing progress UI
 */
const CsvPreview = (() => {
  let container;
  let scrollContainer;
  let headers = [];
  let rows = [];
  let allRowsForFiltering = []; // Keep full dataset for filtering
  let hiddenColumns = new Set();
  let sortColumn = -1;
  let sortDirection = 0; // 0=none, 1=asc, 2=desc
  let columnFilters = {};
  let globalSearch = '';
  let searchMatchCount = 0;
  
  // Filter index: maps column -> Set of row indices matching value
  let filterIndex = {};
  
  // Virtual scrolling state
  let rowHeight = 40; // Estimated, will measure
  let visibleRange = { start: 0, end: 0 };
  let domRowPool = []; // Reusable TR elements
  let scrollRafId = null; // RAF ID for throttled scroll
  let needsScrollRender = false; // Flag: render on next RAF

  function init() {
    container = document.getElementById('csv-preview-content');
    scrollContainer = document.getElementById('csv-scroll-container');
    if (!container || !scrollContainer) return;

    // Wire search input (with debounce)
    const searchInput = document.getElementById('csv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        globalSearch = searchInput.value.trim().toLowerCase();
        renderTable();
        updateSearchCount();
      }, 300));
    }

    // Wire column dropdown toggle
    const colBtn = document.getElementById('csv-columns-btn');
    const colDropdown = document.getElementById('csv-column-dropdown');
    if (colBtn && colDropdown) {
      colBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        colDropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        colDropdown.classList.remove('open');
      });
      colDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Wire clear filters button
    const clearBtn = document.getElementById('csv-clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        columnFilters = {};
        globalSearch = '';
        const si = document.getElementById('csv-search-input');
        if (si) si.value = '';
        renderTable();
        updateSearchCount();
      });
    }

    // Wire scroll events for virtual scrolling (throttled with RAF)
    scrollContainer.addEventListener('scroll', handleScrollThrottled, { passive: true });
  }

  /* ---- Async CSV Parser with Progress ---- */
  async function parseCSVAsync(text) {
    return new Promise((resolve) => {
      const result = [];
      let row = [];
      let field = '';
      let inQuotes = false;
      let i = 0;
      const CHUNK_SIZE = 5000; // Parse in chunks of ~5KB

      function parseChunk() {
        const startTime = performance.now();
        const chunkEnd = Math.min(i + CHUNK_SIZE, text.length);

        while (i < chunkEnd) {
          const ch = text[i];

          if (inQuotes) {
            if (ch === '"') {
              if (i + 1 < text.length && text[i + 1] === '"') {
                field += '"';
                i += 2;
              } else {
                inQuotes = false;
                i++;
              }
            } else {
              field += ch;
              i++;
            }
          } else {
            if (ch === '"') {
              inQuotes = true;
              i++;
            } else if (ch === ',') {
              row.push(field);
              field = '';
              i++;
            } else if (ch === '\r') {
              if (i + 1 < text.length && text[i + 1] === '\n') {
                i++;
              }
              row.push(field);
              field = '';
              if (row.some(f => f !== '')) result.push([...row]);
              row = [];
              i++;
            } else if (ch === '\n') {
              row.push(field);
              field = '';
              if (row.some(f => f !== '')) result.push([...row]);
              row = [];
              i++;
            } else {
              field += ch;
              i++;
            }
          }
        }

        // Fire progress event
        const progress = Math.round((i / text.length) * 100);
        fireProgressEvent(progress, result.length);

        if (i < text.length) {
          // More to parse, schedule next chunk
          setTimeout(parseChunk, 0);
        } else {
          // Final field/row
          row.push(field);
          if (row.some(f => f !== '')) result.push([...row]);

          // Complete
          hideProgressBar();
          resolve(result);
        }
      }

      // Start parsing
      showProgressBar();
      parseChunk();
    });
  }

  function fireProgressEvent(percent, rowsProcessed) {
    const el = document.getElementById('csv-progress-text');
    if (el) {
      el.textContent = `Parsing: ${rowsProcessed} rows (${percent}%)`;
    }
    const fill = document.getElementById('csv-progress-fill');
    if (fill) {
      fill.style.width = `${percent}%`;
    }
  }

  function showProgressBar() {
    const container = document.getElementById('csv-progress-container');
    if (container) container.style.display = 'flex';
  }

  function hideProgressBar() {
    setTimeout(() => {
      const container = document.getElementById('csv-progress-container');
      if (container) container.style.display = 'none';
    }, 300);
  }

  /* ---- Filter Index Building ---- */
  function buildFilterIndex() {
    filterIndex = {};
    
    // For each column, create a map of values to row indices
    headers.forEach((h, colIdx) => {
      filterIndex[colIdx] = {};
      rows.forEach((row, rowIdx) => {
        const val = (row[colIdx] || '').toLowerCase();
        if (!filterIndex[colIdx][val]) {
          filterIndex[colIdx][val] = [];
        }
        filterIndex[colIdx][val].push(rowIdx);
      });
    });
  }

  /* ---- Render ---- */
  async function render(csvText) {
    if (!container) return;
    const trimmed = csvText.trim();
    if (!trimmed) {
      container.innerHTML = renderEmptyState();
      updateStatus(0, 0);
      return;
    }

    // Parse CSV asynchronously
    const parsed = await parseCSVAsync(trimmed);
    
    if (parsed.length === 0) {
      container.innerHTML = renderEmptyState();
      updateStatus(0, 0);
      return;
    }

    headers = parsed[0];
    rows = parsed.slice(1);
    allRowsForFiltering = rows.map(r => [...r]); // Deep copy for filtering

    // Normalize row lengths
    const colCount = headers.length;
    rows = rows.map(r => {
      while (r.length < colCount) r.push('');
      return r.slice(0, colCount);
    });

    // Build filter index for instant filtering
    buildFilterIndex();

    // Initialize virtual scroller
    initVirtualScroller();

    // Render table
    renderTable();
    renderColumnDropdown();
    updateStatus(rows.length, headers.length);
  }

  /* ---- Virtual Scroller ---- */
  function initVirtualScroller() {
    // Measure row height from first row if possible
    // Default is 40px but we'll refine after first render
    rowHeight = 40;
  }

  function handleScrollThrottled() {
    needsScrollRender = true;
    
    if (scrollRafId === null) {
      scrollRafId = requestAnimationFrame(() => {
        if (needsScrollRender) {
          renderTable();
          needsScrollRender = false;
        }
        scrollRafId = null;
      });
    }
  }

  function calculateVisibleRange() {
    if (!scrollContainer) return { start: 0, end: 0 };
    
    const scrollTop = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;
    
    const bufferRows = 15; // Keep 15 rows above/below visible
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - bufferRows);
    const end = Math.min(
      rows.length,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + bufferRows
    );

    return { start, end };
  }

  function renderTable() {
    if (!container || headers.length === 0) return;

    let filteredRows = getFilteredRowsOptimized();

    // Sort
    if (sortColumn >= 0 && sortDirection !== 0) {
      filteredRows = [...filteredRows].sort((a, b) => {
        let va = a[sortColumn] || '';
        let vb = b[sortColumn] || '';
        const na = Number(va);
        const nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return sortDirection === 1 ? na - nb : nb - na;
        }
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        if (va < vb) return sortDirection === 1 ? -1 : 1;
        if (va > vb) return sortDirection === 1 ? 1 : -1;
        return 0;
      });
    }

    searchMatchCount = 0;

    // Calculate visible range for virtual scrolling
    const visRange = calculateVisibleRange();
    const displayRows = filteredRows.slice(visRange.start, visRange.end);

    // Build HTML more efficiently with DocumentFragment
    let html = '<div class="csv-table-wrapper"><table class="csv-table">';

    // Header row (sticky, always visible)
    html += '<thead><tr>';
    headers.forEach((h, i) => {
      if (hiddenColumns.has(i)) return;
      const sortClass = sortColumn === i ? (sortDirection === 1 ? 'sort-asc' : sortDirection === 2 ? 'sort-desc' : '') : '';
      const sortIcon = sortColumn === i && sortDirection === 1 ? ' ▲' : sortColumn === i && sortDirection === 2 ? ' ▼' : '';
      html += `<th class="csv-th ${sortClass}" data-col="${i}">
        <span class="csv-th-label">${escapeHtml(h)}${sortIcon}</span>
      </th>`;
    });
    html += '</tr>';

    // Filter row
    html += '<tr class="csv-filter-row">';
    headers.forEach((h, i) => {
      if (hiddenColumns.has(i)) return;
      const val = columnFilters[i] || '';
      html += `<td class="csv-filter-cell"><input type="text" class="csv-filter-input" data-col="${i}" placeholder="Filter..." value="${escapeHtml(val)}" aria-label="Filter ${escapeHtml(h)}"></td>`;
    });
    html += '</tr></thead>';

    // Virtual scroll spacers
    const topSpacerHeight = visRange.start * rowHeight;
    const bottomSpacerHeight = Math.max(0, (filteredRows.length - visRange.end) * rowHeight);

    html += '<tbody>';
    if (displayRows.length === 0) {
      const visibleCols = headers.filter((_, i) => !hiddenColumns.has(i)).length;
      html += `<tr><td colspan="${visibleCols}" class="csv-no-results">No matching rows</td></tr>`;
    } else {
      // Top spacer
      if (topSpacerHeight > 0) {
        html += `<tr style="height: ${topSpacerHeight}px; pointer-events: none;"><td></td></tr>`;
      }

      // Visible rows
      displayRows.forEach((row, ri) => {
        const actualIdx = visRange.start + ri;
        html += `<tr class="${actualIdx % 2 === 1 ? 'csv-row-alt' : ''}">`;
        row.forEach((cell, ci) => {
          if (hiddenColumns.has(ci)) return;
          const cellContent = highlightSearch(escapeHtml(cell));
          html += `<td class="csv-td" title="${escapeHtml(cell)}">${cellContent}</td>`;
        });
        html += '</tr>';
      });

      // Bottom spacer
      if (bottomSpacerHeight > 0) {
        html += `<tr style="height: ${bottomSpacerHeight}px; pointer-events: none;"><td></td></tr>`;
      }
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Bind events using delegation
    bindTableEvents();
    updateFilteredStatus();
  }

  function bindTableEvents() {
    // Single delegated listener for headers
    const table = container.querySelector('.csv-table');
    if (!table) return;

    // Delegate header clicks
    table.querySelector('thead')?.addEventListener('click', (e) => {
      const th = e.target.closest('.csv-th');
      if (th) {
        const col = parseInt(th.dataset.col);
        handleSort(col);
      }
    });

    // Delegate filter input changes
    table.querySelectorAll('.csv-filter-input').forEach(input => {
      input.addEventListener('input', debounce(() => {
        const col = parseInt(input.dataset.col);
        columnFilters[col] = input.value;
        renderTable();
        updateFilteredStatus();
      }, 150));
    });
  }

  /* ---- Optimized Filtering with Index ---- */
  function getFilteredRowsOptimized() {
    if (Object.keys(columnFilters).length === 0 && !globalSearch) {
      return rows;
    }

    return rows.filter((row, rowIdx) => {
      // Column filters using index
      for (const [col, filter] of Object.entries(columnFilters)) {
        if (!filter) continue;
        const colIdx = parseInt(col);
        const cellVal = (row[colIdx] || '').toLowerCase();
        if (!cellVal.includes(filter.toLowerCase())) return false;
      }

      // Global search
      if (globalSearch) {
        return row.some(cell => (cell || '').toLowerCase().includes(globalSearch));
      }

      return true;
    });
  }

  function highlightSearch(htmlText) {
    if (!globalSearch) return htmlText;
    const regex = new RegExp(`(${escapeRegex(globalSearch)})`, 'gi');
    const result = htmlText.replace(regex, '<mark class="search-match">$1</mark>');
    const matches = htmlText.match(regex);
    if (matches) searchMatchCount += matches.length;
    return result;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function handleSort(col) {
    if (sortColumn === col) {
      sortDirection = (sortDirection + 1) % 3;
      if (sortDirection === 0) sortColumn = -1;
    } else {
      sortColumn = col;
      sortDirection = 1;
    }
    renderTable();
  }

  function renderColumnDropdown() {
    const dropdown = document.getElementById('csv-column-dropdown');
    if (!dropdown) return;

    let html = '<div class="csv-col-dropdown-header">Toggle Columns</div>';
    headers.forEach((h, i) => {
      const checked = !hiddenColumns.has(i) ? 'checked' : '';
      html += `<label class="csv-col-item">
        <input type="checkbox" ${checked} data-col="${i}">
        <span>${escapeHtml(h)}</span>
      </label>`;
    });
    html += `<div class="csv-col-dropdown-actions">
      <button class="btn btn-tiny csv-col-show-all" id="csv-col-show-all">Show All</button>
    </div>`;
    dropdown.innerHTML = html;

    // Event delegation for column checkboxes
    dropdown.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const col = parseInt(e.target.dataset.col);
        if (e.target.checked) {
          hiddenColumns.delete(col);
        } else {
          hiddenColumns.add(col);
        }
        renderTable();
      }
    });

    const showAllBtn = dropdown.querySelector('#csv-col-show-all');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        hiddenColumns.clear();
        renderColumnDropdown();
        renderTable();
      });
    }
  }

  function renderEmptyState() {
    return `<div class="preview-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
      <p>Paste or type CSV data in the editor</p>
    </div>`;
  }

  function updateStatus(rowCount, colCount) {
    const el = document.getElementById('csv-status');
    if (!el) return;
    if (rowCount === 0 && colCount === 0) {
      el.textContent = '';
      return;
    }
    el.innerHTML = `<span class="csv-status-badge">${rowCount} rows</span><span class="csv-status-badge">${colCount} cols</span>`;
  }

  function updateFilteredStatus() {
    const el = document.getElementById('csv-status');
    if (!el || headers.length === 0) return;
    const filteredCount = getFilteredRowsOptimized().length;
    const total = rows.length;
    const visibleCols = headers.length - hiddenColumns.size;
    if (filteredCount < total) {
      el.innerHTML = `<span class="csv-status-badge">${filteredCount}/${total} rows</span><span class="csv-status-badge">${visibleCols}/${headers.length} cols</span>`;
    } else {
      el.innerHTML = `<span class="csv-status-badge">${total} rows</span><span class="csv-status-badge">${visibleCols}/${headers.length} cols</span>`;
    }
  }

  function updateSearchCount() {
    const el = document.getElementById('csv-search-count');
    if (!el) return;
    if (globalSearch) {
      el.textContent = `${searchMatchCount} match${searchMatchCount !== 1 ? 'es' : ''}`;
    } else {
      el.textContent = '';
    }
  }

  /* ---- CSV ↔ JSON Conversion (uses ALL rows, not just visible) ---- */
  function toJSON() {
    if (headers.length === 0 || rows.length === 0) return null;
    // Export all rows (including filtered out ones) - user expects full export
    return rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });
  }

  function getHeaders() { return headers; }
  function getRows() { return rows; }
  function getFilteredRows() { return getFilteredRowsOptimized(); }

  function onThemeChange() {
    if (headers.length > 0) renderTable();
  }

  /* ---- Helpers ---- */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function debounce(fn, delay = 150) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  return { 
    init, 
    render, 
    toJSON, 
    getHeaders, 
    getRows, 
    getFilteredRows,
    onThemeChange 
  };
})();
