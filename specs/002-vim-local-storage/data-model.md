# Phase 1 Data Model

All data lives in the browser's `localStorage` under the `marklink.` namespace. There is no server. Mode is one of `markdown`, `json`, `csv`.

## Entities

### SavedDocument

A user-named snapshot of editor content.

| Field         | Type      | Notes |
|---------------|-----------|-------|
| `id`          | string    | Stable identifier; generated as `Date.now().toString(36) + Math.random().toString(36).slice(2,6)`. Used as the row key in UI; renames do not change the id. |
| `name`        | string    | User-supplied label, 1–80 chars, trimmed. Uniqueness within a mode is enforced at save time (overwrite-on-confirm — FR-003, scenario 3). |
| `mode`        | enum      | `"markdown" \| "json" \| "csv"`. Redundant with the storage key but kept on the record for safety when listing. |
| `content`     | string    | Raw editor text. No transformation. |
| `lastModified`| number    | `Date.now()` epoch ms. |

**Validation rules**:
- `name` after trim must be non-empty and ≤80 chars; reject otherwise with a UI-level error.
- `content` length is bounded only by available localStorage quota; a save that would push total origin usage past quota is rejected before write (FR-006).
- `mode` must match the editor mode performing the save; cross-mode loads are blocked at the UI layer (FR-005, edge case "saved as JSON, loaded in CSV").

**State transitions**: none; SavedDocument is a value record.

### AutosaveSlot

A reserved per-mode slot holding the most recent in-memory content.

| Field         | Type   | Notes |
|---------------|--------|-------|
| `content`     | string | Raw editor text at the last debounced flush. |
| `lastModified`| number | `Date.now()` epoch ms of the flush. |

**Validation rules**:
- Only one AutosaveSlot exists per mode (single key, overwritten on each flush).
- Empty `content` (zero-length string) MUST clear the slot rather than store an empty record, so first-time users see no false "Restored last session" toast.

**State transitions**: written by autosave tick or `beforeunload`; cleared explicitly when the user deletes it from the Saves UI.

### EditorPreferences

Per-mode user preferences.

| Field             | Type    | Default | Notes |
|-------------------|---------|---------|-------|
| `vim`             | boolean | `false` | FR-013: off by default for first-time users. |
| `autosaveEnabled` | boolean | `true`  | FR-008: on by default. |

**Validation rules**:
- Both fields must be booleans; missing or malformed JSON falls back to defaults.

**State transitions**: toggled by user from toolbar / Saves panel; written immediately on change.

## Storage Keys

```text
marklink.markdown.saves        →  SavedDocument[]
marklink.markdown.autosave     →  AutosaveSlot | (absent)
marklink.markdown.preferences  →  EditorPreferences
marklink.json.saves            →  SavedDocument[]
marklink.json.autosave         →  AutosaveSlot | (absent)
marklink.json.preferences      →  EditorPreferences
marklink.csv.saves             →  SavedDocument[]
marklink.csv.autosave          →  AutosaveSlot | (absent)
marklink.csv.preferences       →  EditorPreferences
```

Each value is `JSON.stringify`-encoded. All reads must `try/catch` parse failures and treat them as "key absent" to survive partial corruption.

## Relationships

- `SavedDocument` and `AutosaveSlot` are siblings within a mode's namespace; neither references the other. Loading from one path is a UI affordance, not a data relationship.
- `EditorPreferences` is orthogonal — it controls editor *behavior*, not document storage.

## Derived UI lists

- **Saves list** (per mode): `JSON.parse(localStorage.getItem("marklink.<mode>.saves") ?? "[]")`, sorted by `lastModified` descending.
- **Autosave banner**: present iff `marklink.<mode>.autosave` exists and `content` is non-empty.
