/**
 * MarkLink — Storage Module
 * Shared localStorage API: named saves, autosave slot, preferences.
 * Keys: marklink.<mode>.<saves|autosave|preferences>
 */
const MarkLinkStorage = (() => {
  const VALID_MODES = ['markdown', 'json', 'csv'];
  const DEFAULT_PREFS = { vim: false, autosaveEnabled: true };
  let availabilityCache = null;

  function _key(mode, suffix) {
    if (!VALID_MODES.includes(mode)) {
      throw new Error(`MarkLinkStorage: invalid mode "${mode}"`);
    }
    return `marklink.${mode}.${suffix}`;
  }

  function isAvailable() {
    if (availabilityCache !== null) return availabilityCache;
    try {
      const probe = '__marklink_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      availabilityCache = true;
    } catch (_) {
      availabilityCache = false;
    }
    return availabilityCache;
  }

  function _readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function _writeJSON(key, value) {
    // Throws QuotaExceededError up to caller.
    localStorage.setItem(key, JSON.stringify(value));
  }

  function _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function listSaves(mode) {
    const arr = _readJSON(_key(mode, 'saves'), []);
    if (!Array.isArray(arr)) return [];
    return arr.slice().sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  }

  function upsertSave(mode, { id, name, content }) {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length > 80) {
      throw new Error('Save name must be 1–80 characters.');
    }
    const all = _readJSON(_key(mode, 'saves'), []);
    const list = Array.isArray(all) ? all : [];
    const now = Date.now();
    let record = null;

    if (id) {
      const idx = list.findIndex(r => r.id === id);
      if (idx !== -1) {
        record = {
          ...list[idx],
          name: trimmed,
          content: content,
          mode: mode,
          lastModified: now,
        };
        list[idx] = record;
      }
    }

    if (!record) {
      const collisionIdx = list.findIndex(r => r.name === trimmed);
      if (collisionIdx !== -1) {
        record = {
          ...list[collisionIdx],
          name: trimmed,
          content: content,
          mode: mode,
          lastModified: now,
        };
        list[collisionIdx] = record;
      } else {
        record = {
          id: _genId(),
          name: trimmed,
          content: content,
          mode: mode,
          lastModified: now,
        };
        list.push(record);
      }
    }

    _writeJSON(_key(mode, 'saves'), list);
    return record;
  }

  function deleteSave(mode, id) {
    const list = _readJSON(_key(mode, 'saves'), []);
    if (!Array.isArray(list)) return;
    const next = list.filter(r => r.id !== id);
    _writeJSON(_key(mode, 'saves'), next);
  }

  function renameSave(mode, id, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed || trimmed.length > 80) {
      throw new Error('Save name must be 1–80 characters.');
    }
    const list = _readJSON(_key(mode, 'saves'), []);
    if (!Array.isArray(list)) return null;
    const target = list.find(r => r.id === id);
    if (!target) return null;
    const collision = list.find(r => r.id !== id && r.name === trimmed);
    if (collision) {
      // Overwrite-on-rename: keep target's content, drop collision row.
      const next = list.filter(r => r.id !== collision.id);
      target.name = trimmed;
      target.lastModified = Date.now();
      _writeJSON(_key(mode, 'saves'), next);
    } else {
      target.name = trimmed;
      target.lastModified = Date.now();
      _writeJSON(_key(mode, 'saves'), list);
    }
    return target;
  }

  function readAutosave(mode) {
    const rec = _readJSON(_key(mode, 'autosave'), null);
    if (!rec || typeof rec.content !== 'string' || rec.content.length === 0) return null;
    return rec;
  }

  function writeAutosave(mode, content) {
    if (typeof content !== 'string' || content.length === 0) {
      clearAutosave(mode);
      return;
    }
    try {
      _writeJSON(_key(mode, 'autosave'), { content, lastModified: Date.now() });
    } catch (err) {
      // R5: autosave failures are non-fatal; warn and skip.
      console.warn('MarkLinkStorage: autosave write failed', err);
    }
  }

  function clearAutosave(mode) {
    try {
      localStorage.removeItem(_key(mode, 'autosave'));
    } catch (_) {
      // ignore
    }
  }

  function readPreferences(mode) {
    const raw = _readJSON(_key(mode, 'preferences'), {});
    const merged = Object.assign({}, DEFAULT_PREFS, raw || {});
    merged.vim = !!merged.vim;
    merged.autosaveEnabled = merged.autosaveEnabled !== false;
    return merged;
  }

  function writePreferences(mode, partial) {
    const current = readPreferences(mode);
    const next = Object.assign({}, current, partial || {});
    next.vim = !!next.vim;
    next.autosaveEnabled = next.autosaveEnabled !== false;
    try {
      _writeJSON(_key(mode, 'preferences'), next);
    } catch (err) {
      console.warn('MarkLinkStorage: preferences write failed', err);
    }
    return next;
  }

  return {
    isAvailable,
    listSaves,
    upsertSave,
    deleteSave,
    renameSave,
    readAutosave,
    writeAutosave,
    clearAutosave,
    readPreferences,
    writePreferences,
  };
})();
