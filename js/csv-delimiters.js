const CsvDelimiters = (() => {
  const delimiters = [
    { key: 'csv', char: ',', label: 'CSV', extension: '.csv', mimeType: 'text/csv;charset=utf-8;' },
    { key: 'tsv', char: '\t', label: 'TSV', extension: '.tsv', mimeType: 'text/tab-separated-values;charset=utf-8;' }
  ];

  return {
    list: () => delimiters,
    get: (key) => delimiters.find(d => d.key === key) || delimiters[0],
    getDefault: () => delimiters[0],
    detectFromFilename: (filename) => {
      if (!filename) return null;
      const lower = filename.toLowerCase();
      if (lower.endsWith('.tsv')) return 'tsv';
      if (lower.endsWith('.csv')) return 'csv';
      return null;
    }
  };
})();
