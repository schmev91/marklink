/**
 * MarkLink — CSV Comparison Module
 * Handles comparison of current editor CSV against reference CSV
 */
const CSVComparison = (() => {
  let modalElement = null;
  let currentComparisonResult = null;

  /**
   * Parse CSV text into 2D array of strings
   * @param {string} csvText - Raw CSV text with line breaks and commas
   * @returns {Array<Array<string>>} 2D array representing rows and columns
   */
  function parseCSV(csvText) {
    const result = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    const text = csvText || '';

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
          if (row.length > 0) {
            result.push([...row]);
          }
          row = [];
          i++;
        } else if (ch === '\n') {
          row.push(field);
          field = '';
          if (row.length > 0) {
            result.push([...row]);
          }
          row = [];
          i++;
        } else {
          field += ch;
          i++;
        }
      }
    }

    row.push(field);
    if (row.length > 0) {
      result.push([...row]);
    }

    return result;
  }

  /**
   * Compare two CSVs and return detailed diff result
   * @param {Array<Array<string>>} editorCSV - Parsed CSV from editor
   * @param {Array<Array<string>>} referenceCSV - Parsed CSV from reference input
   * @returns {Object} DiffResult object with match status and differences
   */
  function compareCSVs(editorCSV, referenceCSV) {
    const startTime = performance.now();

    // Initialize result structure
    const diffResult = {
      matchStatus: 'match',
      addedRows: [],
      removedRows: [],
      modifiedRows: [],
      rowCountDiff: {
        editorCount: editorCSV.length - 1, // Exclude header
        referenceCount: referenceCSV.length - 1,
        isDifferent: false
      },
      columnCountDiff: {
        editorCount: editorCSV.length > 0 ? editorCSV[0].length : 0,
        referenceCount: referenceCSV.length > 0 ? referenceCSV[0].length : 0,
        isDifferent: false
      },
      timestamp: Date.now(),
      comparisonTime: 0
    };

    // Handle empty CSVs
    if (editorCSV.length === 0 && referenceCSV.length === 0) {
      diffResult.matchStatus = 'match';
      diffResult.comparisonTime = Math.round(performance.now() - startTime);
      return diffResult;
    }

    // Extract headers (first row) and data rows
    const editorHeaders = editorCSV.length > 0 ? editorCSV[0] : [];
    const referenceHeaders = referenceCSV.length > 0 ? referenceCSV[0] : [];
    const editorRows = editorCSV.slice(1);
    const referenceRows = referenceCSV.slice(1);

    // Check column count
    if (editorHeaders.length !== referenceHeaders.length) {
      diffResult.columnCountDiff.isDifferent = true;
      diffResult.matchStatus = 'no-match';
    }

    // Check row count
    if (editorRows.length !== referenceRows.length) {
      diffResult.rowCountDiff.isDifferent = true;
      diffResult.matchStatus = 'no-match';
    }

    // Build column header index for reference CSV (for reporting column names in diffs)
    const headerIndex = {};
    referenceHeaders.forEach((header, idx) => {
      headerIndex[idx] = header;
    });

    // Compare rows by index
    const maxRows = Math.max(editorRows.length, referenceRows.length);
    for (let i = 0; i < maxRows; i++) {
      const editorRow = editorRows[i];
      const referenceRow = referenceRows[i];

      if (!referenceRow && editorRow) {
        // Reference row missing (added in editor)
        diffResult.addedRows.push({
          editorRowIndex: i,
          values: editorRow
        });
        diffResult.matchStatus = 'no-match';
      } else if (!editorRow && referenceRow) {
        // Editor row missing (removed from reference)
        diffResult.removedRows.push({
          referenceRowIndex: i,
          values: referenceRow
        });
        diffResult.matchStatus = 'no-match';
      } else if (editorRow && referenceRow) {
        // Both rows exist, compare cell by cell
        const changes = [];
        const maxCols = Math.max(editorRow.length, referenceRow.length);

        for (let j = 0; j < maxCols; j++) {
          const editorCell = editorRow[j] || '';
          const referenceCell = referenceRow[j] || '';

          if (editorCell !== referenceCell) {
            changes.push({
              columnIndex: j,
              columnName: headerIndex[j] || `Column ${j}`,
              oldValue: referenceCell,
              newValue: editorCell
            });
          }
        }

        if (changes.length > 0) {
          diffResult.modifiedRows.push({
            rowIndex: i,
            changes: changes
          });
          diffResult.matchStatus = 'no-match';
        }
      }
    }

    diffResult.comparisonTime = Math.round(performance.now() - startTime);
    return diffResult;
  }

  /**
   * Create modal HTML structure
   * @returns {HTMLElement} Modal element
   */
  function createModal() {
    const modal = document.createElement('div');
    modal.id = 'csv-comparison-modal';
    modal.className = 'csv-comparison-modal';
    modal.innerHTML = `
      <div class="csv-comparison-modal-content">
        <div class="csv-comparison-modal-header">
          <h2>Compare CSV</h2>
          <button class="csv-comparison-close-btn" aria-label="Close" id="csv-comparison-close-modal-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="csv-comparison-modal-body">
          <div class="csv-input-method-tabs">
            <button class="csv-method-tab active" data-method="paste">Paste Text</button>
            <button class="csv-method-tab" data-method="upload">Upload File</button>
            <button class="csv-method-tab" data-method="url">Load from URL</button>
          </div>

          <div id="csv-paste-input" class="csv-input-method-section active">
            <label for="csv-reference-input">Paste Reference CSV:</label>
            <textarea
              id="csv-reference-input"
              class="csv-reference-input"
              placeholder="Paste CSV data here..."
              spellcheck="false"
            ></textarea>
          </div>

          <div id="csv-upload-input" class="csv-input-method-section">
            <label for="csv-reference-file">Upload CSV File:</label>
            <input
              type="file"
              id="csv-reference-file"
              accept=".csv,text/csv"
              class="csv-reference-file"
            />
            <div id="csv-upload-status" class="csv-upload-status" style="display: none;"></div>
          </div>

          <div id="csv-url-input" class="csv-input-method-section">
            <label for="csv-reference-url">CSV URL:</label>
            <input
              type="text"
              id="csv-reference-url"
              class="csv-reference-url"
              placeholder="https://example.com/data.csv"
            />
            <div id="csv-url-status" class="csv-url-status" style="display: none;"></div>
          </div>

          <div id="csv-error-message" class="csv-error-message" style="display: none;"></div>

          <div class="csv-comparison-button-group">
            <button id="csv-do-compare-btn" class="btn csv-compare-btn">Compare</button>
            <button id="csv-comparison-close-btn" class="btn csv-close-btn">Close</button>
          </div>

          <div id="csv-comparison-result" class="csv-comparison-result" style="display: none;">
            <div id="csv-result-badge" class="csv-result-badge"></div>
            <div id="csv-diff-report" class="csv-diff-report"></div>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  /**
   * Display result badge (match/no-match)
   * @param {Object} diffResult - DiffResult object from compareCSVs
   */
  function displayResult(diffResult) {
    const resultDiv = document.getElementById('csv-comparison-result');
    const badge = document.getElementById('csv-result-badge');

    if (!resultDiv || !badge) return;

    // Clear previous display
    badge.innerHTML = '';
    document.getElementById('csv-diff-report').innerHTML = '';

    // Show result badge
    if (diffResult.matchStatus === 'match') {
      badge.className = 'csv-result-badge match';
      badge.innerHTML = `
        <svg style="display: inline; margin-right: 6px;" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Match`;
    } else {
      badge.className = 'csv-result-badge no-match';
      badge.innerHTML = `
        <svg style="display: inline; margin-right: 6px;" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        No Match`;
    }

    // Show diff report if no match
    if (diffResult.matchStatus === 'no-match') {
      const diffHtml = formatDiffReport(diffResult);
      if (diffHtml) {
        document.getElementById('csv-diff-report').innerHTML = diffHtml;
      }
    }

    resultDiv.style.display = 'block';
  }

  /**
   * Create and display the comparison modal
   * @param {HTMLElement} element - Parent element to attach modal to
   */
  function setupModalHandlers() {
    // Tab switching for input methods
    document.querySelectorAll('.csv-method-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const method = this.dataset.method;

        // Update active tab
        document.querySelectorAll('.csv-method-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Update active section
        document.querySelectorAll('.csv-input-method-section').forEach(section => {
          section.classList.remove('active');
        });
        document.getElementById('csv-' + method + '-input').classList.add('active');

        // Clear error message
        const errorMsg = document.getElementById('csv-error-message');
        if (errorMsg) errorMsg.style.display = 'none';
      });
    });

    // File upload handler
    const fileInput = document.getElementById('csv-reference-file');
    if (fileInput) {
      fileInput.addEventListener('change', handleFileUpload);
    }

    // URL loader trigger on input
    const urlInput = document.getElementById('csv-reference-url');
    if (urlInput) {
      urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleUrlLoad();
      });
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      // Store the loaded content in a data attribute for comparison
      modalElement.dataset.referenceContent = content;

      const statusDiv = document.getElementById('csv-upload-status');
      if (statusDiv) {
        statusDiv.textContent = 'File loaded: ' + file.name;
        statusDiv.style.display = 'block';
      }
    };
    reader.onerror = function() {
      showErrorMessage('Error reading file: ' + file.name);
    };
    reader.readAsText(file);
  }

  function handleUrlLoad() {
    const urlInput = document.getElementById('csv-reference-url');
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
      showErrorMessage('Please enter a URL');
      return;
    }

    const statusDiv = document.getElementById('csv-url-status');
    if (statusDiv) {
      statusDiv.textContent = 'Loading...';
      statusDiv.style.display = 'block';
    }

    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(content => {
        // Store the loaded content in a data attribute for comparison
        modalElement.dataset.referenceContent = content;
        if (statusDiv) {
          statusDiv.textContent = 'CSV loaded from URL';
          statusDiv.style.display = 'block';
        }
      })
      .catch(error => {
        showErrorMessage('Failed to load URL: ' + error.message + ' (Check CORS if cross-origin)');
        if (statusDiv) statusDiv.style.display = 'none';
      });
  }

  function showErrorMessage(message) {
    const errorDiv = document.getElementById('csv-error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  function showComparisonModal(element) {
    if (!modalElement) {
      modalElement = createModal();
      element.appendChild(modalElement);

      // Wire up close buttons
      document.getElementById('csv-comparison-close-modal-btn').addEventListener('click', closeComparisonModal);
      document.getElementById('csv-comparison-close-btn').addEventListener('click', closeComparisonModal);

      // Wire up Compare button
      document.getElementById('csv-do-compare-btn').addEventListener('click', handleCompareClick);

      // Setup modal handlers (tabs, file upload, URL loading)
      setupModalHandlers();
    }

    // Clear previous result and input
    document.getElementById('csv-reference-input').value = '';
    document.getElementById('csv-reference-file').value = '';
    document.getElementById('csv-reference-url').value = '';
    document.getElementById('csv-comparison-result').style.display = 'none';
    document.getElementById('csv-error-message').style.display = 'none';
    document.getElementById('csv-upload-status').style.display = 'none';
    document.getElementById('csv-url-status').style.display = 'none';
    delete modalElement.dataset.referenceContent;
    modalElement.classList.add('open');
  }

  /**
   * Handle Compare button click
   */
  function handleCompareClick() {
    let referenceText = '';

    // Determine which input method is active and get reference content
    const activeTab = document.querySelector('.csv-method-tab.active');
    if (!activeTab) {
      showErrorMessage('Error: No input method selected');
      return;
    }

    const method = activeTab.dataset.method;

    if (method === 'paste') {
      const referenceInput = document.getElementById('csv-reference-input');
      referenceText = referenceInput.value.trim();
      if (!referenceText) {
        showErrorMessage('Please paste a reference CSV to compare');
        return;
      }
    } else if (method === 'upload') {
      referenceText = modalElement.dataset.referenceContent || '';
      if (!referenceText) {
        showErrorMessage('Please upload a CSV file to compare');
        return;
      }
    } else if (method === 'url') {
      referenceText = modalElement.dataset.referenceContent || '';
      if (!referenceText) {
        showErrorMessage('Please load a CSV from URL to compare');
        return;
      }
    }

    // Parse reference CSV
    const referenceCSV = parseCSV(referenceText);
    const referenceValidation = validateCSV(referenceCSV);

    if (!referenceValidation.isValid) {
      showErrorMessage(`Error in reference CSV: ${referenceValidation.error}`);
      return;
    }

    // Get editor CSV
    const editorText = CsvEditor.getValue();
    const editorCSV = parseCSV(editorText);
    const editorValidation = validateCSV(editorCSV);

    if (!editorValidation.isValid) {
      showErrorMessage(`Error in editor CSV: ${editorValidation.error}`);
      return;
    }

    // Perform comparison
    const diffResult = compareCSVs(editorCSV, referenceCSV);
    currentComparisonResult = diffResult;

    // Display result
    displayResult(diffResult);
  }

  /**
   * Close the comparison modal
   */
  function closeComparisonModal() {
    if (modalElement) {
      modalElement.classList.remove('open');
      // Keep modal in DOM for reuse, just hide it
    }
  }

  /**
   * Validate CSV data
   * @param {Array<Array<string>>} csvData - Parsed CSV data
   * @returns {Object} Validation result with isValid flag and error message
   */
  function validateCSV(csvData) {
    if (!csvData || !Array.isArray(csvData)) {
      return {
        isValid: false,
        error: 'Invalid CSV data structure'
      };
    }

    if (csvData.length === 0) {
      return {
        isValid: true,
        error: null,
        isEmpty: true
      };
    }

    // Check for duplicate column headers (first row)
    const headers = csvData[0];
    const seenHeaders = new Set();
    for (const header of headers) {
      if (seenHeaders.has(header)) {
        return {
          isValid: false,
          error: `Duplicate column header: "${header}"`
        };
      }
      seenHeaders.add(header);
    }

    // Check column consistency (all rows should have same column count as header)
    const expectedCols = headers.length;
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];
      if (row.length !== expectedCols) {
        return {
          isValid: false,
          error: `Row ${i + 1} has ${row.length} columns, expected ${expectedCols}`
        };
      }
    }

    return {
      isValid: true,
      error: null
    };
  }

  /**
   * Format diff result into HTML for display
   * @param {Object} diffResult - DiffResult object from compareCSVs
   * @returns {string} HTML string representing the diff report
   */
  function formatDiffReport(diffResult) {
    if (diffResult.matchStatus === 'match') {
      return '';
    }

    let html = '<div class="csv-diff-report-content">';

    // Removed rows section
    if (diffResult.removedRows.length > 0) {
      html += '<div class="csv-diff-section">';
      html += '<h4>Removed Rows (' + diffResult.removedRows.length + ')</h4>';
      diffResult.removedRows.forEach(item => {
        html += '<div class="csv-removed-row">';
        html += '<strong>Row ' + (item.referenceRowIndex + 1) + ':</strong> ';
        html += escapeHtml(item.values.join(' | '));
        html += '</div>';
      });
      html += '</div>';
    }

    // Added rows section
    if (diffResult.addedRows.length > 0) {
      html += '<div class="csv-diff-section">';
      html += '<h4>Added Rows (' + diffResult.addedRows.length + ')</h4>';
      diffResult.addedRows.forEach(item => {
        html += '<div class="csv-added-row">';
        html += '<strong>Row ' + (item.editorRowIndex + 1) + ':</strong> ';
        html += escapeHtml(item.values.join(' | '));
        html += '</div>';
      });
      html += '</div>';
    }

    // Modified rows section
    if (diffResult.modifiedRows.length > 0) {
      html += '<div class="csv-diff-section">';
      html += '<h4>Modified Rows (' + diffResult.modifiedRows.length + ')</h4>';
      diffResult.modifiedRows.forEach(row => {
        html += '<div class="csv-modified-row">';
        html += '<strong>Row ' + (row.rowIndex + 1) + ':</strong><br>';
        row.changes.forEach(change => {
          html += '<span class="csv-change">';
          html += escapeHtml(change.columnName) + ': ';
          html += '<span class="csv-old-value">' + escapeHtml(change.oldValue) + '</span> → ';
          html += '<span class="csv-new-value">' + escapeHtml(change.newValue) + '</span>';
          html += '</span>';
        });
        html += '</div>';
      });
      html += '</div>';
    }

    // Column count difference warning
    if (diffResult.columnCountDiff.isDifferent) {
      html += '<div class="csv-diff-section">';
      html += '<h4>Column Count Mismatch</h4>';
      html += '<div style="color: var(--warning);">';
      html += 'Editor: ' + diffResult.columnCountDiff.editorCount + ' columns, ';
      html += 'Reference: ' + diffResult.columnCountDiff.referenceCount + ' columns';
      html += '</div></div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Escape HTML special characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  return {
    parseCSV,
    compareCSVs,
    validateCSV,
    showComparisonModal,
    closeComparisonModal,
    formatDiffReport,
    getCurrentData: () => currentComparisonResult
  };
})();
