# Contract: `js/storage.js`

Shared module that owns every `localStorage` read and write for the feature. All three editor modes call into this module via the API below.

## Exposed API

The module attaches a single global `MarkLinkStorage` (or, equivalently, `export`s the same surface if loaded as a module — both pages load it via plain `<script>`).

```js
MarkLinkStorage.isAvailable(): boolean
// One-shot probe done at boot. Returns false in private-browsing modes that
// throw on setItem. UI uses this to disable Save controls and show the
// "Storage not available" banner (FR-006).

MarkLinkStorage.listSaves(mode): SavedDocument[]
// Returns array sorted by lastModified desc. Returns [] on parse error or
// missing key.

MarkLinkStorage.upsertSave(mode, { id?, name, content }): SavedDocument
// If `id` is provided and exists, updates name/content/lastModified.
// If `name` collides with an existing entry in the same mode (and id differs
// or is absent), the existing entry is overwritten — caller is responsible
// for prompting the user beforehand (scenario 3, FR-003).
// Returns the persisted record. Throws QuotaExceededError on quota failure.

MarkLinkStorage.deleteSave(mode, id): void

MarkLinkStorage.renameSave(mode, id, newName): SavedDocument
// Same uniqueness/collision rules as upsertSave.

MarkLinkStorage.readAutosave(mode): AutosaveSlot | null

MarkLinkStorage.writeAutosave(mode, content): void
// No-op (and silently swallows QuotaExceededError) if content is empty or
// quota is exhausted (R5). Updates lastModified to Date.now().

MarkLinkStorage.clearAutosave(mode): void

MarkLinkStorage.readPreferences(mode): EditorPreferences
// Returns merged defaults + stored values. Missing/invalid JSON falls back
// to defaults { vim: false, autosaveEnabled: true }.

MarkLinkStorage.writePreferences(mode, partial): EditorPreferences
// Shallow-merges `partial` over the current preferences and persists.
// Returns the new full record.
```

## Invariants

- All keys are exactly `marklink.<mode>.<saves|autosave|preferences>`; no other shapes are produced.
- All write operations are synchronous from the caller's perspective; no Promises.
- The module performs zero DOM access — UI is the caller's concern.
- Errors from `setItem`:
  - For named-save writes → rethrown so the UI can show a banner (FR-006).
  - For autosave writes → caught and `console.warn`'d (R5).

## Mode discriminator

`mode` is a string and MUST be one of `"markdown" | "json" | "csv"`. Passing any other value throws synchronously (developer-error, not user-facing).
