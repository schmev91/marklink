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
  async function shareCurrentContent() {
    const content = Editor.getValue();
    if (!content.trim()) {
      showToast('Nothing to share — write some markdown first!');
      return;
    }

    const compressed = LZString.compressToEncodedURIComponent(content);
    const url = `${window.location.origin}${window.location.pathname}#content=${compressed}`;

    // copy link to clipboard
    navigator.clipboard.writeText(url).then(() => {
      showToast('Share link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      fallbackCopy(url);
    });

    // update URL bar so users can bookmark after generating link
    history.replaceState(null, '', `#content=${compressed}`);

    // generate a preview image but do NOT embed it in the URL
    if (window.Preview && typeof Preview.captureImage === 'function') {
      try {
        const dataUrl = await Preview.captureImage();
        if (dataUrl) {
          // open the generated image in a new tab so user can save/upload it
          const imgWindow = window.open(dataUrl, '_blank');
          if (imgWindow) {
            imgWindow.document.title = 'MarkLink preview';
            showToast('Preview image opened in new tab');
          } else {
            showToast('Preview image generated (popup blocked).');
          }

          // attempt to also copy the image to clipboard if supported
          if (navigator.clipboard && navigator.clipboard.write) {
            const blob = dataURLToBlob(dataUrl);
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).catch(() => {
              /* ignore failures silently */
            });
          }
        }
      } catch (err) {
        console.error('failed to generate preview image', err);
      }
    }
  }

  // convert data URL to a Blob object (used for clipboard copy)
  function dataURLToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const meta = parts[0].match(/:(.*?);/);
    const mime = meta ? meta[1] : 'image/png';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
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
