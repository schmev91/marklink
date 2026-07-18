/**
 * MarkLink — CSV Share Module
 * Compress CSV content into URL for sharing, decompress on load
 */
const CsvShare = (() => {
  function init() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareCurrentContent);
    }
  }

  function loadFromUrl() {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.slice(1));
    const compressed = params.get('content');
    if (!compressed) return null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed) {
        const delimiter = params.get('delimiter') || 'csv';
        return { content: decompressed, delimiter };
      }
    } catch (err) {
      console.error('Failed to decompress URL content:', err);
    }
    return null;
  }

  function shareCurrentContent() {
    const content = CsvEditor.getValue();
    if (!content.trim()) {
      showToast('Nothing to share — paste some CSV first!');
      return;
    }

    const compressed = LZString.compressToEncodedURIComponent(content);
    let url = `${window.location.origin}${window.location.pathname}#content=${compressed}`;

    const currentDelimiter = (typeof CsvApp !== 'undefined' && CsvApp.getCurrentDelimiter)
      ? CsvApp.getCurrentDelimiter()
      : 'csv';
    if (currentDelimiter !== 'csv') {
      url += `&delimiter=${encodeURIComponent(currentDelimiter)}`;
    }

    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied to clipboard!');
    }).catch(() => {
      fallbackCopy(url);
    });

    const hash = `#content=${compressed}${currentDelimiter !== 'csv' ? `&delimiter=${encodeURIComponent(currentDelimiter)}` : ''}`;
    history.replaceState(null, '', hash);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Share link copied to clipboard!');
    } catch (_) {
      showToast('Failed to copy — check browser permissions.');
    }
    document.body.removeChild(ta);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 2500);
  }

  return { init, loadFromUrl, showToast };
})();
