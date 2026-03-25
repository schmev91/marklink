/**
 * MarkLink — CSV Preview Module
 * Renders CSV data as an interactive table with sorting, filtering, column visibility, and search
 */
const CsvPreview = (() => {
  let container;
  let headers = [];
  let rows = [];
  let hiddenColumns = new Set();
  let sortColumn = -1;
  let sortDirection = 0; // 0=none, 1=asc, 2=desc
  let columnFilters = {};
  let globalSearch = '';
  let searchMatchCount = 0;

  function init() {
    container = document.getElementById('csv-preview-content');
    if (!container) return;

    // Search bar
    const searchInput = document.getElementById('csv-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        globalSearch = searchInput.value.trim().toLowerCase();
        renderTable();
        updateSearchCount();
      });
    }

    // Column dropdown toggle
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

    // Clear filters
    const clearBtn = document.getElementById('csv-clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        columnFilters = {};
        globalSearch = '';
        const searchInput = document.getElementById('csv-search-input');
        if (searchInput) searchInput.value = '';
        renderTable();
        updateSearchCount();
      });
    }
  }

  /* ---- CSV Parser (RFC 4180) ---- */
  function parseCSV(text) {
    const result = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
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
          if (row.some(f => f !== '')) result.push(row);
          row = [];
          i++;
        } else if (ch === '\n') {
          row.push(field);
          field = '';
          if (row.some(f => f !== '')) result.push(row);
          row = [];
          i++;
        } else {
          field += ch;
          i++;
        }
      }
    }

    // Last field/row
    row.push(field);
    if (row.some(f => f !== '')) result.push(row);

    return result;
  }

  /* ---- Render ---- */
  function render(csvText) {
    if (!container) return;
    const trimmed = csvText.trim();
    if (!trimmed) {
      container.innerHTML = renderEmptyState();
      updateStatus(0, 0);
      return;
    }

    const parsed = parseCSV(trimmed);
    if (parsed.length === 0) {
      container.innerHTML = renderEmptyState();
      updateStatus(0, 0);
      return;
    }

    headers = parsed[0];
    rows = parsed.slice(1);

    // Normalize row lengths
    const colCount = headers.length;
    rows = rows.map(r => {
      while (r.length < colCount) r.push('');
      return r.slice(0, colCount);
    });

    renderTable();
    renderColumnDropdown();
    updateStatus(rows.length, headers.length);
  }

  function renderTable() {
    if (!container || headers.length === 0) return;

    let filteredRows = getFilteredRows();

    // Sort
    if (sortColumn >= 0 && sortDirection !== 0) {
      filteredRows = [...filteredRows].sort((a, b) => {
        let va = a[sortColumn] || '';
        let vb = b[sortColumn] || '';
        // Try numeric comparison
        const na = Number(va);
        const nb = Number(vb);
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
          return sortDirection === 1 ? na - nb : nb - na;
        }
        // String comparison
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        if (va < vb) return sortDirection === 1 ? -1 : 1;
        if (va > vb) return sortDirection === 1 ? 1 : -1;
        return 0;
      });
    }

    searchMatchCount = 0;

    let html = '<div class="csv-table-wrapper"><table class="csv-table">';

    // Header row
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

    // Body — cap rendered rows for performance
    const MAX_RENDER_ROWS = 500;
    const displayRows = filteredRows.length > MAX_RENDER_ROWS ? filteredRows.slice(0, MAX_RENDER_ROWS) : filteredRows;
    const isTruncated = filteredRows.length > MAX_RENDER_ROWS;

    html += '<tbody>';
    if (displayRows.length === 0) {
      const visibleCols = headers.filter((_, i) => !hiddenColumns.has(i)).length;
      html += `<tr><td colspan="${visibleCols}" class="csv-no-results">No matching rows</td></tr>`;
    } else {
      displayRows.forEach((row, ri) => {
        html += `<tr class="${ri % 2 === 1 ? 'csv-row-alt' : ''}">`;
        row.forEach((cell, ci) => {
          if (hiddenColumns.has(ci)) return;
          const cellContent = highlightSearch(escapeHtml(cell));
          html += `<td class="csv-td" title="${escapeHtml(cell)}">${cellContent}</td>`;
        });
        html += '</tr>';
      });
      if (isTruncated) {
        const visibleCols = headers.filter((_, i) => !hiddenColumns.has(i)).length;
        html += `<tr><td colspan="${visibleCols}" class="csv-no-results" style="text-align:center;font-style:italic;">Showing ${MAX_RENDER_ROWS} of ${filteredRows.length} rows for performance</td></tr>`;
      }
    }
    html += '</tbody></table></div>';

    container.innerHTML = html;

    // Bind events
    container.querySelectorAll('.csv-th').forEach(th => {
      th.addEventListener('click', () => {
        const col = parseInt(th.dataset.col);
        handleSort(col);
      });
    });

    container.querySelectorAll('.csv-filter-input').forEach(input => {
      input.addEventListener('input', debounce(() => {
        const col = parseInt(input.dataset.col);
        columnFilters[col] = input.value;
        renderTable();
        updateFilteredStatus();
      }));
    });

    updateFilteredStatus();
  }

  function getFilteredRows() {
    return rows.filter(row => {
      // Column filters
      for (const [col, filter] of Object.entries(columnFilters)) {
        if (!filter) continue;
        const cellVal = (row[parseInt(col)] || '').toLowerCase();
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

    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const col = parseInt(cb.dataset.col);
        if (cb.checked) {
          hiddenColumns.delete(col);
        } else {
          hiddenColumns.add(col);
        }
        renderTable();
      });
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
    const filteredCount = getFilteredRows().length;
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

  /* ---- CSV ↔ JSON Conversion ---- */
  function toJSON() {
    if (headers.length === 0 || rows.length === 0) return null;
    const filtered = getFilteredRows();
    return filtered.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });
  }

  function getHeaders() { return headers; }
  function getRows() { return rows; }

  function onThemeChange() {
    // Re-render to update any theme-dependent visuals
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

  return { init, render, toJSON, getHeaders, getRows, onThemeChange };
})();
