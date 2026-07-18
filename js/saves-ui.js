/**
 * MarkLink — Saves UI Module
 * Shared "Saves" panel: list, load, rename, delete, save-as, autosave toggle.
 * Each editor page calls MarkLinkSavesUI.mount({...}) once.
 */
const MarkLinkSavesUI = (() => {
  function mount({ mode, getContent, setContent, getMeta, setMeta, onLoadDirty }) {
    let overlay = null;
    let dialog = null;
    let listEl = null;
    let nameInput = null;
    let autosaveCheckbox = null;
    let errorBanner = null;
    let lastLoadedSnapshot = getContent ? getContent() : '';
    let liveRegion = null;
    let currentToast = null;
    let currentToastFadeOutTimeout = null;
    let currentToastRemoveTimeout = null;

    function ensureBuilt() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.className = 'saves-overlay';
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      dialog = document.createElement('div');
      dialog.className = 'saves-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Saved documents');

      dialog.innerHTML = `
        <div class="saves-header">
          <h3>Saved Documents</h3>
          <button type="button" class="saves-close" aria-label="Close">×</button>
        </div>
        <div class="saves-banner" style="display:none;"></div>
        <div class="saves-save-row">
          <input type="text" class="saves-name-input" placeholder="Name your save..." maxlength="80" aria-label="Save name">
          <button type="button" class="saves-save-btn">Save current as</button>
        </div>
        <div class="saves-autosave-row">
          <label>
            <input type="checkbox" class="saves-autosave-checkbox">
            Autosave (silently restores on next open)
          </label>
        </div>
        <div class="saves-list-wrapper">
          <table class="saves-list">
            <thead>
              <tr><th>Name</th><th>Last modified</th><th></th></tr>
            </thead>
            <tbody class="saves-list-body"></tbody>
          </table>
          <div class="saves-empty" style="display:none;">No saves yet for this editor.</div>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      listEl = dialog.querySelector('.saves-list-body');
      nameInput = dialog.querySelector('.saves-name-input');
      autosaveCheckbox = dialog.querySelector('.saves-autosave-checkbox');
      errorBanner = dialog.querySelector('.saves-banner');

      dialog.querySelector('.saves-close').addEventListener('click', close);
      dialog.querySelector('.saves-save-btn').addEventListener('click', onSaveAs);
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); onSaveAs(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      });
      autosaveCheckbox.addEventListener('change', () => {
        MarkLinkStorage.writePreferences(mode, { autosaveEnabled: autosaveCheckbox.checked });
        if (!autosaveCheckbox.checked) {
          MarkLinkStorage.clearAutosave(mode);
        }
      });
    }

    function refresh() {
      ensureBuilt();
      const saves = MarkLinkStorage.listSaves(mode);
      listEl.innerHTML = '';
      const emptyEl = dialog.querySelector('.saves-empty');
      if (saves.length === 0) {
        emptyEl.style.display = '';
      } else {
        emptyEl.style.display = 'none';
        for (const rec of saves) {
          listEl.appendChild(buildRow(rec));
        }
      }
      const prefs = MarkLinkStorage.readPreferences(mode);
      autosaveCheckbox.checked = prefs.autosaveEnabled;
    }

    function buildRow(rec) {
      const tr = document.createElement('tr');
      tr.dataset.id = rec.id;

      const tdName = document.createElement('td');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'saves-row-name';
      nameSpan.textContent = rec.name;
      nameSpan.title = 'Double-click to rename';
      nameSpan.addEventListener('dblclick', () => beginRename(rec, nameSpan));
      tdName.appendChild(nameSpan);

      const tdTime = document.createElement('td');
      tdTime.className = 'saves-row-time';
      tdTime.textContent = formatTime(rec.lastModified);

      const tdActions = document.createElement('td');
      tdActions.className = 'saves-row-actions';

      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'saves-btn';
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => onLoad(rec));

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'saves-btn';
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => beginRename(rec, nameSpan));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'saves-btn saves-btn-danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => onDelete(rec));

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'saves-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', `Copy contents of ${rec.name}`);
      copyBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        onCopy(rec);
      });
      // stopPropagation is defensive isolation only — the dblclick-to-rename
      // listener lives on nameSpan, a sibling outside tdActions, so it can't
      // actually be reached by bubbling from a click here.

      tdActions.appendChild(loadBtn);
      tdActions.appendChild(renameBtn);
      tdActions.appendChild(delBtn);
      tdActions.appendChild(copyBtn);

      tr.appendChild(tdName);
      tr.appendChild(tdTime);
      tr.appendChild(tdActions);
      return tr;
    }

    function beginRename(rec, nameSpan) {
      const newName = window.prompt('Rename save:', rec.name);
      if (newName === null) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      try {
        MarkLinkStorage.renameSave(mode, rec.id, trimmed);
        refresh();
      } catch (err) {
        showError(err.message || 'Rename failed.');
      }
    }

    function onSaveAs() {
      const name = (nameInput.value || '').trim();
      if (!name) {
        showError('Enter a name first.');
        nameInput.focus();
        return;
      }
      const existing = MarkLinkStorage.listSaves(mode).find(r => r.name === name);
      if (existing) {
        const ok = window.confirm(`A save named "${name}" already exists. Overwrite?`);
        if (!ok) return;
      }
      try {
        const saveData = { name, content: getContent() };
        if (getMeta) saveData.meta = getMeta();
        MarkLinkStorage.upsertSave(mode, saveData);
        nameInput.value = '';
        clearError();
        refresh();
      } catch (err) {
        if (err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''))) {
          showError('Save failed: storage full. Delete old entries or shorten content.');
        } else {
          showError(err.message || 'Save failed.');
        }
      }
    }

    function onLoad(rec) {
      const current = getContent();
      const dirty = current !== '' && current !== lastLoadedSnapshot;
      if (dirty) {
        const proceed = (typeof onLoadDirty === 'function')
          ? onLoadDirty()
          : window.confirm('Replace current editor content with this save?');
        if (!proceed) return;
      }
      setContent(rec.content);
      if (setMeta && rec.meta) setMeta(rec.meta);
      lastLoadedSnapshot = rec.content;
      close();
    }

    function onDelete(rec) {
      const ok = window.confirm(`Delete save "${rec.name}"?`);
      if (!ok) return;
      MarkLinkStorage.deleteSave(mode, rec.id);
      refresh();
    }

    function onCopy(rec) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rec.content).then(
          () => showToast(`Copied "${rec.name}" to clipboard`),
          () => onCopyFallback(rec)
        );
      } else {
        onCopyFallback(rec);
      }
    }

    function onCopyFallback(rec) {
      if (copyViaExecCommand(rec.content)) {
        showToast(`Copied "${rec.name}" to clipboard`);
      } else {
        showError('Copy failed — clipboard access unavailable');
      }
    }

    function copyViaExecCommand(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        return document.execCommand('copy');
      } catch (err) {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    function open() {
      ensureBuilt();
      refresh();
      overlay.classList.add('visible');
      nameInput.focus();
    }

    function close() {
      if (overlay) overlay.classList.remove('visible');
      clearError();
    }

    function showError(message) {
      ensureBuilt();
      errorBanner.textContent = message;
      errorBanner.style.display = '';
      errorBanner.classList.add('saves-banner-error');
    }

    function clearError() {
      if (errorBanner) {
        errorBanner.textContent = '';
        errorBanner.style.display = 'none';
        errorBanner.classList.remove('saves-banner-error');
      }
    }

    function showQuotaError(message) {
      showError(message || 'Local storage is full.');
    }

    function showToast(message) {
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
      }
      liveRegion.textContent = message;

      // A second call while a toast is still showing (or fading) takes over
      // that toast rather than stacking a new one — both pending timers must
      // be cleared or the earlier call's removal timer fires later and rips
      // out the toast that's now showing this call's message.
      if (currentToastFadeOutTimeout !== null) {
        clearTimeout(currentToastFadeOutTimeout);
        currentToastFadeOutTimeout = null;
      }
      if (currentToastRemoveTimeout !== null) {
        clearTimeout(currentToastRemoveTimeout);
        currentToastRemoveTimeout = null;
      }

      if (currentToast && currentToast.parentNode) {
        currentToast.textContent = message;
        currentToast.classList.add('visible');
      } else {
        currentToast = document.createElement('div');
        currentToast.className = 'saves-restored-toast';
        currentToast.textContent = message;
        document.body.appendChild(currentToast);
        requestAnimationFrame(() => {
          if (currentToast) {
            currentToast.classList.add('visible');
          }
        });
      }

      currentToastFadeOutTimeout = setTimeout(() => {
        currentToast.classList.remove('visible');
        currentToastRemoveTimeout = setTimeout(() => {
          if (currentToast) {
            currentToast.remove();
            currentToast = null;
          }
          currentToastRemoveTimeout = null;
        }, 400);
        currentToastFadeOutTimeout = null;
      }, 3500);
    }

    function showRestoredToast(timestamp) {
      showToast(`Restored last session (${formatTime(timestamp)})`);
    }

    function setLoadedSnapshot(content) {
      lastLoadedSnapshot = content;
    }

    function formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (sameDay) return `${hh}:${mm}`;
      const yyyy = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mo}-${dd} ${hh}:${mm}`;
    }

    return {
      open,
      close,
      refresh,
      showQuotaError,
      showRestoredToast,
      showToast,
      setLoadedSnapshot,
    };
  }

  return { mount };
})();
