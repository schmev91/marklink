/**
 * MarkLink — Splitter Module
 * Draggable panel divider with collapse/expand support
 */
const Splitter = (() => {
  const STORAGE_KEY = 'marklink-split-ratio';

  let splitter, editorPanel, previewPanel, mainContainer;
  let isDragging = false;
  let isVertical = false;
  let lastEditorWidth = null; // remember width before collapse

  function init() {
    splitter = document.getElementById('splitter');
    editorPanel = document.getElementById('editor-panel');
    previewPanel = document.getElementById('preview-panel');
    mainContainer = document.getElementById('main-container');

    if (!splitter || !editorPanel || !previewPanel) return;

    // Restore saved ratio
    const savedRatio = localStorage.getItem(STORAGE_KEY);
    if (savedRatio) {
      editorPanel.style.width = savedRatio + '%';
    }
    lastEditorWidth = editorPanel.style.width || '50%';

    // Mouse events
    splitter.addEventListener('mousedown', onSplitterMouseDown);
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);

    // Touch events
    splitter.addEventListener('touchstart', onSplitterMouseDown, { passive: false });
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', stopDrag);

    // Collapse/expand buttons
    document.getElementById('collapse-editor-btn')?.addEventListener('click', () => togglePanel('editor'));
    document.getElementById('collapse-preview-btn')?.addEventListener('click', () => togglePanel('preview'));
    document.getElementById('toggle-editor-btn')?.addEventListener('click', () => togglePanel('editor'));
    document.getElementById('toggle-preview-btn')?.addEventListener('click', () => togglePanel('preview'));

    // Detect responsive mode
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
  }

  function checkOrientation() {
    isVertical = window.innerWidth <= 768;
  }

  function onSplitterMouseDown(e) {
    // If a panel is collapsed, clicking the splitter restores split view
    if (editorPanel.classList.contains('collapsed') || previewPanel.classList.contains('collapsed')) {
      restoreAll();
      e.preventDefault?.();
      return;
    }

    startDrag(e);
  }

  function startDrag(e) {
    isDragging = true;
    splitter.classList.add('dragging');
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault?.();
  }

  function onDrag(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = mainContainer.getBoundingClientRect();

    if (isVertical) {
      const totalHeight = rect.height;
      const offsetY = clientY - rect.top;
      const ratio = Math.max(15, Math.min(85, (offsetY / totalHeight) * 100));
      editorPanel.style.height = ratio + '%';
    } else {
      const totalWidth = rect.width;
      const offsetX = clientX - rect.left;
      const ratio = Math.max(15, Math.min(85, (offsetX / totalWidth) * 100));
      editorPanel.style.width = ratio + '%';
      lastEditorWidth = ratio + '%';
      localStorage.setItem(STORAGE_KEY, ratio.toFixed(1));
    }
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    splitter.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function togglePanel(panel) {
    if (panel === 'editor') {
      if (editorPanel.classList.contains('collapsed')) {
        // Restore editor
        restoreAll();
      } else {
        // Collapse editor
        lastEditorWidth = editorPanel.style.width || '50%';
        editorPanel.classList.add('collapsed');
      }
    } else {
      if (previewPanel.classList.contains('collapsed')) {
        // Restore preview
        restoreAll();
      } else {
        // Collapse preview
        lastEditorWidth = editorPanel.style.width || '50%';
        previewPanel.classList.add('collapsed');
      }
    }
    updateSplitterState();
    updateToggleButtons();
  }

  function restoreAll() {
    editorPanel.classList.remove('collapsed');
    previewPanel.classList.remove('collapsed');
    // Restore the saved editor width
    editorPanel.style.width = lastEditorWidth || '50%';
    updateSplitterState();
    updateToggleButtons();
  }

  function updateSplitterState() {
    const anyCollapsed = editorPanel.classList.contains('collapsed') || previewPanel.classList.contains('collapsed');
    splitter.classList.toggle('has-collapsed', anyCollapsed);
  }

  function updateToggleButtons() {
    const editorBtn = document.getElementById('toggle-editor-btn');
    const previewBtn = document.getElementById('toggle-preview-btn');
    if (editorBtn) editorBtn.classList.toggle('active', !editorPanel.classList.contains('collapsed'));
    if (previewBtn) previewBtn.classList.toggle('active', !previewPanel.classList.contains('collapsed'));
  }

  return { init, togglePanel };
})();
