# Journal & Storage

Scope: CRUD entries, sectioned lists, item swipe/delete, local storage/backup.

**Files**

* `context/JournalProvider.tsx` (or `SecureJournalProvider.tsx`) — app‑wide source of truth; exposes CRUD and selectors.
* `app/(tabs)/journal.tsx` — screen that renders the sectioned list.
* `components/HistoryList.tsx` — sectioned FlatList wrapper + empty/loader states.
* `components/EntryItem.tsx` — one row: title, time, duration, swipe actions.
* `services/DatabaseService.ts` — SQLite access layer (queries, migrations, indices).
* `services/BackupService.ts` — encrypted export/import (local/off‑device).

---

## Data Model (Schema)

### Table: `entries`

| Field              | Type         | Notes                                |            |             |                     |                   |
| ------------------ | ------------ | ------------------------------------ | ---------- | ----------- | ------------------- | ----------------- |
| `id`               | TEXT (PK)    | `ulid()`/`uuid()`; sortable if ULID. |            |             |                     |                   |
| `createdAt`        | INTEGER      | epoch ms; list sort key (DESC).      |            |             |                     |                   |
| `updatedAt`        | INTEGER      | touch on any write.                  |            |             |                     |                   |
| `durationMs`       | INTEGER      | audio length.                        |            |             |                     |                   |
| `audioUri`         | TEXT         | absolute path to sealed `.m4a`.      |            |             |                     |                   |
| `processingStage`  | TEXT         | `'transcribing'                      | 'refining' | 'completed' | 'transcribe_failed' | 'refine_failed'`. |
| `title`            | TEXT NULL    | refined title.                       |            |             |                     |                   |
| `text`             | TEXT NULL    | refined text.                        |            |             |                     |                   |
| `rawText`          | TEXT NULL    | raw transcript (optional).           |            |             |                     |                   |
| `tags`             | TEXT NULL    | comma‑ or JSON‑encoded (future).     |            |             |                     |                   |
| `deletedAt`        | INTEGER NULL | soft‑delete tombstone (ms).          |            |             |                     |                   |
| `lastErrorCode`    | TEXT NULL    | machine‑readable.                    |            |             |                     |                   |
| `lastErrorMessage` | TEXT NULL    | human string.                        |            |             |                     |                   |

**Indices**

* `CREATE INDEX idx_entries_createdAt ON entries(createdAt DESC);`
* `CREATE INDEX idx_entries_stage ON entries(processingStage);`
* `CREATE INDEX idx_entries_deleted ON entries(deletedAt);` (for cleanup jobs)

> If you use ULIDs for `id`, you can sort by `id` for near‑time order; keep `createdAt` as explicit truth.

---

## Provider API (high‑level)

```ts
// context/JournalProvider.tsx
export function useSecureJournal() {
  return {
    entries,               // memoized list (excluding soft‑deleted)
    getEntryById(id),      // selector
    addEntry(payload),     // create placeholder; kicks off pipeline
    updateEntry(id, patch),
    deleteEntry(id, opts), // soft or hard
    restoreEntry(id),      // from trash
    purgeTrash(olderThanMs)
  };
}
```

**Contract**

* All writes are wrapped in a DB transaction; context state mirrors DB after commit.
* Writes update `updatedAt` automatically.

---

## CRUD Flows

### Create

1. Recorder calls `addEntry({ audioUri, durationMs, createdAt })`.
2. Provider inserts placeholder record with `processingStage: 'transcribing'`, empty text fields.
3. Emits `onEntryCreated(id)`; TranscriptionService enqueues.

### Read (Listing)

* `journal.tsx` subscribes to `entries` selector.
* `HistoryList` groups by **Day** (Today, Yesterday, Earlier) using `createdAt`.
* Each `EntryItem` shows: **title** (or fallback: date/time), **preview line** (`text` → `rawText`), **duration**, and a right chevron.
* While processing, show badge: “Transcribing…” / “Refining…”. On failure, show small warning icon + label.

### Update

* Edits (future) will patch `title`, `text`, `tags`. For v1, updates are system‑driven (pipeline).
* Provider merges patches, writes DB, and revalidates list memo.

### Delete

* **Swipe left** on an item → actions: **Delete** (soft), **More…**.
* Soft delete sets `deletedAt = now` and removes the row from the live list.
* Snackbar: “Entry moved to Trash. Undo?” → calls `restoreEntry(id)` (clears `deletedAt`).
* **Hard delete** occurs via cleanup (Trash screen or `purgeTrash`) and must remove:

  * DB row
  * audio file at `audioUri`
  * any auxiliary blobs (backup temp files)

> If the entry is mid‑processing, cancel/ignore the in‑flight job before hard delete.

---

## Sectioning & Grouping

**Grouping algorithm (journal.tsx)**

* Bucket by calendar day in the user’s timezone.
* Section headers: `Today`, `Yesterday`, `MMM d, yyyy` for older.
* Within each section, sort by `createdAt DESC`.

**Empty states**

* No entries → friendly prompt with a **Record** button.
* All entries processing → list shows placeholders with skeletons.

---

## Storage Layer (SQLite + Encryption)

* All content persisted in local SQLite file.
* Encrypt at rest (AES‑256); key stored in OS keychain/secure storage.
* Audio lives as files; DB stores `audioUri` and metadata.
* Writes use transactions; failures roll back.
* On app start, run lightweight **integrity check** and **pending job scan** (re‑enqueue any `transcribing/refining`).

**Migrations**

* Keep a `schemaVersion` table; apply ordered migrations on upgrade.
* Backfill new columns with safe defaults (e.g., `processingStage='completed'` for legacy rows).

---

## Backup & Restore

**BackupService**

* **Export**: serialize rows + copy audio files → package into an **encrypted archive** (include schemaVersion + createdAt).
* **Import**: verify archive → decrypt → insert rows (upsert by `id`) → copy audio files → rebuild indices.
* Never transmit backups off‑device unless the user explicitly chooses a destination.

**Versioning**

* Include app version + schemaVersion in the archive; refuse restore if newer major schema and `--force` not passed.

**Privacy**

* Backups are encrypted with a key derived from a user secret; never store raw archives.

---

## Error Handling

| Where       | Example            | User Feedback                                | Dev Notes                            |
| ----------- | ------------------ | -------------------------------------------- | ------------------------------------ |
| DB insert   | disk full          | “Not enough storage to save.”                | retry after cleanup; keep temp audio |
| DB read     | corrupted row      | auto‑repair if possible; otherwise hide item | log + mark for migration fix         |
| Hard delete | file unlink fails  | “Removed from list; file cleanup pending.”   | schedule cleanup job                 |
| Backup      | bad key / tampered | “Backup couldn’t be opened.”                 | verify signature; no partial restore |

---

## Selectors & Performance

* Keep `entries` memoized; derive light shapes for list (id, title, preview, createdAt, badges).
* Use `FlashList`/`SectionList` with `getItemLayout` to avoid jank.
* Lazy‑load long `text` bodies on entry screen; store a short excerpt for list preview.

---

## Telemetry (optional)

* `entry.create/delete/restore`
* list render counts and time
* backup export/import duration and size

---

## Test Checklist

* Create → item appears under **Today** with Processing badge, sorts correctly.
* Kill/relaunch app → list rehydrates fast; processing resumes.
* Swipe delete → item leaves list; **Undo** restores.
* Hard delete removes DB row **and** audio file.
* Disk‑full path shows error and preserves temp audio.
* Backup export/import round‑trips a small dataset.
* Migration from an older schema succeeds with correct defaults.
