/**
 * MarkLink — Share Module
 * Compress markdown content into URL for sharing, decompress on load
 */
const Share = (() => {
  function init() {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', shareCurrentContent);
    }
  }

  /**
   * Check if the current URL has shared content and return it
   */
  function loadFromUrl() {
    const hash = window.location.hash;
    if (!hash) return null;

    const params = new URLSearchParams(hash.slice(1));
    const compressed = params.get('content');
    if (!compressed) return null;

    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed) {
        return decompressed;
      }
    } catch (err) {
      console.error('Failed to decompress URL content:', err);
    }
    return null;
  }

  /**
   * Compress current editor content and copy shareable URL to clipboard
   */
  function shareCurrentContent() {
    const content = Editor.getValue();
    if (!content.trim()) {
      showToast('Nothing to share — write some markdown first!');
      return;
    }

    const compressed = LZString.compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#content=${compressed}`;

    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopy(url);
    });

    // Also update the URL bar without reload
    history.replaceState(null, '', `#content=${compressed}`);
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
