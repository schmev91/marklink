/**
 * MarkLink — CSV App Module
 * Main orchestration for CSV editor page
 */
const CsvApp = (() => {
  const DEFAULT_CSV = `Name,Age,City,Department,Salary,Status
Alice Johnson,32,New York,Engineering,95000,Active
Bob Smith,28,San Francisco,Design,82000,Active
Charlie Brown,45,Chicago,Marketing,78000,On Leave
Diana Ross,36,Los Angeles,Engineering,102000,Active
Eve Martinez,29,Seattle,Data Science,91000,Active
Frank Wilson,41,Boston,Management,115000,Active
Grace Lee,33,Austin,Engineering,97000,Active
Henry Davis,27,Denver,Design,76000,Active
Iris Chen,38,Portland,Data Science,88000,On Leave
Jack Thompson,31,Miami,Marketing,73000,Active
Karen White,44,Atlanta,Management,108000,Active
Leo Garcia,26,Phoenix,Engineering,85000,Active
Maria Lopez,35,Dallas,Design,79000,Active
Nathan Kim,30,Minneapolis,Data Science,93000,Active`;

  function init() {
    // Initialize modules
    Theme.init();
    Splitter.init();
    CsvEditor.init();
    CsvPreview.init();
    CsvShare.init();

    // Wire theme changes
    Theme.onChange((theme) => {
      CsvPreview.onThemeChange(theme);
    });

    // Wire editor input to preview rendering (debounced)
    const editor = CsvEditor.getElement();
    let renderTimer;
    if (editor) {
      editor.addEventListener('input', () => {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(() => {
          const val = CsvEditor.getValue().trim();
          CsvPreview.render(val);
        }, 300);
      });
    }

    // Wire Convert to JSON button
    const convertBtn = document.getElementById('csv-convert-json-btn');
    if (convertBtn) {
      convertBtn.addEventListener('click', convertToJson);
    }

    // Wire Download button
    const downloadBtn = document.getElementById('csv-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadCsv);
    }

    // Load content: URL shared > default
    const sharedContent = CsvShare.loadFromUrl();
    if (sharedContent) {
      CsvEditor.setValue(sharedContent);
    } else {
      CsvEditor.setValue(DEFAULT_CSV);
    }
  }

  function convertToJson() {
    const jsonData = CsvPreview.toJSON();
    if (!jsonData || jsonData.length === 0) {
      showToast('No CSV data to convert!');
      return;
    }
    const jsonStr = JSON.stringify(jsonData, null, 2);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    window.location.href = `json.html#content=${compressed}`;
  }

  function downloadCsv() {
    const content = CsvEditor.getValue();
    if (!content.trim()) {
      showToast('Nothing to download — paste some CSV first!');
      return;
    }
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marklink-data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV file downloaded!');
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
